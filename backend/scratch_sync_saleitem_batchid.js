import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Checking if batchId column exists on SaleItem table...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "batchId" INTEGER REFERENCES "StockBatch"("id") ON DELETE SET NULL;
    `);
    console.log("Database schema synced: SaleItem.batchId column is ready!");
  } catch (err) {
    console.error("Error executing ALTER TABLE:", err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
