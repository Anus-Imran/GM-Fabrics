import { prisma } from "../config/prisma.js";
import { resolveRange } from "../utils/time.js";

export const getAuditLogs = async (filters = {}) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const where = {};
  if (filters.entity) where.entity = filters.entity;
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = parseInt(filters.userId, 10);
  if (filters.from || filters.to) {
    const { start, end } = resolveRange({ from: filters.from, to: filters.to });
    where.createdAt = { gte: start, lte: end };
  }
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: "insensitive" } },
      { entity: { contains: filters.search, mode: "insensitive" } },
      { entityId: { contains: filters.search } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [items, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    actions: actions.map((a) => a.action),
  };
};
