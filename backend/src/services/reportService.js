import { prisma } from "../config/prisma.js";

export const getDashboardKpis = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Today's sales
  const todaySales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startOfToday, lte: endOfToday },
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
    },
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todaySalesCount = todaySales.length;

  // 2. Outstanding Khata Balance
  const customerBalanceAgg = await prisma.customer.aggregate({
    _sum: { outstandingBalance: true },
    _count: { id: true },
  });
  const totalKhataBalance = customerBalanceAgg._sum.outstandingBalance || 0;

  // 3. Low stock count & list
  const allActiveProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { unit: true, category: true, brand: true },
  });

  const lowStockProducts = allActiveProducts.filter(
    (p) => p.stockQuantity <= p.lowStockAlert
  );

  // 4. Recent sales
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  // 5. Last 7 days revenue trend
  const last7DaysTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));

    const daySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
      },
    });

    const dayRevenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const dayName = dayStart.toLocaleDateString("en-US", { weekday: "short" });

    last7DaysTrend.push({
      date: dayStart.toISOString().split("T")[0],
      day: dayName,
      revenue: dayRevenue,
      count: daySales.length,
    });
  }

  return {
    todayRevenue,
    todaySalesCount,
    totalKhataBalance,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 5),
    recentSales,
    salesTrend: last7DaysTrend,
  };
};

export const getSalesReport = async (from, to) => {
  const startDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = to ? new Date(to) : new Date();

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      user: { select: { name: true } },
      saleItems: {
        include: { product: { select: { name: true, unit: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = sales
    .filter((s) => s.status !== "REFUNDED")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const totalDiscount = sales.reduce((sum, s) => sum + s.discountAmount, 0);

  return {
    from: startDate,
    to: endDate,
    totalSalesCount: sales.length,
    totalRevenue,
    totalDiscount,
    sales,
  };
};

export const getInventoryReport = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true, brand: true, unit: true, supplier: true },
    orderBy: { name: "asc" },
  });

  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalItemsCount = 0;

  const productValuation = products.map((p) => {
    const costVal = p.stockQuantity * p.costPrice;
    const retailVal = p.stockQuantity * p.salePrice;

    totalCostValue += costVal;
    totalRetailValue += retailVal;
    totalItemsCount += p.stockQuantity;

    return {
      ...p,
      costValuation: costVal,
      retailValuation: retailVal,
    };
  });

  return {
    totalProducts: products.length,
    totalStockItems: totalItemsCount,
    totalCostValue,
    totalRetailValue,
    potentialProfit: totalRetailValue - totalCostValue,
    products: productValuation,
  };
};

export const getProfitLossReport = async (month, year) => {
  const targetYear = parseInt(year || new Date().getFullYear(), 10);
  const targetMonth = parseInt(month || new Date().getMonth() + 1, 10);

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  // 1. Revenue
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
    },
    include: {
      saleItems: {
        include: { product: { select: { costPrice: true } } },
      },
    },
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // 2. Cost of Goods Sold (COGS)
  let cogs = 0;
  sales.forEach((s) => {
    s.saleItems.forEach((si) => {
      // Use cost price snapshot or product cost price
      const cost = si.product ? si.product.costPrice : 0;
      cogs += si.quantity * cost;
    });
  });

  const grossProfit = totalRevenue - cogs;

  // 3. Operating Expenses
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate, lte: endDate } },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  return {
    month: targetMonth,
    year: targetYear,
    totalRevenue,
    cogs,
    grossProfit,
    totalExpenses,
    netProfit,
  };
};

export const getTopProductsReport = async (limit = 10) => {
  const topItems = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { subtotal: "desc" } },
    take: parseInt(limit, 10),
  });

  const result = [];
  for (const item of topItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { category: true, brand: true, unit: true },
    });

    if (product) {
      result.push({
        product,
        totalQuantitySold: item._sum.quantity,
        totalRevenueGenerated: item._sum.subtotal,
      });
    }
  }

  return result;
};
