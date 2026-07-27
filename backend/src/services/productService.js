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

  return prisma.product.create({
    data: {
      name,
      sku: sku || null,
      barcode: barcode || null,
      description: description || null,
      categoryId: parseInt(categoryId, 10),
      brandId: brandId ? parseInt(brandId, 10) : null,
      unitId: parseInt(unitId, 10),
      supplierId: supplierId ? parseInt(supplierId, 10) : null,
      costPrice: parseFloat(costPrice || 0),
      salePrice: parseFloat(salePrice || 0),
      stockQuantity: parseFloat(stockQuantity || 0),
      lowStockAlert: parseFloat(lowStockAlert || 10),
    },
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
    },
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

  return prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
    },
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
