"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Tag,
  Ruler,
  TrendingDown,
  Users,
  Truck,
  Receipt,
  RotateCcw,
  BarChart3,
  Bot,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../context/authContext.jsx";
import { useTheme } from "../../context/themeContext.jsx";
import gmLogo from "../../assets/GM_Logo.jpeg";

export const SidebarNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "POS Counter", href: "/pos", icon: ShoppingCart, highlight: true },
    {
      group: "Inventory & Stock",
      items: [
        { label: "Products Catalog", href: "/products", icon: Package },
        { label: "Stock Purchases", href: "/stock-entries", icon: TrendingDown },
        { label: "Categories", href: "/categories", icon: Layers },
        { label: "Brands", href: "/brands", icon: Tag },
        { label: "Units", href: "/units", icon: Ruler },
      ],
    },
    { label: "Suppliers", href: "/suppliers", icon: Truck },
    { label: "Sales History", href: "/sales", icon: Receipt },
    { label: "Customers & Khata", href: "/customers", icon: Users },
    { label: "Expenses", href: "/expenses", icon: TrendingDown },
    { label: "Returns", href: "/returns", icon: RotateCcw },
    { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
    { label: "AI Agent Assistant", href: "/ai-assistant", icon: Bot, aiBadge: true },
  ];

  return (
    <aside className="w-64 bg-slate-100/90 dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col min-h-screen shrink-0">
      {/* Brand Header with User's GM_Logo.jpeg */}
      <div className="h-20 flex items-center px-5 border-b border-slate-200 dark:border-zinc-800 gap-3 bg-white dark:bg-zinc-900">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white shrink-0 shadow-xs">
          <Image
            src={gmLogo}
            alt="GM Fabrics Logo"
            width={44}
            height={44}
            className="object-contain w-full h-full p-0.5"
            priority
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 tracking-tight leading-none">
            GM FABRICS
          </h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
            POS & Inventory
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          if (item.group) {
            return (
              <div key={idx} className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  {item.group}
                </p>
                {item.items.map((subItem) => {
                  const Icon = subItem.icon;
                  const isActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900 font-bold"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                item.highlight
                  ? "bg-slate-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                  : isActive
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.aiBadge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle & User Account Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        {/* Light / Dark Mode Switch */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            {theme === "light" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
          </span>
          <span className="text-[10px] opacity-70 uppercase">Switch</span>
        </button>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-slate-500 font-mono font-semibold uppercase">{user?.role || "CASHIER"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
