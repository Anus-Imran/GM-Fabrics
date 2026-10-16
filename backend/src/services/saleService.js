import { prisma } from "../config/prisma.js";
import { generateSaleNumber } from "../utils/saleNumberUtil.js";
import { generateReceiptHtml } from "../utils/receiptUtil.js";
import { badRequest, notFound, forbidden } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";
import { parseLocalDateTime, resolveRange } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import {
  lockProducts,
  getActiveBatches,
  planConsumption,
  applyBatchDeductions,
  assertQuantityAllowed,
  notifyLowStockIfCrossed,
  restoreStock,
} from "./inventoryService.js";
import { postKhataEntry } from "./khataService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

const saleDetailInclude = {
  customer: true,
  user: { select: { id: true, name: true } },
  voidedBy: { select: { id: true, name: true } },
  saleItems: {
    include: { product: { include: { unit: true, category: true, brand: true } } },
    orderBy: { id: "asc" },
  },
  receipt: { select: { id: true, printCount: true, lastPrintAt: true } },
  returns: { include: { returnItems: true }, orderBy: { createdAt: "asc" } },
};

/** Adds the generated receipt HTML to a sale object (receipts are rendered on demand). */
export const withReceipt = (sale) => {
  if (!sale) return sale;
  return {
    ...sale,
    receipt: { ...(sale.receipt || {}), receiptHtml: generateReceiptHtml(sale) },
  };
};

