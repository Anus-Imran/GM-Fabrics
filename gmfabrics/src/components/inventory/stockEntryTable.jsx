import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import { TrendingUp, TrendingDown, Minus, Edit2, Trash2 } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const StockEntryTable = ({
  entries = [],
  onDeleteSelected = null,
  onEdit = null,
  onDelete = null,
}) => {
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
      label: "Quantity / Lot",
      render: (e) => {
        const mainBatch = e.stockBatches?.[0];
        const initial = mainBatch ? mainBatch.initialQuantity : Number(e.quantity);
        const remaining = mainBatch ? mainBatch.remainingQuantity : null;
        const sold = mainBatch ? Math.max(0, initial - remaining) : 0;

        return (
          <div className="flex flex-col">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {Number(e.quantity)} {e.product?.unit?.symbol || ""}
            </span>
            {mainBatch && sold > 0 ? (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                {remaining} left ({sold} sold)
              </span>
            ) : mainBatch ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Full lot ({remaining} left)
              </span>
            ) : null}
          </div>
        );
      },
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
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (e) => {
        const mainBatch = e.stockBatches?.[0];
        const soldQty = mainBatch
          ? Math.max(0, (mainBatch.initialQuantity || 0) - (mainBatch.remainingQuantity || 0))
          : 0;
        const hasSales = soldQty > 0 || (mainBatch?.saleItems && mainBatch.saleItems.length > 0);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(e)}
                title="Edit Stock Purchase Lot"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                disabled={hasSales}
                title={
                  hasSales
                    ? `Cannot delete: ${soldQty} pcs already sold from this lot in POS sales`
                    : "Delete Stock Purchase Lot"
                }
                className={`p-1.5 rounded-lg transition-colors ${
                  hasSales
                    ? "opacity-30 cursor-not-allowed text-zinc-400"
                    : "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
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

