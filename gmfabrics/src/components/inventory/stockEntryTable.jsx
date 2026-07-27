import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const StockEntryTable = ({ entries = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
            <th className="py-3 px-3">Date</th>
            <th className="py-3 px-3">Fabric Product</th>
            <th className="py-3 px-3">Supplier</th>
            <th className="py-3 px-3">Quantity</th>
            <th className="py-3 px-3">Cost / Unit</th>
            <th className="py-3 px-3">Price Diff</th>
            <th className="py-3 px-3 text-right">Total Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-zinc-400">
                No stock purchase entries recorded
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const priceDiff = e.priceDiff || 0;
              return (
                <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 text-zinc-500">{formatDateTime(e.purchasedAt)}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {e.product?.name || "Product"}
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                    {e.supplier?.name || "—"}
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                    {e.quantity} {e.product?.unit?.symbol || ""}
                  </td>
                  <td className="py-3 px-3 text-zinc-800 dark:text-zinc-200 font-mono">
                    {formatCurrency(e.costPerUnit)}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {priceDiff > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +{formatCurrency(priceDiff)}
                      </span>
                    ) : priceDiff < 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> {formatCurrency(priceDiff)}
                      </span>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Minus className="w-3 h-3" /> Same
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(e.totalCost)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
