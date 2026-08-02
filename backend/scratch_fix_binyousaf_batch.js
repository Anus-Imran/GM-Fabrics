import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Fixing Batch #15 sellingPrice for BinYousaf 3PC...");
  
  // Set Batch #15 sellingPrice to 3000
  await prisma.stockBatch.update({
    where: { id: 15 },
    data: { sellingPrice: 3000, costPrice: 2000 },
  });

  console.log("Updated Batch #15 -> sellingPrice = PKR 3000, costPrice = PKR 2000");

  const product = await prisma.product.findUnique({
    where: { id: 6 },
    include: {
      stockBatches: { orderBy: { createdAt: "asc" } },
    },
  });

  console.log("\nUpdated Batches for BinYousaf 3PC:");
  for (const b of product.stockBatches) {
    console.log(`  [Batch #${b.id}] remainingQty: ${b.remainingQuantity} | costPrice: PKR ${b.costPrice} | sellingPrice: PKR ${b.sellingPrice}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
