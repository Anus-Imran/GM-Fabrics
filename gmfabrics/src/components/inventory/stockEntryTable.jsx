import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import { TrendingUp, TrendingDown, Minus, Edit2, Trash2, PackageMinus } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const StockEntryTable = ({
  list,
  onDeleteSelected = null,
  onEdit = null,
  onDelete = null,
  onReturn = null,
}) => {
  const columns = [
    {
      key: "purchasedAt",
      label: "Date",
      sortable: false,
      render: (e) => formatDateTime(e.purchasedAt),
    },
    {
      key: "productName",
      label: "Fabric Product",
      sortable: false,
      render: (e) => (
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{e.productName}</span>
          {e.invoiceNumber && <p className="text-[10px] font-mono text-zinc-400">Inv {e.invoiceNumber}</p>}
        </div>
      ),
    },
    {
      key: "supplierName",
      label: "Supplier",
      sortable: false,
      render: (e) => e.supplierName,
    },
    {
      key: "quantity",
      label: "Quantity / Lot",
      sortable: false,
      render: (e) => {
        const mainBatch = e.stockBatches?.[0];
        const remaining = e.remainingQuantity ?? mainBatch?.remainingQuantity ?? null;
        const sold = e.soldQuantity ?? 0;

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
            {e.returnedQuantity > 0 && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">{e.returnedQuantity} returned to supplier</span>
            )}
          </div>
        );
      },
    },
    {
      key: "costPerUnit",
      label: "Cost / Unit",
      sortable: false,
      render: (e) => <span className="font-mono">{formatCurrency(e.costPerUnit)}</span>,
    },
    {
      key: "priceDiff",
      label: "Price Diff",
      sortable: false,
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
      sortable: false,
      cellClassName: "text-right",
      render: (e) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(e.totalCost)}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (e) => {
        const soldQty = e.soldQuantity || 0;
        const hasSales = soldQty > 0;

        return (
          <div className="flex items-center justify-end gap-1.5">
            {onReturn && e.supplierId && (e.remainingQuantity || 0) > 0 && (
              <button
                type="button"
                onClick={() => onReturn(e)}
                title="Return to supplier / replacement"
                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <PackageMinus className="w-4 h-4" />
              </button>
            )}
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

  const formattedData = (list?.items || []).map((e) => ({
    ...e,
    productName: e.product?.name || "Product",
    supplierName: e.supplier?.name || "—",
  }));

  return (
    <DataTable
      title="Stock_Purchases"
      columns={columns}
      data={formattedData}
      serverMode
      totalCount={list?.total || 0}
      onQueryChange={list?.setQuery}
      loading={list?.loading}
      defaultPageSize={25}
      dateKey="purchasedAt"
      onDeleteSelected={onDeleteSelected}
      enableSelection={!!onDeleteSelected}
      enableDateFilter={true}
    />
  );
};

