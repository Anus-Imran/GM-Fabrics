import { prisma } from "../config/prisma.js";

export const getDashboardKpis = async (params = {}) => {
  const { period = "7days", startDate: customStart, endDate: customEnd } = params;

  let rangeStart = new Date();
  let rangeEnd = new Date();
  rangeEnd.setHours(23, 59, 59, 999);

  const now = new Date();

  if (period === "today") {
    rangeStart.setHours(0, 0, 0, 0);
  } else if (period === "7days") {
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
  } else if (period === "this_month") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (period === "last_month") {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === "this_year") {
    rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (period === "all_time") {
    rangeStart = new Date(2020, 0, 1, 0, 0, 0, 0);
  } else if (period === "custom" && customStart && customEnd) {
    rangeStart = new Date(customStart);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(customEnd);
    rangeEnd.setHours(23, 59, 59, 999);
  } else {
    // Default to last 7 days
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
  }

  // 1. Sales in period
  const periodSales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: rangeStart, lte: rangeEnd },
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
    },
    include: {
      saleItems: {
        include: { product: { select: { costPrice: true, categoryId: true } } },
      },
    },
  });

  const periodGrossSales = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const periodSalesCount = periodSales.length;

  // 2. Expenses in period
  const periodExpensesAgg = await prisma.expense.aggregate({
    where: { date: { gte: rangeStart, lte: rangeEnd } },
    _sum: { amount: true },
  });
  const periodExpenses = periodExpensesAgg._sum.amount || 0;

  // 3. Returns in period
  const periodReturnsAgg = await prisma.return.aggregate({
    where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
    _sum: { refundAmount: true },
    _count: { id: true },
  });
  const periodReturnsAmount = periodReturnsAgg._sum.refundAmount || 0;
  const periodReturnsCount = periodReturnsAgg._count.id || 0;

  // Net Revenue = Gross Sales Total - Returns Total
  const periodRevenue = Math.max(0, periodGrossSales - periodReturnsAmount);

  // Calculate exact COGS in period based on item purchase cost prices
  let periodCogs = 0;
  periodSales.forEach((s) => {
    s.saleItems.forEach((si) => {
      const cost = (si.costPrice && si.costPrice > 0) ? si.costPrice : (si.product ? si.product.costPrice : 0);
      periodCogs += si.quantity * cost;
    });
  });

  // 4. Net Profit calculation (Net Revenue - COGS - Operating Expenses)
  const grossProfit = periodRevenue - periodCogs;
  const netProfit = grossProfit - periodExpenses;

  // 5. Total Khata Credit Owed across system
  const customerBalanceAgg = await prisma.customer.aggregate({
    _sum: { outstandingBalance: true },
    _count: { id: true },
  });
  const totalKhataBalance = customerBalanceAgg._sum.outstandingBalance || 0;

  // 6. Total Stock Valuation across all active multi-batch lots
  const activeBatches = await prisma.stockBatch.findMany({
    where: { remainingQuantity: { gt: 0 } },
  });

  let totalStockValue = 0;
  let totalStockItems = 0;

  activeBatches.forEach((b) => {
    totalStockValue += b.remainingQuantity * (b.costPerUnit || 0);
    totalStockItems += b.remainingQuantity;
  });

  const productsWithStock = await prisma.product.findMany({
    where: { isActive: true, stockQuantity: { gt: 0 } },
    include: { batches: { where: { remainingQuantity: { gt: 0 } } } },
  });

  productsWithStock.forEach((p) => {
    if (!p.batches || p.batches.length === 0) {
      totalStockValue += p.stockQuantity * (p.costPrice || 0);
      totalStockItems += p.stockQuantity;
    }
  });

  // 7. Low stock products
  const allActiveProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { unit: true, category: true, brand: true },
  });
  const lowStockProducts = allActiveProducts.filter(
    (p) => p.stockQuantity <= p.lowStockAlert
  );

  // 7. Payment Methods Breakdown (Cash vs Card vs Credit) with Net Sales
  const paymentMethodMap = { CASH: 0, CARD: 0, CREDIT: 0 };
  periodSales.forEach((s) => {
    const method = s.paymentMethod || "CASH";
    if (paymentMethodMap[method] !== undefined) {
      paymentMethodMap[method] += s.totalAmount;
    }
  });

  // Deduct returned amounts by refund method
  const periodReturnsList = await prisma.return.findMany({
    where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
  });
  periodReturnsList.forEach((r) => {
    const method = r.refundMethod || "CASH";
    if (paymentMethodMap[method] !== undefined) {
      paymentMethodMap[method] = Math.max(0, paymentMethodMap[method] - r.refundAmount);
    }
  });

  const paymentMethodBreakdown = [
    { name: "Cash Counter", value: paymentMethodMap.CASH, color: "#10b981" },
    { name: "Card / Digital", value: paymentMethodMap.CARD, color: "#3b82f6" },
    { name: "Khata Credit", value: paymentMethodMap.CREDIT, color: "#f59e0b" },
  ];

  // 8. Category Breakdown
  const categoryRevenueMap = {};
  const categoriesList = await prisma.category.findMany();
  categoriesList.forEach((c) => {
    categoryRevenueMap[c.id] = { name: c.name, revenue: 0 };
  });

  periodSales.forEach((s) => {
    s.saleItems.forEach((si) => {
      const catId = si.product?.categoryId;
      if (catId && categoryRevenueMap[catId]) {
        categoryRevenueMap[catId].revenue += si.subtotal;
      }
    });
  });

  const categoryBreakdown = Object.values(categoryRevenueMap)
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // 9. Trend Chart Data (Group by Day or Month depending on range duration)
  const diffDays = Math.max(1, Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)));
  const isMonthlyView = diffDays > 35;

  const salesTrend = [];

  if (isMonthlyView) {
    // Generate monthly buckets
    let currentMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (currentMonth <= rangeEnd) {
      const mStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0);
      const mEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const mSales = await prisma.sale.findMany({
        where: { createdAt: { gte: mStart, lte: mEnd }, status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
      });
      const mGross = mSales.reduce((sum, s) => sum + s.totalAmount, 0);

      const mExpAgg = await prisma.expense.aggregate({
        where: { date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      });
      const mExp = mExpAgg._sum.amount || 0;

      const mRetAgg = await prisma.return.aggregate({
        where: { createdAt: { gte: mStart, lte: mEnd } },
        _sum: { refundAmount: true },
      });
      const mRet = mRetAgg._sum.refundAmount || 0;

      const mNetRev = Math.max(0, mGross - mRet);
      const label = mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      salesTrend.push({
        label,
        date: mStart.toISOString().split("T")[0],
        revenue: mNetRev,
        expenses: mExp,
        returns: mRet,
        netProfit: Math.max(0, mNetRev - mExp),
        orders: mSales.length,
      });

      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
  } else {
    // Generate daily buckets
    let dayCursor = new Date(rangeStart);
    while (dayCursor <= rangeEnd) {
      const dStart = new Date(dayCursor);
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dayCursor);
      dEnd.setHours(23, 59, 59, 999);

      const dSales = await prisma.sale.findMany({
        where: { createdAt: { gte: dStart, lte: dEnd }, status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
      });
      const dGross = dSales.reduce((sum, s) => sum + s.totalAmount, 0);

      const dExpAgg = await prisma.expense.aggregate({
        where: { date: { gte: dStart, lte: dEnd } },
        _sum: { amount: true },
      });
      const dExp = dExpAgg._sum.amount || 0;

      const dRetAgg = await prisma.return.aggregate({
        where: { createdAt: { gte: dStart, lte: dEnd } },
        _sum: { refundAmount: true },
      });
      const dRet = dRetAgg._sum.refundAmount || 0;

      const dNetRev = Math.max(0, dGross - dRet);
      const label = dStart.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

      salesTrend.push({
        label,
        date: dStart.toISOString().split("T")[0],
        revenue: dNetRev,
        expenses: dExp,
        returns: dRet,
        netProfit: Math.max(0, dNetRev - dExp),
        orders: dSales.length,
      });

      dayCursor.setDate(dayCursor.getDate() + 1);
    }
  }

  // 10. Recent sales
  const recentSales = await prisma.sale.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  // 11. Top products in period
  const topItemsGroup = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, subtotal: true },
    where: {
      sale: { createdAt: { gte: rangeStart, lte: rangeEnd } },
    },
    orderBy: { _sum: { subtotal: "desc" } },
    take: 5,
  });

  const topProducts = [];
  for (const item of topItemsGroup) {
    const p = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { category: true, unit: true },
    });
    if (p) {
      topProducts.push({
        id: p.id,
        name: p.name,
        categoryName: p.category?.name || "Fabric",
        unitSymbol: p.unit?.symbol || "pcs",
        totalSold: item._sum.quantity || 0,
        revenue: item._sum.subtotal || 0,
      });
    }
  }

  return {
    period,
    startDate: rangeStart.toISOString(),
    endDate: rangeEnd.toISOString(),
    todayRevenue: periodRevenue, // Backwards compatibility
    todaySalesCount: periodSalesCount,
    todayExpenses: periodExpenses,
    periodRevenue,
    periodSalesCount,
    periodExpenses,
    periodReturnsAmount,
    periodReturnsCount,
    netProfit,
    totalKhataBalance,
    totalStockValue,
    totalStockItems,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 6),
    paymentMethodBreakdown,
    categoryBreakdown,
    recentSales,
    topProducts,
    salesTrend,
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
    include: {
      category: true,
      brand: true,
      unit: true,
      supplier: true,
      batches: { where: { remainingQuantity: { gt: 0 } } },
    },
    orderBy: { name: "asc" },
  });

  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalItemsCount = 0;

  const productValuation = products.map((p) => {
    let costVal = 0;
    let totalQty = 0;

    if (p.batches && p.batches.length > 0) {
      p.batches.forEach((b) => {
        costVal += b.remainingQuantity * (b.costPerUnit || 0);
        totalQty += b.remainingQuantity;
      });
    } else {
      totalQty = p.stockQuantity;
      costVal = p.stockQuantity * (p.costPrice || 0);
    }

    const retailVal = totalQty * (p.salePrice || 0);

    totalCostValue += costVal;
    totalRetailValue += retailVal;
    totalItemsCount += totalQty;

    return {
      ...p,
      stockQuantity: totalQty,
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

  const grossRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const returnsAgg = await prisma.return.aggregate({
    where: { createdAt: { gte: startDate, lte: endDate } },
    _sum: { refundAmount: true },
  });
  const totalReturns = returnsAgg._sum.refundAmount || 0;
  const totalRevenue = Math.max(0, grossRevenue - totalReturns);

  // 2. Cost of Goods Sold (COGS) based on exact FIFO item cost prices
  let cogs = 0;
  sales.forEach((s) => {
    s.saleItems.forEach((si) => {
      const cost = (si.costPrice && si.costPrice > 0) ? si.costPrice : (si.product ? si.product.costPrice : 0);
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
