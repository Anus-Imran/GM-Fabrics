import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";
import { parseLocalDateTime, resolveRange } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { lockProducts, notifyLowStockIfCrossed } from "./inventoryService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

const entryInclude = {
  product: { include: { unit: true, category: true, brand: true } },
  supplier: true,
  stockBatches: { select: { id: true, initialQuantity: true, remainingQuantity: true, sellingPrice: true, costPrice: true } },
};

// How much of an entry's lot has left the shelf (sold, adjusted, etc.).
const consumedOf = (entry) =>
  round3((entry.stockBatches || []).reduce((s, b) => s + Math.max(0, b.initialQuantity - b.remainingQuantity), 0));

const decorate = (entry) => ({
  ...entry,
  soldQuantity: consumedOf(entry),
  remainingQuantity: round3((entry.stockBatches || []).reduce((s, b) => s + b.remainingQuantity, 0)),
});

export const getAllStockEntries = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = {};
  if (filters.productId) where.productId = parseInt(filters.productId, 10);
  if (filters.supplierId) where.supplierId = parseInt(filters.supplierId, 10);
  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.purchasedAt = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total, sums] = await Promise.all([
    prisma.stockEntry.findMany({
      where,
      include: entryInclude,
      orderBy: { purchasedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockEntry.count({ where }),
    prisma.stockEntry.aggregate({ where, _sum: { totalCost: true, quantity: true } }),
  ]);

  return {
    items: items.map(decorate),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { totalCost: round2(sums._sum.totalCost || 0), totalQuantity: round3(sums._sum.quantity || 0) },
  };
};

export const getStockEntryById = async (id) => {
  const entry = await prisma.stockEntry.findUnique({ where: { id }, include: entryInclude });
  if (!entry) throw notFound("Stock entry not found");
  return decorate(entry);
};

/** Adds one purchased lot inside an open transaction. */
const addPurchaseLine = async (tx, { productId, supplierId, invoiceNumber, quantity, costPerUnit, newSalePrice, notes, purchasedAt }) => {
  const product = await tx.product.findUnique({ where: { id: productId }, include: { unit: true } });
  if (!product) throw badRequest(`Product ID ${productId} not found`);
  if (!product.isActive) throw badRequest(`"${product.name}" is deleted — restore it before adding stock`);
  if (product.unit && !product.unit.allowDecimal && Math.abs(quantity - Math.round(quantity)) > QTY_EPSILON) {
    throw badRequest(`"${product.name}" is counted in whole ${product.unit.name} — ${quantity} is not allowed`);
  }

  const qty = round3(quantity);
  const cost = round2(costPerUnit);
  const previousCostPerUnit = product.costPrice || 0;
  const salePrice = newSalePrice && newSalePrice > 0 ? round2(newSalePrice) : product.salePrice || 0;

  const entry = await tx.stockEntry.create({
    data: {
      productId,
      supplierId: supplierId || null,
      invoiceNumber: invoiceNumber || null,
      quantity: qty,
      costPerUnit: cost,
      totalCost: round2(qty * cost),
      previousCostPerUnit,
      priceDiff: round2(cost - previousCostPerUnit),
      notes: notes || null,
      purchasedAt,
    },
  });

  await tx.stockBatch.create({
    data: {
      productId,
      stockEntryId: entry.id,
      initialQuantity: qty,
      remainingQuantity: qty,
      costPrice: cost,
      sellingPrice: salePrice,
      createdAt: purchasedAt,
    },
  });

  const updated = await tx.product.update({
    where: { id: productId },
    data: {
      stockQuantity: { increment: qty },
      costPrice: cost,
      ...(supplierId ? { supplierId } : {}),
      ...(newSalePrice && newSalePrice > 0 ? { salePrice: round2(newSalePrice) } : {}),
    },
  });
  await notifyLowStockIfCrossed(tx, product, product.stockQuantity, updated.stockQuantity);

  return entry;
};

const resolvePurchaseDate = (value) => {
  if (!value) return new Date();
  const date = parseLocalDateTime(value);
  if (!date || isNaN(date.getTime())) throw badRequest("Invalid purchase date");
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) throw badRequest("Purchase date cannot be in the future");
  return date;
};

export const createStockEntry = async (user, data) => {
  const purchasedAt = resolvePurchaseDate(data.purchasedAt);
  const entryId = await prisma.$transaction(async (tx) => {
    await lockProducts(tx, [data.productId]);
    const entry = await addPurchaseLine(tx, { ...data, purchasedAt });
    await audit(tx, user, "STOCK_PURCHASED", "StockEntry", entry.id, {
      productId: data.productId,
      quantity: data.quantity,
      costPerUnit: data.costPerUnit,
      invoiceNumber: data.invoiceNumber || null,
    });
    return entry.id;
  }, TX_OPTIONS);
  return getStockEntryById(entryId);
};

/** Multi-item purchase invoice: several products from one supplier, optionally with a payment. */
export const createBulkStockEntries = async (user, data) => {
  const purchasedAt = resolvePurchaseDate(data.purchasedAt);

  const ids = await prisma.$transaction(async (tx) => {
    if (data.supplierId) {
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) throw badRequest("Selected supplier was not found");
    }
    await lockProducts(tx, data.items.map((i) => i.productId));

    const created = [];
    for (const item of data.items) {
      const entry = await addPurchaseLine(tx, {
        ...item,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        purchasedAt,
      });
      created.push(entry);
    }

    const invoiceTotal = round2(created.reduce((s, e) => s + e.totalCost, 0));
    if (data.amountPaid && data.amountPaid > 0) {
      if (!data.supplierId) throw badRequest("Select a supplier to record a payment against this invoice");
      await tx.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          amount: round2(data.amountPaid),
          method: data.paymentMethod || "CASH",
          reference: data.invoiceNumber || null,
          fromDrawer: !!data.fromDrawer,
          notes: `Payment with purchase invoice ${data.invoiceNumber || ""}`.trim(),
          paidAt: purchasedAt,
          userId: user.id,
        },
      });
    }

    await audit(tx, user, "PURCHASE_INVOICE", "StockEntry", data.invoiceNumber || created[0].id, {
      supplierId: data.supplierId || null,
      lines: created.length,
      invoiceTotal,
      amountPaid: data.amountPaid || 0,
    });

    return created.map((e) => e.id);
  }, TX_OPTIONS);

  return prisma.stockEntry.findMany({ where: { id: { in: ids } }, include: entryInclude }).then((rows) => rows.map(decorate));
};

