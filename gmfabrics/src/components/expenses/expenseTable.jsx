import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { Badge } from "../common/badge.jsx";
import { Trash2 } from "lucide-react";

export const ExpenseTable = ({ expenses = [], onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
            <th className="py-3 px-3">Date</th>
            <th className="py-3 px-3">Title / Expense</th>
            <th className="py-3 px-3">Category</th>
            <th className="py-3 px-3">Recorded By</th>
            <th className="py-3 px-3">Amount</th>
            <th className="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-zinc-400">
                No expense entries found
              </td>
            </tr>
          ) : (
            expenses.map((e) => (
              <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 px-3 text-zinc-500">{formatDate(e.date)}</td>
                <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  {e.title}
                  {e.notes && <p className="text-[10px] text-zinc-400 font-normal">{e.notes}</p>}
                </td>
                <td className="py-3 px-3">
                  <Badge variant="default">{e.category?.name || "Other"}</Badge>
                </td>
                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                  {e.user?.name || "Staff"}
                </td>
                <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(e.amount)}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onDelete(e.id)}
                    className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
