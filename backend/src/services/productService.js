import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2, round3, QTY_EPSILON } from "../utils/money.js";
import { parseLocalDateTime } from "../utils/time.js";
import { audit } from "../utils/audit.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import { applyAdjustment } from "./stockAdjustmentService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

const activeBatchesSelect = (admin) => ({
  where: { remainingQuantity: { gt: QTY_EPSILON } },
  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  select: {
    id: true,
    productId: true,
    remainingQuantity: true,
    initialQuantity: true,
    sellingPrice: true,
    createdAt: true,
    stockEntryId: true,
    ...(admin ? { costPrice: true } : {}),
  },
});

// Cashiers never receive purchase cost data.
const stripCost = (product, admin) => {
  if (admin || !product) return product;
  const { costPrice, ...rest } = product;
  return rest;
};

export const getAllProducts = async (filters = {}, user) => {
  const admin = isAdmin(user);
  const where = { isActive: true };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.brandId) where.brandId = filters.brandId;
  if (filters.unitId) where.unitId = filters.unitId;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.lowStock === "true") {
    where.stockQuantity = { lte: prisma.product.fields.lowStockAlert };
  }

  // POS view: only what the counter needs (smaller payload, faster query).
  if (filters.view === "pos") {
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        categoryId: true,
        salePrice: true,
        costPrice: admin,
        stockQuantity: true,
        lowStockAlert: true,
        isActive: true,
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true, allowDecimal: true } },
        stockBatches: activeBatchesSelect(admin),
      },
      orderBy: { name: "asc" },
    });
    return admin ? products : products.map((p) => stripCost(p, admin));
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: { select: { id: true, name: true } },
      stockBatches: activeBatchesSelect(admin),
    },
    orderBy: { name: "asc" },
  });
  return products.map((p) => stripCost(p, admin));
};

export const getLowStockProducts = async () => {
  return prisma.product.findMany({
    where: { isActive: true, stockQuantity: { lte: prisma.product.fields.lowStockAlert } },
    include: { category: true, brand: true, unit: true, supplier: { select: { id: true, name: true } } },
    orderBy: { stockQuantity: "asc" },
  });
};

export const getProductById = async (id, user) => {
  const admin = isAdmin(user);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
      stockEntries: admin
        ? { take: 10, orderBy: { purchasedAt: "desc" }, include: { supplier: true } }
        : false,
      stockBatches: activeBatchesSelect(admin),
    },
  });
  if (!product) throw notFound("Product not found");
  return stripCost(product, admin);
};

/** Exact barcode / SKU lookup for scanners. */
export const findByCode = async (code, user) => {
  const admin = isAdmin(user);
  const term = String(code || "").trim();
  if (!term) return null;
  return prisma.product
    .findFirst({
      where: { isActive: true, OR: [{ barcode: term }, { sku: { equals: term, mode: "insensitive" } }] },
      include: { category: true, brand: true, unit: true, stockBatches: activeBatchesSelect(admin) },
    })
    .then((p) => stripCost(p, admin));
};

export const searchProducts = async (query, user) => {
  const admin = isAdmin(user);
  const term = String(query || "").trim();
  if (!term) return [];

  // Exact code match wins (barcode scanners), otherwise fall back to name search.
  const exact = await findByCode(term, user);
  if (exact) return [exact];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term } },
      ],
    },
    include: { category: true, brand: true, unit: true, stockBatches: activeBatchesSelect(admin) },
    orderBy: { name: "asc" },
    take: 20,
  });
  return products.map((p) => stripCost(p, admin));
};