/** Resets a product's cost/supplier snapshot to its latest remaining purchase. */
const syncLatestCost = async (tx, productId) => {
  const latest = await tx.stockEntry.findFirst({ where: { productId }, orderBy: { purchasedAt: "desc" } });
  if (latest) {
    await tx.product.update({
      where: { id: productId },
      data: { costPrice: latest.costPerUnit, ...(latest.supplierId ? { supplierId: latest.supplierId } : {}) },
    });
  }
};

export const updateStockEntry = async (user, id, data) => {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.stockEntry.findUnique({
      where: { id },
      include: { product: true, stockBatches: { include: { _count: { select: { saleItems: true } } } } },
    });
    if (!existing) throw notFound("Stock purchase entry not found");

    const targetProductId = data.productId || existing.productId;
    const isProductChanged = targetProductId !== existing.productId;
    await lockProducts(tx, [existing.productId, targetProductId]);

    const newQty = data.quantity !== undefined ? round3(data.quantity) : existing.quantity;
    const newCost = data.costPerUnit !== undefined ? round2(data.costPerUnit) : existing.costPerUnit;
    const purchaseDate = data.purchasedAt ? resolvePurchaseDate(data.purchasedAt) : existing.purchasedAt;

    const mainBatch = existing.stockBatches[0] || null;
    const consumed = mainBatch ? round3(Math.max(0, mainBatch.initialQuantity - mainBatch.remainingQuantity)) : 0;
    const hasSales = mainBatch ? mainBatch._count.saleItems > 0 : false;

    if (isProductChanged && (consumed > QTY_EPSILON || hasSales)) {
      throw badRequest(`Cannot change the product: ${consumed} units from this purchase lot have already been sold or adjusted.`);
    }
    if (newQty + QTY_EPSILON < consumed) {
      throw badRequest(`Cannot reduce purchase quantity to ${newQty}: ${consumed} units from this lot are already sold. Minimum is ${consumed}.`);
    }

    const targetProduct = isProductChanged
      ? await tx.product.findUnique({ where: { id: targetProductId }, include: { unit: true } })
      : existing.product;
    if (!targetProduct) throw badRequest("Selected product not found");

    const salePrice =
      data.newSalePrice && data.newSalePrice > 0
        ? round2(data.newSalePrice)
        : mainBatch?.sellingPrice > 0
        ? mainBatch.sellingPrice
        : targetProduct.salePrice || 0;

    const oldRemaining = mainBatch ? mainBatch.remainingQuantity : 0;
    const newRemaining = round3(Math.max(0, newQty - consumed));

    if (mainBatch) {
      await tx.stockBatch.update({
        where: { id: mainBatch.id },
        data: {
          productId: targetProductId,
          initialQuantity: newQty,
          remainingQuantity: newRemaining,
          costPrice: newCost,
          sellingPrice: salePrice,
          createdAt: purchaseDate,
        },
      });
    } else {
      await tx.stockBatch.create({
        data: {
          productId: targetProductId,
          stockEntryId: id,
          initialQuantity: newQty,
          remainingQuantity: newRemaining,
          costPrice: newCost,
          sellingPrice: salePrice,
          createdAt: purchaseDate,
        },
      });
    }

    // Move stock by the change in this lot only, so other lots / legacy stock are untouched.
    if (isProductChanged) {
      await tx.product.update({
        where: { id: existing.productId },
        data: { stockQuantity: round3(Math.max(0, existing.product.stockQuantity - oldRemaining)) },
      });
      await tx.product.update({ where: { id: targetProductId }, data: { stockQuantity: { increment: newRemaining } } });
    } else {
      await tx.product.update({
        where: { id: targetProductId },
        data: { stockQuantity: round3(Math.max(0, existing.product.stockQuantity + (newRemaining - oldRemaining))) },
      });
    }

    const previousCostPerUnit = isProductChanged ? targetProduct.costPrice || 0 : existing.previousCostPerUnit ?? 0;
    await tx.stockEntry.update({
      where: { id },
      data: {
        productId: targetProductId,
        supplierId: data.supplierId !== undefined ? data.supplierId || null : existing.supplierId,
        invoiceNumber: data.invoiceNumber !== undefined ? data.invoiceNumber || null : existing.invoiceNumber,
        quantity: newQty,
        costPerUnit: newCost,
        totalCost: round2(newQty * newCost),
        previousCostPerUnit,
        priceDiff: round2(newCost - previousCostPerUnit),
        notes: data.notes !== undefined ? data.notes || null : existing.notes,
        purchasedAt: purchaseDate,
      },
    });

    if (data.newSalePrice && data.newSalePrice > 0) {
      await tx.product.update({ where: { id: targetProductId }, data: { salePrice: round2(data.newSalePrice) } });
    }
    await syncLatestCost(tx, targetProductId);
    if (isProductChanged) await syncLatestCost(tx, existing.productId);

    await audit(tx, user, "STOCK_ENTRY_UPDATED", "StockEntry", id, {
      before: { productId: existing.productId, quantity: existing.quantity, costPerUnit: existing.costPerUnit },
      after: { productId: targetProductId, quantity: newQty, costPerUnit: newCost },
    });
  }, TX_OPTIONS);

  return getStockEntryById(id);
};

