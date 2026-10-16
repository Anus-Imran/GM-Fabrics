import express from "express";
import { z } from "zod";
import * as receiptService from "../services/receiptService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { id } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();
const params = z.object({ saleId: id });

router.use(authenticateUser);

router.get(
  "/:saleId",
  validate({ params }),
  asyncHandler(async (req, res) => sendSuccess(res, "Receipt retrieved", await receiptService.getReceiptBySaleId(req.params.saleId)))
);

router.post(
  "/:saleId/print",
  validate({ params }),
  asyncHandler(async (req, res) => sendSuccess(res, "Receipt print logged", await receiptService.printReceipt(req.params.saleId)))
);

export default router;
