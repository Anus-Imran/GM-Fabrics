import prisma from "./src/config/prisma.js";

async function main() {
  const products = await prisma.product.findMany({
    where: { name: { contains: "BinYousaf", mode: "insensitive" } },
    include: {
      stockBatches: { orderBy: { createdAt: "asc" } },
      stockEntries: { orderBy: { purchasedAt: "asc" } },
    },
  });

  console.log("=== PRODUCT BATCHES & ENTRIES AUDIT ===");
  for (const p of products) {
    console.log(`Product ID: ${p.id} | Name: "${p.name}" | Current Product salePrice: PKR ${p.salePrice} | costPrice: PKR ${p.costPrice} | totalStock: ${p.stockQuantity}`);
    
    console.log("\n  Stock Entries:");
    for (const e of p.stockEntries) {
      console.log(`    [Entry #${e.id}] Qty: ${e.quantity} | costPerUnit: PKR ${e.costPerUnit} | purchasedAt: ${e.purchasedAt}`);
    }

    console.log("\n  Stock Batches:");
    for (const b of p.stockBatches) {
      console.log(`    [Batch #${b.id}] stockEntryId: ${b.stockEntryId} | initialQty: ${b.initialQuantity} | remainingQty: ${b.remainingQuantity} | costPrice: PKR ${b.costPrice} | sellingPrice: PKR ${b.sellingPrice} | createdAt: ${b.createdAt}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
