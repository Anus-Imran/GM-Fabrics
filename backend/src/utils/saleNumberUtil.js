// Arbitrary constant key for the Postgres advisory lock that serialises bill numbering.
const SALE_NUMBER_LOCK_KEY = 4815162342;

/**
 * Generate sequential sale number: GM-YYYY-00001.
 * Must be called inside a transaction: the advisory lock is held until commit,
 * so two counters can never receive the same bill number.
 */
export const generateSaleNumber = async (tx, date = new Date()) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SALE_NUMBER_LOCK_KEY}::bigint)`;

  const currentYear = date.getFullYear();
  const prefix = `GM-${currentYear}-`;

  const latestSale = await tx.sale.findFirst({
    where: { saleNumber: { startsWith: prefix } },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });

  let nextNumber = 1;
  if (latestSale?.saleNumber) {
    const numPart = parseInt(latestSale.saleNumber.slice(prefix.length), 10);
    if (!isNaN(numPart)) nextNumber = numPart + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
};
