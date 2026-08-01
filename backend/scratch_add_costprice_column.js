import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Adding costPrice column to SaleItem table...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SaleItem" 
    ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
  `);
  console.log("Column costPrice added to SaleItem successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
