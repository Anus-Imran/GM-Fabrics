import { prisma } from "../config/prisma.js";

export const getAllStockEntries = async (filters = {}) => {
  const where = {};
  if (filters.productId) where.productId = parseInt(filters.productId, 10);
  if (filters.supplierId) where.supplierId = parseInt(filters.supplierId, 10);

  return prisma.stockEntry.findMany({
    where,
    include: {
      product: {
        include: { unit: true, category: true, brand: true },
      },
      supplier: true,
    },
    orderBy: { purchasedAt: "desc" },
  });
};

export const getStockEntryById = async (id) => {
  const entryId = parseInt(id, 10);
  const entry = await prisma.stockEntry.findUnique({
    where: { id: entryId },
    include: {
      product: {
        include: { unit: true, category: true, brand: true },
      },
      supplier: true,
    },
  });
  if (!entry) throw new Error("Stock entry not found");
  return entry;
};

export const createStockEntry = async (data) => {
  const { productId, supplierId, quantity, costPerUnit, notes, purchasedAt } = data;

  const prodId = parseInt(productId, 10);
  const qty = parseFloat(quantity);
  const costUnit = parseFloat(costPerUnit);
  const totalCost = qty * costUnit;

  if (qty <= 0) throw new Error("Quantity must be greater than zero");
  if (costUnit < 0) throw new Error("Cost per unit cannot be negative");

  return prisma.$transaction(async (tx) => {
    // 1. Fetch existing product
    const product = await tx.product.findUnique({
      where: { id: prodId },
    });

    if (!product) throw new Error("Product not found");

    const previousCostPerUnit = product.costPrice || 0;
    const priceDiff = costUnit - previousCostPerUnit;

    // 2. Create StockEntry
    const stockEntry = await tx.stockEntry.create({
      data: {
        productId: prodId,
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        quantity: qty,
        costPerUnit: costUnit,
        totalCost,
        previousCostPerUnit,
        priceDiff,
        notes: notes || null,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date(),
      },
      include: {
        product: { include: { unit: true, category: true, brand: true } },
        supplier: true,
      },
    });

    // 3. Update Product stock & latest cost price
    await tx.product.update({
      where: { id: prodId },
      data: {
        stockQuantity: product.stockQuantity + qty,
        costPrice: costUnit,
        supplierId: supplierId ? parseInt(supplierId, 10) : product.supplierId,
      },
    });

    return stockEntry;
  });
};
