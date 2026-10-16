import React, { memo } from "react";
import { Plus, Ban } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency.js";

const priceRange = (product) => {
  const prices = (product.stockBatches || [])
    .filter((b) => b.remainingQuantity > 0)
    .map((b) => (b.sellingPrice > 0 ? b.sellingPrice : product.salePrice));
  if (prices.length === 0) return { first: product.salePrice, max: product.salePrice };
  return { first: prices[0], max: Math.max(...prices) };
};

const formatQty = (q) => (Number.isInteger(q) ? q : Math.round(q * 1000) / 1000);

export const ProductCard = memo(({ product, onAddToCart, inCartQty = 0 }) => {
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && product.stockQuantity <= product.lowStockAlert;
  const { first, max } = priceRange(product);
  const unit = product.unit?.symbol || product.unit?.name || "unit";

  const stockStyle = isOutOfStock
    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
    : isLowStock
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => onAddToCart(product)}
      title={isOutOfStock ? `${product.name} is out of stock` : `Add 1 ${unit} of ${product.name}`}
      className={`group text-left flex flex-col bg-white dark:bg-zinc-900 border-2 transition-colors focus-visible:outline-none focus-visible:border-emerald-500 ${
        inCartQty > 0
          ? "border-emerald-500"
          : isOutOfStock
          ? "border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-500"
      }`}
    >
      <div className="p-4 flex-1 w-full space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            {product.category?.name || "Fabric"}
          </span>
          {product.brand && (
            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 whitespace-nowrap">
              {product.brand.name}
            </span>
          )}
        </div>

        <h4 className="text-[15px] leading-snug font-semibold text-zinc-900 dark:text-white line-clamp-2">{product.name}</h4>
        {(product.barcode || product.sku) && (
          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{product.barcode || product.sku}</p>
        )}
      </div>

      <div className="px-4 pb-3 w-full space-y-2">
        <p className="whitespace-nowrap">
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(first)}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400"> / {unit}</span>
        </p>
        {max > first && <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Newer lot: {formatCurrency(max)}</p>}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border ${stockStyle}`}>
            {isOutOfStock ? (
              <>
                <Ban className="w-3 h-3" /> Out of stock
              </>
            ) : (
              <>
                {isLowStock ? "Low" : "In stock"}: {formatQty(product.stockQuantity)} {unit}
              </>
            )}
          </span>
          {inCartQty > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-600 text-white">In cart: {formatQty(inCartQty)}</span>
          )}
        </div>
      </div>

      <span
        className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-t-2 ${
          isOutOfStock
            ? "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900"
            : "border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white"
        }`}
      >
        {isOutOfStock ? (
          "Not available"
        ) : (
          <>
            <Plus className="w-4 h-4" /> Add to cart
          </>
        )}
      </span>
    </button>
  );
});

ProductCard.displayName = "ProductCard";
