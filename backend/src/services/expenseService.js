import { prisma } from "../config/prisma.js";

export const getAllExpenseCategories = async () => {
  return prisma.expenseCategory.findMany({
    include: { _count: { select: { expenses: true } } },
    orderBy: { name: "asc" },
  });
};

export const createExpenseCategory = async (name) => {
  const existing = await prisma.expenseCategory.findUnique({ where: { name } });
  if (existing) throw new Error("Category already exists");
  return prisma.expenseCategory.create({ data: { name } });
};

export const updateExpenseCategory = async (id, name) => {
  const catId = parseInt(id, 10);
  return prisma.expenseCategory.update({
    where: { id: catId },
    data: { name },
  });
};

export const deleteExpenseCategory = async (id) => {
  const catId = parseInt(id, 10);
  const count = await prisma.expense.count({ where: { categoryId: catId } });
  if (count > 0) throw new Error("Cannot delete category with recorded expenses");
  return prisma.expenseCategory.delete({ where: { id: catId } });
};

export const getAllExpenses = async (filters = {}) => {
  const where = {};
  if (filters.categoryId) where.categoryId = parseInt(filters.categoryId, 10);
  if (filters.from && filters.to) {
    where.date = {
      gte: new Date(filters.from),
      lte: new Date(filters.to),
    };
  }

  return prisma.expense.findMany({
    where,
    include: {
      category: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
};

export const createExpense = async (userId, data) => {
  const { title, categoryId, amount, date, notes } = data;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) throw new Error("Expense amount must be greater than zero");

  return prisma.expense.create({
    data: {
      title,
      categoryId: parseInt(categoryId, 10),
      amount: amt,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      userId,
    },
    include: { category: true, user: { select: { id: true, name: true } } },
  });
};

export const updateExpense = async (id, data) => {
  const expenseId = parseInt(id, 10);
  const updateData = {};
  if (data.title) updateData.title = data.title;
  if (data.categoryId) updateData.categoryId = parseInt(data.categoryId, 10);
  if (data.amount) updateData.amount = parseFloat(data.amount);
  if (data.date) updateData.date = new Date(data.date);
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.expense.update({
    where: { id: expenseId },
    data: updateData,
    include: { category: true },
  });
};

export const deleteExpense = async (id) => {
  const expenseId = parseInt(id, 10);
  return prisma.expense.delete({ where: { id: expenseId } });
};

export const getExpenseSummary = async (month, year) => {
  const targetYear = parseInt(year || new Date().getFullYear(), 10);
  const targetMonth = parseInt(month || new Date().getMonth() + 1, 10);

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
  });

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = {};
  expenses.forEach((e) => {
    const catName = e.category ? e.category.name : "Uncategorized";
    byCategory[catName] = (byCategory[catName] || 0) + e.amount;
  });

  return {
    month: targetMonth,
    year: targetYear,
    totalExpense,
    categoryBreakdown: byCategory,
    expenses,
  };
};
