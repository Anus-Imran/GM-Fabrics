"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const SalesChart = ({ data = [] }) => {
  const [activeMetric, setActiveMetric] = useState("revenue");

  return (
    <div className="space-y-3">
      {/* Metric Toggle Tabs */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-[11px] font-bold">
          <button
            onClick={() => setActiveMetric("revenue")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeMetric === "revenue"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Sales Revenue
          </button>
          <button
            onClick={() => setActiveMetric("expenses")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeMetric === "expenses"
                ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveMetric("netProfit")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeMetric === "netProfit"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Net Profit
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#71717a", fontWeight: 600 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickFormatter={(v) => `Rs ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#09090b",
                color: "#fff",
                borderRadius: "12px",
                border: "1 border-zinc-800",
                fontSize: "12px",
                padding: "10px 14px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              }}
              formatter={(value, name) => [
                formatCurrency(value),
                name === "revenue" ? "Sales Revenue" : name === "expenses" ? "Expenses" : "Net Profit",
              ]}
              labelFormatter={(label) => `Period: ${label}`}
            />
            {activeMetric === "revenue" && (
              <Area
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            )}
            {activeMetric === "expenses" && (
              <Area
                type="monotone"
                dataKey="expenses"
                name="expenses"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expensesGrad)"
              />
            )}
            {activeMetric === "netProfit" && (
              <Area
                type="monotone"
                dataKey="netProfit"
                name="netProfit"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#profitGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
