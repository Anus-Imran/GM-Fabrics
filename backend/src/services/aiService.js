import OpenAI from "openai";
import { prisma } from "../config/prisma.js";
import { envConfig } from "../config/envConfig.js";

const openai = envConfig.openaiApiKey ? new OpenAI({ apiKey: envConfig.openaiApiKey }) : null;

/**
 * Log AI execution for audit trail
 */
const logAiAction = async (agent, input, output, tokensUsed = 0, metadata = {}) => {
  try {
    await prisma.aiLog.create({
      data: {
        agent,
        input: typeof input === "string" ? input : JSON.stringify(input),
        output: typeof output === "string" ? output : JSON.stringify(output),
        tokensUsed,
        metadata,
      },
    });
  } catch (err) {
    console.error("AI log error:", err);
  }
};

// Agent 1: Low Stock & Reorder Suggestions
export const getLowStockSuggestions = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { unit: true, category: true, brand: true },
  });

  const lowStock = products.filter((p) => p.stockQuantity <= p.lowStockAlert);

  const suggestions = [];

  for (const prod of lowStock) {
    // Calculate 30-day sales velocity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const saleItems = await prisma.saleItem.aggregate({
      where: {
        productId: prod.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { quantity: true },
    });

    const totalSold30d = saleItems._sum.quantity || 0;
    const avgDailySales = totalSold30d / 30;
    const suggestedReorder = Math.ceil(Math.max(prod.lowStockAlert * 3, avgDailySales * 30));

    let aiReasoning = `Current stock is ${prod.stockQuantity} ${prod.unit.symbol || prod.unit.name}. Past 30-day sales: ${totalSold30d} ${prod.unit.symbol || prod.unit.name}. Recommended reorder: ${suggestedReorder} ${prod.unit.symbol || prod.unit.name}.`;

    if (openai) {
      try {
        const prompt = `Product: ${prod.name} (${prod.category.name}), Current Stock: ${prod.stockQuantity} ${prod.unit.name}, Min Threshold: ${prod.lowStockAlert}, 30-day sales: ${totalSold30d}. Write a concise 2-sentence business recommendation for the shop owner.`;
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
        });
        aiReasoning = response.choices[0]?.message?.content?.trim() || aiReasoning;
      } catch (err) {
        console.warn("OpenAI API call skipped for low stock agent:", err.message);
      }
    }

    suggestions.push({
      product: prod,
      currentStock: prod.stockQuantity,
      threshold: prod.lowStockAlert,
      sales30d: totalSold30d,
      suggestedReorderQuantity: suggestedReorder,
      recommendation: aiReasoning,
    });
  }

  await logAiAction("LOW_STOCK_AGENT", { count: lowStock.length }, suggestions);
  return suggestions;
};

