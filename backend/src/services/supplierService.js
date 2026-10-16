import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2 } from "../utils/money.js";
import { parseLocalDateTime } from "../utils/time.js";
import { audit } from "../utils/audit.js";

/** Suppliers with payables: total purchased − total paid = balance owed. */
export const getAllSuppliers = async () => {
  const [suppliers, purchases, payments] = await Promise.all([
    prisma.supplier.findMany({
      include: { _count: { select: { products: true, stockEntries: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.stockEntry.groupBy({ by: ["supplierId"], _sum: { totalCost: true }, where: { supplierId: { not: null } } }),
    prisma.supplierPayment.groupBy({ by: ["supplierId"], _sum: { amount: true } }),
  ]);

  const purchaseMap = new Map(purchases.map((p) => [p.supplierId, p._sum.totalCost || 0]));
  const paymentMap = new Map(payments.map((p) => [p.supplierId, p._sum.amount || 0]));

  return suppliers.map((s) => {
    const totalPurchased = round2(purchaseMap.get(s.id) || 0);
    const totalPaid = round2(paymentMap.get(s.id) || 0);
    return { ...s, totalPurchased, totalPaid, balanceDue: round2(totalPurchased - totalPaid) };
  });
};

export const getSupplierById = async (id) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: { where: { isActive: true }, select: { id: true, name: true, stockQuantity: true, salePrice: true } },
      stockEntries: {
        take: 10,
        orderBy: { purchasedAt: "desc" },
        include: { product: { select: { name: true } } },
      },
    },
  });
  if (!supplier) throw notFound("Supplier not found");
  return supplier;
};

export const createSupplier = async (user, data) => {
  const supplier = await prisma.supplier.create({ data });
  await audit(null, user, "SUPPLIER_CREATED", "Supplier", supplier.id, { name: supplier.name });
  return supplier;
};

export const updateSupplier = async (user, id, data) => {
  const { name, phone, address, city, notes } = data;
  return prisma.supplier.update({ where: { id }, data: { name, phone, address, city, notes } });
};

export const deleteSupplier = async (user, id) => {
  const [entries, payments] = await Promise.all([
    prisma.stockEntry.count({ where: { supplierId: id } }),
    prisma.supplierPayment.count({ where: { supplierId: id } }),
  ]);
  if (entries > 0 || payments > 0) {
    throw badRequest("This supplier has purchase or payment history and cannot be deleted");
  }
  await prisma.product.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
  const supplier = await prisma.supplier.delete({ where: { id } });
  await audit(null, user, "SUPPLIER_DELETED", "Supplier", id, { name: supplier.name });
  return supplier;
};

export const getSupplierStockHistory = async (id) => {
  return prisma.stockEntry.findMany({
    where: { supplierId: id },
    include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    orderBy: { purchasedAt: "desc" },
  });
};

/** Supplier statement: purchases and payments in date order with a running balance. */
export const getSupplierLedger = async (id) => {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw notFound("Supplier not found");

  const [entries, payments] = await Promise.all([
    prisma.stockEntry.findMany({
      where: { supplierId: id },
      include: { product: { select: { name: true, unit: { select: { symbol: true } } } } },
      orderBy: { purchasedAt: "asc" },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: id },
      include: { user: { select: { name: true } } },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const rows = [
    ...entries.map((e) => ({
      type: "PURCHASE",
      id: `P${e.id}`,
      date: e.purchasedAt,
      description: `${e.product?.name || "Product"} — ${e.quantity} ${e.product?.unit?.symbol || ""} @ ${e.costPerUnit}`,
      reference: e.invoiceNumber,
      debit: round2(e.totalCost),
      credit: 0,
    })),
    ...payments.map((p) => ({
      type: "PAYMENT",
      id: `R${p.id}`,
      paymentId: p.id,
      date: p.paidAt,
      description: `Payment (${p.method})${p.notes ? ` — ${p.notes}` : ""}`,
      reference: p.reference,
      recordedBy: p.user?.name || null,
      debit: 0,
      credit: round2(p.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = 0;
  for (const row of rows) {
    balance = round2(balance + row.debit - row.credit);
    row.balance = balance;
  }

  return {
    supplier,
    rows: rows.reverse(),
    totalPurchased: round2(entries.reduce((s, e) => s + e.totalCost, 0)),
    totalPaid: round2(payments.reduce((s, p) => s + p.amount, 0)),
    balanceDue: balance,
  };
};

export const recordSupplierPayment = async (user, supplierId, data) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw notFound("Supplier not found");

  const paidAt = data.paidAt ? parseLocalDateTime(data.paidAt) : new Date();
  if (!paidAt || isNaN(paidAt.getTime())) throw badRequest("Invalid payment date");

  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.create({
      data: {
        supplierId,
        amount: round2(data.amount),
        method: data.method,
        reference: data.reference || null,
        fromDrawer: !!data.fromDrawer,
        notes: data.notes || null,
        paidAt,
        userId: user.id,
      },
    });
    await audit(tx, user, "SUPPLIER_PAYMENT", "Supplier", supplierId, { supplier: supplier.name, amount: payment.amount, method: payment.method });
    return payment;
  });
};

export const deleteSupplierPayment = async (user, supplierId, paymentId) => {
  const payment = await prisma.supplierPayment.findFirst({ where: { id: paymentId, supplierId } });
  if (!payment) throw notFound("Payment not found");
  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.delete({ where: { id: paymentId } });
    await audit(tx, user, "SUPPLIER_PAYMENT_DELETED", "Supplier", supplierId, { amount: payment.amount, method: payment.method });
  });
  return { id: paymentId };
};
