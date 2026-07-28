import { prisma } from "../config/prisma.js";

export const createReturn = async (data) => {
  const { saleId, items, reason, refundMethod } = data;
  const sId = parseInt(saleId, 10);

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Return must include at least one item");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch sale
    const sale = await tx.sale.findUnique({
      where: { id: sId },
      include: { saleItems: true, customer: true },
    });

    if (!sale) throw new Error("Original sale not found");

    let totalRefund = 0;
    const preparedReturnItems = [];

    for (const item of items) {
      const saleItemId = parseInt(item.saleItemId, 10);
      const returnQty = parseFloat(item.quantity);

      const saleItem = sale.saleItems.find((si) => si.id === saleItemId);
      if (!saleItem) throw new Error(`Sale item ID ${saleItemId} not found in this sale`);

      // Fetch previous return items to calculate already returned quantity
      const previousReturns = await tx.returnItem.findMany({
        where: { saleItemId: saleItem.id },
      });
      const alreadyReturnedQty = previousReturns.reduce((sum, ri) => sum + ri.quantity, 0);
      const remainingReturnable = saleItem.quantity - alreadyReturnedQty;

      if (remainingReturnable <= 0) {
        throw new Error(`This sale item has already been fully returned.`);
      }

      if (returnQty <= 0 || returnQty > remainingReturnable) {
        throw new Error(
          `Cannot return ${returnQty} units. Maximum remaining returnable quantity for this item is ${remainingReturnable}`
        );
      }

      // Round refund price to integer PKR
      const itemRefundAmount = Math.round(returnQty * saleItem.unitPrice);
      totalRefund += itemRefundAmount;

      preparedReturnItems.push({
        saleItemId,
        productId: saleItem.productId,
        quantity: returnQty,
        refundAmount: itemRefundAmount,
      });
    }

    // 2. Create Return record
    const returnRecord = await tx.return.create({
      data: {
        saleId: sId,
        reason: reason || null,
        refundAmount: Math.round(totalRefund),
        refundMethod: refundMethod || sale.paymentMethod,
      },
    });

    // 3. Create ReturnItems & Restock Inventory
    for (const item of preparedReturnItems) {
      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          saleItemId: item.saleItemId,
          productId: item.productId,
          quantity: item.quantity,
          refundAmount: item.refundAmount,
        },
      });

      // Increment product stock (restock)
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { increment: item.quantity },
        },
      });
    }

    // 4. Update Customer Khata balance if sale was CREDIT
    if (sale.paymentMethod === "CREDIT" && sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          outstandingBalance: { decrement: totalRefund },
        },
      });
    }

    // 5. Update Sale status
    const allReturns = await tx.return.findMany({ where: { saleId: sId } });
    const cumulativeRefund = allReturns.reduce((sum, r) => sum + r.refundAmount, 0);

    const newStatus = cumulativeRefund >= sale.totalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx.sale.update({
      where: { id: sId },
      data: { status: newStatus },
    });

    return tx.return.findUnique({
      where: { id: returnRecord.id },
      include: {
        returnItems: {
          include: { product: { include: { unit: true } } },
        },
        sale: { select: { saleNumber: true, createdAt: true } },
      },
    });
  });
};

export const getReturnById = async (id) => {
  const returnId = parseInt(id, 10);
  const ret = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      returnItems: {
        include: { product: true },
      },
      sale: {
        include: { customer: true, user: { select: { name: true } } },
      },
    },
  });

  if (!ret) throw new Error("Return record not found");
  return ret;
};

export const getReturnsBySaleId = async (saleId) => {
  const sId = parseInt(saleId, 10);
  return prisma.return.findMany({
    where: { saleId: sId },
    include: {
      returnItems: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};
