import React from "react";

export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200",
    success: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold",
    warning: "bg-zinc-200 text-zinc-900 border-zinc-300 font-medium",
    danger: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-900",
    dark: "bg-black text-white dark:bg-white dark:text-black font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
