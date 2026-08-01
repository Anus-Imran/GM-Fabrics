import { prisma } from "../config/prisma.js";
import { generateReceiptHtml } from "../utils/receiptUtil.js";

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

    // Calculate effective discount ratio (if sale had a overall discount applied)
    const discountRatio = sale.subtotal > 0 ? sale.totalAmount / sale.subtotal : 1;

    for (const item of items) {
      const saleItemId = parseInt(item.saleItemId, 10);
      const returnQty = parseFloat(item.quantity);
      const condition = item.condition === "DAMAGED_WASTE" ? "DAMAGED_WASTE" : "RESTOCK";

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

      // Round refund price to integer PKR based on actual effective discounted unit price paid
      const effectiveUnitPrice = saleItem.unitPrice * discountRatio;
      const itemRefundAmount = Math.round(returnQty * effectiveUnitPrice);
      totalRefund += itemRefundAmount;

      preparedReturnItems.push({
        saleItemId,
        productId: saleItem.productId,
        quantity: returnQty,
        refundAmount: itemRefundAmount,
        condition,
      });
    }

    // Determine final refund method (If sale was CREDIT, force or default to CREDIT to protect Khata ledger)
    const finalRefundMethod = (sale.paymentMethod === "CREDIT" && sale.customerId) ? "CREDIT" : (refundMethod || sale.paymentMethod);

    // 2. Create Return record
    const returnRecord = await tx.return.create({
      data: {
        saleId: sId,
        reason: reason || null,
        refundAmount: Math.round(totalRefund),
        refundMethod: finalRefundMethod,
      },
    });

    // 3. Create ReturnItems & Restock Inventory (ONLY if condition === "RESTOCK")
    for (const item of preparedReturnItems) {
      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          saleItemId: item.saleItemId,
          productId: item.productId,
          quantity: item.quantity,
          refundAmount: item.refundAmount,
          condition: item.condition,
        },
      });

      // Increment product stock ONLY for RESTOCK condition (Damaged/Waste is written off without inflating stock)
      if (item.condition === "RESTOCK") {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
          },
        });

        // Increment remainingQuantity on the latest batch for this product
        const latestBatch = await tx.stockBatch.findFirst({
          where: { productId: item.productId },
          orderBy: { createdAt: "desc" },
        });

        if (latestBatch) {
          await tx.stockBatch.update({
            where: { id: latestBatch.id },
            data: {
              remainingQuantity: { increment: item.quantity },
            },
          });
        }
      }
    }

    // 4. Update Customer Khata balance if refund is CREDIT or sale was CREDIT
    if ((finalRefundMethod === "CREDIT" || sale.paymentMethod === "CREDIT") && sale.customerId) {
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

    // 6. Regenerate and update thermal Receipt HTML with returns information
    const updatedSaleForReceipt = await tx.sale.findUnique({
      where: { id: sId },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        saleItems: { include: { product: { include: { unit: true } } } },
        returns: { include: { returnItems: true } },
      },
    });
    const newReceiptHtml = generateReceiptHtml(updatedSaleForReceipt);
    await tx.receipt.update({
      where: { saleId: sId },
      data: { receiptHtml: newReceiptHtml },
    });

    return tx.return.findUnique({
      where: { id: returnRecord.id },
      include: {
        returnItems: {
          include: { product: { include: { unit: true } } },
        },
        sale: { select: { saleNumber: true, createdAt: true, customer: true } },
      },
    });
  }, {
    maxWait: 10000,
    timeout: 30000,
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

export const getAllReturns = async () => {
  return prisma.return.findMany({
    include: {
      returnItems: {
        include: {
          product: { include: { unit: true } },
          saleItem: true,
        },
      },
      sale: {
        include: { customer: true, user: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteReturn = async (id) => {
  const returnId = parseInt(id, 10);
  if (isNaN(returnId)) throw new Error("Invalid Return ID");

  return prisma.$transaction(async (tx) => {
    // 1. Fetch return record with return items and original sale
    const returnRecord = await tx.return.findUnique({
      where: { id: returnId },
      include: {
        returnItems: true,
        sale: true,
      },
    });

    if (!returnRecord) {
      throw new Error("Return record not found");
    }

    // 2. Reverse inventory restock: decrement product stock ONLY if item was originally RESTOCKED
    for (const item of returnRecord.returnItems) {
      if (item.condition === "RESTOCK") {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }
    }

    // 3. Revert Customer Khata balance if refund was CREDIT or sale was CREDIT
    if ((returnRecord.refundMethod === "CREDIT" || returnRecord.sale.paymentMethod === "CREDIT") && returnRecord.sale.customerId) {
      await tx.customer.update({
        where: { id: returnRecord.sale.customerId },
        data: {
          outstandingBalance: { increment: returnRecord.refundAmount },
        },
      });
    }

    // 4. Delete the return record (returnItems are deleted via onDelete: Cascade)
    await tx.return.delete({
      where: { id: returnId },
    });

    // 5. Recalculate original Sale status
    const remainingReturns = await tx.return.findMany({
      where: { saleId: returnRecord.saleId },
    });
    const cumulativeRefund = remainingReturns.reduce((sum, r) => sum + r.refundAmount, 0);

    let newStatus = "COMPLETED";
    if (cumulativeRefund >= returnRecord.sale.totalAmount) {
      newStatus = "REFUNDED";
    } else if (cumulativeRefund > 0) {
      newStatus = "PARTIALLY_REFUNDED";
    }

    await tx.sale.update({
      where: { id: returnRecord.saleId },
      data: { status: newStatus },
    });

    // 6. Regenerate updated thermal Receipt HTML
    const updatedSaleForReceipt = await tx.sale.findUnique({
      where: { id: returnRecord.saleId },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        saleItems: { include: { product: { include: { unit: true } } } },
        returns: { include: { returnItems: true } },
      },
    });
    const newReceiptHtml = generateReceiptHtml(updatedSaleForReceipt);
    await tx.receipt.update({
      where: { saleId: returnRecord.saleId },
      data: { receiptHtml: newReceiptHtml },
    });

    return { id: returnId };
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
};


