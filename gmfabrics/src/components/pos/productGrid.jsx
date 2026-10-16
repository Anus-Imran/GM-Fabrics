import React, { useEffect, useRef, useState } from "react";
import { ProductCard } from "./productCard.jsx";

const PAGE = 60;

export const ProductGrid = ({ products = [], categories = [], selectedCategory, setSelectedCategory, onAddToCart, cartQtyById }) => {
  // Render cards in chunks so a large catalog stays fast; more load as you scroll.
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisible(PAGE);
  }, [products]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => v + PAGE);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [products, visible]);

  return (
    <div className="flex flex-col h-full">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 text-[13px] font-semibold shrink-0 border transition-colors ${
            selectedCategory === null
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-400"
          }`}
        >
          All Categories
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-[13px] font-semibold shrink-0 border transition-colors ${
              selectedCategory === cat.id
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-400"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 overflow-y-auto pr-1 pb-20 lg:pb-4 content-start">
        {products.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-400 text-xs">No fabric products found</div>
        ) : (
          products
            .slice(0, visible)
            .map((prod) => (
              <ProductCard key={prod.id} product={prod} onAddToCart={onAddToCart} inCartQty={cartQtyById?.get(prod.id) || 0} />
            ))
        )}
        {visible < products.length && <div ref={sentinelRef} className="col-span-full h-8" />}
      </div>
    </div>
  );
};
