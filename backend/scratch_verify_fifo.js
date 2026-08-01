import prisma from "./src/config/prisma.js";

async function verifyFifoBatches() {
  console.log("\n=======================================================");
  console.log("   FIFO STOCK BATCHES & INVENTORY AUDIT REPORT        ");
  console.log("=======================================================\n");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      unit: true,
      stockBatches: {
        orderBy: { createdAt: "asc" },
      },
      stockEntries: {
        orderBy: { purchasedAt: "desc" },
      },
    },
  });

  for (const p of products) {
    const totalBatchStock = p.stockBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
    const activeBatchesCount = p.stockBatches.filter((b) => b.remainingQuantity > 0).length;

    // Sync product main stockQuantity with active batch total
    if (p.stockQuantity !== totalBatchStock) {
      await prisma.product.update({
        where: { id: p.id },
        data: { stockQuantity: totalBatchStock },
      });
      p.stockQuantity = totalBatchStock;
    }

    console.log(`📌 Product #${p.id}: "${p.name}"`);
    console.log(`   - Main Product Stock: ${p.stockQuantity} ${p.unit?.symbol || "units"}`);
    console.log(`   - Sum of Batch Remaining Quantities: ${totalBatchStock} ${p.unit?.symbol || "units"}`);
    console.log(`   - Active Batches (remaining > 0): ${activeBatchesCount} of ${p.stockBatches.length} total batches`);
    console.log("   - Detailed Batches List (FIFO Order - Oldest First):");

    if (p.stockBatches.length === 0) {
      console.log("     (No batches recorded yet)");
    } else {
      p.stockBatches.forEach((b, idx) => {
        const isDepleted = b.remainingQuantity === 0;
        const status = isDepleted ? "🔴 DEPLETED (0 left)" : `🟢 ACTIVE (${b.remainingQuantity} left)`;
        console.log(
          `     [Batch #${b.id}] Lot #${idx + 1} | Cost/Unit: PKR ${b.costPrice} | Initial: ${b.initialQuantity} | Remaining: ${b.remainingQuantity} | Status: ${status} | Date: ${b.createdAt.toISOString().split("T")[0]}`
        );
      });
    }
    console.log("-------------------------------------------------------");
  }
}

verifyFifoBatches()
  .catch((err) => {
    console.error("Verification script error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
