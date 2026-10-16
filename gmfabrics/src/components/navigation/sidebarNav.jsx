"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Search,
  Sliders,
  Keyboard,
  ShieldCheck,
  X,
} from "lucide-react";
import { Sidebar } from "./sidebarPrimitives.jsx";
import { useSidebar } from "./sidebarContext.jsx";
import { useAuth } from "../../context/authContext.jsx";
import { useTheme } from "../../context/themeContext.jsx";
import { confirmAction, showToastInfo } from "../../utils/alerts.js";
import { visibleNavGroups } from "../../config/navigation.js";
import { useHotkeys } from "../../hooks/useHotkeys.js";
import gmLogo from "../../assets/GM_Logo.jpeg";

export const SidebarNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open, toggleSidebar, isMobile, setOpenMobile, variant, setVariant } = useSidebar();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  // Close mobile offcanvas on route change
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest("#user-dropdown") && !e.target.closest("#user-trigger")) {
        setShowUserMenu(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleLogoutConfirm = async () => {
    setShowUserMenu(false);
    const isConfirmed = await confirmAction(
      "Logout of POS?",
      "Are you sure you want to end your GM Fabrics POS cashier session?",
      "Yes, Logout"
    );
    if (isConfirmed) {
      logout();
      showToastInfo("Logged out successfully.");
    }
  };

  const navGroups = visibleNavGroups(user?.role);

  // Ctrl+K / Cmd+K focuses the menu search (expanding the sidebar if needed).
  useHotkeys({
    "Ctrl+K": () => {
      if (!open && !isMobile) toggleSidebar();
      if (isMobile) setOpenMobile(true);
      setTimeout(() => searchInputRef.current?.focus(), 150);
    },
  });

  // Search filter
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navGroups;
    const q = searchQuery.toLowerCase().trim();
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [searchQuery, navGroups]);

  const isCompact = !open && !isMobile;

  return (
    <>
      <Sidebar.Root id="gm-fabrics-sidebar">
        <Sidebar.Aside>
          <Sidebar.Panel>
            {/* 1. BRAND & STORE SWITCHER HEADER */}
            <Sidebar.Header className="relative">
              <div className="flex items-center gap-2.5 overflow-hidden w-full">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2.5 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-1 overflow-hidden select-none ${
                    isCompact ? "justify-center" : ""
                  }`}
                  title={isCompact ? "GM Fabrics" : undefined}
                >
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white shrink-0 shadow-xs flex items-center justify-center">
                    <Image
                      src={gmLogo}
                      alt="GM Fabrics Logo"
                      width={36}
                      height={36}
                      className="object-contain w-full h-full p-0.5"
                      priority
                    />
                  </div>

                  {!isCompact && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-50 truncate tracking-tight">
                          GM FABRICS
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                        POS & Inventory
                      </p>
                    </div>
                  )}
                </Link>

                {/* Sidebar expand/collapse trigger button */}
                <Sidebar.Trigger className="shrink-0" />
              </div>

            </Sidebar.Header>

            {/* 2. SEARCH / QUICK FILTER (WHEN EXPANDED) */}
            {!isCompact ? (
              <div className="px-3 pt-3 pb-1">
                <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-2.5 py-1.5 border border-transparent focus-within:border-emerald-500/40 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-200/80 dark:bg-zinc-700 px-1 rounded">
                      ⌘K
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-2 pt-2 flex justify-center">
                <button
                  onClick={() => {
                    toggleSidebar();
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }}
                  title="Search navigation (⌘K)"
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3. NAVIGATION CONTENT */}
            <Sidebar.Content>
              {filteredGroups.length === 0 ? (
                <div className="text-center py-6 px-3">
                  <p className="text-xs text-zinc-400">No menu items found</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 cursor-pointer underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <Sidebar.Group key={group.label}>
                    <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
                    <Sidebar.GroupContent>
                      <Sidebar.Menu>
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                          return (
                            <Sidebar.MenuItem key={item.href}>
                              <Sidebar.MenuButton
                                as={Link}
                                href={item.href}
                                isActive={isActive}
                                variant={item.highlight ? "highlight" : "default"}
                                tooltip={item.shortcut ? `${item.label}  (${item.shortcut})` : item.label}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <Icon
                                    className={`w-[18px] h-[18px] shrink-0 ${
                                      item.highlight && isActive
                                        ? "text-white"
                                        : item.highlight
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : isActive
                                        ? "text-emerald-400"
                                        : "text-zinc-500 dark:text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-zinc-100"
                                    }`}
                                  />
                                  {!isCompact && (
                                    <span className="truncate">
                                      {item.label}
                                    </span>
                                  )}
                                </div>

                                {!isCompact && item.badge && (
                                  <Sidebar.MenuBadge variant="emerald">
                                    {item.badge}
                                  </Sidebar.MenuBadge>
                                )}

                                {!isCompact && item.shortcut && !item.badge && (
                                  <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    {item.shortcut}
                                  </span>
                                )}
                              </Sidebar.MenuButton>
                            </Sidebar.MenuItem>
                          );
                        })}
                      </Sidebar.Menu>
                    </Sidebar.GroupContent>
                  </Sidebar.Group>
                ))
              )}
            </Sidebar.Content>

            {/* 4. FOOTER: USER CARD & QUICK SETTINGS */}
            <Sidebar.Footer className="relative">
              {/* User Profile Card Button */}
              <div className="relative">
                <button
                  id="user-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title={isCompact ? `${user?.name || "User"} (${user?.role || "Cashier"})` : undefined}
                  className={`w-full flex items-center ${
                    isCompact ? "justify-center p-1.5" : "justify-between p-2"
                  } rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer select-none`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        {user?.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                    </div>

                    {!isCompact && (
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user?.name || "Cashier User"}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold uppercase truncate">
                          {user?.role || "CASHIER"}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isCompact && (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                  )}
                </button>

                {/* User Menu Popover */}
                {showUserMenu && (
                  <div
                    id="user-dropdown"
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 min-w-56"
                  >
                    {/* Header with user info */}
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {user?.name || "Logged User"}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {user?.email || "pos@gmfabrics.com"}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          Signed in as {user?.role === "ADMIN" ? "Admin" : "Cashier"}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1 space-y-0.5">
                      {/* Theme toggle */}
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          {theme === "light" ? (
                            <Sun className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Moon className="w-4 h-4 text-indigo-400" />
                          )}
                          <span>Theme Appearance</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {theme}
                        </span>
                      </button>

                      {/* Variant switcher */}
                      <button
                        onClick={() => {
                          const nextVariant =
                            variant === "sidebar"
                              ? "floating"
                              : variant === "floating"
                              ? "inset"
                              : "sidebar";
                          setVariant(nextVariant);
                          showToastInfo(`Sidebar layout: ${nextVariant}`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Sliders className="w-4 h-4 text-zinc-400" />
                          <span>Sidebar Style</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded capitalize">
                          {variant}
                        </span>
                      </button>

                      {/* Keyboard shortcuts */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          window.__gmOpenShortcuts?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Keyboard className="w-4 h-4 text-zinc-400" />
                          <span>POS Shortcuts</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">Shift+?</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        onClick={handleLogoutConfirm}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of POS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Sidebar.Footer>

            {/* 5. INTERACTIVE EDGE RAIL */}
            <Sidebar.Rail />
          </Sidebar.Panel>
        </Sidebar.Aside>
      </Sidebar.Root>

    </>
  );
};
