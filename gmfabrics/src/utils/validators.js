/**
 * Client-side form helpers (the server validates again — these give instant feedback).
 */

const digitsOnly = (v) => String(v || "").replace(/\D/g, "");

/** Formats as the user types: 0300-1234567 (mobile) or leaves landlines as digits. */
export const maskPhone = (value) => {
  let raw = String(value || "").replace(/[^\d+]/g, "");
  if (raw.startsWith("+92")) raw = `0${raw.slice(3)}`;
  else if (raw.startsWith("92") && raw.length > 10) raw = `0${raw.slice(2)}`;
  const d = digitsOnly(raw).slice(0, 11);
  if (d.startsWith("03") && d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
};

export const isValidPhone = (value) => {
  if (!value) return true;
  const d = digitsOnly(maskPhone(value));
  return /^0\d{9,10}$/.test(d);
};

/** Formats CNIC as 35202-1234567-1. */
export const maskCnic = (value) => {
  const d = digitsOnly(value).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

export const isValidCnic = (value) => !value || /^\d{5}-\d{7}-\d$/.test(maskCnic(value));

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());

export const passwordProblem = (value) => {
  if (!value || value.length < 8) return "At least 8 characters";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use letters and numbers";
  return null;
};

/** Blocks "-", "e" and "+" in number inputs used for money / quantity. */
export const blockInvalidNumberKeys = (e) => {
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
};
