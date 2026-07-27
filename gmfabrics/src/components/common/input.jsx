import React from "react";

export const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  error,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-colors ${
          error ? "border-red-500" : "hover:border-zinc-300 focus:border-zinc-900 dark:focus:border-zinc-100"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
};
