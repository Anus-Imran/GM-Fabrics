import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { round2, round3 } from "../utils/money.js";
import {
  OFFSET_MS,
  PG_OFFSET,
  startOfLocalDay,
  endOfLocalDay,
  startOfLocalMonth,
  startOfLocalYear,
  parseLocalDate,
  localMidnight,
  localDateKey,
} from "../utils/time.js";
import { valuationOf } from "./inventoryService.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

/**
 * Reports are computed with a handful of SQL aggregates (GROUP BY in Postgres) instead of
 * loading every sale into memory or running one query per day — this is what keeps the
 * dashboard fast as the data grows.
 */

const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const SHIFT = Prisma.raw(`interval '${PG_OFFSET}'`);
const NOT_VOIDED = Prisma.sql`s."status" <> 'VOIDED'`;

export const resolvePeriod = async ({ period = "7days", startDate, endDate }) => {
  const now = new Date();
  let start;
  let end = endOfLocalDay(now);

  switch (period) {
    case "today":
      start = startOfLocalDay(now);
      break;
    case "this_month":
      start = startOfLocalMonth(now);
      break;
    case "last_month":
      start = startOfLocalMonth(now, -1);
      end = new Date(startOfLocalMonth(now).getTime() - 1);
      break;
    case "this_year":
      start = startOfLocalYear(now);
      break;
    case "all_time": {
      const [first] = await prisma.$queryRaw`
        SELECT LEAST(
          (SELECT MIN("createdAt") FROM "Sale"),
          (SELECT MIN("date") FROM "Expense")
        ) AS first`;
      start = first?.first ? startOfLocalMonth(new Date(first.first)) : startOfLocalMonth(now);
      break;
    }
    case "custom": {
      const s = parseLocalDate(startDate);
      const e = parseLocalDate(endDate);
      if (s && e) {
        start = s <= e ? s : e;
        end = endOfLocalDay(s <= e ? e : s);
        break;
      }
      start = new Date(startOfLocalDay(now).getTime() - 6 * 86400000);
      break;
    }
    case "7days":
    default:
      start = new Date(startOfLocalDay(now).getTime() - 6 * 86400000);
  }
  return { start, end };
};

/** Revenue, COGS (net of restocked returns), expenses and profit for a range. */
const computeFinancials = async (start, end) => {
  const [salesAgg, cogsAgg, returnsAgg, returnedCogsAgg, expensesAgg] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(s."totalAmount"), 0) AS gross, COALESCE(SUM(s."discountAmount"), 0) AS discount
      FROM "Sale" s
      WHERE s."createdAt" BETWEEN ${start} AND ${end} AND ${NOT_VOIDED}`,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(si."quantity" * COALESCE(NULLIF(si."costPrice", 0), p."costPrice")), 0) AS cogs
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."createdAt" BETWEEN ${start} AND ${end} AND ${NOT_VOIDED}`,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(r."refundAmount"), 0) AS amount
      FROM "Return" r
      WHERE r."createdAt" BETWEEN ${start} AND ${end}`,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(ri."quantity" * COALESCE(NULLIF(si."costPrice", 0), p."costPrice")), 0) AS cogs
      FROM "ReturnItem" ri
      JOIN "Return" r ON r.id = ri."returnId"
      JOIN "SaleItem" si ON si.id = ri."saleItemId"
      JOIN "Product" p ON p.id = ri."productId"
      WHERE r."createdAt" BETWEEN ${start} AND ${end} AND ri."condition" = 'RESTOCK'`,
    prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
  ]);

  const gross = round2(num(salesAgg[0].gross));
  const returns = round2(num(returnsAgg[0].amount));
  const revenue = round2(gross - returns);
  // Stock that came back on the shelf is no longer a cost of goods sold.
  const cogs = round2(num(cogsAgg[0].cogs) - num(returnedCogsAgg[0].cogs));
  const expenses = round2(expensesAgg._sum.amount || 0);
  const grossProfit = round2(revenue - cogs);

  return {
    salesCount: salesAgg[0].count,
    grossSales: gross,
    totalDiscount: round2(num(salesAgg[0].discount)),
    returnsAmount: returns,
    returnsCount: returnsAgg[0].count,
    revenue,
    cogs,
    grossProfit,
    expenses,
    netProfit: round2(grossProfit - expenses),
  };
};

