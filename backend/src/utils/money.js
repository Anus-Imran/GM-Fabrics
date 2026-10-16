/**
 * Money & quantity helpers. Amounts are stored as Float (PKR), so every computed
 * value is rounded here to avoid floating point drift (0.1 + 0.2 style errors).
 */
export const round2 = (v) => Math.round((Number(v) || 0) * 100 + Number.EPSILON) / 100;

// Quantities can be fractional (guzz, metre, grams) — keep 3 decimals.
export const round3 = (v) => Math.round((Number(v) || 0) * 1000 + Number.EPSILON) / 1000;

export const QTY_EPSILON = 0.0005;
