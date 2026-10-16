import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Tooltip } from "../common/tooltip.jsx";
import { Edit2, CreditCard, BookOpen, SlidersHorizontal, Trash2 } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const CustomerTable = ({ list, onEdit, onSettleKhata, onLedger, onAdjust, onDelete, isAdmin }) => {
  const columns = [
    {
      key: "name",
      label: "Customer Name",
      render: (c) => (
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</span>
          <p className="text-[10px] text-zinc-400">{c._count?.sales || 0} bill(s)</p>
        </div>
      ),
    },
    { key: "phone", label: "Phone", sortable: false, render: (c) => <span className="font-mono">{c.phone || "—"}</span> },
    { key: "cnic", label: "CNIC", sortable: false, render: (c) => <span className="font-mono text-zinc-500">{c.cnic || "—"}</span> },
    { key: "address", label: "Address", sortable: false, render: (c) => c.address || "—" },
    {
      key: "outstandingBalance",
      label: "Khata Balance",
      render: (c) => {
        const hasCredit = c.outstandingBalance > 0;
        const advance = c.outstandingBalance < 0;
        return (
          <div className="font-bold">
            <span className={hasCredit ? "text-amber-600 dark:text-amber-400" : advance ? "text-emerald-600" : "text-zinc-700 dark:text-zinc-300"}>
              {formatCurrency(Math.abs(c.outstandingBalance))}
            </span>
            {hasCredit && (
              <Badge variant="amber" className="ml-2">
                Due
              </Badge>
            )}
            {advance && (
              <Badge variant="emerald" className="ml-2">
                Advance
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {c.outstandingBalance > 0 && (
            <button
              onClick={() => onSettleKhata(c)}
              className="px-2 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
            >
              <CreditCard className="w-3 h-3" /> Receive
            </button>
          )}
          <Tooltip label="Khata statement">
            <button onClick={() => onLedger(c)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Khata statement">
              <BookOpen className="w-4 h-4" />
            </button>
          </Tooltip>
          {isAdmin && (
            <Tooltip label="Adjust balance (admin)">
              <button onClick={() => onAdjust(c)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Adjust balance">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Edit customer">
            <button onClick={() => onEdit(c)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Edit customer">
              <Edit2 className="w-4 h-4" />
            </button>
          </Tooltip>
          {isAdmin && (c._count?.sales || 0) === 0 && Math.abs(c.outstandingBalance) < 0.01 && (
            <Tooltip label="Delete customer">
              <button onClick={() => onDelete(c)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" aria-label="Delete customer">
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      title="Customers_List"
      columns={columns}
      data={list.items}
      serverMode
      totalCount={list.total}
      onQueryChange={list.setQuery}
      loading={list.loading}
      enableSelection={false}
      enableDateFilter={false}
      defaultPageSize={25}
    />
  );
};
