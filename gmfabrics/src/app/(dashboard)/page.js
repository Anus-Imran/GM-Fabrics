"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { KpiCard } from "../../components/dashboard/kpiCard.jsx";
import { SalesChart } from "../../components/dashboard/salesChart.jsx";
import { PaymentMethodChart } from "../../components/dashboard/paymentMethodChart.jsx";
import { CategoryBarChart } from "../../components/dashboard/categoryBarChart.jsx";
import { RecentSalesTable } from "../../components/dashboard/recentSalesTable.jsx";
import { AiInsightPanel } from "../../components/dashboard/aiInsightPanel.jsx";
import { Card, CardHeader } from "../../components/common/card.jsx";
import { Button } from "../../components/common/button.jsx";
import {
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  Plus,
  Package,
  ArrowRight,
  TrendingUp,
  Receipt,
  RotateCcw,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Users,
  Bot,
  Filter,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { useAuth } from "../../context/authContext.jsx";
import api from "../../services/apiService.js";
import { Loader } from "../../components/common/loader.jsx";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchKpis(period);
  }, [period]);

  const fetchKpis = async (selectedPeriod = period, start = customStart, end = customEnd) => {
    setLoading(true);
    try {
      let url = `/reports/dashboard?period=${selectedPeriod}`;
      if (selectedPeriod === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await api.get(url);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = (e) => {
    e.preventDefault();
    if (customStart && customEnd) {
      fetchKpis("custom", customStart, customEnd);
    }
  };

  const currentDateStr = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const averageBillValue =
    data?.periodSalesCount > 0
      ? Math.round(data.periodRevenue / data.periodSalesCount)
      : 0;

  const periodsList = [
    { id: "today", label: "Today" },
    { id: "7days", label: "Last 7 Days" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_year", label: "This Year" },
    { id: "all_time", label: "All Time" },
    { id: "custom", label: "Custom Range" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Executive Welcome & Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white rounded-3xl p-6 md:p-8 shadow-lg border border-zinc-800">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 font-mono tracking-wide">
                {currentDateStr}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM ONLINE ({user?.role || "ADMIN"})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {getGreetingTime()}, {user?.name || "Shop Admin"}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              GM Fabrics Point of Sale & Real-Time Analytics Center. Track daily sales, product inventory, expenses, returns, and customer credit khata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchKpis(period)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Analytics</span>
            </button>

            <Link href="/pos">
              <button
                type="button"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <ShoppingCart className="w-4 h-4 text-zinc-950" />
                <span>Launch POS Counter</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Interactive Date / Period Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Analytics Period</h3>
            <p className="text-[10px] text-zinc-500">Filter KPIs, charts, and financial statistics</p>
          </div>
        </div>

        {/* Period Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-xl text-xs font-bold">
          {periodsList.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === p.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker inputs (If 'custom' period is selected) */}
      {period === "custom" && (
        <form onSubmit={handleCustomApply} className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-zinc-500">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-zinc-500">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
              required
            />
          </div>
          <Button type="submit" size="sm" className="font-bold text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            Apply Date Filter
          </Button>
        </form>
      )}

      {/* 3. Quick Shortcuts Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          href="/pos"
          className="group p-3.5 bg-zinc-900 text-white rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-black transition-all shadow-xs border border-zinc-800 hover:border-zinc-700"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span>New Sale Bill</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/products"
          className="group p-3.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all border border-zinc-200/80 dark:border-zinc-800"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span>Add Fabric</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/stock-entries"
          className="group p-3.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all border border-zinc-200/80 dark:border-zinc-800"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <span>Stock Entry</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/customers"
          className="group p-3.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all border border-zinc-200/80 dark:border-zinc-800"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span>Khata Credit</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/expenses"
          className="group p-3.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-xs col-span-2 sm:col-span-1 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all border border-zinc-200/80 dark:border-zinc-800"
        >
          <span className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span>Expenses Log</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 4. Comprehensive Metric KPI Cards Grid (7 Cards across 2 Rows) */}
      {loading && !data ? (
        <Loader text="Syncing business analytics & KPI metrics..." size="lg" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Sales Revenue"
          value={formatCurrency(data?.periodRevenue || 0)}
          subtext={`Total revenue in selected period`}
          icon={DollarSign}
          badgeText="SALES"
          badgeVariant="success"
        />
        <KpiCard
          title="Counter Orders"
          value={data?.periodSalesCount || 0}
          subtext={`Avg Order: ${formatCurrency(averageBillValue)}`}
          icon={ShoppingBag}
          badgeText="BILLS"
          badgeVariant="info"
        />
        <KpiCard
          title="Shop Expenses"
          value={formatCurrency(data?.periodExpenses || 0)}
          subtext="Operating expenses in period"
          icon={Receipt}
          badgeText="EXPENSES"
          badgeVariant="danger"
        />
        <KpiCard
          title="Returns & Refunds"
          value={formatCurrency(data?.periodReturnsAmount || 0)}
          subtext={`${data?.periodReturnsCount || 0} returned bills`}
          icon={RotateCcw}
          badgeText="RETURNS"
          badgeVariant="warning"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Estimated Net Profit"
          value={formatCurrency(data?.netProfit || 0)}
          subtext="Revenue minus COGS and expenses"
          icon={TrendingUp}
          badgeText={data?.netProfit >= 0 ? "PROFIT" : "LOSS"}
          badgeVariant={data?.netProfit >= 0 ? "success" : "danger"}
        />
        <KpiCard
          title="Khata Credit Owed"
          value={formatCurrency(data?.totalKhataBalance || 0)}
          subtext="Outstanding customer credit"
          icon={CreditCard}
          badgeText={data?.totalKhataBalance > 0 ? "RECEIVABLE" : "CLEARED"}
          badgeVariant={data?.totalKhataBalance > 0 ? "warning" : "success"}
        />
        <KpiCard
          title="Low Stock Watchlist"
          value={data?.lowStockCount || 0}
          subtext="Items below minimum threshold"
          icon={AlertTriangle}
          badgeText={data?.lowStockCount > 0 ? "REORDER" : "OPTIMAL"}
          badgeVariant={data?.lowStockCount > 0 ? "danger" : "success"}
        />
      </div>

      {/* 5. Main Charts Grid: Sales Trend & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Financial Performance Trend Chart */}
        <Card className="lg:col-span-2 shadow-xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader
            title="Financial Performance Trend"
            subtitle={`Sales, Expenses & Net Profit analysis (${data?.period || period})`}
            action={
              <Link href="/reports" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1">
                Full Report <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <div className="p-2">
            <SalesChart data={data?.salesTrend || []} />
          </div>
        </Card>

        {/* AI Business Assistant Panel */}
        <div>
          <AiInsightPanel />
        </div>
      </div>

      {/* 6. Secondary Visual Charts: Payment Breakdown & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <Card className="shadow-xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader
            title="Sales by Payment Method"
            subtitle="Cash Counter vs Digital Card vs Khata Credit"
          />
          <PaymentMethodChart data={data?.paymentMethodBreakdown || []} />
        </Card>

        {/* Fabric Categories Breakdown */}
        <Card className="shadow-xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader
            title="Fabric Category Sales"
            subtitle="Top revenue generating product categories"
          />
          <CategoryBarChart data={data?.categoryBreakdown || []} />
        </Card>
      </div>

      {/* 7. Bottom Tables & Watchlists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Counter Bills */}
        <Card className="lg:col-span-2 shadow-xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader
            title="Recent POS Transactions"
            subtitle="Latest completed counter bills"
            action={
              <Link href="/sales" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <RecentSalesTable sales={data?.recentSales || []} />
        </Card>

        {/* Top Fabrics & Low Stock Alert Column */}
        <div className="space-y-6">
          {/* Top Selling Products */}
          <Card className="shadow-xs border-zinc-200/80 dark:border-zinc-800">
            <CardHeader
              title="Top Selling Fabrics"
              subtitle="Highest revenue items in period"
            />
            <div className="space-y-2.5">
              {!data?.topProducts || data.topProducts.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No fabric sales recorded in this period.</p>
              ) : (
                data.topProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold text-[10px] flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                        <p className="text-[10px] text-zinc-500">{p.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(p.revenue)}
                      </span>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {p.totalSold} {p.unitSymbol} sold
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Low Stock Watchlist */}
          <Card className="shadow-xs border-zinc-200/80 dark:border-zinc-800">
            <CardHeader
              title="Low Stock Watchlist"
              subtitle="Items needing stock replenishment"
              action={
                <Link href="/products" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                  Manage →
                </Link>
              }
            />
            <div className="space-y-2.5">
              {!data?.lowStockProducts || data.lowStockProducts.length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-4 text-center">
                  Inventory stock levels are healthy.
                </p>
              ) : (
                data.lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">{p.category?.name || "Fabric"}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                        {p.stockQuantity} {p.unit?.symbol || "units"}
                      </span>
                      <p className="text-[9px] text-zinc-400">Min Alert: {p.lowStockAlert}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