const buildSalesWhere = (filters) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.userId) where.userId = filters.userId;

  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.createdAt = { gte: start, lte: end };
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { saleNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { customer: { phone: { contains: term } } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
};

/** Paginated sales list — lean rows for the sales history table. */
export const getAllSales = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = buildSalesWhere(filters);

  const sortable = ["createdAt", "totalAmount", "saleNumber", "status", "paymentMethod"];
  const sortBy = sortable.includes(filters.sortBy) ? filters.sortBy : "createdAt";
  const sortDir = filters.sortDir || "desc";

  const [items, total, sums] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: {
        id: true,
        saleNumber: true,
        createdAt: true,
        subtotal: true,
        discountAmount: true,
        totalAmount: true,
        amountPaid: true,
        changeAmount: true,
        creditAmount: true,
        paymentMethod: true,
        status: true,
        notes: true,
        voidReason: true,
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { saleItems: true, returns: true } },
        returns: { select: { refundAmount: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: { ...where, status: where.status || { not: "VOIDED" } },
      _sum: { totalAmount: true, discountAmount: true },
    }),
  ]);

  return {
    items: items.map((s) => ({
      ...s,
      refundedAmount: round2(s.returns.reduce((sum, r) => sum + r.refundAmount, 0)),
      returns: undefined,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      totalAmount: round2(sums._sum.totalAmount || 0),
      totalDiscount: round2(sums._sum.discountAmount || 0),
    },
  };
};

export const getSaleById = async (idOrNumber) => {
  const term = String(idOrNumber).trim();
  const numericId = parseInt(term, 10);
  const isNumeric = !isNaN(numericId) && String(numericId) === term && numericId < 2147483647;

  const sale = await prisma.sale.findFirst({
    where: isNumeric
      ? { OR: [{ id: numericId }, { saleNumber: { equals: term, mode: "insensitive" } }] }
      : { saleNumber: { equals: term, mode: "insensitive" } },
    include: saleDetailInclude,
  });

  if (!sale) throw notFound(`Sale bill "${term}" not found`);
  return withReceipt(sale);
};

const resolveCustomer = async (tx, data) => {
  if (data.customerId) {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw badRequest("Selected customer was not found");
    return customer.id;
  }

  const inlineName = data.newCustomer?.name || data.customerName;
  if (!inlineName) return null;

  const phone = data.newCustomer?.phone || data.customerPhone || null;
  const city = data.newCustomer?.city || data.customerCity;
  const address = data.newCustomer?.address || data.customerAddress;

  if (phone) {
    const existing = await tx.customer.findUnique({ where: { phone } });
    if (existing) return existing.id;
  }

  const fullAddress = [address, city].filter(Boolean).join(", ");
  const created = await tx.customer.create({
    data: { name: inlineName, phone, address: fullAddress || null },
  });
  return created.id;
};

/**
 * Creates a POS sale. Everything (stock, lots, khata, bill number) happens in one
 * transaction with the product rows locked, so concurrent counters stay consistent.
 *
 * Line pricing: `unitPrice` (cashier's net rate) applies to the whole line. Without it,
 * each FIFO lot is sold at its own selling price minus `discountPerUnit`.
 */
export const createSale = async (user, data) => {
  const admin = isAdmin(user);
  const requestedDate = data.createdAt || data.saleDate;
  let transactionDate = new Date();

  if (requestedDate) {
    const parsed = parseLocalDateTime(requestedDate);
    if (!parsed || isNaN(parsed.getTime())) throw badRequest("Invalid sale date");
    if (parsed.getTime() > Date.now() + 5 * 60 * 1000) throw badRequest("Sale date cannot be in the future");
    const isBackdated = Math.abs(parsed.getTime() - Date.now()) > 5 * 60 * 1000;
    if (isBackdated && !admin) throw forbidden("Only an admin can record a sale with a past date");
    transactionDate = parsed;
  }

  const payMethod = data.paymentMethod || "CASH";

  const saleId = await prisma.$transaction(async (tx) => {
    const finalCustomerId = await resolveCustomer(tx, data);
    if (payMethod === "CREDIT" && !finalCustomerId) {
      throw badRequest("Customer name or selection is required for CREDIT (Khata) payment");
    }

    // 1. Lock and load products + their active lots
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    await lockProducts(tx, productIds);

    const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { unit: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const batches = await getActiveBatches(tx, productIds);

    // 2. Validate stock per product (lines of the same product are summed)
    const requestedByProduct = new Map();
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) throw badRequest(`Product ID ${item.productId} not found or inactive`);
      assertQuantityAllowed(product, item.quantity);
      requestedByProduct.set(product.id, round3((requestedByProduct.get(product.id) || 0) + item.quantity));
    }

    const unbatchedByProduct = new Map();
    for (const [productId, qty] of requestedByProduct) {
      const product = productMap.get(productId);
      if (product.stockQuantity + QTY_EPSILON < qty) {
        const avail = round3(Math.max(0, product.stockQuantity));
        throw badRequest(
          `Insufficient stock for "${product.name}". Available: ${avail} ${product.unit?.symbol || product.unit?.name || "pcs"}, requested: ${qty}`
        );
      }
      const batchTotal = batches.filter((b) => b.productId === productId).reduce((s, b) => s + b.remainingQuantity, 0);
      unbatchedByProduct.set(productId, { value: Math.max(0, round3(product.stockQuantity - batchTotal)) });
    }

    // 3. Allocate each line to lots and price it
    const preparedLines = [];
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const allocations = planConsumption({
        product,
        batches,
        quantity: item.quantity,
        preferredBatchId: item.batchId || null,
        unbatchedAvailable: unbatchedByProduct.get(product.id),
      });

      for (const a of allocations) {
        const listPrice = round2(a.sellingPrice);
        const unitPrice =
          item.unitPrice !== undefined
            ? round2(item.unitPrice)
            : round2(Math.max(0, listPrice - (item.discountPerUnit || 0)));

        if (!admin && unitPrice + 0.0001 < a.costPrice) {
          throw forbidden(
            `"${product.name}" cannot be sold below its cost price. Ask an admin to approve this rate.`
          );
        }

        preparedLines.push({
          productId: product.id,
          batchId: a.batchId,
          quantity: a.quantity,
          costPrice: round2(a.costPrice),
          listPrice,
          unitPrice,
          subtotal: round2(a.quantity * unitPrice),
        });
      }
    }

    // 4. Totals & bill discount
    const subtotal = round2(preparedLines.reduce((s, l) => s + l.subtotal, 0));
    const discVal = round2(data.discountValue || 0);
    let discountAmount = 0;
    if (data.discountType === "PERCENTAGE" && discVal > 0) {
      discountAmount = round2((subtotal * Math.min(discVal, 100)) / 100);
    } else if (data.discountType === "FLAT" && discVal > 0) {
      if (discVal > subtotal) throw badRequest("Flat discount cannot be more than the bill subtotal");
      discountAmount = discVal;
    }
    const totalAmount = round2(Math.max(0, subtotal - discountAmount));

    // 5. Payment rules
    let amountPaid = 0;
    let changeAmount = 0;
    let creditAmount = 0;

    if (payMethod === "CASH") {
      amountPaid = data.amountPaid !== undefined ? round2(data.amountPaid) : totalAmount;
      if (amountPaid + 0.001 < totalAmount) {
        throw badRequest(`Cash received (PKR ${amountPaid}) is less than the bill total (PKR ${totalAmount})`);
      }
      changeAmount = round2(amountPaid - totalAmount);
    } else if (payMethod === "CARD") {
      amountPaid = totalAmount;
    } else {
      amountPaid = round2(data.amountPaid || 0);
      if (amountPaid > totalAmount + 0.001) {
        throw badRequest("Advance paid on a khata sale cannot be more than the bill total");
      }
      creditAmount = round2(totalAmount - amountPaid);
    }

    // 6. Create sale + items
    const saleNumber = await generateSaleNumber(tx, transactionDate);
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerId: finalCustomerId,
        userId: user.id,
        subtotal,
        discountType: discountAmount > 0 ? data.discountType : null,
        discountValue: discountAmount > 0 ? discVal : 0,
        discountAmount,
        totalAmount,
        paymentMethod: payMethod,
        amountPaid,
        changeAmount,
        creditAmount,
        status: "COMPLETED",
        notes: data.notes || null,
        createdAt: transactionDate,
      },
    });

    await tx.saleItem.createMany({
      data: preparedLines.map((l) => ({ ...l, saleId: sale.id, createdAt: transactionDate })),
    });

    // 7. Deduct lots and product stock
    await applyBatchDeductions(tx, preparedLines);
    for (const [productId, qty] of requestedByProduct) {
      const product = productMap.get(productId);
      const after = round3(Math.max(0, product.stockQuantity - qty));
      await tx.product.update({ where: { id: productId }, data: { stockQuantity: after } });
      await notifyLowStockIfCrossed(tx, product, product.stockQuantity, after);
    }

    // 8. Khata ledger
    if (creditAmount > 0) {
      await postKhataEntry(tx, {
        customerId: finalCustomerId,
        type: "SALE",
        amount: creditAmount,
        method: "CREDIT",
        saleId: sale.id,
        notes: `Bill ${saleNumber}${amountPaid > 0 ? ` (advance paid PKR ${amountPaid})` : ""}`,
        userId: user.id,
      });
    }

    await tx.receipt.create({ data: { saleId: sale.id } });

    if (requestedDate && Math.abs(transactionDate.getTime() - Date.now()) > 5 * 60 * 1000) {
      await audit(tx, user, "SALE_BACKDATED", "Sale", sale.id, { saleNumber, date: transactionDate });
    }

    return sale.id;
  }, TX_OPTIONS);

  const full = await prisma.sale.findUnique({ where: { id: saleId }, include: saleDetailInclude });
  return withReceipt(full);
};

