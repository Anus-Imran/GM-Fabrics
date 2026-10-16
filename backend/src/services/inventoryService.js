import { Prisma } from "@prisma/client";
import { badRequest, notFound } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";

/**
 * Inventory primitives shared by sales, returns, voids, purchases and adjustments.
 *
 * Invariant: Product.stockQuantity is the sellable stock. Active StockBatch rows
 * (remainingQuantity > 0) describe where that stock came from and what it cost (FIFO).
 * Legacy data may have a small unbatched remainder (stockQuantity > sum of batches);
 * it is sold last at the product's cost price.
 */

/**
 * Locks product rows for the rest of the transaction so two counters cannot sell
 * the same stock at the same time. Ids are sorted to avoid deadlocks.
 */
export const lockProducts = async (tx, productIds) => {
  const ids = [...new Set(productIds.map(Number))].sort((a, b) => a - b);
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
};

export const getActiveBatches = (tx, productIds) =>
  tx.stockBatch.findMany({
    where: { productId: { in: productIds }, remainingQuantity: { gt: QTY_EPSILON } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

export const assertQuantityAllowed = (product, qty) => {
  if (product.unit && product.unit.allowDecimal === false && Math.abs(qty - Math.round(qty)) > QTY_EPSILON) {
    throw badRequest(
      `"${product.name}" is sold in whole ${product.unit.name || "units"} only — ${qty} is not allowed`
    );
  }
};

/**
 * Plans (does not write) how `quantity` of a product is taken from its lots.
 * `batches` is a mutable working copy so several lines of one bill share it.
 * Returns [{ batchId, quantity, costPrice, sellingPrice }].
 */
export const planConsumption = ({ product, batches, quantity, preferredBatchId = null, unbatchedAvailable = { value: 0 } }) => {
  let remaining = round3(quantity);
  const allocations = [];

  const take = (batch) => {
    if (remaining <= QTY_EPSILON || batch.remainingQuantity <= QTY_EPSILON) return;
    const qty = round3(Math.min(batch.remainingQuantity, remaining));
    batch.remainingQuantity = round3(batch.remainingQuantity - qty);
    remaining = round3(remaining - qty);
    allocations.push({
      batchId: batch.id,
      quantity: qty,
      costPrice: batch.costPrice || product.costPrice || 0,
      sellingPrice: batch.sellingPrice > 0 ? batch.sellingPrice : product.salePrice || 0,
    });
  };

  if (preferredBatchId) {
    const preferred = batches.find((b) => b.id === preferredBatchId && b.productId === product.id);
    if (preferred) take(preferred);
  }
  for (const batch of batches) {
    if (batch.productId === product.id) take(batch);
  }

  if (remaining > QTY_EPSILON) {
    if (remaining - unbatchedAvailable.value > QTY_EPSILON) {
      throw badRequest(`Insufficient stock for "${product.name}"`);
    }
    unbatchedAvailable.value = round3(unbatchedAvailable.value - remaining);
    allocations.push({
      batchId: null,
      quantity: remaining,
      costPrice: product.costPrice || 0,
      sellingPrice: product.salePrice || 0,
    });
  }

  return allocations;
};

/** Applies planned allocations to the batch rows. */
export const applyBatchDeductions = async (tx, allocations) => {
  const byBatch = new Map();
  for (const a of allocations) {
    if (!a.batchId) continue;
    byBatch.set(a.batchId, round3((byBatch.get(a.batchId) || 0) + a.quantity));
  }
  for (const [batchId, qty] of byBatch) {
    await tx.stockBatch.update({
      where: { id: batchId },
      data: { remainingQuantity: { decrement: qty } },
    });
  }
};

/**
 * Removes stock from one product (FIFO, optionally starting at a specific lot).
 * Used by negative adjustments and by reversing a return. Returns the allocations.
 */
export const removeStock = async (tx, { productId, quantity, preferredBatchId = null, lock = true }) => {
  if (lock) await lockProducts(tx, [productId]);
  const product = await tx.product.findUnique({ where: { id: productId }, include: { unit: true } });
  if (!product) throw notFound("Product not found");

  const qty = round3(quantity);
  if (product.stockQuantity + QTY_EPSILON < qty) {
    throw badRequest(
      `Only ${round3(Math.max(0, product.stockQuantity))} ${product.unit?.symbol || ""} of "${product.name}" is in stock — cannot remove ${qty}`
    );
  }

  const batches = await getActiveBatches(tx, [productId]);
  const batchTotal = batches.reduce((s, b) => s + b.remainingQuantity, 0);
  const unbatched = { value: Math.max(0, round3(product.stockQuantity - batchTotal)) };
  const allocations = planConsumption({ product, batches, quantity: qty, preferredBatchId, unbatchedAvailable: unbatched });

  await applyBatchDeductions(tx, allocations);
  const updated = await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: round3(Math.max(0, product.stockQuantity - qty)) },
  });
  await notifyLowStockIfCrossed(tx, product, product.stockQuantity, updated.stockQuantity);
  return allocations;
};

/**
 * Puts stock back into a lot (returns, voids). If the original lot no longer exists,
 * a new lot is created at the original cost so valuation stays correct.
 */
export const restoreStock = async (tx, { productId, batchId, quantity, costPrice, sellingPrice }) => {
  const qty = round3(quantity);
  let restoredBatchId = null;

  if (batchId) {
    const batch = await tx.stockBatch.findUnique({ where: { id: batchId } });
    if (batch && batch.productId === productId) {
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          remainingQuantity: { increment: qty },
          ...(batch.remainingQuantity + qty > batch.initialQuantity
            ? { initialQuantity: round3(batch.remainingQuantity + qty) }
            : {}),
        },
      });
      restoredBatchId = batch.id;
    }
  }

  if (!restoredBatchId) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    const batch = await tx.stockBatch.create({
      data: {
        productId,
        initialQuantity: qty,
        remainingQuantity: qty,
        costPrice: costPrice ?? product?.costPrice ?? 0,
        sellingPrice: sellingPrice ?? product?.salePrice ?? 0,
      },
    });
    restoredBatchId = batch.id;
  }

  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: { increment: qty } },
  });

  return restoredBatchId;
};

/**
 * Creates a low-stock notification only when stock crosses the threshold
 * (avoids one alert per sale while stock stays low).
 */
export const notifyLowStockIfCrossed = async (tx, product, before, after) => {
  const threshold = product.lowStockAlert ?? 0;
  if (!(before > threshold && after <= threshold)) return;
  const unit = product.unit?.symbol || product.unit?.name || "";
  await tx.notification.create({
    data: {
      type: after <= QTY_EPSILON ? "OUT_OF_STOCK" : "LOW_STOCK",
      title: `${after <= QTY_EPSILON ? "Out of Stock" : "Low Stock Alert"}: ${product.name}`,
      message: `Current stock of ${product.name} is ${round3(after)} ${unit}. Low stock threshold is ${threshold}.`,
      metadata: { productId: product.id, currentStock: round3(after), threshold },
    },
  });
};

/** Weighted cost of the lots that remain — used for stock valuation. */
export const valuationOf = (product, batches) => {
  const qty = Math.max(0, product.stockQuantity || 0);
  let remainingQty = qty;
  let value = 0;
  for (const b of batches) {
    const q = Math.min(b.remainingQuantity, remainingQty);
    value += q * (b.costPrice || product.costPrice || 0);
    remainingQty -= q;
    if (remainingQty <= QTY_EPSILON) break;
  }
  if (remainingQty > QTY_EPSILON) value += remainingQty * (product.costPrice || 0);
  return round2(value);
};
