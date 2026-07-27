import React from "react";

export const Card = ({ children, className = "", onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xs ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
