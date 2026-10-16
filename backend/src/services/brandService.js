import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";

export const getAllBrands = async () => {
  return prisma.brand.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const createBrand = async ({ name, country, notes }) => {
  const existing = await prisma.brand.findUnique({ where: { name } });
  if (existing) throw badRequest("Brand with this name already exists");
  return prisma.brand.create({
    data: { name, country, notes },
  });
};

export const updateBrand = async (id, { name, country, notes }) => {
  const brandId = parseInt(id, 10);
  return prisma.brand.update({
    where: { id: brandId },
    data: { name, country, notes },
  });
};

export const deleteBrand = async (id) => {
  const brandId = parseInt(id, 10);
  const count = await prisma.product.count({ where: { brandId } });
  if (count > 0) {
    throw badRequest("Cannot delete brand associated with products");
  }
  return prisma.brand.delete({ where: { id: brandId } });
};
