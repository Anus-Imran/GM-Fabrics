import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";
import { parseLocalDateTime, resolveRange } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { lockProducts, restoreStock, notifyLowStockIfCrossed } from "./inventoryService.js";

/**
 * Supplier returns ("purchase returns").
 *
 * Stock always leaves ONE specific purchase lot of that supplier, so FIFO lot costs stay exact.
 *  - RETURN:      stock − qty, supplier balance − (qty × lot cost) as a credit note,
 *                 optionally the supplier refunds money instead (recorded as refundReceived).
 *  - REPLACEMENT: stock − qty, balance unchanged, status PENDING_REPLACEMENT. Received
 *                 replacements go back into the same lot. Unreplaced quantity can be
 *                 converted into a normal return (credit note).
 * Supplier balance = purchases − payments − return credits + refunds received.
 */

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

const include = {
  supplier: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, unit: { select: { name: true, symbol: true, allowDecimal: true } } } },
  stockEntry: { select: { id: true, invoiceNumber: true, purchasedAt: true } },
  user: { select: { id: true, name: true } },
};

const outstandingOf = (r) => round3(r.quantity - r.replacedQuantity);

const assertWhole = (product, qty) => {
  if (product.unit && product.unit.allowDecimal === false && Math.abs(qty - Math.round(qty)) > QTY_EPSILON) {
    throw badRequest(`"${product.name}" is counted in whole ${product.unit.name} — ${qty} is not allowed`);
  }
};

/** Lots of this supplier that still have stock on the shelf (and can be returned). */
export const getReturnableLots = async ({ supplierId, productId }) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw notFound("Supplier not found");

  const lots = await prisma.stockBatch.findMany({
    where: {
      remainingQuantity: { gt: QTY_EPSILON },
      ...(productId ? { productId } : {}),
      OR: [
        { stockEntry: { supplierId } },
        // Opening-stock lots of products that list this supplier.
        { stockEntryId: null, product: { supplierId } },
      ],
    },
    include: {
      product: { select: { id: true, name: true, sku: true, stockQuantity: true, unit: { select: { name: true, symbol: true, allowDecimal: true } } } },
      stockEntry: { select: { id: true, invoiceNumber: true, purchasedAt: true, quantity: true } },
    },
    orderBy: [{ remainingQuantity: "desc" }, { createdAt: "desc" }],
  });

  return lots.map((b) => ({
    batchId: b.id,
    productId: b.productId,
    productName: b.product.name,
    sku: b.product.sku,
    unit: b.product.unit,
    stockEntryId: b.stockEntryId,
    invoiceNumber: b.stockEntry?.invoiceNumber || null,
    purchasedAt: b.stockEntry?.purchasedAt || b.createdAt,
    purchasedQuantity: b.initialQuantity,
    remainingQuantity: round3(b.remainingQuantity),
    returnedQuantity: round3(b.returnedQuantity),
    costPrice: b.costPrice,
    isOpeningStock: !b.stockEntryId,
  }));
};

