import express from "express";
import { z } from "zod";
import * as expenseService from "../services/expenseService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { expenseBody, idParam, listQuery } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser);

const monthQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => sendSuccess(res, "Expenses retrieved successfully", await expenseService.getAllExpenses(req.query)))
);

router.get(
  "/summary",
  validate({ query: monthQuery }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Expense summary retrieved", await expenseService.getExpenseSummary(req.query.month, req.query.year))
  )
);

router.post(
  "/",
  validate({ body: expenseBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Expense recorded successfully", await expenseService.createExpense(req.user, req.body), 201)
  )
);

router.put(
  "/:id",
  requireAdmin,
  validate({ params: idParam, body: expenseBody.partial() }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Expense updated successfully", await expenseService.updateExpense(req.user, req.params.id, req.body))
  )
);

router.delete(
  "/:id",
  requireAdmin,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await expenseService.deleteExpense(req.user, req.params.id);
    return sendSuccess(res, "Expense deleted successfully");
  })
);

export default router;
