import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Edit2, CreditCard } from "lucide-react";

export const CustomerTable = ({ customers = [], onEdit, onSettleKhata }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
            <th className="py-3 px-3">Customer Name</th>
            <th className="py-3 px-3">Phone</th>
            <th className="py-3 px-3">CNIC</th>
            <th className="py-3 px-3">Address</th>
            <th className="py-3 px-3">Khata Balance</th>
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {customers.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-zinc-400">
                No customer accounts found
              </td>
            </tr>
          ) : (
            customers.map((c) => {
              const hasCredit = c.outstandingBalance > 0;
              return (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {c.name}
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300 font-mono">
                    {c.phone || "—"}
                  </td>
                  <td className="py-3 px-3 text-zinc-500 font-mono">{c.cnic || "—"}</td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{c.address || "—"}</td>
                  <td className="py-3 px-3 font-bold">
                    <span className={hasCredit ? "text-amber-600 dark:text-amber-400" : "text-zinc-700"}>
                      {formatCurrency(c.outstandingBalance)}
                    </span>
                    {hasCredit && (
                      <Badge variant="warning" className="ml-2">
                        Khata Due
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasCredit && (
                        <button
                          onClick={() => onSettleKhata(c)}
                          title="Settle Payment"
                          className="px-2 py-1 bg-zinc-900 text-white rounded text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> Pay Khata
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(c)}
                        title="Edit Customer"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
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
