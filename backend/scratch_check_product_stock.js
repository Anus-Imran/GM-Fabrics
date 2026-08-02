import prisma from "./src/config/prisma.js";

async function main() {
  const p = await prisma.product.findUnique({
    where: { id: 6 },
    include: {
      stockBatches: { orderBy: { createdAt: "asc" } },
    },
  });

  const totalFromBatches = p.stockBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

  console.log(`Product 6: "${p.name}"`);
  console.log(`Product main stockQuantity in DB: ${p.stockQuantity}`);
  console.log(`Sum of remainingQuantity in StockBatches: ${totalFromBatches}`);

  for (const b of p.stockBatches) {
    console.log(`  [Batch #${b.id}] initialQty: ${b.initialQuantity} | remainingQty: ${b.remainingQuantity} | cost: PKR ${b.costPrice} | selling: PKR ${b.sellingPrice}`);
  }

  if (p.stockQuantity !== totalFromBatches) {
    console.log(`\nSyncing main Product.stockQuantity (${p.stockQuantity} -> ${totalFromBatches})...`);
    await prisma.product.update({
      where: { id: 6 },
      data: { stockQuantity: totalFromBatches },
    });
    console.log("Product stockQuantity synced successfully!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
