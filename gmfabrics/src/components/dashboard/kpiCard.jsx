import React from "react";

export const KpiCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  badgeVariant = "default",
  accentColor = "zinc",
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case "danger":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40";
      case "warning":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40";
      case "success":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40";
      case "info":
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <div className="group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-700 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 group-hover:scale-110 transition-transform duration-200 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
          {value}
        </h2>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{subtext}</p>
          {badgeText && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${getBadgeStyle()}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
