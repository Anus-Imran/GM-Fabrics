"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { KpiCard } from "../../components/dashboard/kpiCard.jsx";
import { SalesChart } from "../../components/dashboard/salesChart.jsx";
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
  Sparkles,
  Users,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { useAuth } from "../../context/authContext.jsx";
import api from "../../services/apiService.js";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/dashboard");
      if (res.data) setData(res.data);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentDateStr = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-500">{currentDateStr}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {user?.role || "CASHIER"} ACTIVE
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Welcome back, {user?.name || "Shop Admin"} 👋
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            GM Fabrics Point of Sale & Real-Time Inventory Control Center.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchKpis} className="flex items-center gap-1.5 font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Data
          </Button>

          <Link href="/pos">
            <Button size="sm" className="flex items-center gap-2 font-bold shadow-sm">
              <ShoppingCart className="w-4 h-4" /> Launch POS Counter
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Shortcuts Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/pos"
          className="p-3 bg-zinc-900 text-white rounded-xl font-bold text-xs flex items-center justify-between hover:bg-black transition-all cursor-pointer shadow-xs"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Create New Bill
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          href="/products"
          className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-xs flex items-center justify-between hover:bg-zinc-200/70 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
        </Link>

        <Link
          href="/stock-entries"
          className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-xs flex items-center justify-between hover:bg-zinc-200/70 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Stock Purchase
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
        </Link>

        <Link
          href="/customers"
          className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-xs flex items-center justify-between hover:bg-zinc-200/70 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Khata Accounts
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
        </Link>
      </div>

      {/* KPI Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Revenue"
          value={formatCurrency(data?.todayRevenue || 0)}
          subtext="Net POS sales today"
          icon={DollarSign}
          badgeText="LIVE"
        />
        <KpiCard
          title="Today's Bills"
          value={data?.todaySalesCount || 0}
          subtext="Completed counter sales"
          icon={ShoppingBag}
        />
        <KpiCard
          title="Low Stock Items"
          value={data?.lowStockCount || 0}
          subtext="Below alert threshold"
          icon={AlertTriangle}
          badgeText={data?.lowStockCount > 0 ? "ACTION REQ" : "HEALTHY"}
        />
        <KpiCard
          title="Khata Credit Owed"
          value={formatCurrency(data?.totalKhataBalance || 0)}
          subtext="Total customer balance"
          icon={CreditCard}
        />
      </div>

      {/* Main Grid: Revenue Trend & AI Agent Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weekly Revenue Performance"
            subtitle="7-day sales comparison trend"
            action={
              <Link href="/reports" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                View Full Reports →
              </Link>
            }
          />
          <SalesChart data={data?.salesTrend || []} />
        </Card>

        <div>
          <AiInsightPanel />
        </div>
      </div>

      {/* Low Stock Alerts & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent POS Transactions"
            subtitle="Latest 5 counter sales bills"
            action={
              <Link href="/sales" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                All Transactions →
              </Link>
            }
          />
          <RecentSalesTable sales={data?.recentSales || []} />
        </Card>

        {/* Low Stock Items List */}
        <Card>
          <CardHeader
            title="Low Stock Watchlist"
            subtitle="Products requiring immediate reorder"
            action={
              <Link href="/products" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                Catalog →
              </Link>
            }
          />
          <div className="space-y-3">
            {!data?.lowStockProducts || data.lowStockProducts.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">All product stock levels are sufficient.</p>
            ) : (
              data.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                    <p className="text-[10px] text-zinc-500">{p.category?.name || "Fabric"}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      {p.stockQuantity} {p.unit?.symbol || "units"}
                    </span>
                    <p className="text-[9px] text-zinc-400">Min: {p.lowStockAlert}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
