import express from "express";
import * as supplierController from "../controllers/supplierController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", supplierController.getSuppliers);
router.get("/:id", supplierController.getSupplier);
router.get("/:id/stock-history", supplierController.getSupplierStockHistory);
router.post("/", requireAdmin, supplierController.createSupplier);
router.put("/:id", requireAdmin, supplierController.updateSupplier);
router.delete("/:id", requireAdmin, supplierController.deleteSupplier);

export default router;
