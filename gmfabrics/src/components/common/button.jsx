import React from "react";
import { Loader2 } from "lucide-react";
import { Tooltip } from "./tooltip.jsx";

export const Button = ({
  children,
  type = "button",
  variant = "primary", // "primary" | "secondary" | "outline" | "danger" | "ghost" | "success"
  size = "md", // "sm" | "md" | "lg"
  disabled = false,
  loading = false,
  loadingText,
  className = "",
  onClick,
  tooltip, // hover text
  shortcut, // keyboard combo shown in the tooltip, e.g. "F4"
  tooltipSide = "top",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900";

  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-black shadow-xs dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    outline: "border border-zinc-200 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-xs",
    lg: "px-5 py-3 text-sm",
  };

  const button = (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-keyshortcuts={shortcut || undefined}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{loadingText || children || "Processing..."}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );

  if (!tooltip && !shortcut) return button;

  // Full-width buttons keep their width inside the tooltip wrapper.
  const block = /\bw-full\b/.test(className);
  return (
    <Tooltip label={tooltip} shortcut={shortcut} side={tooltipSide} block={block} className={block ? "w-full" : ""}>
      {button}
    </Tooltip>
  );
};
