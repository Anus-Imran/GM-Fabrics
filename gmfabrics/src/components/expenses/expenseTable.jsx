import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { Badge } from "../common/badge.jsx";
import { Trash2 } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const ExpenseTable = ({ list, onDelete, isAdmin }) => {
  const columns = [
    { key: "date", label: "Date", sortable: false, render: (e) => formatDate(e.date) },
    {
      key: "title",
      label: "Title / Expense",
      sortable: false,
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
      sortable: false,
      render: (e) => (
        <div className="flex items-center gap-1">
          <Badge variant="default">{e.categoryName}</Badge>
          {e.fromDrawer && <Badge variant="amber">Drawer</Badge>}
        </div>
      ),
    },
    { key: "userName", label: "Recorded By", sortable: false },
    {
      key: "amount",
      label: "Amount",
      sortable: false,
      render: (e) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(e.amount)}</span>,
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            label: "Action",
            sortable: false,
            cellClassName: "text-right",
            render: (e) => (
              <button
                onClick={() => onDelete(e)}
                title="Delete expense (admin)"
                aria-label="Delete expense"
                className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  const formattedData = (list.items || []).map((e) => ({
    ...e,
    categoryName: e.category?.name || "Other",
    userName: e.user?.name || "Staff",
  }));

  return (
    <DataTable
      title="Expenses_History"
      columns={columns}
      data={formattedData}
      serverMode
      totalCount={list.total}
      onQueryChange={list.setQuery}
      loading={list.loading}
      dateKey="date"
      enableSelection={false}
      enableDateFilter={true}
      defaultPageSize={25}
    />
  );
};
