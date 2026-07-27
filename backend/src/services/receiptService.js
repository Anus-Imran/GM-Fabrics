import { prisma } from "../config/prisma.js";

export const getReceiptBySaleId = async (saleId) => {
  const sId = parseInt(saleId, 10);
  const receipt = await prisma.receipt.findUnique({
    where: { saleId: sId },
    include: {
      sale: {
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          saleItems: {
            include: { product: { include: { unit: true } } },
          },
        },
      },
    },
  });

  if (!receipt) throw new Error("Receipt not found for this sale");
  return receipt;
};

export const printReceipt = async (saleId) => {
  const sId = parseInt(saleId, 10);

  const receipt = await prisma.receipt.update({
    where: { saleId: sId },
    data: {
      printCount: { increment: 1 },
      lastPrintAt: new Date(),
    },
  });

  return receipt;
};
