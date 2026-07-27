import React from "react";

export const KpiCard = ({ title, value, subtext, icon: Icon, badgeText, badgeVariant = "default" }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md hover:border-zinc-300">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</h2>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>
          {badgeText && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
