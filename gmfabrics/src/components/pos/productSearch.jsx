import React, { forwardRef } from "react";
import { Search, Barcode, X } from "lucide-react";
import { Kbd } from "../common/tooltip.jsx";

export const ProductSearch = forwardRef(({ searchTerm, setSearchTerm, onBarcodeSubmit }, ref) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onBarcodeSubmit) {
      e.preventDefault();
      onBarcodeSubmit(searchTerm.trim());
    }
    if (e.key === "Escape" && searchTerm) {
      e.stopPropagation();
      setSearchTerm("");
    }
  };

  return (
    <div className="relative w-full">
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        ref={ref}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-keyshortcuts="F3"
        placeholder="Search name, barcode or SKU — scan & press Enter"
        className="w-full pl-10 pr-24 py-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 shadow-xs transition-colors"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <Kbd combo="F3" />
        )}
        <Barcode className="w-4 h-4 text-zinc-400" />
      </div>
    </div>
  );
});

ProductSearch.displayName = "ProductSearch";
