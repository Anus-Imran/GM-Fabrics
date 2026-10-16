import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2 } from "../utils/money.js";
import { audit } from "../utils/audit.js";
import { postKhataEntry } from "./khataService.js";

const TX_OPTIONS = { maxWait: 10000, timeout: 30000 };

/**
 * Customers list. With `page` it is paginated; `withBalance=true` returns only khata holders.
 * `limit` gives a quick top-N search for the POS customer picker.
 */
export const getAllCustomers = async (filters = {}) => {
  const where = {};
  if (filters.search) {
    const digits = filters.search.replace(/\D/g, "");
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: digits || filters.search } },
      { cnic: { contains: filters.search } },
    ];
  }
  if (filters.withBalance === "true") where.outstandingBalance = { gt: 0 };

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const sortable = ["name", "outstandingBalance", "createdAt"];
  const sortBy = sortable.includes(filters.sortBy) ? filters.sortBy : "name";
  const sortDir = filters.sortDir || (sortBy === "name" ? "asc" : "desc");

  const [items, total, sums] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { sales: true } } },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
    prisma.customer.aggregate({ _sum: { outstandingBalance: true }, where: { outstandingBalance: { gt: 0 } } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { totalOutstanding: round2(sums._sum.outstandingBalance || 0) },
  };
};

export const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        take: 15,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          totalAmount: true,
          paymentMethod: true,
          creditAmount: true,
          status: true,
          user: { select: { name: true } },
        },
      },
      _count: { select: { sales: true } },
    },
  });
  if (!customer) throw notFound("Customer not found");
  return customer;
};

export const createCustomer = async (user, data) => {
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone || null,
      cnic: data.cnic || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
  return customer;
};

// Only profile fields can be edited; the balance changes exclusively through the khata ledger.
export const updateCustomer = async (user, id, data) => {
  return prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone ?? null,
      cnic: data.cnic ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
    },
  });
};

export const deleteCustomer = async (user, id) => {
  const customer = await prisma.customer.findUnique({ where: { id }, include: { _count: { select: { sales: true } } } });
  if (!customer) throw notFound("Customer not found");
  if (customer._count.sales > 0) throw badRequest("Cannot delete a customer with past sales history");
  if (Math.abs(customer.outstandingBalance) > 0.004) {
    throw badRequest("Cannot delete a customer with an open khata balance. Settle or adjust it first.");
  }
  await prisma.customer.delete({ where: { id } });
  await audit(null, user, "CUSTOMER_DELETED", "Customer", id, { name: customer.name });
  return customer;
};

/** Records a khata payment from the customer. Overpayment is rejected. */
export const settleCustomerBalance = async (user, id, { amount, method, notes }) => {
  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw`SELECT id, "outstandingBalance" FROM "Customer" WHERE id = ${id} FOR UPDATE`;
    if (!locked) throw notFound("Customer not found");

    const balance = round2(locked.outstandingBalance);
    if (balance <= 0) throw badRequest("This customer has no outstanding khata balance");
    if (amount > balance + 0.004) {
      throw badRequest(`Payment (PKR ${amount}) is more than the outstanding balance (PKR ${balance})`);
    }

    const entry = await postKhataEntry(tx, {
      customerId: id,
      type: "PAYMENT",
      amount: -amount,
      method,
      notes: notes || null,
      userId: user.id,
    });

    const customer = await tx.customer.findUnique({ where: { id } });
    await tx.notification.create({
      data: {
        type: "KHATA_PAYMENT",
        title: `Khata Payment — ${customer.name}`,
        message: `${customer.name} paid PKR ${amount.toLocaleString()} (${method}). Remaining balance: PKR ${entry.balanceAfter.toLocaleString()}`,
        metadata: { customerId: id, amountPaid: amount, remainingBalance: entry.balanceAfter, method },
      },
    });

    return customer;
  }, TX_OPTIONS);
};

/** Manual balance correction (admin) — always recorded in the ledger and audit log. */
export const adjustCustomerBalance = async (user, id, { amount, notes }) => {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id } });
    if (!customer) throw notFound("Customer not found");
    const entry = await postKhataEntry(tx, { customerId: id, type: "ADJUSTMENT", amount, notes, userId: user.id });
    await audit(tx, user, "KHATA_ADJUSTED", "Customer", id, {
      customer: customer.name,
      amount,
      reason: notes,
      before: customer.outstandingBalance,
      after: entry.balanceAfter,
    });
    return tx.customer.findUnique({ where: { id } });
  }, TX_OPTIONS);
};

/** Khata statement, newest first, paginated. */
export const getCustomerLedger = async (id, { page = 1, pageSize = 50 } = {}) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw notFound("Customer not found");

  const [items, total, sums] = await Promise.all([
    prisma.khataEntry.findMany({
      where: { customerId: id },
      include: { sale: { select: { id: true, saleNumber: true } }, user: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.khataEntry.count({ where: { customerId: id } }),
    prisma.khataEntry.aggregate({ where: { customerId: id }, _sum: { amount: true } }),
  ]);

  // Balance that existed before the ledger was introduced.
  const openingBalance = round2(customer.outstandingBalance - (sums._sum.amount || 0));

  return {
    customer,
    openingBalance,
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};
