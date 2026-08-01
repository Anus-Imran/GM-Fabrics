import { prisma } from "./src/config/prisma.js";

async function main() {
  console.log("Starting StockBatch migration...");

  // 1. Create StockBatch for existing StockEntry records if missing
  const stockEntries = await prisma.stockEntry.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${stockEntries.length} stock entries to check.`);

  for (const entry of stockEntries) {
    const existingBatch = await prisma.stockBatch.findFirst({
      where: { stockEntryId: entry.id },
    });

    if (!existingBatch) {
      await prisma.stockBatch.create({
        data: {
          productId: entry.productId,
          stockEntryId: entry.id,
          initialQuantity: entry.quantity,
          remainingQuantity: entry.quantity,
          costPrice: entry.costPerUnit,
          createdAt: entry.purchasedAt || entry.createdAt,
        },
      });
      console.log(`Created StockBatch for StockEntry #${entry.id} (Product ID ${entry.productId})`);
    }
  }

  // 2. For products with stockQuantity > 0 that have NO batches yet
  const products = await prisma.product.findMany({
    include: { stockBatches: true },
  });

  for (const product of products) {
    if (product.stockQuantity > 0 && product.stockBatches.length === 0) {
      await prisma.stockBatch.create({
        data: {
          productId: product.id,
          initialQuantity: product.stockQuantity,
          remainingQuantity: product.stockQuantity,
          costPrice: product.costPrice || 0,
        },
      });
      console.log(`Created initial StockBatch for Product #${product.id} (${product.name}) with ${product.stockQuantity} units.`);
    }
  }

  console.log("StockBatch migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
