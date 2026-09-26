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
      stockBatches: {
        include: {
          saleItems: true,
        },
      },
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
      stockBatches: {
        include: {
          saleItems: true,
        },
      },
    },
  });
  if (!entry) throw new Error("Stock entry not found");
  return entry;
};

export const createStockEntry = async (data) => {
  const { productId, supplierId, quantity, costPerUnit, newSalePrice, notes, purchasedAt } = data;

  const prodId = parseInt(productId, 10);
  const qty = parseFloat(quantity);
  const costUnit = parseFloat(costPerUnit);
  const totalCost = qty * costUnit;
  const parsedNewSalePrice = newSalePrice ? parseFloat(newSalePrice) : null;

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

    const batchSalePrice = parsedNewSalePrice && parsedNewSalePrice > 0 ? parsedNewSalePrice : (product.salePrice || 0);

    // 3. Create independent StockBatch for this purchase lot
    await tx.stockBatch.create({
      data: {
        productId: prodId,
        stockEntryId: stockEntry.id,
        initialQuantity: qty,
        remainingQuantity: qty,
        costPrice: costUnit,
        sellingPrice: batchSalePrice,
        createdAt: purchasedAt ? new Date(purchasedAt) : new Date(),
      },
    });

    // 4. Update Product stock, latest cost price snapshot, and optional new sale price
    // Aggregate exact remainingQuantity from all batches to prevent any drift
    const batchSum = await tx.stockBatch.aggregate({
      where: { productId: prodId },
      _sum: { remainingQuantity: true },
    });
    const exactStockQuantity = batchSum._sum.remainingQuantity ?? (product.stockQuantity + qty);

    const updateProductData = {
      stockQuantity: Math.max(0, exactStockQuantity),
      costPrice: costUnit,
      supplierId: supplierId ? parseInt(supplierId, 10) : product.supplierId,
    };

    if (parsedNewSalePrice && parsedNewSalePrice > 0) {
      updateProductData.salePrice = parsedNewSalePrice;
    }

    await tx.product.update({
      where: { id: prodId },
      data: updateProductData,
    });

    return stockEntry;
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
};

export const updateStockEntry = async (id, data) => {
  const entryId = parseInt(id, 10);
  const { productId, supplierId, quantity, costPerUnit, newSalePrice, notes, purchasedAt } = data;

  return prisma.$transaction(async (tx) => {
    // 1. Fetch current StockEntry with associated product and batches
    const existingEntry = await tx.stockEntry.findUnique({
      where: { id: entryId },
      include: {
        product: true,
        stockBatches: {
          include: { saleItems: true },
        },
      },
    });

    if (!existingEntry) throw new Error("Stock purchase entry not found");

    const targetProductId = productId ? parseInt(productId, 10) : existingEntry.productId;
    const isProductChanged = targetProductId !== existingEntry.productId;

    const newQty = quantity !== undefined ? parseFloat(quantity) : existingEntry.quantity;
    const newCost = costPerUnit !== undefined ? parseFloat(costPerUnit) : existingEntry.costPerUnit;
    const parsedNewSalePrice = newSalePrice !== undefined && newSalePrice !== null && newSalePrice !== ""
      ? parseFloat(newSalePrice)
      : null;

    if (newQty <= 0) throw new Error("Quantity must be greater than zero");
    if (newCost < 0) throw new Error("Cost per unit cannot be negative");

    // Check associated batches for POS sales history
    const entryBatches = existingEntry.stockBatches || [];
    const mainBatch = entryBatches.length > 0 ? entryBatches[0] : null;

    let soldQuantity = 0;
    if (mainBatch) {
      soldQuantity = Math.max(0, (mainBatch.initialQuantity || 0) - (mainBatch.remainingQuantity || 0));
      if (mainBatch.saleItems && mainBatch.saleItems.length > 0) {
        const saleItemsSum = mainBatch.saleItems.reduce((acc, si) => acc + (si.quantity || 0), 0);
        soldQuantity = Math.max(soldQuantity, saleItemsSum);
      }
    }

    if (isProductChanged && soldQuantity > 0) {
      throw new Error(`Cannot change fabric product because ${soldQuantity} units from this purchase lot have already been sold in POS sales.`);
    }

    if (newQty < soldQuantity) {
      throw new Error(`Cannot reduce purchase quantity to ${newQty} because ${soldQuantity} units have already been sold from this lot. Minimum allowable quantity is ${soldQuantity}.`);
    }

    const purchaseDate = purchasedAt ? new Date(purchasedAt) : existingEntry.purchasedAt;
    const targetProduct = isProductChanged
      ? await tx.product.findUnique({ where: { id: targetProductId } })
      : existingEntry.product;

    if (!targetProduct) throw new Error("Selected product not found");

    const batchSalePrice = parsedNewSalePrice && parsedNewSalePrice > 0
      ? parsedNewSalePrice
      : (mainBatch?.sellingPrice > 0 ? mainBatch.sellingPrice : (targetProduct.salePrice || 0));

    // 2. Synchronize StockBatch
    if (mainBatch) {
      const newRemaining = Math.max(0, newQty - soldQuantity);
      await tx.stockBatch.update({
        where: { id: mainBatch.id },
        data: {
          productId: targetProductId,
          initialQuantity: newQty,
          remainingQuantity: newRemaining,
          costPrice: newCost,
          sellingPrice: batchSalePrice,
          createdAt: purchaseDate,
        },
      });
    } else {
      // Recreate batch if missing from legacy records
      await tx.stockBatch.create({
        data: {
          productId: targetProductId,
          stockEntryId: entryId,
          initialQuantity: newQty,
          remainingQuantity: newQty,
          costPrice: newCost,
          sellingPrice: batchSalePrice,
          createdAt: purchaseDate,
        },
      });
    }

    // 3. Recalculate price diff and total cost
    const totalCost = newQty * newCost;
    const previousCostPerUnit = isProductChanged ? (targetProduct.costPrice || 0) : (existingEntry.previousCostPerUnit ?? 0);
    const priceDiff = newCost - previousCostPerUnit;

    // 4. Update StockEntry
    const updatedEntry = await tx.stockEntry.update({
      where: { id: entryId },
      data: {
        productId: targetProductId,
        supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId, 10) : null) : existingEntry.supplierId,
        quantity: newQty,
        costPerUnit: newCost,
        totalCost,
        previousCostPerUnit,
        priceDiff,
        notes: notes !== undefined ? (notes || null) : existingEntry.notes,
        purchasedAt: purchaseDate,
      },
      include: {
        product: { include: { unit: true, category: true, brand: true } },
        supplier: true,
        stockBatches: {
          include: { saleItems: true },
        },
      },
    });

    // 5. Product stock and pricing synchronization function
    const syncProductStockAndPricing = async (pId, latestCostOverride = null) => {
      // Aggregate exact remaining quantity across all active batches
      const batchSum = await tx.stockBatch.aggregate({
        where: { productId: pId },
        _sum: { remainingQuantity: true },
      });
      const newStockQuantity = batchSum._sum.remainingQuantity ?? 0;

      // Determine latest active cost price and vendor from most recent entry
      const latestEntry = await tx.stockEntry.findFirst({
        where: { productId: pId },
        orderBy: { purchasedAt: "desc" },
      });

      let latestCostPrice = 0;
      let latestSupplierId = null;

      if (latestEntry && latestEntry.id === entryId && latestCostOverride !== null) {
        latestCostPrice = latestCostOverride;
        latestSupplierId = updatedEntry.supplierId;
      } else if (latestEntry) {
        latestCostPrice = latestEntry.costPerUnit;
        latestSupplierId = latestEntry.supplierId;
      } else {
        const initialBatch = await tx.stockBatch.findFirst({
          where: { productId: pId, stockEntryId: null },
        });
        latestCostPrice = initialBatch?.costPrice ?? 0;
      }

      const prodData = {
        stockQuantity: Math.max(0, newStockQuantity),
        costPrice: latestCostPrice,
      };

      if (latestSupplierId !== null) {
        prodData.supplierId = latestSupplierId;
      }

      if (parsedNewSalePrice && parsedNewSalePrice > 0 && pId === targetProductId) {
        prodData.salePrice = parsedNewSalePrice;
      }

      await tx.product.update({
        where: { id: pId },
        data: prodData,
      });
    };

    await syncProductStockAndPricing(targetProductId, newCost);

    if (isProductChanged) {
      await syncProductStockAndPricing(existingEntry.productId);
    }

    return updatedEntry;
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
};