const deleteEntryInTx = async (tx, user, id) => {
  const entry = await tx.stockEntry.findUnique({
    where: { id },
    include: { product: true, stockBatches: { include: { _count: { select: { saleItems: true, adjustments: true } } } } },
  });
  if (!entry) throw notFound(`Stock purchase entry #${id} not found`);
  await lockProducts(tx, [entry.productId]);

  const consumed = consumedOf(entry);
  const linked = entry.stockBatches.some((b) => b._count.saleItems > 0 || b._count.adjustments > 0);
  if (consumed > QTY_EPSILON || linked) {
    throw badRequest(
      `Cannot delete purchase #${id} (${entry.product.name}): ${consumed > 0 ? consumed : "some"} units from this lot were already sold or adjusted.`
    );
  }

  const remaining = round3(entry.stockBatches.reduce((s, b) => s + b.remainingQuantity, 0));
  await tx.stockBatch.deleteMany({ where: { stockEntryId: id } });
  await tx.stockEntry.delete({ where: { id } });
  await tx.product.update({
    where: { id: entry.productId },
    data: { stockQuantity: round3(Math.max(0, entry.product.stockQuantity - remaining)) },
  });
  await syncLatestCost(tx, entry.productId);

  await audit(tx, user, "STOCK_ENTRY_DELETED", "StockEntry", id, {
    product: entry.product.name,
    quantity: entry.quantity,
    costPerUnit: entry.costPerUnit,
  });
  return { id };
};

export const deleteStockEntry = (user, id) => prisma.$transaction((tx) => deleteEntryInTx(tx, user, id), TX_OPTIONS);

// All-or-nothing: if any entry cannot be deleted, none are.
export const deleteManyStockEntries = (user, ids) =>
  prisma.$transaction(async (tx) => {
    const results = [];
    for (const id of ids) results.push(await deleteEntryInTx(tx, user, id));
    return results;
  }, { maxWait: 10000, timeout: 60000 });