const computeStockValuation = async () => {
  const [row] = await prisma.$queryRaw`
    WITH b AS (
      SELECT "productId", SUM("remainingQuantity") AS q, SUM("remainingQuantity" * "costPrice") AS v
      FROM "StockBatch" WHERE "remainingQuantity" > 0 GROUP BY "productId"
    )
    SELECT
      COALESCE(SUM(
        CASE
          WHEN COALESCE(b.q, 0) <= p."stockQuantity"
            THEN COALESCE(b.v, 0) + (p."stockQuantity" - COALESCE(b.q, 0)) * p."costPrice"
          ELSE b.v * p."stockQuantity" / NULLIF(b.q, 0)
        END
      ), 0) AS value,
      COALESCE(SUM(p."stockQuantity"), 0) AS items,
      COALESCE(SUM(p."stockQuantity" * p."salePrice"), 0) AS retail
    FROM "Product" p
    LEFT JOIN b ON b."productId" = p.id
    WHERE p."isActive" = true AND p."stockQuantity" > 0`;
  return { value: round2(num(row.value)), items: round3(num(row.items)), retail: round2(num(row.retail)) };
};

/** Builds a continuous list of day or month buckets (shop-local) for the trend chart. */
const buildBuckets = (start, end, monthly) => {
  const buckets = [];
  const startLocal = new Date(start.getTime() + OFFSET_MS);
  let y = startLocal.getUTCFullYear();
  let m = startLocal.getUTCMonth();
  let d = startLocal.getUTCDate();

  for (let guard = 0; guard < 2000; guard++) {
    const bucketStart = monthly ? localMidnight(y, m, 1) : localMidnight(y, m, d);
    if (bucketStart > end) break;
    const key = monthly ? `${y}-${String(m + 1).padStart(2, "0")}` : localDateKey(bucketStart);
    const labelDate = new Date(Date.UTC(y, m, monthly ? 1 : d));
    buckets.push({
      key,
      date: monthly ? `${key}-01` : key,
      label: monthly
        ? labelDate.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
        : labelDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }),
    });
    if (monthly) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    } else {
      const next = new Date(Date.UTC(y, m, d + 1));
      y = next.getUTCFullYear();
      m = next.getUTCMonth();
      d = next.getUTCDate();
    }
  }
  return buckets;
};

const computeTrend = async (start, end) => {
  const days = Math.ceil((end - start) / 86400000);
  const monthly = days > 62;
  const unit = Prisma.raw(monthly ? "'month'" : "'day'");
  const fmt = Prisma.raw(monthly ? "'YYYY-MM'" : "'YYYY-MM-DD'");

  const [sales, expenses, returns] = await Promise.all([
    prisma.$queryRaw`
      SELECT to_char(date_trunc(${unit}, s."createdAt" + ${SHIFT}), ${fmt}) AS k,
             COUNT(*)::int AS orders, COALESCE(SUM(s."totalAmount"), 0) AS gross
      FROM "Sale" s
      WHERE s."createdAt" BETWEEN ${start} AND ${end} AND ${NOT_VOIDED}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT to_char(date_trunc(${unit}, e."date" + ${SHIFT}), ${fmt}) AS k, COALESCE(SUM(e."amount"), 0) AS amount
      FROM "Expense" e
      WHERE e."date" BETWEEN ${start} AND ${end}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT to_char(date_trunc(${unit}, r."createdAt" + ${SHIFT}), ${fmt}) AS k, COALESCE(SUM(r."refundAmount"), 0) AS amount
      FROM "Return" r
      WHERE r."createdAt" BETWEEN ${start} AND ${end}
      GROUP BY 1`,
  ]);

  const salesMap = new Map(sales.map((r) => [r.k, r]));
  const expMap = new Map(expenses.map((r) => [r.k, num(r.amount)]));
  const retMap = new Map(returns.map((r) => [r.k, num(r.amount)]));

  return buildBuckets(start, end, monthly).map((b) => {
    const gross = num(salesMap.get(b.key)?.gross);
    const ret = retMap.get(b.key) || 0;
    const exp = expMap.get(b.key) || 0;
    const revenue = round2(gross - ret);
    return {
      label: b.label,
      date: b.date,
      revenue,
      expenses: round2(exp),
      returns: round2(ret),
      netProfit: round2(revenue - exp),
      orders: salesMap.get(b.key)?.orders || 0,
    };
  });
};

