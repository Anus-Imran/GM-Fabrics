import express from "express";
import cors from "cors";
import morgan from "morgan";
import { envConfig } from "./config/envConfig.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

// Routes Imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import unitRoutes from "./routes/unitRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import stockEntryRoutes from "./routes/stockEntryRoutes.js";
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

const app = express();

// Dynamic CORS Middleware supporting Vercel previews, production domains, and localhost
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,X-Api-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
