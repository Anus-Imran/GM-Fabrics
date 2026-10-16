import express from "express";
import * as backupController from "../controllers/backupController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { resetDatabaseBody } from "../validation/schemas.js";

const router = express.Router();

// Full data export contains customer details and costs — admin only.
router.get("/export", authenticateUser, requireAdmin, backupController.exportData);
router.delete(
  "/reset-database",
  authenticateUser,
  requireAdmin,
  validate({ body: resetDatabaseBody }),
  backupController.resetDatabase
);

export default router;