const computeTopProducts = async (start, end, limit = 5) => {
  const rows = await prisma.$queryRaw`
    WITH sold AS (
      SELECT si."productId", SUM(si."quantity") AS qty, SUM(si."subtotal") AS revenue
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
      WHERE s."createdAt" BETWEEN ${start} AND ${end} AND ${NOT_VOIDED}
      GROUP BY si."productId"
    ),
    returned AS (
      SELECT ri."productId", SUM(ri."quantity") AS qty, SUM(ri."refundAmount") AS amount
      FROM "ReturnItem" ri JOIN "Return" r ON r.id = ri."returnId"
      WHERE r."createdAt" BETWEEN ${start} AND ${end}
      GROUP BY ri."productId"
    )
    SELECT p.id, p.name, c.name AS "categoryName", u.symbol AS "unitSymbol",
           sold.qty - COALESCE(returned.qty, 0) AS "totalSold",
           sold.revenue - COALESCE(returned.amount, 0) AS revenue
    FROM sold
    JOIN "Product" p ON p.id = sold."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Unit" u ON u.id = p."unitId"
    LEFT JOIN returned ON returned."productId" = sold."productId"
    ORDER BY revenue DESC
    LIMIT ${limit}`;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categoryName: r.categoryName || "Fabric",
    unitSymbol: r.unitSymbol || "pcs",
    totalSold: round3(num(r.totalSold)),
    revenue: round2(num(r.revenue)),
  }));
};

export const getDashboardKpis = async (params = {}, user) => {
  const admin = isAdmin(user);
  const { start, end } = await resolvePeriod(params);

  const [fin, paymentRows, refundRows, categoryRows, trend, topProducts, khata, stock, lowStockCount, lowStockProducts, recentSales] =
    await Promise.all([
      computeFinancials(start, end),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: start, lte: end }, status: { not: "VOIDED" } },
        _sum: { totalAmount: true },
      }),
      prisma.return.groupBy({
        by: ["refundMethod"],
        where: { createdAt: { gte: start, lte: end } },
        _sum: { refundAmount: true },
      }),
      prisma.$queryRaw`
        SELECT c.name, COALESCE(SUM(si."subtotal"), 0) AS revenue
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN "Product" p ON p.id = si."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE s."createdAt" BETWEEN ${start} AND ${end} AND ${NOT_VOIDED}
        GROUP BY c.name
        HAVING SUM(si."subtotal") > 0
        ORDER BY revenue DESC`,
      computeTrend(start, end),
      computeTopProducts(start, end, 5),
      prisma.customer.aggregate({ where: { outstandingBalance: { gt: 0 } }, _sum: { outstandingBalance: true }, _count: { id: true } }),
      admin ? computeStockValuation() : Promise.resolve(null),
      prisma.product.count({ where: { isActive: true, stockQuantity: { lte: prisma.product.fields.lowStockAlert } } }),
      prisma.product.findMany({
        where: { isActive: true, stockQuantity: { lte: prisma.product.fields.lowStockAlert } },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          lowStockAlert: true,
          unit: { select: { symbol: true, name: true } },
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
        orderBy: { stockQuantity: "asc" },
        take: 6,
      }),
      prisma.sale.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          totalAmount: true,
          paymentMethod: true,
          status: true,
          customer: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

  const methodTotal = (m) =>
    round2(
      Math.max(
        0,
        (paymentRows.find((r) => r.paymentMethod === m)?._sum.totalAmount || 0) -
          (refundRows.find((r) => r.refundMethod === m)?._sum.refundAmount || 0)
      )
    );

  const hide = (v) => (admin ? v : null);

  return {
    period: params.period || "7days",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    todayRevenue: fin.revenue, // Backwards compatibility
    todaySalesCount: fin.salesCount,
    todayExpenses: fin.expenses,
    periodRevenue: fin.revenue,
    periodGrossSales: fin.grossSales,
    periodSalesCount: fin.salesCount,
    periodExpenses: fin.expenses,
    periodReturnsAmount: fin.returnsAmount,
    periodReturnsCount: fin.returnsCount,
    periodDiscount: fin.totalDiscount,
    cogs: hide(fin.cogs),
    grossProfit: hide(fin.grossProfit),
    netProfit: hide(fin.netProfit),
    totalKhataBalance: round2(khata._sum.outstandingBalance || 0),
    khataCustomers: khata._count.id,
    totalStockValue: hide(stock?.value ?? null),
    totalRetailValue: hide(stock?.retail ?? null),
    totalStockItems: hide(stock?.items ?? null),
    lowStockCount,
    lowStockProducts,
    paymentMethodBreakdown: [
      { name: "Cash Counter", value: methodTotal("CASH"), color: "#10b981" },
      { name: "Card / Digital", value: methodTotal("CARD"), color: "#3b82f6" },
      { name: "Khata Credit", value: methodTotal("CREDIT"), color: "#f59e0b" },
    ],
    categoryBreakdown: categoryRows.map((r) => ({ name: r.name, revenue: round2(num(r.revenue)) })),
    recentSales,
    topProducts,
    salesTrend: trend,
  };
};

