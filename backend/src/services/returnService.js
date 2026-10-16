import { prisma } from "../config/prisma.js";
import { badRequest, notFound, forbidden } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";
import { resolveRange } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { envConfig } from "../config/envConfig.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import { lockProducts, restoreStock, removeStock } from "./inventoryService.js";
import { postKhataEntry } from "./khataService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

const statusFor = (cumulativeRefund, totalAmount, allItemsReturned) => {
  if (cumulativeRefund <= 0.004 && !allItemsReturned) return "COMPLETED";
  if (allItemsReturned || cumulativeRefund + 0.004 >= totalAmount) return "REFUNDED";
  return "PARTIALLY_REFUNDED";
};

export const createReturn = async (user, data) => {
  const returnId = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: data.saleId },
      include: {
        saleItems: { include: { product: { select: { name: true } }, returnItems: { select: { quantity: true } } } },
        returns: { select: { refundAmount: true } },
      },
    });

    if (!sale) throw notFound("Original sale not found");
    if (sale.status === "VOIDED") throw badRequest("This sale was voided and cannot be returned");

    // Return window (receipt promises 7 days). Admin may override.
    const ageDays = (Date.now() - new Date(sale.createdAt).getTime()) / 86400000;
    if (envConfig.returnWindowDays > 0 && ageDays > envConfig.returnWindowDays) {
      if (!(isAdmin(user) && data.overrideWindow)) {
        throw forbidden(
          `This bill is ${Math.floor(ageDays)} days old. Returns are allowed within ${envConfig.returnWindowDays} days${
            isAdmin(user) ? " — tick \"override return window\" to continue." : ". Ask an admin to approve."
          }`
        );
      }
    }

    // Merge duplicate lines for the same sale item.
    const requested = new Map();
    for (const item of data.items) {
      const key = `${item.saleItemId}_${item.condition}`;
      const prev = requested.get(key);
      requested.set(key, prev ? { ...prev, quantity: round3(prev.quantity + item.quantity) } : { ...item });
    }

    const qtyBySaleItem = new Map();
    for (const item of requested.values()) {
      qtyBySaleItem.set(item.saleItemId, round3((qtyBySaleItem.get(item.saleItemId) || 0) + item.quantity));
    }

    for (const [saleItemId, qty] of qtyBySaleItem) {
      const saleItem = sale.saleItems.find((si) => si.id === saleItemId);
      if (!saleItem) throw badRequest(`Sale item ID ${saleItemId} not found in this sale`);
      const alreadyReturned = saleItem.returnItems.reduce((s, ri) => s + ri.quantity, 0);
      const returnable = round3(saleItem.quantity - alreadyReturned);
      if (returnable <= QTY_EPSILON) throw badRequest(`"${saleItem.product?.name}" has already been fully returned`);
      if (qty > returnable + QTY_EPSILON) {
        throw badRequest(
          `Cannot return ${qty} of "${saleItem.product?.name}". Maximum remaining returnable quantity is ${returnable}`
        );
      }
    }

    // Refund = price actually paid per unit (bill discount spread proportionally).
    const discountRatio = sale.subtotal > 0 ? sale.totalAmount / sale.subtotal : 1;
    const prevRefunds = round2(sale.returns.reduce((s, r) => s + r.refundAmount, 0));
    const maxRefundable = round2(Math.max(0, sale.totalAmount - prevRefunds));

    const prepared = [];
    let totalRefund = 0;
    for (const item of requested.values()) {
      const saleItem = sale.saleItems.find((si) => si.id === item.saleItemId);
      const refund = round2(item.quantity * saleItem.unitPrice * discountRatio);
      totalRefund = round2(totalRefund + refund);
      prepared.push({ ...item, saleItem, refundAmount: refund });
    }

    // When this return completes the bill, refund exactly what is left (no rounding remainder).
    const allItemsReturned = sale.saleItems.every((si) => {
      const already = si.returnItems.reduce((s, ri) => s + ri.quantity, 0);
      return si.quantity - already - (qtyBySaleItem.get(si.id) || 0) <= QTY_EPSILON;
    });
    if (allItemsReturned || totalRefund > maxRefundable) {
      const diff = round2((allItemsReturned ? maxRefundable : Math.min(totalRefund, maxRefundable)) - totalRefund);
      totalRefund = round2(totalRefund + diff);
      if (prepared.length > 0) prepared[prepared.length - 1].refundAmount = round2(prepared[prepared.length - 1].refundAmount + diff);
    }

    // Refund method: bills with a khata portion always refund to khata.
    let refundMethod = data.refundMethod || sale.paymentMethod;
    if (sale.creditAmount > 0 || sale.paymentMethod === "CREDIT") refundMethod = "CREDIT";
    if (refundMethod === "CREDIT" && !sale.customerId) {
      throw badRequest("A khata refund needs a customer on the bill. Choose CASH or CARD instead.");
    }

    const returnRecord = await tx.return.create({
      data: {
        saleId: sale.id,
        reason: data.reason || null,
        refundAmount: totalRefund,
        refundMethod,
        userId: user.id,
      },
    });

    const restockProducts = prepared.filter((p) => p.condition === "RESTOCK").map((p) => p.saleItem.productId);
    await lockProducts(tx, restockProducts);

    for (const item of prepared) {
      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          saleItemId: item.saleItemId,
          productId: item.saleItem.productId,
          quantity: item.quantity,
          refundAmount: item.refundAmount,
          condition: item.condition,
        },
      });

      // Damaged / waste is written off — it is not put back into sellable stock.
      if (item.condition === "RESTOCK") {
        await restoreStock(tx, {
          productId: item.saleItem.productId,
          batchId: item.saleItem.batchId,
          quantity: item.quantity,
          costPrice: item.saleItem.costPrice,
          sellingPrice: item.saleItem.listPrice || item.saleItem.unitPrice,
        });
      }
    }

    if (refundMethod === "CREDIT" && totalRefund > 0) {
      await postKhataEntry(tx, {
        customerId: sale.customerId,
        type: "RETURN",
        amount: -totalRefund,
        method: "CREDIT",
        saleId: sale.id,
        returnId: returnRecord.id,
        notes: `Return on bill ${sale.saleNumber}`,
        userId: user.id,
      });
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: { status: statusFor(round2(prevRefunds + totalRefund), sale.totalAmount, allItemsReturned) },
    });

    if (data.overrideWindow && isAdmin(user)) {
      await audit(tx, user, "RETURN_WINDOW_OVERRIDE", "Return", returnRecord.id, { saleNumber: sale.saleNumber });
    }

    return returnRecord.id;
  }, TX_OPTIONS);

  return getReturnById(returnId);
};

