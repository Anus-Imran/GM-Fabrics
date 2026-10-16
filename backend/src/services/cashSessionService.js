import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { round2 } from "../utils/money.js";
import { audit } from "../utils/audit.js";

/**
 * Cash drawer sessions: open the day with a float, close it with a counted amount.
 * Expected cash = opening float + cash taken − cash paid out during the session.
 */
export const computeSessionSummary = async (openedAt, closedAt, openingCash) => {
  const window = { gte: openedAt, lte: closedAt };

  const [sales, khataPayments, refunds, expenses, supplierPayments, byCashier] = await Promise.all([
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: window, status: { not: "VOIDED" } },
      _sum: { totalAmount: true, amountPaid: true, changeAmount: true, creditAmount: true },
      _count: { id: true },
    }),
    prisma.khataEntry.groupBy({
      by: ["method"],
      where: { createdAt: window, type: "PAYMENT" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.return.groupBy({
      by: ["refundMethod"],
      where: { createdAt: window },
      _sum: { refundAmount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({ where: { createdAt: window, fromDrawer: true }, _sum: { amount: true }, _count: { id: true } }),
    prisma.supplierPayment.aggregate({ where: { createdAt: window, fromDrawer: true }, _sum: { amount: true }, _count: { id: true } }),
    prisma.sale.groupBy({
      by: ["userId", "paymentMethod"],
      where: { createdAt: window, status: { not: "VOIDED" } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  const sale = (m) => sales.find((s) => s.paymentMethod === m);
  const cashSales = round2(sale("CASH")?._sum.totalAmount || 0);
  const cardSales = round2(sale("CARD")?._sum.totalAmount || 0);
  const creditSalesTotal = round2(sale("CREDIT")?._sum.totalAmount || 0);
  const khataAdvanceCash = round2(sale("CREDIT")?._sum.amountPaid || 0);
  const khataAdded = round2(sale("CREDIT")?._sum.creditAmount || 0);

  const khataCash = round2(-(khataPayments.find((k) => k.method === "CASH")?._sum.amount || 0));
  const khataCard = round2(-(khataPayments.find((k) => k.method === "CARD")?._sum.amount || 0));

  const cashRefunds = round2(refunds.find((r) => r.refundMethod === "CASH")?._sum.refundAmount || 0);
  const cardRefunds = round2(refunds.find((r) => r.refundMethod === "CARD")?._sum.refundAmount || 0);
  const khataRefunds = round2(refunds.find((r) => r.refundMethod === "CREDIT")?._sum.refundAmount || 0);

  const drawerExpenses = round2(expenses._sum.amount || 0);
  const drawerSupplierPayments = round2(supplierPayments._sum.amount || 0);

  const cashIn = round2(cashSales + khataAdvanceCash + khataCash);
  const cashOut = round2(cashRefunds + drawerExpenses + drawerSupplierPayments);
  const expectedCash = round2((openingCash || 0) + cashIn - cashOut);

  const userIds = [...new Set(byCashier.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const cashiers = userIds.map((uid) => {
    const rows = byCashier.filter((r) => r.userId === uid);
    const by = (m) => round2(rows.find((r) => r.paymentMethod === m)?._sum.totalAmount || 0);
    return {
      userId: uid,
      name: users.find((u) => u.id === uid)?.name || `User #${uid}`,
      bills: rows.reduce((s, r) => s + r._count.id, 0),
      cash: by("CASH"),
      card: by("CARD"),
      credit: by("CREDIT"),
      total: round2(rows.reduce((s, r) => s + (r._sum.totalAmount || 0), 0)),
    };
  });

  return {
    from: openedAt,
    to: closedAt,
    openingCash: round2(openingCash || 0),
    billsCount: sales.reduce((s, r) => s + r._count.id, 0),
    grossSales: round2(cashSales + cardSales + creditSalesTotal),
    cashSales,
    cardSales,
    creditSalesTotal,
    khataAdvanceCash,
    khataAdded,
    khataCashReceived: khataCash,
    khataCardReceived: khataCard,
    cashRefunds,
    cardRefunds,
    khataRefunds,
    drawerExpenses,
    drawerSupplierPayments,
    cashIn,
    cashOut,
    expectedCash,
    cashiers,
  };
};

const sessionInclude = {
  openedBy: { select: { id: true, name: true } },
  closedBy: { select: { id: true, name: true } },
};

export const getCurrentSession = async () => {
  const session = await prisma.cashSession.findFirst({
    where: { status: "OPEN" },
    include: sessionInclude,
    orderBy: { openedAt: "desc" },
  });
  if (!session) return null;
  const summary = await computeSessionSummary(session.openedAt, new Date(), session.openingCash);
  return { ...session, summary };
};

export const openSession = async (user, { openingCash, notes }) => {
  return prisma.$transaction(async (tx) => {
    // Serialise opening so two cashiers cannot open two drawers at once.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${2718281828}::bigint)`;
    const open = await tx.cashSession.findFirst({ where: { status: "OPEN" } });
    if (open) throw badRequest("A cash drawer session is already open. Close it before opening a new one.");
    const session = await tx.cashSession.create({
      data: { openingCash: round2(openingCash), openedById: user.id, notes: notes || null },
      include: sessionInclude,
    });
    await audit(tx, user, "CASH_SESSION_OPENED", "CashSession", session.id, { openingCash: session.openingCash });
    return session;
  });
};

export const closeSession = async (user, id, { countedCash, notes }) => {
  const session = await prisma.cashSession.findUnique({ where: { id } });
  if (!session) throw notFound("Cash session not found");
  if (session.status !== "OPEN") throw badRequest("This session is already closed");

  const closedAt = new Date();
  const summary = await computeSessionSummary(session.openedAt, closedAt, session.openingCash);
  const counted = round2(countedCash);
  const difference = round2(counted - summary.expectedCash);

  const closed = await prisma.$transaction(async (tx) => {
    const updated = await tx.cashSession.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: "CLOSED",
        closedAt,
        closedById: user.id,
        countedCash: counted,
        expectedCash: summary.expectedCash,
        difference,
        summary,
        notes: [session.notes, notes].filter(Boolean).join(" | ") || null,
      },
    });
    if (updated.count === 0) throw badRequest("This session was closed by someone else");

    if (Math.abs(difference) >= 1) {
      await tx.notification.create({
        data: {
          type: "CASH_DIFFERENCE",
          title: `Cash ${difference > 0 ? "over" : "short"} by PKR ${Math.abs(difference).toLocaleString()}`,
          message: `Day close #${id}: expected PKR ${summary.expectedCash.toLocaleString()}, counted PKR ${counted.toLocaleString()}.`,
          metadata: { sessionId: id, expected: summary.expectedCash, counted, difference },
        },
      });
    }
    await audit(tx, user, "CASH_SESSION_CLOSED", "CashSession", id, { expected: summary.expectedCash, counted, difference });
    return tx.cashSession.findUnique({ where: { id }, include: sessionInclude });
  });

  return closed;
};

export const getSessions = async ({ page = 1, pageSize = 25 } = {}) => {
  const [items, total] = await Promise.all([
    prisma.cashSession.findMany({
      include: sessionInclude,
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cashSession.count(),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

export const getSessionById = async (id) => {
  const session = await prisma.cashSession.findUnique({ where: { id }, include: sessionInclude });
  if (!session) throw notFound("Cash session not found");
  if (session.status === "OPEN") {
    return { ...session, summary: await computeSessionSummary(session.openedAt, new Date(), session.openingCash) };
  }
  return session;
};