export const getSalesReport = async (from, to) => {
  const startDate = parseLocalDate(from) || new Date(startOfLocalDay().getTime() - 29 * 86400000);
  const endDate = to ? endOfLocalDay(parseLocalDate(to) || new Date(to)) : endOfLocalDay();
  const fin = await computeFinancials(startDate, endDate);
  const byMethod = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { createdAt: { gte: startDate, lte: endDate }, status: { not: "VOIDED" } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  return {
    from: startDate,
    to: endDate,
    totalSalesCount: fin.salesCount,
    totalRevenue: fin.revenue,
    totalDiscount: fin.totalDiscount,
    totalReturns: fin.returnsAmount,
    byPaymentMethod: byMethod.map((r) => ({ method: r.paymentMethod, count: r._count.id, total: round2(r._sum.totalAmount || 0) })),
  };
};

export const getInventoryReport = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: { select: { id: true, name: true } },
      stockBatches: {
        where: { remainingQuantity: { gt: 0 } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { remainingQuantity: true, costPrice: true },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalItemsCount = 0;

  const productValuation = products.map((p) => {
    const costVal = valuationOf(p, p.stockBatches);
    const retailVal = round2(Math.max(0, p.stockQuantity) * (p.salePrice || 0));
    totalCostValue += costVal;
    totalRetailValue += retailVal;
    totalItemsCount += Math.max(0, p.stockQuantity);
    const { stockBatches, ...rest } = p;
    return { ...rest, costValuation: costVal, retailValuation: retailVal };
  });

  return {
    totalProducts: products.length,
    totalStockItems: round3(totalItemsCount),
    totalCostValue: round2(totalCostValue),
    totalRetailValue: round2(totalRetailValue),
    potentialProfit: round2(totalRetailValue - totalCostValue),
    products: productValuation,
  };
};

export const getProfitLossReport = async (month, year) => {
  const now = new Date(Date.now() + OFFSET_MS);
  const targetYear = parseInt(year || now.getUTCFullYear(), 10);
  const targetMonth = parseInt(month || now.getUTCMonth() + 1, 10);

  const startDate = localMidnight(targetYear, targetMonth - 1, 1);
  const endDate = new Date(localMidnight(targetYear, targetMonth, 1).getTime() - 1);
  const fin = await computeFinancials(startDate, endDate);

  return {
    month: targetMonth,
    year: targetYear,
    grossSales: fin.grossSales,
    totalReturns: fin.returnsAmount,
    totalRevenue: fin.revenue,
    cogs: fin.cogs,
    grossProfit: fin.grossProfit,
    totalExpenses: fin.expenses,
    netProfit: fin.netProfit,
  };
};

export const getTopProductsReport = async (limit = 10, from, to) => {
  const start = parseLocalDate(from) || new Date(0);
  const end = to ? endOfLocalDay(parseLocalDate(to) || new Date(to)) : endOfLocalDay();
  const rows = await computeTopProducts(start, end, Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100));
  return rows.map((r) => ({
    product: { id: r.id, name: r.name, category: { name: r.categoryName }, unit: { symbol: r.unitSymbol } },
    totalQuantitySold: r.totalSold,
    totalRevenueGenerated: r.revenue,
  }));
};
