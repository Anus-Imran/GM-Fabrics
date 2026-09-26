import express from "express";
import * as stockEntryController from "../controllers/stockEntryController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", stockEntryController.getStockEntries);
router.get("/:id", stockEntryController.getStockEntry);
router.post("/", requireAdmin, stockEntryController.createStockEntry);
router.put("/:id", requireAdmin, stockEntryController.updateStockEntry);
router.delete("/:id", requireAdmin, stockEntryController.deleteStockEntry);
router.delete("/", requireAdmin, stockEntryController.deleteManyStockEntries);

export default router;

