import React, { memo } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency.js";

const priceRange = (product) => {
  const prices = (product.stockBatches || [])
    .filter((b) => b.remainingQuantity > 0)
    .map((b) => (b.sellingPrice > 0 ? b.sellingPrice : product.salePrice));
  if (prices.length === 0) return { first: product.salePrice, max: product.salePrice };
  return { first: prices[0], max: Math.max(...prices) };
};

export const ProductCard = memo(({ product, onAddToCart, inCartQty = 0 }) => {
  const isLowStock = product.stockQuantity <= product.lowStockAlert;
  const isOutOfStock = product.stockQuantity <= 0;
  const { first, max } = priceRange(product);
  const unit = product.unit?.symbol || product.unit?.name || "unit";

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => onAddToCart(product)}
      title={isOutOfStock ? "Out of stock" : `Add 1 ${unit} of ${product.name}`}
      className={`text-left bg-white dark:bg-zinc-900 border rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        inCartQty > 0
          ? "border-emerald-400 dark:border-emerald-700"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
      } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="w-full">
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

        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-2">{product.name}</h4>
        {product.barcode && <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{product.barcode}</p>}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between w-full">
        <div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(first)}
            <span className="text-[10px] text-zinc-500 font-normal"> / {unit}</span>
          </p>
          {max > first && <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Newer lot: {formatCurrency(max)}</p>}
          <p
            className={`text-[10px] mt-0.5 ${
              isOutOfStock ? "text-red-500 font-bold" : isLowStock ? "text-amber-600 font-semibold" : "text-zinc-500"
            }`}
          >
            {isOutOfStock ? "Out of Stock" : `Stock: ${product.stockQuantity} ${product.unit?.symbol || ""}`}
            {inCartQty > 0 && <span className="text-emerald-600 font-bold"> • In cart: {inCartQty}</span>}
          </p>
        </div>

        <span className="p-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Plus className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
});

ProductCard.displayName = "ProductCard";