export const createSupplierReturn = async (user, data) => {
  const returnedAt = data.returnedAt ? parseLocalDateTime(data.returnedAt) : new Date();
  if (!returnedAt || isNaN(returnedAt.getTime())) throw badRequest("Invalid return date");
  if (returnedAt.getTime() > Date.now() + 5 * 60 * 1000) throw badRequest("Return date cannot be in the future");

  const id = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw badRequest("Supplier not found");

    await lockProducts(tx, [data.productId]);
    const product = await tx.product.findUnique({ where: { id: data.productId }, include: { unit: true } });
    if (!product) throw badRequest("Product not found");

    // Pick the lot: the one asked for, else this supplier's lot with the most stock left.
    const lots = await tx.stockBatch.findMany({
      where: {
        productId: product.id,
        remainingQuantity: { gt: QTY_EPSILON },
        OR: [{ stockEntry: { supplierId: supplier.id } }, { stockEntryId: null, product: { supplierId: supplier.id } }],
      },
      orderBy: [{ remainingQuantity: "desc" }, { createdAt: "desc" }],
    });
    const lot = data.batchId ? lots.find((l) => l.id === data.batchId) : lots[0];
    if (!lot) {
      throw badRequest(
        data.batchId
          ? "That purchase lot does not belong to this supplier or has no stock left"
          : `No stock of "${product.name}" from ${supplier.name} is left to return`
      );
    }

    const qty = round3(data.quantity);
    assertWhole(product, qty);
    if (qty > lot.remainingQuantity + QTY_EPSILON) {
      throw badRequest(`Only ${round3(lot.remainingQuantity)} ${product.unit?.symbol || ""} of this lot is still in stock — cannot return ${qty}`);
    }
    if (qty > product.stockQuantity + QTY_EPSILON) {
      throw badRequest(`Only ${round3(product.stockQuantity)} ${product.unit?.symbol || ""} of "${product.name}" is in stock`);
    }

    const isReturn = data.type === "RETURN";
    const value = round2(qty * lot.costPrice);
    const refund = isReturn && data.settlement === "REFUND" ? round2(data.refundAmount ?? value) : 0;
    if (refund > value + 0.004) throw badRequest("Refund cannot be more than the value of the returned goods");

    // Stock leaves exactly this lot.
    await tx.stockBatch.update({
      where: { id: lot.id },
      data: { remainingQuantity: { decrement: qty }, returnedQuantity: { increment: qty } },
    });
    const updated = await tx.product.update({
      where: { id: product.id },
      data: { stockQuantity: round3(Math.max(0, product.stockQuantity - qty)) },
    });
    await notifyLowStockIfCrossed(tx, product, product.stockQuantity, updated.stockQuantity);

    const record = await tx.supplierReturn.create({
      data: {
        supplierId: supplier.id,
        productId: product.id,
        stockEntryId: lot.stockEntryId,
        batchId: lot.id,
        type: data.type,
        status: isReturn ? "COMPLETED" : "PENDING_REPLACEMENT",
        quantity: qty,
        costPerUnit: lot.costPrice,
        creditAmount: isReturn ? value : 0,
        refundReceived: refund,
        refundMethod: refund > 0 ? data.refundMethod || "CASH" : null,
        refundToDrawer: refund > 0 && !!data.refundToDrawer,
        refundedAt: refund > 0 ? new Date() : null,
        reason: data.reason || null,
        notes: data.notes || null,
        userId: user.id,
        returnedAt,
      },
    });

    await audit(tx, user, isReturn ? "SUPPLIER_RETURN" : "SUPPLIER_REPLACEMENT_SENT", "SupplierReturn", record.id, {
      supplier: supplier.name,
      product: product.name,
      quantity: qty,
      lotId: lot.id,
      value,
      refund,
    });
    return record.id;
  }, TX_OPTIONS);

  return getSupplierReturnById(id);
};

/** Replacement goods arrived: they go back into the same lot. */
export const receiveReplacement = async (user, id, { quantity }) => {
  await prisma.$transaction(async (tx) => {
    const r = await tx.supplierReturn.findUnique({ where: { id }, include: { product: { include: { unit: true } } } });
    if (!r) throw notFound("Supplier return not found");
    if (r.type !== "REPLACEMENT" || !["PENDING_REPLACEMENT", "PARTIALLY_REPLACED"].includes(r.status)) {
      throw badRequest("This return is not waiting for a replacement");
    }
    const outstanding = outstandingOf(r);
    const qty = round3(quantity ?? outstanding);
    assertWhole(r.product, qty);
    if (qty <= 0 || qty > outstanding + QTY_EPSILON) {
      throw badRequest(`Only ${outstanding} ${r.product.unit?.symbol || ""} are still waiting for replacement`);
    }

    await lockProducts(tx, [r.productId]);
    const batchId = await restoreStock(tx, {
      productId: r.productId,
      batchId: r.batchId,
      quantity: qty,
      costPrice: r.costPerUnit,
    });
    if (batchId === r.batchId) {
      await tx.stockBatch.update({ where: { id: batchId }, data: { returnedQuantity: { decrement: qty } } });
    }

    const replaced = round3(r.replacedQuantity + qty);
    await tx.supplierReturn.update({
      where: { id },
      data: { replacedQuantity: replaced, status: replaced + QTY_EPSILON >= r.quantity ? "REPLACED" : "PARTIALLY_REPLACED" },
    });
    await audit(tx, user, "SUPPLIER_REPLACEMENT_RECEIVED", "SupplierReturn", id, { product: r.product.name, quantity: qty });
  }, TX_OPTIONS);
  return getSupplierReturnById(id);
};

