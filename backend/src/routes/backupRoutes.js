import express from "express";
import * as backupController from "../controllers/backupController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Export all tables data (Authenticated users)
router.get("/export", authenticateUser, backupController.exportData);

// Wipe/Reset entire system database (Strictly ADMIN only)
router.delete("/reset-database", authenticateUser, requireAdmin, backupController.resetDatabase);

export default router;