const assertUniqueCodes = async (tx, { sku, barcode }, excludeId = null) => {
  if (sku) {
    const existing = await tx.product.findFirst({ where: { sku, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    if (existing) throw badRequest(`SKU "${sku}" is already used by "${existing.name}"${existing.isActive ? "" : " (deleted product)"}`);
  }
  if (barcode) {
    const existing = await tx.product.findFirst({ where: { barcode, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    if (existing) throw badRequest(`Barcode "${barcode}" is already used by "${existing.name}"${existing.isActive ? "" : " (deleted product)"}`);
  }
};

export const createProduct = async (user, data) => {
  const initialStock = round3(data.stockQuantity || 0);
  const cost = round2(data.costPrice || 0);
  const selling = round2(data.salePrice || 0);
  const recordDate = parseLocalDateTime(data.createdAt || data.entryDate) || new Date();

  const productId = await prisma.$transaction(async (tx) => {
    await assertUniqueCodes(tx, data);

    const unit = await tx.unit.findUnique({ where: { id: data.unitId } });
    if (!unit) throw badRequest("Selected unit was not found");
    if (!unit.allowDecimal && Math.abs(initialStock - Math.round(initialStock)) > QTY_EPSILON) {
      throw badRequest(`Opening stock must be a whole number for unit "${unit.name}"`);
    }

    const product = await tx.product.create({
      data: {
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        description: data.description || null,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        unitId: data.unitId,
        supplierId: data.supplierId || null,
        costPrice: cost,
        salePrice: selling,
        stockQuantity: 0,
        lowStockAlert: round3(data.lowStockAlert ?? 10),
        createdAt: recordDate,
      },
    });

    if (initialStock > 0) {
      await applyAdjustment(tx, user, {
        productId: product.id,
        quantity: initialStock,
        reason: "OPENING",
        notes: "Opening stock when product was created",
        costPrice: cost,
      });
    }

    await audit(tx, user, "PRODUCT_CREATED", "Product", product.id, { name: product.name, costPrice: cost, salePrice: selling, initialStock });
    return product.id;
  }, TX_OPTIONS);

  return getProductById(productId, user);
};

/**
 * Updates product details. A stock change is never written directly: it becomes a
 * StockAdjustment (count correction by default) so every unit is accounted for.
 */
export const updateProduct = async (user, id, data) => {
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id }, include: { unit: true } });
    if (!current) throw notFound("Product not found");

    await assertUniqueCodes(tx, { sku: data.sku, barcode: data.barcode }, id);

    const updateData = {};
    for (const key of ["name", "sku", "barcode", "description", "categoryId", "unitId"]) {
      if (data[key] !== undefined) updateData[key] = data[key] === "" ? null : data[key];
    }
    if (data.brandId !== undefined) updateData.brandId = data.brandId || null;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId || null;
    if (data.costPrice !== undefined) updateData.costPrice = round2(data.costPrice);
    if (data.salePrice !== undefined) updateData.salePrice = round2(data.salePrice);
    if (data.lowStockAlert !== undefined) updateData.lowStockAlert = round3(data.lowStockAlert);

    await tx.product.update({ where: { id }, data: updateData });

    const changes = {};
    if (updateData.costPrice !== undefined && updateData.costPrice !== current.costPrice) {
      changes.costPrice = { from: current.costPrice, to: updateData.costPrice };
      // Lots that did not come from a purchase invoice (opening / manual) follow the corrected cost.
      await tx.stockBatch.updateMany({
        where: { productId: id, stockEntryId: null, remainingQuantity: { gt: QTY_EPSILON } },
        data: { costPrice: updateData.costPrice },
      });
    }
    if (updateData.salePrice !== undefined && updateData.salePrice !== current.salePrice) {
      changes.salePrice = { from: current.salePrice, to: updateData.salePrice };
      // A new catalog price applies to all stock still on the shelf.
      await tx.stockBatch.updateMany({
        where: { productId: id, remainingQuantity: { gt: QTY_EPSILON } },
        data: { sellingPrice: updateData.salePrice },
      });
    }
    if (updateData.name && updateData.name !== current.name) changes.name = { from: current.name, to: updateData.name };

    if (data.stockQuantity !== undefined) {
      const target = round3(data.stockQuantity);
      const delta = round3(target - current.stockQuantity);
      if (Math.abs(delta) > QTY_EPSILON) {
        await applyAdjustment(tx, user, {
          productId: id,
          quantity: delta,
          reason: data.adjustmentReason || "COUNT_CORRECTION",
          notes: data.adjustmentNotes || "Stock edited from product form",
        });
      }
    }

    if (Object.keys(changes).length > 0) {
      await audit(tx, user, "PRODUCT_UPDATED", "Product", id, { product: current.name, ...changes });
    }
  }, TX_OPTIONS);

  return getProductById(id, user);
};

export const deleteProduct = async (user, id) => {
  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  await audit(null, user, "PRODUCT_DEACTIVATED", "Product", id, { name: product.name, stockQuantity: product.stockQuantity });
  return product;
};

export const getProductPriceHistory = async (id) => {
  return prisma.stockEntry.findMany({
    where: { productId: id },
    include: { supplier: true },
    orderBy: { purchasedAt: "desc" },
  });
};