export const deleteStockEntry = async (id) => {
  const entryId = parseInt(id, 10);

  return prisma.$transaction(async (tx) => {
    // 1. Fetch current entry with batches and product
    const entry = await tx.stockEntry.findUnique({
      where: { id: entryId },
      include: {
        product: true,
        stockBatches: {
          include: { saleItems: true },
        },
      },
    });

    if (!entry) throw new Error("Stock purchase entry not found");

    const batches = entry.stockBatches || [];
    let soldQuantity = 0;
    let hasSales = false;

    for (const batch of batches) {
      const sold = Math.max(0, (batch.initialQuantity || 0) - (batch.remainingQuantity || 0));
      if (sold > 0) soldQuantity += sold;
      if (batch.saleItems && batch.saleItems.length > 0) {
        hasSales = true;
      }
    }

    if (hasSales || soldQuantity > 0) {
      throw new Error(
        `Cannot delete this purchase entry: ${soldQuantity > 0 ? soldQuantity : "some"} units have already been sold in POS customer sales. Deleting this purchase lot would compromise financial audit integrity and stock batch balance.`
      );
    }

    // 2. Delete the associated StockBatches (safe: no sales recorded against this lot)
    for (const batch of batches) {
      await tx.stockBatch.delete({
        where: { id: batch.id },
      });
    }

    // 3. Delete the StockEntry
    await tx.stockEntry.delete({
      where: { id: entryId },
    });

    // 4. Synchronize Product stockQuantity, costPrice, and supplier
    const productId = entry.productId;

    const batchSum = await tx.stockBatch.aggregate({
      where: { productId },
      _sum: { remainingQuantity: true },
    });
    const newStockQuantity = batchSum._sum.remainingQuantity ?? Math.max(0, entry.product.stockQuantity - entry.quantity);

    // Revert cost price to the latest remaining stock purchase or initial batch
    const latestRemainingEntry = await tx.stockEntry.findFirst({
      where: { productId },
      orderBy: { purchasedAt: "desc" },
    });

    let revertCostPrice = 0;
    let revertSupplierId = null;

    if (latestRemainingEntry) {
      revertCostPrice = latestRemainingEntry.costPerUnit;
      revertSupplierId = latestRemainingEntry.supplierId;
    } else {
      const initialBatch = await tx.stockBatch.findFirst({
        where: { productId, stockEntryId: null },
      });
      revertCostPrice = initialBatch?.costPrice ?? 0;
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: Math.max(0, newStockQuantity),
        costPrice: revertCostPrice,
        ...(revertSupplierId ? { supplierId: revertSupplierId } : {}),
      },
    });

    return { message: "Stock purchase entry deleted successfully", id: entryId };
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
};

export const deleteManyStockEntries = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("No purchase entries provided for deletion");
  }

  const results = [];
  for (const id of ids) {
    const res = await deleteStockEntry(id);
    results.push(res);
  }
  return results;
};

