import { prisma } from "../config/prisma.js";

export const getAllUnits = async () => {
  return prisma.unit.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const createUnit = async ({ name, symbol, allowDecimal }) => {
  const existing = await prisma.unit.findUnique({ where: { name } });
  if (existing) throw new Error("Unit with this name already exists");
  return prisma.unit.create({
    data: {
      name,
      symbol,
      allowDecimal: allowDecimal !== undefined ? Boolean(allowDecimal) : true,
    },
  });
};

export const updateUnit = async (id, { name, symbol, allowDecimal }) => {
  const unitId = parseInt(id, 10);
  const data = { name, symbol };
  if (allowDecimal !== undefined) {
    data.allowDecimal = Boolean(allowDecimal);
  }
  return prisma.unit.update({
    where: { id: unitId },
    data,
  });
};

export const deleteUnit = async (id) => {
  const unitId = parseInt(id, 10);
  const productsCount = await prisma.product.count({ where: { unitId } });
  if (productsCount > 0) {
    throw new Error("Cannot delete unit attached to existing products");
  }
  return prisma.unit.delete({ where: { id: unitId } });
};
