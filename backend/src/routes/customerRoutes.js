import express from "express";
import * as customerController from "../controllers/customerController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { customerBody, idParam, khataAdjustBody, listQuery, settleBody } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", validate({ query: listQuery }), customerController.getCustomers);
router.get("/:id", validate({ params: idParam }), customerController.getCustomer);
router.get("/:id/ledger", validate({ params: idParam, query: listQuery }), customerController.getLedger);
router.post("/", validate({ body: customerBody }), customerController.createCustomer);
router.put("/:id", validate({ params: idParam, body: customerBody }), customerController.updateCustomer);
router.put("/:id/settle", validate({ params: idParam, body: settleBody }), customerController.settleBalance);
router.post("/:id/adjust", requireAdmin, validate({ params: idParam, body: khataAdjustBody }), customerController.adjustBalance);
router.delete("/:id", requireAdmin, validate({ params: idParam }), customerController.deleteCustomer);

export default router;
