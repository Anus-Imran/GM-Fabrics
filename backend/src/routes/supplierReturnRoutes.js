import express from "express";
import { z } from "zod";
import * as supplierReturnService from "../services/supplierReturnService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  convertReturnBody,
  id,
  idParam,
  listQuery,
  optionalId,
  receiveReplacementBody,
  supplierReturnBody,
} from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

// Purchase returns touch costs and supplier balances — admin only.
router.use(authenticateUser, requireAdmin);

router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => sendSuccess(res, "Supplier returns retrieved", await supplierReturnService.getSupplierReturns(req.query)))
);

router.get(
  "/lots",
  validate({ query: z.object({ supplierId: id, productId: optionalId.optional() }) }),
  asyncHandler(async (req, res) => sendSuccess(res, "Returnable lots", await supplierReturnService.getReturnableLots(req.query)))
);

router.post(
  "/",
  validate({ body: supplierReturnBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Stock returned to supplier", await supplierReturnService.createSupplierReturn(req.user, req.body), 201)
  )
);

router.post(
  "/:id/receive",
  validate({ params: idParam, body: receiveReplacementBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Replacement received — stock added back", await supplierReturnService.receiveReplacement(req.user, req.params.id, req.body))
  )
);

router.post(
  "/:id/convert",
  validate({ params: idParam, body: convertReturnBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Converted to a return", await supplierReturnService.convertToReturn(req.user, req.params.id, req.body))
  )
);

router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Supplier return deleted — stock restored", await supplierReturnService.deleteSupplierReturn(req.user, req.params.id))
  )
);

export default router;
