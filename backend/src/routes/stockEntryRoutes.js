import express from "express";
import * as stockEntryController from "../controllers/stockEntryController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  bulkStockEntryBody,
  createStockEntryBody,
  updateStockEntryBody,
  deleteManyBody,
  idParam,
  listQuery,
} from "../validation/schemas.js";

const router = express.Router();

// Purchase costs are admin-only information.
router.use(authenticateUser, requireAdmin);

router.get("/", validate({ query: listQuery }), stockEntryController.getStockEntries);
router.post("/bulk", validate({ body: bulkStockEntryBody }), stockEntryController.createBulkStockEntries);
router.get("/:id", validate({ params: idParam }), stockEntryController.getStockEntry);
router.post("/", validate({ body: createStockEntryBody }), stockEntryController.createStockEntry);
router.put("/:id", validate({ params: idParam, body: updateStockEntryBody }), stockEntryController.updateStockEntry);
router.delete("/:id", validate({ params: idParam }), stockEntryController.deleteStockEntry);
router.delete("/", validate({ body: deleteManyBody }), stockEntryController.deleteManyStockEntries);

export default router;
