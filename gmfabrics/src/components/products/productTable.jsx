import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Edit2, Trash2, History } from "lucide-react";
import { DataTable } from "../common/dataTable.jsx";

export const ProductTable = ({ products = [], onEdit, onDelete, onDeleteSelected, onViewHistory }) => {
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
    {
      key: "categoryName",
      label: "Category",
      render: (prod) => prod.categoryName,
    },
    {
      key: "brandName",
      label: "Brand",
      render: (prod) => prod.brandName,
    },
    {
      key: "unitName",
      label: "Unit",
      render: (prod) => `${prod.unitName} (${prod.unitSymbol})`,
    },
    {
      key: "costPrice",
      label: "Cost Price",
      render: (prod) => formatCurrency(prod.costPrice),
    },
    {
      key: "salePrice",
      label: "Sale Price",
      render: (prod) => <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(prod.salePrice)}</span>,
    },
    {
      key: "stockQuantity",
      label: "Stock Qty",
      render: (prod) => {
        const isLowStock = prod.stockQuantity <= prod.lowStockAlert;
        return (
          <div className="font-semibold">
            <span className={isLowStock ? "text-amber-600 font-bold" : "text-zinc-900 dark:text-zinc-100"}>
              {prod.stockQuantity} {prod.unitSymbol}
            </span>
            {isLowStock && (
              <Badge variant="warning" className="ml-2">
                Low Stock
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
      render: (prod) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onViewHistory && onViewHistory(prod)}
            title="Price History"
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(prod)}
            title="Edit"
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(prod.id)}
            title="Deactivate"
            className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
  }));

  return (
    <DataTable
      title="Products_Catalog"
      columns={columns}
      data={formattedData}
      searchKeys={["name", "sku", "barcode", "categoryName", "brandName"]}
      dateKey="createdAt"
      onDeleteSelected={onDeleteSelected}
      enableSelection={!!onDeleteSelected}
      enableDateFilter={false}
    />
  );
};
