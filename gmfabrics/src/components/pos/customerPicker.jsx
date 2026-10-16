"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import { User, X, Search } from "lucide-react";
import api from "../../services/apiService.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Kbd } from "../common/tooltip.jsx";

/**
 * Searches customers on the server as you type (name / phone / CNIC),
 * so the POS does not need to download the whole customer list.
 */
export const CustomerPicker = forwardRef(({ value, onChange }, ref) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get("/customers", { params: { search: term || undefined, pageSize: 8, sortBy: term ? "name" : "outstandingBalance" } });
        setResults(res.data?.items || []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [term, open]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const choose = (c) => {
    onChange(c);
    setTerm("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      e.currentTarget.blur();
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded-lg">
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{value.name}</p>
          <p className="text-[10px] text-zinc-500 truncate">
            {value.phone || "No phone"} • Khata:{" "}
            <span className={value.outstandingBalance > 0 ? "text-amber-600 font-bold" : ""}>{formatCurrency(value.outstandingBalance || 0)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 rounded text-zinc-400 hover:text-red-600 cursor-pointer"
          title="Remove customer (walk-in sale)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        ref={ref}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-keyshortcuts="F7"
        placeholder="Walk-in — search customer name / phone"
        className="w-full text-xs pl-8 pr-10 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <Kbd combo="F7" className="absolute right-2 top-1/2 -translate-y-1/2" />
      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          {loading && <p className="text-[11px] text-zinc-400 p-3">Searching…</p>}
          {!loading && results.length === 0 && <p className="text-[11px] text-zinc-400 p-3">No customers found</p>}
          {!loading &&
            results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer ${
                  i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate font-semibold">{c.name}</span>
                  {c.phone && <span className="text-zinc-400 font-mono text-[10px]">{c.phone}</span>}
                </span>
                {c.outstandingBalance > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 shrink-0">{formatCurrency(c.outstandingBalance)}</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
});

CustomerPicker.displayName = "CustomerPicker";
