import React from "react";

export const PageHeader = ({ title, description, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
