/**
 * Format currency in PKR with support for decimals (e.g. cut pieces / per-gram rates)
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "PKR 0";

  const hasDecimals = num % 1 !== 0;
  if (!hasDecimals) {
    return `PKR ${num.toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  // Count decimals (support 2 to 4 decimal places for fine units like grams)
  const decimalPart = num.toString().split(".")[1] || "";
  const decimals = Math.min(Math.max(decimalPart.length, 2), 4);

  return `PKR ${num.toLocaleString("en-PK", {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  })}`;
};
