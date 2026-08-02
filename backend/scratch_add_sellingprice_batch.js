import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Adding sellingPrice column to StockBatch table...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StockBatch" 
    ADD COLUMN IF NOT EXISTS "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
  `);
  console.log("Column sellingPrice added to StockBatch successfully!");

  // Populate sellingPrice for existing batches where sellingPrice is 0
  const batches = await prisma.stockBatch.findMany({
    where: { sellingPrice: 0 },
    include: { product: true },
  });

  console.log(`Found ${batches.length} batches to update with selling price.`);

  for (const b of batches) {
    if (b.product && b.product.salePrice > 0) {
      await prisma.stockBatch.update({
        where: { id: b.id },
        data: { sellingPrice: b.product.salePrice },
      });
      console.log(`Updated Batch #${b.id} (Product: ${b.product.name}) -> sellingPrice = PKR ${b.product.salePrice}`);
    }
  }

  console.log("All batches updated with selling prices!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
