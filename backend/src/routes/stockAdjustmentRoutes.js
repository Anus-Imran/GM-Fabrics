import express from "express";
import * as stockAdjustmentService from "../services/stockAdjustmentService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { listQuery, stockAdjustmentBody } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser, requireAdmin);

router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const data = await stockAdjustmentService.getAdjustments(req.query);
    return sendSuccess(res, "Stock adjustments retrieved", data);
  })
);

router.post(
  "/",
  validate({ body: stockAdjustmentBody }),
  asyncHandler(async (req, res) => {
    const product = await stockAdjustmentService.createAdjustment(req.user, req.body);
    return sendSuccess(res, "Stock adjusted and recorded", product, 201);
  })
);

export default router;
