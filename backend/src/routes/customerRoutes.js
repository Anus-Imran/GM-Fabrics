import express from "express";
import * as customerController from "../controllers/customerController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomer);
router.post("/", customerController.createCustomer);
router.put("/:id", customerController.updateCustomer);
router.put("/:id/settle", customerController.settleBalance);
router.delete("/:id", requireAdmin, customerController.deleteCustomer);

export default router;