/**
 * Voids a completed sale (admin): stock goes back to its lots, khata is reversed,
 * and the bill stays in history marked VOIDED. Sales with returns must have them removed first.
 */
export const voidSale = async (user, id, reason) => {
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { saleItems: true, returns: { select: { id: true } } },
    });
    if (!sale) throw notFound("Sale not found");
    if (sale.status === "VOIDED") throw badRequest("This sale is already voided");
    if (sale.returns.length > 0) {
      throw badRequest("This sale has returns. Delete its returns first, then void the sale.");
    }

    await lockProducts(tx, sale.saleItems.map((i) => i.productId));
    for (const item of sale.saleItems) {
      await restoreStock(tx, {
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        costPrice: item.costPrice,
        sellingPrice: item.listPrice || item.unitPrice,
      });
    }

    // Bills created before creditAmount existed stored the whole unpaid total as khata.
    const khataPortion =
      sale.creditAmount > 0
        ? sale.creditAmount
        : sale.paymentMethod === "CREDIT"
        ? round2(Math.max(0, sale.totalAmount - (sale.amountPaid || 0)))
        : 0;

    if (sale.customerId && khataPortion > 0) {
      await postKhataEntry(tx, {
        customerId: sale.customerId,
        type: "VOID",
        amount: -khataPortion,
        saleId: sale.id,
        notes: `Bill ${sale.saleNumber} voided`,
        userId: user.id,
      });
    }

    await tx.sale.update({
      where: { id },
      data: { status: "VOIDED", voidedAt: new Date(), voidedById: user.id, voidReason: reason },
    });

    await audit(tx, user, "SALE_VOIDED", "Sale", id, { saleNumber: sale.saleNumber, totalAmount: sale.totalAmount, reason });
  }, TX_OPTIONS);

  return getSaleById(String(id));
};
