import React from "react";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Badge } from "../common/badge.jsx";
import { Edit2, Trash2, History } from "lucide-react";

export const ProductTable = ({ products = [], onEdit, onDelete, onViewHistory }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
            <th className="py-3 px-3">Fabric Product</th>
            <th className="py-3 px-3">Category</th>
            <th className="py-3 px-3">Brand</th>
            <th className="py-3 px-3">Unit</th>
            <th className="py-3 px-3">Cost Price</th>
            <th className="py-3 px-3">Sale Price</th>
            <th className="py-3 px-3">Stock Qty</th>
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {products.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-zinc-400">
                No fabric products found
              </td>
            </tr>
          ) : (
            products.map((prod) => {
              const isLowStock = prod.stockQuantity <= prod.lowStockAlert;
              return (
                <tr key={prod.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{prod.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      SKU: {prod.sku || "N/A"} • Barcode: {prod.barcode || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                    {prod.category?.name || "—"}
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                    {prod.brand?.name || "—"}
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                    {prod.unit?.name} ({prod.unit?.symbol})
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(prod.costPrice)}
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(prod.salePrice)}
                  </td>
                  <td className="py-3 px-3 font-semibold">
                    <span className={isLowStock ? "text-amber-600 font-bold" : "text-zinc-900 dark:text-zinc-100"}>
                      {prod.stockQuantity} {prod.unit?.symbol || ""}
                    </span>
                    {isLowStock && (
                      <Badge variant="warning" className="ml-2">
                        Low Stock
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
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