// Agent 2: Daily Business Summary
export const getDailySummary = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfToday, lte: endOfToday } },
  });

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startOfToday, lte: endOfToday } },
  });

  const returns = await prisma.return.findMany({
    where: { createdAt: { gte: startOfToday, lte: endOfToday } },
  });

  const totalRevenue = sales.reduce((s, item) => s + item.totalAmount, 0);
  const totalExpenses = expenses.reduce((s, item) => s + item.amount, 0);
  const totalRefunds = returns.reduce((s, item) => s + item.refundAmount, 0);
  const netIncome = totalRevenue - totalExpenses - totalRefunds;

  const dataContext = {
    salesCount: sales.length,
    totalRevenue,
    totalExpenses,
    totalRefunds,
    netIncome,
  };

  let summaryText = `Today you recorded ${sales.length} sales totaling PKR ${totalRevenue.toLocaleString()}. Expenses: PKR ${totalExpenses.toLocaleString()}. Refunds: PKR ${totalRefunds.toLocaleString()}. Estimated Net Daily Profit: PKR ${netIncome.toLocaleString()}.`;

  if (openai) {
    try {
      const prompt = `Write a professional 3-sentence executive daily summary for GM Fabrics POS shop owner based on these stats: Total Sales Count: ${sales.length}, Total Revenue: PKR ${totalRevenue}, Total Expenses: PKR ${totalExpenses}, Total Refunds: PKR ${totalRefunds}, Net Profit: PKR ${netIncome}. Highlight key insights.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });
      summaryText = response.choices[0]?.message?.content?.trim() || summaryText;
    } catch (err) {
      console.warn("OpenAI API call skipped for daily summary:", err.message);
    }
  }

  await logAiAction("DAILY_SUMMARY_AGENT", dataContext, summaryText);

  return {
    date: new Date().toISOString().split("T")[0],
    stats: dataContext,
    summary: summaryText,
  };
};

// Agent 3: Demand Forecasting
export const getDemandForecast = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true, brand: true, unit: true },
  });

  const forecasts = [];

  for (const prod of products) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const aggregate = await prisma.saleItem.aggregate({
      where: {
        productId: prod.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { quantity: true },
    });

    const quantitySold30d = aggregate._sum.quantity || 0;
    const predictedNextMonthDemand = Math.ceil(quantitySold30d * 1.15); // +15% expected growth trend

    forecasts.push({
      product: prod,
      quantitySoldLast30Days: quantitySold30d,
      predictedDemandNext30Days: predictedNextMonthDemand,
      trend: quantitySold30d > 20 ? "HIGH_DEMAND" : quantitySold30d > 5 ? "STABLE" : "SLOW_MOVING",
    });
  }

  forecasts.sort((a, b) => b.predictedDemandNext30Days - a.predictedDemandNext30Days);

  await logAiAction("DEMAND_FORECAST_AGENT", { productCount: products.length }, forecasts.slice(0, 10));

  return forecasts;
};

// Agent 4: Customer Behavior & Khata Analysis
export const getCustomerInsights = async () => {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const insights = customers.map((cust) => {
    const totalSpent = cust.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const lastSaleDate = cust.sales[0] ? cust.sales[0].createdAt : null;

    let segment = "REGULAR";
    if (cust.outstandingBalance > 10000) segment = "HIGH_CREDIT_RISK";
    else if (totalSpent > 50000) segment = "VIP_CUSTOMER";
    else if (!lastSaleDate || (new Date() - new Date(lastSaleDate)) / (1000 * 3600 * 24) > 60)
      segment = "INACTIVE_AT_RISK";

    return {
      customer: cust,
      totalSpent,
      outstandingBalance: cust.outstandingBalance,
      lastPurchaseDate: lastSaleDate,
      segment,
      actionItem:
        segment === "HIGH_CREDIT_RISK"
          ? `Follow up for outstanding Khata balance of PKR ${cust.outstandingBalance.toLocaleString()}`
          : segment === "INACTIVE_AT_RISK"
          ? "Send promotional discount offer to re-engage"
          : "Maintain regular engagement",
    };
  });

  await logAiAction("CUSTOMER_INSIGHTS_AGENT", { customerCount: customers.length }, insights);

  return insights;
};

// Agent 5: Natural Language POS Query Assistant
export const queryAiAssistant = async (userQuery) => {
  if (!userQuery) throw new Error("Query prompt is required");

  // Fetch relevant business data context for AI query
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todaySalesAgg = await prisma.sale.aggregate({
    where: { createdAt: { gte: startOfToday } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  const totalProducts = await prisma.product.count({ where: { isActive: true } });

  const khataAgg = await prisma.customer.aggregate({
    _sum: { outstandingBalance: true },
  });

  const businessContext = `
    Business Context for GM Fabrics POS:
    - Today's Sales Count: ${todaySalesAgg._count.id || 0}
    - Today's Total Revenue: PKR ${todaySalesAgg._sum.totalAmount || 0}
    - Total Active Products in Catalog: ${totalProducts}
    - Total Customer Outstanding Khata Balance: PKR ${khataAgg._sum.outstandingBalance || 0}
  `;

  let responseAnswer = `Based on system records: Today's revenue is PKR ${(todaySalesAgg._sum.totalAmount || 0).toLocaleString()} across ${todaySalesAgg._count.id || 0} sales. Total catalog products: ${totalProducts}. Outstanding customer Khata balance: PKR ${(khataAgg._sum.outstandingBalance || 0).toLocaleString()}.`;

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the AI Assistant for GM Fabrics POS & Inventory System. Answer the owner's question accurately, concisely, and helpfully using the provided live business context: ${businessContext}`,
          },
          { role: "user", content: userQuery },
        ],
        max_tokens: 250,
      });

      responseAnswer = completion.choices[0]?.message?.content?.trim() || responseAnswer;
    } catch (err) {
      console.warn("OpenAI API call error, returning calculated answer:", err.message);
    }
  }

  await logAiAction("NL_QUERY_AGENT", userQuery, responseAnswer);

  return {
    query: userQuery,
    answer: responseAnswer,
  };
};

// Agent 6: Anomaly & Loss Prevention Agent
export const checkAnomalies = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    include: { customer: true, user: { select: { name: true } } },
  });

  const anomalies = [];

  sales.forEach((s) => {
    // 1. High discount check (> 25% or > PKR 2000 flat)
    if (s.discountAmount > s.subtotal * 0.25 && s.discountAmount > 1000) {
      anomalies.push({
        saleId: s.id,
        saleNumber: s.saleNumber,
        type: "HIGH_DISCOUNT_WARNING",
        severity: "MEDIUM",
        details: `High discount of PKR ${s.discountAmount.toLocaleString()} (${Math.round((s.discountAmount / s.subtotal) * 100)}%) applied by ${s.user.name}.`,
      });
    }

    // 2. Unusually high bill amount (> PKR 100,000)
    if (s.totalAmount > 100000) {
      anomalies.push({
        saleId: s.id,
        saleNumber: s.saleNumber,
        type: "LARGE_TRANSACTION_ALERT",
        severity: "INFO",
        details: `Large bill transaction of PKR ${s.totalAmount.toLocaleString()} processed.`,
      });
    }
  });

  await logAiAction("ANOMALY_DETECTION_AGENT", { period: "7_DAYS" }, anomalies);

  return anomalies;
};

// Fetch AI Logs
export const getAiLogs = async () => {
  return prisma.aiLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};
