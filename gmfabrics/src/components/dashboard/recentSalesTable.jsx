import React from "react";
import Link from "next/link";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import { Badge } from "../common/badge.jsx";

export const RecentSalesTable = ({ sales = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
            <th className="py-3 px-2">Bill #</th>
            <th className="py-3 px-2">Customer</th>
            <th className="py-3 px-2">Date</th>
            <th className="py-3 px-2">Amount</th>
            <th className="py-3 px-2">Payment</th>
            <th className="py-3 px-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-zinc-400">
                No recent sales found
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="py-3 px-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  <Link href={`/sales/${sale.id}`} className="hover:underline">
                    {sale.saleNumber}
                  </Link>
                </td>
                <td className="py-3 px-2 text-zinc-700 dark:text-zinc-300">
                  {sale.customer ? sale.customer.name : "Walk-in Customer"}
                </td>
                <td className="py-3 px-2 text-zinc-500">{formatDateTime(sale.createdAt)}</td>
                <td className="py-3 px-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(sale.totalAmount)}
                </td>
                <td className="py-3 px-2">
                  <Badge variant={sale.paymentMethod === "CREDIT" ? "warning" : "default"}>
                    {sale.paymentMethod}
                  </Badge>
                </td>
                <td className="py-3 px-2">
                  <Badge variant={sale.status === "COMPLETED" ? "success" : "danger"}>
                    {sale.status}
                  </Badge>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
