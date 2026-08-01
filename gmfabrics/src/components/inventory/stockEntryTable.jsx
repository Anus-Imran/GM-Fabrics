import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const StockEntryTable = ({ entries = [], onDeleteSelected = null }) => {
  const columns = [
    {
      key: "purchasedAt",
      label: "Date",
      render: (e) => formatDateTime(e.purchasedAt),
    },
    {
      key: "productName",
      label: "Fabric Product",
      render: (e) => <span className="font-semibold text-zinc-900 dark:text-zinc-100">{e.productName}</span>,
    },
    {
      key: "supplierName",
      label: "Supplier",
      render: (e) => e.supplierName,
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (e) => (
        <span className="font-bold text-zinc-900 dark:text-zinc-100">
          {e.quantity} {e.product?.unit?.symbol || ""}
        </span>
      ),
    },
    {
      key: "costPerUnit",
      label: "Cost / Unit",
      render: (e) => <span className="font-mono">{formatCurrency(e.costPerUnit)}</span>,
    },
    {
      key: "priceDiff",
      label: "Price Diff",
      render: (e) => {
        const diff = e.priceDiff || 0;
        return diff > 0 ? (
          <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +{formatCurrency(diff)}
          </span>
        ) : diff < 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> {formatCurrency(diff)}
          </span>
        ) : (
          <span className="text-zinc-400 flex items-center gap-1">
            <Minus className="w-3 h-3" /> Same
          </span>
        );
      },
    },
    {
      key: "totalCost",
      label: "Total Cost",
      cellClassName: "text-right",
      render: (e) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(e.totalCost)}</span>,
    },
  ];

  const formattedData = entries.map((e) => ({
    ...e,
    productName: e.product?.name || "Product",
    supplierName: e.supplier?.name || "—",
  }));

  return (
    <DataTable
      title="Stock_Purchases"
      columns={columns}
      data={formattedData}
      searchKeys={["productName", "supplierName", "notes"]}
      dateKey="purchasedAt"
      onDeleteSelected={onDeleteSelected}
      enableSelection={!!onDeleteSelected}
      enableDateFilter={true}
    />
  );
};
