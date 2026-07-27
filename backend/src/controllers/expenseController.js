import * as expenseService from "../services/expenseService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

// Categories
export const getExpenseCategories = async (req, res) => {
  try {
    const categories = await expenseService.getAllExpenseCategories();
    return sendSuccess(res, "Expense categories retrieved", categories);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Category name is required", 400);
    const category = await expenseService.createExpenseCategory(name);
    return sendSuccess(res, "Expense category created", category, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Category name is required", 400);
    const category = await expenseService.updateExpenseCategory(req.params.id, name);
    return sendSuccess(res, "Expense category updated", category);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteExpenseCategory = async (req, res) => {
  try {
    await expenseService.deleteExpenseCategory(req.params.id);
    return sendSuccess(res, "Expense category deleted");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

// Expenses
export const getExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getAllExpenses(req.query);
    return sendSuccess(res, "Expenses retrieved successfully", expenses);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createExpense = async (req, res) => {
  try {
    const { title, categoryId, amount } = req.body;
    if (!title || !categoryId || !amount) {
      return sendError(res, "Title, category, and amount are required", 400);
    }
    const expense = await expenseService.createExpense(req.user.id, req.body);
    return sendSuccess(res, "Expense recorded successfully", expense, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    return sendSuccess(res, "Expense updated successfully", expense);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    return sendSuccess(res, "Expense deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getExpenseSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const summary = await expenseService.getExpenseSummary(month, year);
    return sendSuccess(res, "Expense summary retrieved", summary);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
