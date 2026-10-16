/**
 * Shop-local time helpers. The server may run in UTC (Vercel) while the shop is in
 * Pakistan (UTC+05:00, no DST), so "today", "this month" etc. use a fixed offset.
 */
const OFFSET_MIN = parseInt(process.env.SHOP_UTC_OFFSET_MINUTES || "300", 10);
export const OFFSET_MS = OFFSET_MIN * 60 * 1000;

// Postgres interval literal for the same offset, used in date_trunc bucketing.
export const PG_OFFSET = `${OFFSET_MIN} minutes`;

const localParts = (date) => {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
};

// UTC instant of shop-local midnight for local Y/M/D (month is 0-based, overflow allowed).
export const localMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - OFFSET_MS);

export const startOfLocalDay = (date = new Date()) => {
  const { y, m, d } = localParts(date);
  return localMidnight(y, m, d);
};

export const endOfLocalDay = (date = new Date()) => {
  const { y, m, d } = localParts(date);
  return new Date(localMidnight(y, m, d + 1).getTime() - 1);
};

export const startOfLocalMonth = (date = new Date(), monthOffset = 0) => {
  const { y, m } = localParts(date);
  return localMidnight(y, m + monthOffset, 1);
};

export const startOfLocalYear = (date = new Date()) => localMidnight(localParts(date).y, 0, 1);

// Shop-local "YYYY-MM-DD" for a UTC instant.
export const localDateKey = (date) => {
  const { y, m, d } = localParts(date);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// Parses "YYYY-MM-DD" as a shop-local calendar day.
export const parseLocalDate = (str) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || "").slice(0, 10));
  if (!match) return null;
  return localMidnight(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
};

// Parses a value from <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") as shop-local time.
// Values that carry an explicit zone (Z / +05:00) are respected.
export const parseLocalDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value);
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(str);
  if (!match) return new Date(str);
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - OFFSET_MS);
};

// Inclusive shop-local date range from "YYYY-MM-DD" strings.
export const resolveRange = ({ from, to } = {}, fallbackDays = 30) => {
  const end = to ? endOfLocalDay(parseLocalDate(to) || new Date(to)) : endOfLocalDay();
  const start = from
    ? parseLocalDate(from) || new Date(from)
    : new Date(startOfLocalDay().getTime() - (fallbackDays - 1) * 86400000);
  return { start, end };
};
