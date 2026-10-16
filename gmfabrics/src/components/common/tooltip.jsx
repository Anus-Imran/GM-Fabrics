import React from "react";

/** Keyboard key chip, e.g. <Kbd combo="Alt+Shift+D" />. */
export const Kbd = ({ combo, children, className = "" }) => {
  const parts = combo ? combo.split("+") : [children];
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {parts.map((p, i) => (
        <kbd
          key={`${p}-${i}`}
          className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 font-mono text-[10px] font-bold leading-none shadow-[0_1px_0_rgba(0,0,0,0.15)]"
        >
          {p === "Shift" ? "⇧" : p}
        </kbd>
      ))}
    </span>
  );
};

/**
 * Lightweight hover/focus tooltip (pure CSS, no portal) that can show a keyboard shortcut.
 *   <Tooltip label="Proceed to payment" shortcut="F4"><button>Pay</button></Tooltip>
 */
export const Tooltip = ({ label, shortcut, children, side = "top", className = "", block = false }) => {
  if (!label && !shortcut) return children;

  const position =
    side === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : side === "left"
      ? "right-full mr-2 top-1/2 -translate-y-1/2"
      : side === "right"
      ? "left-full ml-2 top-1/2 -translate-y-1/2"
      : "bottom-full mb-2 left-1/2 -translate-x-1/2";

  return (
    <span className={`relative group/tooltip ${block ? "flex" : "inline-flex"} ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} z-[60] whitespace-nowrap rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold shadow-lg opacity-0 scale-95 transition-all duration-150 delay-300 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 flex items-center gap-2`}
      >
        {label && <span>{label}</span>}
        {shortcut && <Kbd combo={shortcut} className="[&_kbd]:bg-zinc-700 [&_kbd]:text-white [&_kbd]:border-zinc-600 dark:[&_kbd]:bg-zinc-300 dark:[&_kbd]:text-zinc-900 dark:[&_kbd]:border-zinc-400" />}
      </span>
    </span>
  );
};
