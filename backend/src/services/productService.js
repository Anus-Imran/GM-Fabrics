import { prisma } from "../config/prisma.js";

export const getAllProducts = async (filters = {}) => {
  const where = { isActive: true };

  if (filters.categoryId) where.categoryId = parseInt(filters.categoryId, 10);
  if (filters.brandId) where.brandId = parseInt(filters.brandId, 10);
  if (filters.unitId) where.unitId = parseInt(filters.unitId, 10);
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.lowStock === "true") {
    // Return products where stockQuantity <= lowStockAlert
    where.stockQuantity = { lte: prisma.product.fields.lowStockAlert };
  }

  return prisma.product.findMany({
    where,
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
      stockBatches: {
        where: { remainingQuantity: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getLowStockProducts = async () => {
  // Execute query using raw condition or filter
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true, brand: true, unit: true, supplier: true },
  });

  return products.filter((p) => p.stockQuantity <= p.lowStockAlert);
};

export const getProductById = async (id) => {
  const productId = parseInt(id, 10);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
      stockEntries: {
        take: 10,
        orderBy: { purchasedAt: "desc" },
        include: { supplier: true },
      },
      stockBatches: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!product) throw new Error("Product not found");
  return product;
};

export const searchProducts = async (query) => {
  if (!query) return [];
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { barcode: { equals: query } },
        { sku: { equals: query } },
      ],
    },
    include: {
      category: true,
      brand: true,
      unit: true,
      stockBatches: {
        where: { remainingQuantity: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      },
    },
    take: 20,
  });
};

export const createProduct = async (data) => {
  const {
    name,
    sku,
    barcode,
    description,
    categoryId,
    brandId,
    unitId,
    supplierId,
    costPrice,
    salePrice,
    stockQuantity,
    lowStockAlert,
  } = data;

  if (sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) throw new Error("SKU already exists");
  }

  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
    if (existingBarcode) throw new Error("Barcode already exists");
  }

  const initialStock = parseFloat(stockQuantity || 0);
  const cost = parseFloat(costPrice || 0);
  const selling = parseFloat(salePrice || 0);

  const recordDate = data.createdAt || data.entryDate ? new Date(data.createdAt || data.entryDate) : new Date();

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        categoryId: parseInt(categoryId, 10),
        brandId: brandId ? parseInt(brandId, 10) : null,
        unitId: parseInt(unitId, 10),
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        costPrice: cost,
        salePrice: selling,
        stockQuantity: initialStock,
        lowStockAlert: parseFloat(lowStockAlert || 10),
        createdAt: recordDate,
      },
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
        stockBatches: true,
      },
    });

    if (initialStock > 0) {
      await tx.stockBatch.create({
        data: {
          productId: product.id,
          initialQuantity: initialStock,
          remainingQuantity: initialStock,
          costPrice: cost,
          sellingPrice: selling,
          createdAt: recordDate,
        },
      });
    }

    return product;
  });
};

