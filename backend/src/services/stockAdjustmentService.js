import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/appError.js";
import { round2, round3 } from "../utils/money.js";
import { resolveRange } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { lockProducts, removeStock, notifyLowStockIfCrossed } from "./inventoryService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

export const REASON_LABELS = {
  DAMAGE: "Damaged",
  SHRINKAGE: "Shrinkage / cutting loss",
  COUNT_CORRECTION: "Stock count correction",
  FOUND: "Found stock",
  OPENING: "Opening stock",
  OTHER: "Other",
};

/**
 * Applies a signed stock adjustment inside an existing transaction.
 * Positive: a new lot is created at the given (or current) cost.
 * Negative: stock is removed FIFO; one adjustment row is written per lot touched.
 */
export const applyAdjustment = async (tx, user, { productId, quantity, reason, notes = null, costPrice }) => {
  await lockProducts(tx, [productId]);
  const product = await tx.product.findUnique({ where: { id: productId }, include: { unit: true } });
  if (!product) throw notFound("Product not found");

  const qty = round3(quantity);
  const rows = [];

  if (qty > 0) {
    const cost = costPrice !== undefined ? round2(costPrice) : product.costPrice || 0;
    const batch = await tx.stockBatch.create({
      data: {
        productId,
        initialQuantity: qty,
        remainingQuantity: qty,
        costPrice: cost,
        sellingPrice: product.salePrice || 0,
      },
    });
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: qty } },
    });
    await notifyLowStockIfCrossed(tx, product, product.stockQuantity, updated.stockQuantity);
    rows.push({ productId, batchId: batch.id, quantity: qty, costPrice: cost, reason, notes, userId: user?.id ?? null });
  } else {
    const allocations = await removeStock(tx, { productId, quantity: Math.abs(qty), lock: false });
    for (const a of allocations) {
      rows.push({
        productId,
        batchId: a.batchId,
        quantity: -a.quantity,
        costPrice: round2(a.costPrice),
        reason,
        notes,
        userId: user?.id ?? null,
      });
    }
  }

  await tx.stockAdjustment.createMany({ data: rows });
  await audit(tx, user, "STOCK_ADJUSTED", "Product", productId, {
    product: product.name,
    quantity: qty,
    reason,
    notes,
    before: round3(product.stockQuantity),
    after: round3(product.stockQuantity + qty),
  });

  return rows;
};

export const createAdjustment = async (user, data) => {
  await prisma.$transaction((tx) => applyAdjustment(tx, user, data), TX_OPTIONS);
  return prisma.product.findUnique({ where: { id: data.productId }, include: { unit: true } });
};

export const getAdjustments = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = {};
  if (filters.productId) where.productId = parseInt(filters.productId, 10);
  if (filters.reason) where.reason = filters.reason;
  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.createdAt = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, unit: { select: { symbol: true, name: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockAdjustment.count({ where }),
  ]);

  return {
    items: items.map((a) => ({ ...a, valueImpact: round2(a.quantity * a.costPrice), reasonLabel: REASON_LABELS[a.reason] })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};