/** Supplier will not replace the rest: the unreplaced quantity becomes a normal return. */
export const convertToReturn = async (user, id, data) => {
  await prisma.$transaction(async (tx) => {
    const r = await tx.supplierReturn.findUnique({ where: { id }, include: { product: true } });
    if (!r) throw notFound("Supplier return not found");
    if (r.type !== "REPLACEMENT" || !["PENDING_REPLACEMENT", "PARTIALLY_REPLACED"].includes(r.status)) {
      throw badRequest("Only a pending replacement can be converted into a return");
    }
    const outstanding = outstandingOf(r);
    const value = round2(outstanding * r.costPerUnit);
    const refund = data.settlement === "REFUND" ? round2(data.refundAmount ?? value) : 0;
    if (refund > value + 0.004) throw badRequest("Refund cannot be more than the value of the unreplaced goods");

    await tx.supplierReturn.update({
      where: { id },
      data: {
        status: "CONVERTED",
        creditAmount: value,
        refundReceived: refund,
        refundMethod: refund > 0 ? data.refundMethod || "CASH" : null,
        refundToDrawer: refund > 0 && !!data.refundToDrawer,
        refundedAt: refund > 0 ? new Date() : null,
        notes: [r.notes, data.notes].filter(Boolean).join(" | ") || null,
      },
    });
    await audit(tx, user, "SUPPLIER_REPLACEMENT_CONVERTED", "SupplierReturn", id, { product: r.product.name, quantity: outstanding, value, refund });
  }, TX_OPTIONS);
  return getSupplierReturnById(id);
};

/** Undo (admin): goods still with the supplier come back into the lot; credits/refunds disappear with the record. */
export const deleteSupplierReturn = async (user, id) => {
  return prisma.$transaction(async (tx) => {
    const r = await tx.supplierReturn.findUnique({ where: { id }, include: { product: true, supplier: true } });
    if (!r) throw notFound("Supplier return not found");

    const backQty = outstandingOf(r);
    if (backQty > QTY_EPSILON) {
      await lockProducts(tx, [r.productId]);
      const batchId = await restoreStock(tx, { productId: r.productId, batchId: r.batchId, quantity: backQty, costPrice: r.costPerUnit });
      if (batchId === r.batchId) {
        const batch = await tx.stockBatch.findUnique({ where: { id: batchId } });
        await tx.stockBatch.update({
          where: { id: batchId },
          data: { returnedQuantity: round3(Math.max(0, batch.returnedQuantity - backQty)) },
        });
      }
    }
    await tx.supplierReturn.delete({ where: { id } });
    await audit(tx, user, "SUPPLIER_RETURN_DELETED", "SupplierReturn", id, {
      supplier: r.supplier.name,
      product: r.product.name,
      quantityRestored: backQty,
      creditAmount: r.creditAmount,
      refundReceived: r.refundReceived,
    });
    return { id };
  }, TX_OPTIONS);
};

export const getSupplierReturnById = async (id) => {
  const r = await prisma.supplierReturn.findUnique({ where: { id }, include });
  if (!r) throw notFound("Supplier return not found");
  return { ...r, outstandingQuantity: outstandingOf(r) };
};

export const getSupplierReturns = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = {};
  if (filters.supplierId) where.supplierId = parseInt(filters.supplierId, 10);
  if (filters.status === "PENDING") where.status = { in: ["PENDING_REPLACEMENT", "PARTIALLY_REPLACED"] };
  else if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.returnedAt = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
      { reason: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total, sums, pending] = await Promise.all([
    prisma.supplierReturn.findMany({ where, include, orderBy: { returnedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.supplierReturn.count({ where }),
    prisma.supplierReturn.aggregate({ where, _sum: { creditAmount: true, refundReceived: true } }),
    prisma.supplierReturn.count({ where: { status: { in: ["PENDING_REPLACEMENT", "PARTIALLY_REPLACED"] } } }),
  ]);

  return {
    items: items.map((r) => ({ ...r, outstandingQuantity: outstandingOf(r) })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      totalCredit: round2(sums._sum.creditAmount || 0),
      totalRefunded: round2(sums._sum.refundReceived || 0),
      pendingReplacements: pending,
    },
  };
};
