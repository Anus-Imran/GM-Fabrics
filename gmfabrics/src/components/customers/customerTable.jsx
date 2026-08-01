import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Edit2, CreditCard } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const CustomerTable = ({ customers = [], onEdit, onSettleKhata, onDeleteSelected }) => {
  const columns = [
    {
      key: "name",
      label: "Customer Name",
      render: (c) => <span className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (c) => <span className="font-mono">{c.phone || "—"}</span>,
    },
    {
      key: "cnic",
      label: "CNIC",
      render: (c) => <span className="font-mono text-zinc-500">{c.cnic || "—"}</span>,
    },
    {
      key: "address",
      label: "Address",
      render: (c) => c.address || "—",
    },
    {
      key: "outstandingBalance",
      label: "Khata Balance",
      render: (c) => {
        const hasCredit = c.outstandingBalance > 0;
        return (
          <div className="font-bold">
            <span className={hasCredit ? "text-amber-600 dark:text-amber-400" : "text-zinc-700"}>
              {formatCurrency(c.outstandingBalance)}
            </span>
            {hasCredit && (
              <Badge variant="warning" className="ml-2">
                Khata Due
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
      render: (c) => {
        const hasCredit = c.outstandingBalance > 0;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasCredit && (
              <button
                onClick={() => onSettleKhata(c)}
                title="Settle Payment"
                className="px-2 py-1 bg-zinc-900 text-white rounded text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
              >
                <CreditCard className="w-3 h-3" /> Pay Khata
              </button>
            )}
            <button
              onClick={() => onEdit(c)}
              title="Edit Customer"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Customers_List"
      columns={columns}
      data={customers}
      searchKeys={["name", "phone", "cnic", "address"]}
      dateKey="createdAt"
      onDeleteSelected={onDeleteSelected}
      enableSelection={!!onDeleteSelected}
      enableDateFilter={false}
    />
  );
};
