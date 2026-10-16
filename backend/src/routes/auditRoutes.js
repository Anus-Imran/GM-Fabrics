import express from "express";
import * as auditService from "../services/auditService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { listQuery } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser, requireAdmin);

router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => sendSuccess(res, "Audit log retrieved", await auditService.getAuditLogs(req.query)))
);

export default router;
