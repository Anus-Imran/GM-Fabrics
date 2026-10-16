import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2 } from "../utils/money.js";
import { parseLocalDateTime, resolveRange, localMidnight, OFFSET_MS } from "../utils/time.js";
import { audit } from "../utils/audit.js";

export const getAllExpenseCategories = async () => {
  return prisma.expenseCategory.findMany({
    include: { _count: { select: { expenses: true } } },
    orderBy: { name: "asc" },
  });
};

export const createExpenseCategory = async (name) => {
  const existing = await prisma.expenseCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) throw badRequest("Category already exists");
  return prisma.expenseCategory.create({ data: { name } });
};

export const updateExpenseCategory = async (id, name) => {
  return prisma.expenseCategory.update({ where: { id }, data: { name } });
};

export const deleteExpenseCategory = async (id) => {
  const count = await prisma.expense.count({ where: { categoryId: id } });
  if (count > 0) throw badRequest("Cannot delete category with recorded expenses");
  return prisma.expenseCategory.delete({ where: { id } });
};

export const getAllExpenses = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const where = {};
  if (filters.categoryId) where.categoryId = parseInt(filters.categoryId, 10);
  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.date = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
      { category: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [items, total, sums] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true, user: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { totalAmount: round2(sums._sum.amount || 0) },
  };
};

const parseExpenseDate = (value) => {
  if (!value) return new Date();
  const date = parseLocalDateTime(value);
  if (!date || isNaN(date.getTime())) throw badRequest("Invalid expense date");
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) throw badRequest("Expense date cannot be in the future");
  return date;
};

export const createExpense = async (user, data) => {
  const category = await prisma.expenseCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw badRequest("Selected expense category was not found");

  return prisma.expense.create({
    data: {
      title: data.title,
      categoryId: data.categoryId,
      amount: round2(data.amount),
      date: parseExpenseDate(data.date),
      fromDrawer: !!data.fromDrawer,
      notes: data.notes || null,
      userId: user.id,
    },
    include: { category: true, user: { select: { id: true, name: true } } },
  });
};

export const updateExpense = async (user, id, data) => {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw notFound("Expense not found");

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.amount !== undefined) updateData.amount = round2(data.amount);
  if (data.date !== undefined) updateData.date = parseExpenseDate(data.date);
  if (data.fromDrawer !== undefined) updateData.fromDrawer = data.fromDrawer;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const expense = await prisma.expense.update({ where: { id }, data: updateData, include: { category: true } });
  await audit(null, user, "EXPENSE_UPDATED", "Expense", id, {
    before: { title: existing.title, amount: existing.amount },
    after: { title: expense.title, amount: expense.amount },
  });
  return expense;
};

export const deleteExpense = async (user, id) => {
  const expense = await prisma.expense.delete({ where: { id } });
  await audit(null, user, "EXPENSE_DELETED", "Expense", id, { title: expense.title, amount: expense.amount });
  return expense;
};

export const getExpenseSummary = async (month, year) => {
  const now = new Date(Date.now() + OFFSET_MS);
  const targetYear = parseInt(year || now.getUTCFullYear(), 10);
  const targetMonth = parseInt(month || now.getUTCMonth() + 1, 10);

  const startDate = localMidnight(targetYear, targetMonth - 1, 1);
  const endDate = new Date(localMidnight(targetYear, targetMonth, 1).getTime() - 1);

  const [grouped, categories, total] = await Promise.all([
    prisma.expense.groupBy({ by: ["categoryId"], where: { date: { gte: startDate, lte: endDate } }, _sum: { amount: true } }),
    prisma.expenseCategory.findMany({ select: { id: true, name: true } }),
    prisma.expense.aggregate({ where: { date: { gte: startDate, lte: endDate } }, _sum: { amount: true }, _count: { id: true } }),
  ]);

  const byCategory = {};
  for (const g of grouped) {
    const name = categories.find((c) => c.id === g.categoryId)?.name || "Uncategorized";
    byCategory[name] = round2(g._sum.amount || 0);
  }

  return {
    month: targetMonth,
    year: targetYear,
    totalExpense: round2(total._sum.amount || 0),
    count: total._count.id,
    categoryBreakdown: byCategory,
  };
};
