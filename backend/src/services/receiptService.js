import { prisma } from "../config/prisma.js";
import { notFound } from "../utils/appError.js";
import { generateReceiptHtml } from "../utils/receiptUtil.js";

const receiptSaleInclude = {
  customer: true,
  user: { select: { id: true, name: true } },
  saleItems: { include: { product: { include: { unit: true } } }, orderBy: { id: "asc" } },
  returns: { select: { refundAmount: true } },
};

/** Receipts are rendered from the current sale data, so they always reflect returns and voids. */
export const getReceiptBySaleId = async (saleId) => {
  const receipt = await prisma.receipt.findUnique({
    where: { saleId },
    include: { sale: { include: receiptSaleInclude } },
  });
  if (!receipt) throw notFound("Receipt not found for this sale");
  const { sale, receiptHtml, ...meta } = receipt;
  return { ...meta, saleNumber: sale.saleNumber, receiptHtml: generateReceiptHtml(sale) };
};

export const printReceipt = async (saleId) => {
  return prisma.receipt.update({
    where: { saleId },
    data: { printCount: { increment: 1 }, lastPrintAt: new Date() },
    select: { id: true, saleId: true, printCount: true, lastPrintAt: true },
  });
};
