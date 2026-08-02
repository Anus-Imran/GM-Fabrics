"use client";

import React, { useState, useEffect } from "react";
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
  StickyNote,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../context/authContext.jsx";
import { useTheme } from "../../context/themeContext.jsx";
import { confirmAction, showToastInfo } from "../../utils/alerts.js";
import gmLogo from "../../assets/GM_Logo.jpeg";

export const SidebarNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read saved collapse preference
  useEffect(() => {
    const saved = localStorage.getItem("gm_sidebar_collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("gm_sidebar_collapsed", nextState.toString());
  };

  const handleLogoutConfirm = async () => {
    const isConfirmed = await confirmAction(
      "Logout of System?",
      "Are you sure you want to log out of GM Fabrics POS?",
      "Yes, Logout"
    );
    if (isConfirmed) {
      logout();
      showToastInfo("Logged out successfully.");
    }
  };

  const navGroups = [
    {
      group: "MAIN NAVIGATION",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "POS Counter", href: "/pos", icon: ShoppingCart, highlight: true },
        { label: "Notes & To-Do", href: "/notes", icon: StickyNote },
      ],
    },
    {
      group: "INVENTORY & STOCK",
      items: [
        { label: "Products Catalog", href: "/products", icon: Package },
        { label: "Stock Purchases", href: "/stock-entries", icon: TrendingDown },
        { label: "Categories", href: "/categories", icon: Layers },
        { label: "Brands & Labels", href: "/brands", icon: Tag },
        { label: "Measurement Units", href: "/units", icon: Ruler },
      ],
    },
    {
      group: "FINANCE & SALES",
      items: [
        { label: "Sales History", href: "/sales", icon: Receipt },
        { label: "Customers & Khata", href: "/customers", icon: Users },
        { label: "Suppliers", href: "/suppliers", icon: Truck },
        { label: "Expenses Log", href: "/expenses", icon: TrendingDown },
        { label: "Returns & Refunds", href: "/returns", icon: RotateCcw },
      ],
    },
    {
      group: "INTELLIGENCE",
      items: [
        { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-68"
      } bg-zinc-200/80 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-r border-zinc-300 dark:border-zinc-800 flex flex-col h-screen sticky top-0 shrink-0 shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out select-none z-30`}
    >
      {/* 1. Light Gray Header with Logo & Collapse Toggle Button */}
      <div className="p-4 border-b border-zinc-300 dark:border-zinc-800/80 flex items-center justify-between gap-2 bg-zinc-100/90 dark:bg-zinc-950/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-white shrink-0 shadow-sm group">
            <Image
              src={gmLogo}
              alt="GM Fabrics Logo"
              width={40}
              height={40}
              className="object-contain w-full h-full p-0.5"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-black text-sm text-zinc-900 dark:text-white tracking-tight leading-none">
                GM FABRICS
              </h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1 font-mono mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                POS SYSTEM
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/60 dark:hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. Navigation Links (NO SCROLLBAR) */}
      <nav className="flex-1 py-4 px-2.5 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-black text-zinc-500 dark:text-zinc-500 tracking-widest uppercase mb-1.5 font-mono">
                {group.group}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                if (item.highlight) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex items-center ${
                        isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3.5 py-2.5"
                      } rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-sm ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-emerald-600/30"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0 group-hover:rotate-12 transition-transform" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                      {!isCollapsed && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-950/20 dark:bg-zinc-950/30 text-emerald-800 dark:text-emerald-300 uppercase">
                          POS
                        </span>
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center ${
                      isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3.5 py-2.5"
                    } rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300/50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && item.aiBadge && (
                      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" /> AI
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. Light Gray Footer: Dark Mode Toggle & User Profile */}
      <div className="p-3 border-t border-zinc-300 dark:border-zinc-800/80 bg-zinc-100/90 dark:bg-zinc-950/60 space-y-2">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode") : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center py-2" : "justify-between px-3 py-2"
          } bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all`}
        >
          <span className="flex items-center gap-2">
            {theme === "light" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            {!isCollapsed && <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>}
          </span>
          {!isCollapsed && (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-zinc-300 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {theme}
            </span>
          )}
        </button>

        {/* User Account Card */}
        <div className={`flex items-center ${isCollapsed ? "justify-center flex-col gap-2 pt-1" : "justify-between pt-1"}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 text-zinc-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{user?.name || "User"}</p>
                <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 font-mono tracking-wider uppercase">
                  {user?.role || "CASHIER"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogoutConfirm}
            title="Logout of POS"
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
