import React from "react";
import { Search, Barcode } from "lucide-react";

export const ProductSearch = ({ searchTerm, setSearchTerm, onBarcodeSubmit }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onBarcodeSubmit) {
      onBarcodeSubmit(searchTerm);
    }
  };

  return (
    <div className="relative w-full">
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search fabric name, barcode, or SKU... (Press Enter for scanner)"
        className="w-full pl-10 pr-10 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 shadow-xs transition-colors"
      />
      <Barcode className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
    </div>
  );
};
