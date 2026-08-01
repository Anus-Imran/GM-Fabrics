import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { Badge } from "../common/badge.jsx";
import { Trash2 } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const ExpenseTable = ({ expenses = [], onDelete, onDeleteSelected }) => {
  const columns = [
    {
      key: "date",
      label: "Date",
      render: (e) => formatDate(e.date),
    },
    {
      key: "title",
      label: "Title / Expense",
      render: (e) => (
        <div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{e.title}</div>
          {e.notes && <p className="text-[10px] text-zinc-400 font-normal">{e.notes}</p>}
        </div>
      ),
    },
    {
      key: "categoryName",
      label: "Category",
      render: (e) => <Badge variant="default">{e.categoryName}</Badge>,
    },
    {
      key: "userName",
      label: "Recorded By",
      render: (e) => e.userName,
    },
    {
      key: "amount",
      label: "Amount",
      render: (e) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(e.amount)}</span>,
    },
    {
      key: "actions",
      label: "Action",
      sortable: false,
      cellClassName: "text-right",
      render: (e) => (
        <button
          onClick={() => onDelete(e.id)}
          className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const formattedData = expenses.map((e) => ({
    ...e,
    categoryName: e.category?.name || "Other",
    userName: e.user?.name || "Staff",
  }));

  return (
    <DataTable
      title="Expenses_History"
      columns={columns}
      data={formattedData}
      searchKeys={["title", "notes", "categoryName", "userName"]}
      dateKey="date"
      onDeleteSelected={onDeleteSelected}
      enableSelection={!!onDeleteSelected}
      enableDateFilter={true}
    />
  );
};
