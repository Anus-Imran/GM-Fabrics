import { prisma } from "../config/prisma.js";

export const getAllCategories = async () => {
  return prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const createCategory = async ({ name }) => {
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) throw new Error("Category already exists");
  return prisma.category.create({ data: { name } });
};

export const updateCategory = async (id, { name }) => {
  const catId = parseInt(id, 10);
  return prisma.category.update({
    where: { id: catId },
    data: { name },
  });
};

export const deleteCategory = async (id) => {
  const catId = parseInt(id, 10);
  const count = await prisma.product.count({ where: { categoryId: catId } });
  if (count > 0) {
    throw new Error("Cannot delete category with associated products");
  }
  return prisma.category.delete({ where: { id: catId } });
};
