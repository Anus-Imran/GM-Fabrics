import React from "react";

export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200",
    success: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold",
    warning: "bg-zinc-200 text-zinc-900 border-zinc-300 font-medium",
    danger: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-900",
    dark: "bg-black text-white dark:bg-white dark:text-black font-semibold",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
};
