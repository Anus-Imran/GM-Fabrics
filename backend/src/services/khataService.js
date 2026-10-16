import { round2 } from "../utils/money.js";

/**
 * Posts one khata (customer credit) ledger entry and moves the customer's balance.
 * amount > 0 means the customer owes more; amount < 0 means they owe less.
 * Must be called inside a transaction.
 */
export const postKhataEntry = async (
  tx,
  { customerId, type, amount, method = null, saleId = null, returnId = null, notes = null, userId = null }
) => {
  const value = round2(amount);
  if (value === 0) return null;

  const customer = await tx.customer.update({
    where: { id: customerId },
    data: { outstandingBalance: { increment: value } },
  });

  // Normalise float drift on the stored balance.
  const balanceAfter = round2(customer.outstandingBalance);
  if (balanceAfter !== customer.outstandingBalance) {
    await tx.customer.update({ where: { id: customerId }, data: { outstandingBalance: balanceAfter } });
  }

  return tx.khataEntry.create({
    data: { customerId, type, amount: value, balanceAfter, method, saleId, returnId, notes, userId },
  });
};