export const getReturnById = async (id) => {
  const ret = await prisma.return.findUnique({
    where: { id },
    include: {
      returnItems: { include: { product: { include: { unit: true } } } },
      sale: {
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          totalAmount: true,
          customer: true,
          user: { select: { name: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  });

  if (!ret) throw notFound("Return record not found");
  return ret;
};

export const getReturnsBySaleId = async (saleId) => {
  return prisma.return.findMany({
    where: { saleId },
    include: { returnItems: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllReturns = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = {};

  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.createdAt = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { sale: { saleNumber: { contains: filters.search, mode: "insensitive" } } },
      { sale: { customer: { name: { contains: filters.search, mode: "insensitive" } } } },
      { reason: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total, sums] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        returnItems: { include: { product: { include: { unit: true } } } },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            createdAt: true,
            totalAmount: true,
            paymentMethod: true,
            customer: { select: { id: true, name: true, phone: true } },
            user: { select: { name: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.return.count({ where }),
    prisma.return.aggregate({ where, _sum: { refundAmount: true } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { totalRefunded: round2(sums._sum.refundAmount || 0) },
  };
};

/** Deletes a return (admin) and reverses its effect on stock lots, khata and sale status. */
export const deleteReturn = async (user, id) => {
  return prisma.$transaction(async (tx) => {
    const returnRecord = await tx.return.findUnique({
      where: { id },
      include: { returnItems: { include: { saleItem: true } }, sale: true },
    });
    if (!returnRecord) throw notFound("Return record not found");

    const restocked = returnRecord.returnItems.filter((i) => i.condition === "RESTOCK");
    await lockProducts(tx, restocked.map((i) => i.productId));

    // Take the restocked quantity back out — preferring the lot it went back into.
    for (const item of restocked) {
      await removeStock(tx, {
        productId: item.productId,
        quantity: item.quantity,
        preferredBatchId: item.saleItem?.batchId || null,
        lock: false,
      });
    }

    if (returnRecord.refundMethod === "CREDIT" && returnRecord.sale.customerId && returnRecord.refundAmount > 0) {
      await postKhataEntry(tx, {
        customerId: returnRecord.sale.customerId,
        type: "ADJUSTMENT",
        amount: returnRecord.refundAmount,
        method: "CREDIT",
        saleId: returnRecord.saleId,
        notes: `Return #${returnRecord.id} on bill ${returnRecord.sale.saleNumber} deleted`,
        userId: user.id,
      });
    }

    await tx.return.delete({ where: { id } });

    const remaining = await tx.return.findMany({
      where: { saleId: returnRecord.saleId },
      include: { returnItems: true },
    });
    const cumulativeRefund = round2(remaining.reduce((s, r) => s + r.refundAmount, 0));
    const saleItems = await tx.saleItem.findMany({ where: { saleId: returnRecord.saleId } });
    const returnedBySaleItem = new Map();
    for (const r of remaining) {
      for (const ri of r.returnItems) {
        returnedBySaleItem.set(ri.saleItemId, (returnedBySaleItem.get(ri.saleItemId) || 0) + ri.quantity);
      }
    }
    const allReturned =
      remaining.length > 0 && saleItems.every((si) => si.quantity - (returnedBySaleItem.get(si.id) || 0) <= QTY_EPSILON);

    await tx.sale.update({
      where: { id: returnRecord.saleId },
      data: { status: statusFor(cumulativeRefund, returnRecord.sale.totalAmount, allReturned) },
    });

    await audit(tx, user, "RETURN_DELETED", "Return", id, {
      saleNumber: returnRecord.sale.saleNumber,
      refundAmount: returnRecord.refundAmount,
      refundMethod: returnRecord.refundMethod,
    });

    return { id };
  }, TX_OPTIONS);
};
