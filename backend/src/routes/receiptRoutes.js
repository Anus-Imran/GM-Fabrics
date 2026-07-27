import express from "express";
import * as receiptController from "../controllers/receiptController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/:saleId", receiptController.getReceipt);
router.post("/:saleId/print", receiptController.printReceipt);

export default router;
