import { prisma } from "../config/prisma.js";

export const getAllCustomers = async (search = "") => {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { cnic: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.customer.findMany({
    where,
    include: {
      _count: { select: { sales: true } },
    },
    orderBy: { name: "asc" },
  });
};

export const getCustomerById = async (id) => {
  const custId = parseInt(id, 10);
  const customer = await prisma.customer.findUnique({
    where: { id: custId },
    include: {
      sales: {
        take: 15,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!customer) throw new Error("Customer not found");
  return customer;
};

export const createCustomer = async ({ name, phone, cnic, address, notes }) => {
  if (phone) {
    const existingPhone = await prisma.customer.findUnique({ where: { phone } });
    if (existingPhone) throw new Error("Customer with this phone number already exists");
  }

  return prisma.customer.create({
    data: { name, phone, cnic, address, notes },
  });
};

export const updateCustomer = async (id, data) => {
  const custId = parseInt(id, 10);
  return prisma.customer.update({
    where: { id: custId },
    data,
  });
};

export const deleteCustomer = async (id) => {
  const custId = parseInt(id, 10);
  const salesCount = await prisma.sale.count({ where: { customerId: custId } });
  if (salesCount > 0) {
    throw new Error("Cannot delete customer with past sales history");
  }
  return prisma.customer.delete({ where: { id: custId } });
};

export const settleCustomerBalance = async (id, { amount, notes }) => {
  const custId = parseInt(id, 10);
  const payAmount = parseFloat(amount);

  if (isNaN(payAmount) || payAmount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: custId } });
    if (!customer) throw new Error("Customer not found");

    const newBalance = Math.max(0, customer.outstandingBalance - payAmount);

    const updatedCustomer = await tx.customer.update({
      where: { id: custId },
      data: { outstandingBalance: newBalance },
    });

    // Create system notification log
    await tx.notification.create({
      data: {
        type: "KHATA_PAYMENT",
        title: `Khata Balance Payment — ${customer.name}`,
        message: `Customer ${customer.name} paid PKR ${payAmount.toLocaleString()}. Remaining balance: PKR ${newBalance.toLocaleString()}`,
        metadata: { customerId: custId, amountPaid: payAmount, remainingBalance: newBalance, notes },
      },
    });

    return updatedCustomer;
  }, {
    maxWait: 10000,
    timeout: 30000,
  });
};
