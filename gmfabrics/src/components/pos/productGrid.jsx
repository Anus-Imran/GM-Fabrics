import React from "react";
import { ProductCard } from "./productCard.jsx";

export const ProductGrid = ({ products = [], categories = [], selectedCategory, setSelectedCategory, onAddToCart }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            selectedCategory === null
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          All Categories
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedCategory === cat.id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-1">
        {products.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-400 text-xs">
            No fabric products found
          </div>
        ) : (
          products.map((prod) => (
            <ProductCard key={prod.id} product={prod} onAddToCart={onAddToCart} />
          ))
        )}
      </div>
    </div>
  );
};
