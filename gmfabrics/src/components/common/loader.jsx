"use client";

import React from "react";
import { Loader2, Sparkles, Layers, Package, ShoppingBag } from "lucide-react";

export const Loader = ({
  text = "Loading data...",
  variant = "table", // "table" | "page" | "card" | "inline"
  size = "md",       // "sm" | "md" | "lg"
  icon: CustomIcon = null,
}) => {
  // Size classes
  const sizeMap = {
    sm: {
      outer: "w-6 h-6",
      inner: "w-3 h-3",
      text: "text-xs",
      py: "py-4",
    },
    md: {
      outer: "w-10 h-10",
      inner: "w-5 h-5",
      text: "text-xs font-semibold",
      py: "py-12",
    },
    lg: {
      outer: "w-14 h-14",
      inner: "w-7 h-7",
      text: "text-sm font-bold",
      py: "py-20",
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const IconToRender = CustomIcon || Sparkles;

  if (variant === "inline") {
    return (
      <div className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <Loader2 className={`${currentSize.outer} animate-spin text-emerald-600 dark:text-emerald-400`} />
        {text && <span className={currentSize.text}>{text}</span>}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-all duration-300">
        <div className="relative flex items-center justify-center">
          {/* Glowing Backlight */}
          <div className="absolute w-24 h-24 bg-emerald-500/20 dark:bg-emerald-400/20 rounded-full blur-2xl animate-pulse" />
          
          {/* Multi-layer Spinning Rings */}
          <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 dark:border-emerald-400/20 dark:border-t-emerald-400 animate-spin" />
          <div className="absolute w-12 h-12 rounded-full border-2 border-indigo-500/20 border-b-indigo-600 dark:border-indigo-400/20 dark:border-b-indigo-400 animate-[spin_1.5s_linear_infinite_reverse]" />
          
          {/* Center Brand Icon */}
          <div className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-md">
            <IconToRender className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-1.5">
          <span className="text-sm font-bold tracking-wide text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>GM FABRICS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-normal animate-pulse">
            {text}
          </span>
        </div>
      </div>
    );
  }

  // Default "table" or "card" loader
  return (
    <div className={`w-full flex flex-col items-center justify-center ${currentSize.py} space-y-3`}>
      <div className="relative flex items-center justify-center">
        {/* Soft Ambient Blur */}
        <div className="absolute w-14 h-14 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full blur-lg animate-pulse" />
        
        {/* Glowing Gradient Outer Spinner Ring */}
        <div className={`${currentSize.outer} rounded-full border-2 border-zinc-200 border-t-emerald-600 dark:border-zinc-800 dark:border-t-emerald-400 animate-spin`} />
        
        {/* Center Icon */}
        <div className="absolute">
          <IconToRender className={`${currentSize.inner} text-emerald-600 dark:text-emerald-400 animate-pulse`} />
        </div>
      </div>

      {text && (
        <p className={`${currentSize.text} text-zinc-500 dark:text-zinc-400 tracking-wide font-medium animate-pulse text-center`}>
          {text}
        </p>
      )}
    </div>
  );
};
