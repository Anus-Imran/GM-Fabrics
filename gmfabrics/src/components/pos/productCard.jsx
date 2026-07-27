import React from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const ProductCard = ({ product, onAddToCart }) => {
  const isLowStock = product.stockQuantity <= product.lowStockAlert;
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div
      onClick={() => !isOutOfStock && onAddToCart(product)}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md ${
        isOutOfStock ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            {product.category?.name || "Fabric"}
          </span>
          {product.brand && (
            <span className="text-[10px] font-medium text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded">
              {product.brand.name}
            </span>
          )}
        </div>

        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-2">
          {product.name}
        </h4>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(product.salePrice)}
            <span className="text-[10px] text-zinc-500 font-normal"> / {product.unit?.symbol || product.unit?.name || "unit"}</span>
          </p>
          <p
            className={`text-[10px] mt-0.5 ${
              isOutOfStock
                ? "text-red-500 font-bold"
                : isLowStock
                ? "text-amber-600 font-semibold"
                : "text-zinc-500"
            }`}
          >
            {isOutOfStock ? "Out of Stock" : `Stock: ${product.stockQuantity} ${product.unit?.symbol || ""}`}
          </p>
        </div>

        <button
          disabled={isOutOfStock}
          className="p-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
