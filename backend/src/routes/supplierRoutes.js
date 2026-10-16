import express from "express";
import { z } from "zod";
import * as supplierController from "../controllers/supplierController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { id, idParam, supplierBody, supplierPaymentBody } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

// Basic list is needed by product forms; balances and statements are admin-only.
router.get("/", supplierController.getSuppliers);
router.get("/:id", validate({ params: idParam }), supplierController.getSupplier);
router.get("/:id/stock-history", requireAdmin, validate({ params: idParam }), supplierController.getSupplierStockHistory);
router.get("/:id/ledger", requireAdmin, validate({ params: idParam }), supplierController.getSupplierLedger);
router.post("/", requireAdmin, validate({ body: supplierBody }), supplierController.createSupplier);
router.put("/:id", requireAdmin, validate({ params: idParam, body: supplierBody }), supplierController.updateSupplier);
router.delete("/:id", requireAdmin, validate({ params: idParam }), supplierController.deleteSupplier);
router.post("/:id/payments", requireAdmin, validate({ params: idParam, body: supplierPaymentBody }), supplierController.recordPayment);
router.delete(
  "/:id/payments/:paymentId",
  requireAdmin,
  validate({ params: z.object({ id, paymentId: id }) }),
  supplierController.deletePayment
);

export default router;
