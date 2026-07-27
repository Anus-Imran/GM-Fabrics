"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const SalesChart = ({ data = [] }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#18181b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#09090b",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              fontSize: "12px",
            }}
            formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#09090b"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
