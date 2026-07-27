"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card, CardHeader } from "../../../components/common/card.jsx";
import { KpiCard } from "../../../components/dashboard/kpiCard.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { DollarSign, TrendingUp, Package, Award } from "lucide-react";
import api from "../../../services/apiService.js";

export default function ReportsPage() {
  const [pnL, setPnL] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pnlRes, invRes, topRes] = await Promise.all([
        api.get("/reports/profit-loss"),
        api.get("/reports/inventory"),
        api.get("/reports/top-products?limit=10"),
      ]);
      if (pnlRes.data) setPnL(pnlRes.data);
      if (invRes.data) setInventory(invRes.data);
      if (topRes.data) setTopProducts(topRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-400">Loading business financial reports...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Financial Reports & Analytics"
        description="Comprehensive Profit & Loss, Inventory Cost Valuation, and Product Sales Performance."
      />

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monthly Revenue"
          value={formatCurrency(pnL?.totalRevenue || 0)}
          subtext="Total completed sales"
          icon={DollarSign}
        />
        <KpiCard
          title="Cost of Goods (COGS)"
          value={formatCurrency(pnL?.cogs || 0)}
          subtext="Vendor purchase cost of sold items"
          icon={TrendingUp}
        />
        <KpiCard
          title="Operating Expenses"
          value={formatCurrency(pnL?.totalExpenses || 0)}
          subtext="Rent, salaries, utilities..."
          icon={TrendingUp}
        />
        <KpiCard
          title="Net Monthly Profit"
          value={formatCurrency(pnL?.netProfit || 0)}
          subtext="Revenue - COGS - Expenses"
          icon={Award}
        />
      </div>

      {/* Inventory Valuation Card */}
      <Card>
        <CardHeader title="Inventory Valuation Breakdown" subtitle="Real-time catalog stock asset value" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl mb-4 text-xs">
          <div>
            <span className="text-zinc-500 block">Total Cost Valuation (Purchase Price)</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(inventory?.totalCostValue || 0)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Total Retail Valuation (Sale Price)</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(inventory?.totalRetailValue || 0)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Potential Expected Gross Profit</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(inventory?.potentialProfit || 0)}
            </span>
          </div>
        </div>
      </Card>

      {/* Top 10 Best Sellers Table */}
      <Card>
        <CardHeader title="Top 10 Best Selling Fabric Products" subtitle="Ranked by total sales revenue" />
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-3">Rank</th>
              <th className="py-3 px-3">Product Name</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Units Sold</th>
              <th className="py-3 px-3 text-right">Revenue Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topProducts.map((tp, idx) => (
              <tr key={tp.product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="py-3 px-3 font-bold text-zinc-400">#{idx + 1}</td>
                <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  {tp.product.name}
                </td>
                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                  {tp.product.category?.name}
                </td>
                <td className="py-3 px-3 font-bold">
                  {tp.totalQuantitySold} {tp.product.unit?.symbol}
                </td>
                <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(tp.totalRevenueGenerated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
