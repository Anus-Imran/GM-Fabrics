"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card, CardHeader } from "../../../components/common/card.jsx";
import { KpiCard } from "../../../components/dashboard/kpiCard.jsx";
import { Button } from "../../../components/common/button.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { DollarSign, TrendingUp, Package, Award, RotateCcw, Receipt, RefreshCw } from "lucide-react";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pnL, setPnL] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const monthRange = useCallback(() => {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const last = new Date(year, month, 0).getDate();
    return { from, to: `${year}-${String(month).padStart(2, "0")}-${last}` };
  }, [month, year]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pnlRes, invRes, topRes] = await Promise.all([
        api.get("/reports/profit-loss", { params: { month, year } }),
        api.get("/reports/inventory"),
        api.get("/reports/top-products", { params: { limit: 10, ...monthRange() } }),
      ]);
      setPnL(pnlRes.data);
      setInventory(invRes.data);
      setTopProducts(topRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month, year, monthRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const margin = pnL && pnL.totalRevenue > 0 ? Math.round((pnL.grossProfit / pnL.totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Financial Reports & Analytics"
        description="Profit & Loss (net of returns), inventory valuation at FIFO cost, and best sellers for the selected month."
        action={
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="text-xs py-2 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold" aria-label="Month">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="text-xs py-2 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold" aria-label="Year">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={fetchReports} tooltip="Refresh" className="py-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading && !pnL ? (
        <Loader text="Loading business financial reports & analytics..." size="lg" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard title="Gross Sales" value={formatCurrency(pnL?.grossSales || 0)} subtext={`${MONTHS[month - 1]} ${year} (excl. voided)`} icon={Receipt} />
            <KpiCard title="Returns & Refunds" value={formatCurrency(pnL?.totalReturns || 0)} subtext="Refunded in this month" icon={RotateCcw} />
            <KpiCard title="Net Revenue" value={formatCurrency(pnL?.totalRevenue || 0)} subtext="Gross sales − returns" icon={DollarSign} />
            <KpiCard title="Cost of Goods (COGS)" value={formatCurrency(pnL?.cogs || 0)} subtext="FIFO lot cost, net of restocked returns" icon={Package} />
            <KpiCard title="Gross Profit" value={formatCurrency(pnL?.grossProfit || 0)} subtext={`Margin ${margin}%`} icon={TrendingUp} />
            <KpiCard
              title="Net Profit"
              value={formatCurrency(pnL?.netProfit || 0)}
              subtext={`After expenses of ${formatCurrency(pnL?.totalExpenses || 0)}`}
              icon={Award}
              badgeText={(pnL?.netProfit || 0) >= 0 ? "PROFIT" : "LOSS"}
              badgeVariant={(pnL?.netProfit || 0) >= 0 ? "success" : "danger"}
            />
          </div>

          <Card>
            <CardHeader title="Inventory Valuation" subtitle="Current stock on hand (not month-specific)" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl mb-4 text-xs">
              <div>
                <span className="text-zinc-500 block">Cost Valuation (FIFO purchase price)</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(inventory?.totalCostValue || 0)}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Retail Valuation (sale price)</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(inventory?.totalRetailValue || 0)}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Potential Gross Profit</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(inventory?.potentialProfit || 0)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={`Top 10 Best Selling Fabrics — ${MONTHS[month - 1]} ${year}`} subtitle="Ranked by revenue, net of returns" />
            {topProducts.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No sales in this month.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Units Sold</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {topProducts.map((tp, idx) => (
                    <tr key={tp.product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-3 font-bold text-zinc-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{tp.product.name}</td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{tp.product.category?.name}</td>
                      <td className="py-3 px-3 font-bold">
                        {tp.totalQuantitySold} {tp.product.unit?.symbol}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">{formatCurrency(tp.totalRevenueGenerated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
