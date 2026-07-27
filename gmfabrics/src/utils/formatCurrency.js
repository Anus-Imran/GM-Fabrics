/**
 * Format currency in PKR
 */
export const formatCurrency = (amount) => {
  const value = parseFloat(amount) || 0;
  return `PKR ${value.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};
