import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Creating StockBatch table if not exists...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StockBatch" (
      "id" SERIAL PRIMARY KEY,
      "productId" INTEGER NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
      "stockEntryId" INTEGER REFERENCES "StockEntry"("id") ON DELETE SET NULL,
      "initialQuantity" DOUBLE PRECISION NOT NULL,
      "remainingQuantity" DOUBLE PRECISION NOT NULL,
      "costPrice" DOUBLE PRECISION NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("StockBatch table created/verified successfully!");
}

main()
  .catch((err) => {
    console.error("SQL Error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
