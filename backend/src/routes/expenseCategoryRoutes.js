import express from "express";
import * as expenseController from "../controllers/expenseController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", expenseController.getExpenseCategories);
router.post("/", requireAdmin, expenseController.createExpenseCategory);
router.put("/:id", requireAdmin, expenseController.updateExpenseCategory);
router.delete("/:id", requireAdmin, expenseController.deleteExpenseCategory);

export default router;
