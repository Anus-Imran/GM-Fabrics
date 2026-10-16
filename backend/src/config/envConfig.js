import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

const DEV_JWT_SECRET = "gmfabrics_local_development_only_secret";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn("[security] JWT_SECRET is shorter than 32 characters — use a longer random secret.");
}
if (!process.env.JWT_SECRET) {
  console.warn("[security] JWT_SECRET is not set — using a development-only secret.");
}

const splitList = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

export const envConfig = {
  isProduction,
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  // Comma-separated extra origins allowed by CORS (in addition to FRONTEND_URL).
  corsOrigins: [...splitList(process.env.FRONTEND_URL), ...splitList(process.env.CORS_ORIGINS)],
  // Regex for Vercel preview deployments of the frontend, e.g. https://gmfabrics-git-main-team.vercel.app
  corsPreviewPattern: process.env.CORS_PREVIEW_PATTERN || "^https://gmfabrics(-[a-z0-9-]+)?\\.vercel\\.app$",
  returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || "7", 10),
  currency: "PKR",
};

export default envConfig;