export const updateProduct = async (id, data) => {
  const productId = parseInt(id, 10);
  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.barcode !== undefined) updateData.barcode = data.barcode;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.categoryId !== undefined) updateData.categoryId = parseInt(data.categoryId, 10);
  if (data.brandId !== undefined) updateData.brandId = data.brandId ? parseInt(data.brandId, 10) : null;
  if (data.unitId !== undefined) updateData.unitId = parseInt(data.unitId, 10);
  if (data.supplierId !== undefined) updateData.supplierId = data.supplierId ? parseInt(data.supplierId, 10) : null;
  if (data.costPrice !== undefined) updateData.costPrice = parseFloat(data.costPrice);
  if (data.salePrice !== undefined) updateData.salePrice = parseFloat(data.salePrice);
  if (data.stockQuantity !== undefined) updateData.stockQuantity = parseFloat(data.stockQuantity);
  if (data.lowStockAlert !== undefined) updateData.lowStockAlert = parseFloat(data.lowStockAlert);

  return prisma.$transaction(async (tx) => {
    // 1. Fetch current product and all associated stock batches
    const currentProduct = await tx.product.findUnique({
      where: { id: productId },
      include: {
        stockBatches: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!currentProduct) throw new Error("Product not found");

    // 2. Update Product record
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        brand: true,
        unit: true,
        supplier: true,
      },
    });

    // 3. Synchronize StockBatch records to prevent inventory and valuation drift
    const newQty = updateData.stockQuantity !== undefined ? updateData.stockQuantity : currentProduct.stockQuantity;
    const newCost = updateData.costPrice !== undefined ? updateData.costPrice : (currentProduct.costPrice || 0);
    const newSale = updateData.salePrice !== undefined ? updateData.salePrice : (currentProduct.salePrice || 0);

    const batches = currentProduct.stockBatches || [];
    const currentBatchSum = batches.reduce((sum, b) => sum + (b.remainingQuantity || 0), 0);

    if (updateData.stockQuantity !== undefined) {
      const diff = newQty - currentBatchSum;

      if (batches.length === 0) {
        if (newQty > 0) {
          await tx.stockBatch.create({
            data: {
              productId,
              initialQuantity: newQty,
              remainingQuantity: newQty,
              costPrice: newCost,
              sellingPrice: newSale,
            },
          });
        }
      } else if (batches.length === 1) {
        // Single batch (direct creation lot)
        const singleBatch = batches[0];
        const newRemaining = Math.max(0, newQty);
        await tx.stockBatch.update({
          where: { id: singleBatch.id },
          data: {
            remainingQuantity: newRemaining,
            initialQuantity: Math.max(singleBatch.initialQuantity, newRemaining),
            ...(updateData.costPrice !== undefined ? { costPrice: newCost } : {}),
            ...(updateData.salePrice !== undefined ? { sellingPrice: newSale } : {}),
          },
        });
      } else {
        // Multiple lots exist
        if (diff < 0) {
          let toDeduct = Math.abs(diff);
          for (const batch of batches) {
            if (toDeduct <= 0) break;
            if ((batch.remainingQuantity || 0) <= 0) continue;
            const take = Math.min(batch.remainingQuantity, toDeduct);
            await tx.stockBatch.update({
              where: { id: batch.id },
              data: { remainingQuantity: batch.remainingQuantity - take },
            });
            toDeduct -= take;
          }
        } else if (diff > 0) {
          const latestBatch = batches[0];
          await tx.stockBatch.update({
            where: { id: latestBatch.id },
            data: {
              initialQuantity: latestBatch.initialQuantity + diff,
              remainingQuantity: latestBatch.remainingQuantity + diff,
            },
          });
        }

        // Synchronize costPrice on initial batch if updated
        if (updateData.costPrice !== undefined) {
          const initialBatch = batches.find((b) => !b.stockEntryId);
          if (initialBatch) {
            await tx.stockBatch.update({
              where: { id: initialBatch.id },
              data: { costPrice: newCost },
            });
          }
        }
      }
    } else {
      // Stock quantity was not changed, but cost or sale price might have changed
      if (batches.length === 1 && (updateData.costPrice !== undefined || updateData.salePrice !== undefined)) {
        await tx.stockBatch.update({
          where: { id: batches[0].id },
          data: {
            ...(updateData.costPrice !== undefined ? { costPrice: newCost } : {}),
            ...(updateData.salePrice !== undefined ? { sellingPrice: newSale } : {}),
          },
        });
      } else if (batches.length > 1 && updateData.costPrice !== undefined) {
        const initialBatch = batches.find((b) => !b.stockEntryId);
        if (initialBatch) {
          await tx.stockBatch.update({
            where: { id: initialBatch.id },
            data: { costPrice: newCost },
          });
        }
      }
    }

    // Attach active stockBatches to returned object
    const finalBatches = await tx.stockBatch.findMany({
      where: { productId, remainingQuantity: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    });
    updatedProduct.stockBatches = finalBatches;

    return updatedProduct;
  });
};

export const deleteProduct = async (id) => {
  const productId = parseInt(id, 10);
  // Soft delete
  return prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });
};

export const getProductPriceHistory = async (id) => {
  const productId = parseInt(id, 10);
  return prisma.stockEntry.findMany({
    where: { productId },
    include: { supplier: true },
    orderBy: { purchasedAt: "desc" },
  });
};
