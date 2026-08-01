import prisma from "./src/config/prisma.js";

async function main() {
  console.log("Backfilling costPrice on existing SaleItem records...");

  const saleItems = await prisma.saleItem.findMany({
    where: { costPrice: 0 },
    include: { product: true },
  });

  console.log(`Found ${saleItems.length} sale items with 0 cost price.`);

  for (const item of saleItems) {
    // Attempt to get cost from product or latest stock batch
    const batch = await prisma.stockBatch.findFirst({
      where: { productId: item.productId },
      orderBy: { createdAt: "asc" },
    });

    const cost = batch ? batch.costPrice : (item.product ? item.product.costPrice : 0);

    if (cost > 0) {
      await prisma.saleItem.update({
        where: { id: item.id },
        data: { costPrice: cost },
      });
      console.log(`Updated SaleItem #${item.id} (Product ID ${item.productId}) with costPrice PKR ${cost}`);
    }
  }

  console.log("SaleItem costPrice backfill completed successfully!");
}

main()
  .catch((err) => {
    console.error("Backfill error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
