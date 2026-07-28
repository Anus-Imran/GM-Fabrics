"use client";

import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const PaymentMethodChart = ({ data = [] }) => {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="h-64 w-full flex flex-col justify-center">
      {total === 0 ? (
        <p className="text-xs text-zinc-400 text-center py-10">No sales payment data recorded in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#09090b",
                color: "#fff",
                borderRadius: "12px",
                border: "none",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              formatter={(value, name) => [
                `${formatCurrency(value)} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
