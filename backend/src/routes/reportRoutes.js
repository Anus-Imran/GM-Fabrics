import express from "express";
import { z } from "zod";
import * as reportService from "../services/reportService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { dashboardQuery } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser);

// Dashboard is visible to cashiers, but profit / stock value fields are blanked for them.
router.get(
  "/dashboard",
  validate({ query: dashboardQuery }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Dashboard KPIs retrieved", await reportService.getDashboardKpis(req.query, req.user))
  )
);

const rangeQuery = z.object({ from: z.string().max(40).optional(), to: z.string().max(40).optional() }).passthrough();
const monthQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

router.get(
  "/sales",
  requireAdmin,
  validate({ query: rangeQuery }),
  asyncHandler(async (req, res) => sendSuccess(res, "Sales report", await reportService.getSalesReport(req.query.from, req.query.to)))
);

router.get(
  "/inventory",
  requireAdmin,
  asyncHandler(async (req, res) => sendSuccess(res, "Inventory valuation report", await reportService.getInventoryReport()))
);

router.get(
  "/profit-loss",
  requireAdmin,
  validate({ query: monthQuery }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Profit & loss report", await reportService.getProfitLossReport(req.query.month, req.query.year))
  )
);

router.get(
  "/top-products",
  requireAdmin,
  validate({ query: rangeQuery.extend({ limit: z.coerce.number().int().min(1).max(100).default(10) }) }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Top products", await reportService.getTopProductsReport(req.query.limit, req.query.from, req.query.to))
  )
);

export default router;
