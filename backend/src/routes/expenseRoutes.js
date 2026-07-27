import express from "express";
import * as expenseController from "../controllers/expenseController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", expenseController.getExpenses);
router.get("/summary", expenseController.getExpenseSummary);
router.post("/", expenseController.createExpense);
router.put("/:id", requireAdmin, expenseController.updateExpense);
router.delete("/:id", requireAdmin, expenseController.deleteExpense);

export default router;
