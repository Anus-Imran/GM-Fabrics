import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Tooltip } from "../common/tooltip.jsx";
import { Edit2, Trash2, History, ClipboardList, Barcode } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

const IconButton = ({ label, onClick, children, danger }) => (
  <Tooltip label={label}>
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-1.5 rounded cursor-pointer ${
        danger ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  </Tooltip>
);

export const ProductTable = ({ products = [], isAdmin, onEdit, onDelete, onViewHistory, onAdjust, onLabels }) => {
  const columns = [
    {
      key: "name",
      label: "Fabric Product",
      render: (prod) => (
        <div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{prod.name}</div>
          <div className="text-[10px] text-zinc-400 font-mono">
            SKU: {prod.sku || "N/A"} • Barcode: {prod.barcode || "N/A"}
          </div>
        </div>
      ),
    },
    { key: "categoryName", label: "Category" },
    { key: "brandName", label: "Brand" },
    { key: "unitName", label: "Unit", render: (prod) => `${prod.unitName} (${prod.unitSymbol})` },
    ...(isAdmin ? [{ key: "costPrice", label: "Cost Price", render: (prod) => formatCurrency(prod.costPrice) }] : []),
    {
      key: "salePrice",
      label: "Sale Price",
      render: (prod) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(prod.salePrice)}</span>,
    },
    {
      key: "stockQuantity",
      label: "Stock Qty",
      render: (prod) => {
        const isOut = prod.stockQuantity <= 0;
        const isLowStock = prod.stockQuantity <= prod.lowStockAlert;
        return (
          <div className="font-semibold">
            <span className={isOut ? "text-red-600 font-bold" : isLowStock ? "text-amber-600 font-bold" : "text-zinc-900 dark:text-zinc-100"}>
              {Number(prod.stockQuantity)} {prod.unitSymbol}
            </span>
            {isOut ? (
              <Badge variant="danger" className="ml-2">
                Out
              </Badge>
            ) : (
              isLowStock && (
                <Badge variant="amber" className="ml-2">
                  Low
                </Badge>
              )
            )}
            {prod.lotCount > 1 && <p className="text-[10px] text-blue-600">{prod.lotCount} lots</p>}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (prod) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton label="Print barcode labels" onClick={() => onLabels(prod)}>
            <Barcode className="w-4 h-4" />
          </IconButton>
          {isAdmin && (
            <>
              <IconButton label="Adjust stock (damage, count…)" onClick={() => onAdjust(prod)}>
                <ClipboardList className="w-4 h-4" />
              </IconButton>
              <IconButton label="Purchase price history" onClick={() => onViewHistory(prod)}>
                <History className="w-4 h-4" />
              </IconButton>
              <IconButton label="Edit product" onClick={() => onEdit(prod)}>
                <Edit2 className="w-4 h-4" />
              </IconButton>
              <IconButton label="Deactivate product" onClick={() => onDelete(prod)} danger>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </>
          )}
        </div>
      ),
    },
  ];

  const formattedData = products.map((p) => ({
    ...p,
    categoryName: p.category?.name || "—",
    brandName: p.brand?.name || "—",
    unitName: p.unit?.name || "—",
    unitSymbol: p.unit?.symbol || "",
    lotCount: (p.stockBatches || []).length,
  }));

  return (
    <DataTable
      title="Products_Catalog"
      columns={columns}
      data={formattedData}
      searchKeys={["name", "sku", "barcode", "categoryName", "brandName"]}
      dateKey="createdAt"
      enableSelection={false}
      enableDateFilter={false}
      defaultPageSize={25}
    />
  );
};
