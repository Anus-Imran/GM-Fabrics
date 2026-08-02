import { prisma } from "../config/prisma.js";
import { generateSaleNumber } from "../utils/saleNumberUtil.js";
import { generateReceiptHtml } from "../utils/receiptUtil.js";

export const getAllSales = async (filters = {}) => {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.customerId) where.customerId = parseInt(filters.customerId, 10);
  if (filters.userId) where.userId = parseInt(filters.userId, 10);

  if (filters.from && filters.to) {
    where.createdAt = {
      gte: new Date(filters.from),
      lte: new Date(filters.to),
    };
  }

  return prisma.sale.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true, role: true } },
      saleItems: {
        include: {
          product: { select: { id: true, name: true, unit: true } },
        },
      },
      receipt: true,
      returns: {
        include: { returnItems: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getSaleById = async (idOrNumber) => {
  const term = String(idOrNumber).trim();
  const numericId = parseInt(term, 10);
  const isNumeric = !isNaN(numericId) && String(numericId) === term;

  const sale = await prisma.sale.findFirst({
    where: isNumeric
      ? { OR: [{ id: numericId }, { saleNumber: { equals: term, mode: "insensitive" } }] }
      : { saleNumber: { equals: term, mode: "insensitive" } },
    include: {
      customer: true,
      user: { select: { id: true, name: true, email: true } },
      saleItems: {
        include: {
          product: { include: { unit: true, category: true, brand: true } },
        },
      },
      receipt: true,
      returns: {
        include: { returnItems: true },
      },
    },
  });

  if (!sale) throw new Error(`Sale bill "${term}" not found`);
  return sale;
};

export const createSale = async (userId, data) => {
  const {
    customerId,
    items, // array of { productId, quantity, unitPrice }
    discountType, // "PERCENTAGE" | "FLAT" | null
    discountValue, // number
    paymentMethod, // "CASH" | "CARD" | "CREDIT"
    amountPaid, // number
    notes,
  } = data;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  const custId = customerId ? parseInt(customerId, 10) : null;
  const payMethod = paymentMethod || "CASH";

  if (payMethod === "CREDIT" && !custId) {
    throw new Error("Customer selection is required for CREDIT (Khata) payment");
  }

  return prisma.$transaction(
    async (tx) => {
      // 1. Calculate line item subtotals and check stock
      let subtotal = 0;
      const preparedItems = [];

      for (const item of items) {
        const prodId = parseInt(item.productId, 10);
        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.unitPrice);

        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for product ID ${prodId}`);
        }

        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: { unit: true },
        });

        if (!product || !product.isActive) {
          throw new Error(`Product ID ${prodId} not found or inactive`);
        }

        if (product.stockQuantity < qty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity} ${product.unit.name}, requested: ${qty}`
          );
        }

        const itemSubtotal = qty * price;
        subtotal += itemSubtotal;

        preparedItems.push({
          productId: prodId,
          batchId: item.batchId ? parseInt(item.batchId, 10) : null,
          quantity: qty,
          unitPrice: price,
          subtotal: itemSubtotal,
          product,
        });
      }

      // 2. Calculate discounts
      let discVal = parseFloat(discountValue || 0);
      let discountAmount = 0;

      if (discountType === "PERCENTAGE" && discVal > 0) {
        discountAmount = (subtotal * discVal) / 100;
      } else if (discountType === "FLAT" && discVal > 0) {
        discountAmount = Math.min(discVal, subtotal);
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

      let amtPaid = parseFloat(amountPaid || 0);
      if (payMethod === "CREDIT") {
        amtPaid = 0; // Credit sale
      }

      const changeAmount = Math.max(0, amtPaid - totalAmount);

      // 3. Generate Sale Number
      const saleNumber = await generateSaleNumber();

      // 4. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: custId,
          userId,
          subtotal,
          discountType: discountType || null,
          discountValue: discVal,
          discountAmount,
          totalAmount,
          paymentMethod: payMethod,
          amountPaid: amtPaid,
          changeAmount,
          status: "COMPLETED",
          notes: notes || null,
        },
      });

      // 5. Create SaleItems, Deduct Stock using FIFO, and Update Product Stock
      for (const item of preparedItems) {
        if (item.batchId) {
          // Direct deduction from specified StockBatch
          const batch = await tx.stockBatch.findUnique({
            where: { id: item.batchId },
          });

          if (batch && batch.remainingQuantity > 0) {
            const take = Math.min(batch.remainingQuantity, item.quantity);
            const batchCost = batch.costPrice || item.product.costPrice || 0;

            await tx.stockBatch.update({
              where: { id: batch.id },
              data: { remainingQuantity: batch.remainingQuantity - take },
            });

            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                productId: item.productId,
                batchId: batch.id,
                quantity: take,
                costPrice: batchCost,
                unitPrice: item.unitPrice,
                subtotal: take * item.unitPrice,
              },
            });
          } else {
            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                productId: item.productId,
                quantity: item.quantity,
                costPrice: item.product.costPrice || 0,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              },
            });
          }
        } else {
          // Deduct quantity from oldest active stock batches (FIFO) & record exact batch sale items
          const batches = await tx.stockBatch.findMany({
            where: {
              productId: item.productId,
              remainingQuantity: { gt: 0 },
            },
            orderBy: { createdAt: "asc" },
          });

          let remainingToDeduct = item.quantity;

          if (batches.length > 0) {
            for (const batch of batches) {
              if (remainingToDeduct <= 0) break;

              const takeFromThisBatch = Math.min(batch.remainingQuantity, remainingToDeduct);
              const batchCost = batch.costPrice || item.product.costPrice || 0;
              const batchSelling = batch.sellingPrice > 0 ? batch.sellingPrice : item.unitPrice;

              await tx.stockBatch.update({
                where: { id: batch.id },
                data: {
                  remainingQuantity: batch.remainingQuantity - takeFromThisBatch,
                },
              });

              await tx.saleItem.create({
                data: {
                  saleId: sale.id,
                  productId: item.productId,
                  batchId: batch.id,
                  quantity: takeFromThisBatch,
                  costPrice: batchCost,
                  unitPrice: batchSelling,
                  subtotal: takeFromThisBatch * batchSelling,
                },
              });

              remainingToDeduct -= takeFromThisBatch;
            }
          }

          if (remainingToDeduct > 0) {
            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                productId: item.productId,
                quantity: remainingToDeduct,
                costPrice: item.product.costPrice || 0,
                unitPrice: item.unitPrice,
                subtotal: remainingToDeduct * item.unitPrice,
              },
            });
          }
        }

        // Sync product main stockQuantity with active batch total
        const batchSum = await tx.stockBatch.aggregate({
          where: { productId: item.productId },
          _sum: { remainingQuantity: true },
        });
        const currentStock = batchSum._sum.remainingQuantity ?? 0;

        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: currentStock },
        });

        // Check low stock alert trigger
        if (currentStock <= updatedProduct.lowStockAlert) {
          await tx.notification.create({
            data: {
              type: "LOW_STOCK",
              title: `Low Stock Alert: ${item.product.name}`,
              message: `Current stock of ${item.product.name} is ${currentStock} ${item.product.unit?.symbol || item.product.unit?.name || "pcs"}. Low stock threshold is ${updatedProduct.lowStockAlert}.`,
              metadata: {
                productId: item.productId,
                currentStock,
                threshold: updatedProduct.lowStockAlert,
              },
            },
          });
        }
      }

      // 6. Update Customer Khata balance if CREDIT sale
      if (payMethod === "CREDIT" && custId) {
        const customer = await tx.customer.findUnique({ where: { id: custId } });
        if (customer) {
          await tx.customer.update({
            where: { id: custId },
            data: {
              outstandingBalance: customer.outstandingBalance + totalAmount,
            },
          });
        }
      }

      // 7. Fetch full sale with relations to generate Receipt
      const fullSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          saleItems: {
            include: {
              product: { include: { unit: true } },
            },
          },
        },
      });

      const receiptHtml = generateReceiptHtml(fullSale);

      await tx.receipt.create({
        data: {
          saleId: sale.id,
          receiptHtml,
        },
      });

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          saleItems: {
            include: { product: { include: { unit: true } } },
          },
          receipt: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );
};

export const updateSaleStatus = async (id, status) => {
  const saleId = parseInt(id, 10);
  return prisma.sale.update({
    where: { id: saleId },
    data: { status },
  });
};
