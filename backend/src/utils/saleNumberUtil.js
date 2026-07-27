import { prisma } from "../config/prisma.js";

/**
 * Generate sequential sale number: GM-YYYY-00001
 */
export const generateSaleNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `GM-${currentYear}-`;

  const latestSale = await prisma.sale.findFirst({
    where: {
      saleNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  let nextNumber = 1;
  if (latestSale && latestSale.saleNumber) {
    const parts = latestSale.saleNumber.split("-");
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) {
      nextNumber = numPart + 1;
    }
  }

  const paddedNum = String(nextNumber).padStart(5, "0");
  return `${prefix}${paddedNum}`;
};
