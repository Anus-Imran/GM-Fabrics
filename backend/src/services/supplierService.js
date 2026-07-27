import { prisma } from "../config/prisma.js";

export const getAllSuppliers = async () => {
  return prisma.supplier.findMany({
    include: {
      _count: {
        select: { products: true, stockEntries: true },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getSupplierById = async (id) => {
  const supplierId = parseInt(id, 10);
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      products: {
        select: { id: true, name: true, stockQuantity: true, salePrice: true },
      },
      stockEntries: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true } } },
      },
    },
  });
  if (!supplier) throw new Error("Supplier not found");
  return supplier;
};

export const createSupplier = async ({ name, phone, address, city, notes }) => {
  return prisma.supplier.create({
    data: { name, phone, address, city, notes },
  });
};

export const updateSupplier = async (id, data) => {
  const supplierId = parseInt(id, 10);
  return prisma.supplier.update({
    where: { id: supplierId },
    data,
  });
};

export const deleteSupplier = async (id) => {
  const supplierId = parseInt(id, 10);
  return prisma.supplier.delete({ where: { id: supplierId } });
};

export const getSupplierStockHistory = async (id) => {
  const supplierId = parseInt(id, 10);
  return prisma.stockEntry.findMany({
    where: { supplierId },
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });
};
