import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { envConfig } from "./config/envConfig.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";

// Routes Imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import unitRoutes from "./routes/unitRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import stockEntryRoutes from "./routes/stockEntryRoutes.js";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import expenseCategoryRoutes from "./routes/expenseCategoryRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import cashSessionRoutes from "./routes/cashSessionRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

const app = express();

// Vercel / reverse proxies: needed for correct client IPs in rate limiting.
app.set("trust proxy", 1);
app.disable("x-powered-by");

const previewPattern = envConfig.corsPreviewPattern ? new RegExp(envConfig.corsPreviewPattern) : null;

const isAllowedOrigin = (origin) => {
  if (envConfig.corsOrigins.includes(origin)) return true;
  if (previewPattern && previewPattern.test(origin)) return true;
  if (!envConfig.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

// CORS: only the POS frontend origins may call the API from a browser.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  if (req.method === "OPTIONS") {
    return res.status(origin && isAllowedOrigin(origin) ? 204 : 403).end();
  }
  next();
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(envConfig.isProduction ? "tiny" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// API responses carry live business data; never let browsers or proxies cache them.
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    system: "GM Fabrics POS Backend",
    timestamp: new Date().toISOString(),
  });
});

// API Routes Mounting
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock-entries", stockEntryRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/cash-sessions", cashSessionRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start Server if main local process (Skip in Vercel Serverless environment)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  const PORT = envConfig.port;
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 GM Fabrics POS Backend running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`==================================================`);
  });
}

export default app;
