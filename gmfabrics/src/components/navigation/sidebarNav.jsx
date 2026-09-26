"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronDown,
  Check,
  Search,
  Building2,
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
import gmLogo from "../../assets/GM_Logo.jpeg";

const BRANCHES = [
  { id: "main", name: "GM Fabrics Main", code: "GM-01", tag: "Primary Counter" },
  { id: "market", name: "Cloth Market Branch", code: "GM-02", tag: "Retail Store" },
  { id: "warehouse", name: "Central Warehouse", code: "GM-WH", tag: "Storage Hub" },
];

export const SidebarNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open, toggleSidebar, isMobile, setOpenMobile, variant, setVariant } = useSidebar();

  const [activeBranch, setActiveBranch] = useState(BRANCHES[0]);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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
      if (!e.target.closest("#branch-dropdown") && !e.target.closest("#branch-trigger")) {
        setShowBranchMenu(false);
      }
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

  const navGroups = [
    {
      label: "MAIN NAVIGATION",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          shortcut: "Alt+D",
        },
        {
          label: "POS Counter",
          href: "/pos",
          icon: ShoppingCart,
          highlight: true,
          badge: "LIVE",
          shortcut: "F2",
        },
        {
          label: "Notes & To-Do",
          href: "/notes",
          icon: StickyNote,
          shortcut: "Alt+N",
        },
      ],
    },
    {
      label: "INVENTORY & STOCK",
      items: [
        {
          label: "Products Catalog",
          href: "/products",
          icon: Package,
        },
        {
          label: "Stock Purchases",
          href: "/stock-entries",
          icon: TrendingDown,
        },
        {
          label: "Categories",
          href: "/categories",
          icon: Layers,
        },
        {
          label: "Brands & Labels",
          href: "/brands",
          icon: Tag,
        },
        {
          label: "Measurement Units",
          href: "/units",
          icon: Ruler,
        },
      ],
    },
    {
      label: "FINANCE & SALES",
      items: [
        {
          label: "Sales History",
          href: "/sales",
          icon: Receipt,
        },
        {
          label: "Customers & Khata",
          href: "/customers",
          icon: Users,
        },
        {
          label: "Suppliers",
          href: "/suppliers",
          icon: Truck,
        },
        {
          label: "Expenses Log",
          href: "/expenses",
          icon: TrendingDown,
        },
        {
          label: "Returns & Refunds",
          href: "/returns",
          icon: RotateCcw,
        },
      ],
    },
    {
      label: "INTELLIGENCE",
      items: [
        {
          label: "Reports & Analytics",
          href: "/reports",
          icon: BarChart3,
          aiBadge: true,
        },
      ],
    },
  ];

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
  }, [searchQuery]);

  const isCompact = !open && !isMobile;

  return (
    <>
      <Sidebar.Root id="gm-fabrics-sidebar">
        <Sidebar.Aside>
          <Sidebar.Panel>
            {/* 1. BRAND & STORE SWITCHER HEADER */}
            <Sidebar.Header className="relative">
              <div className="flex items-center gap-2.5 overflow-hidden w-full">
                <div
                  id="branch-trigger"
                  onClick={() => setShowBranchMenu(!showBranchMenu)}
                  className={`flex items-center gap-2.5 p-1 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-1 overflow-hidden select-none ${
                    isCompact ? "justify-center" : ""
                  }`}
                  title={isCompact ? `${activeBranch.name} (${activeBranch.code})` : undefined}
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
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate flex items-center gap-1">
                        <span>{activeBranch.name}</span>
                        <ChevronDown className="w-3 h-3 shrink-0 ml-auto opacity-70" />
                      </p>
                    </div>
                  )}
                </div>

                {/* Sidebar expand/collapse trigger button */}
                <Sidebar.Trigger className="shrink-0" />
              </div>

              {/* Branch Switcher Popup Dropdown */}
              {showBranchMenu && (
                <div
                  id="branch-dropdown"
                  className="absolute top-full left-2 right-2 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Active POS Branches
                    </p>
                  </div>
                  <div className="space-y-1 mt-1">
                    {BRANCHES.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBranch(b);
                          setShowBranchMenu(false);
                          showToastInfo(`Switched branch to: ${b.name}`);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left ${
                          activeBranch.id === b.id
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold truncate">{b.name}</p>
                            <p className="text-[10px] text-zinc-400">{b.tag}</p>
                          </div>
                        </div>
                        {activeBranch.id === b.id && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                          const isActive = pathname === item.href;

                          return (
                            <Sidebar.MenuItem key={item.href}>
                              <Sidebar.MenuButton
                                as={Link}
                                href={item.href}
                                isActive={isActive}
                                variant={item.highlight ? "highlight" : "default"}
                                tooltip={item.label}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Icon
                                    className={`w-4 h-4 shrink-0 transition-transform group-hover/item:scale-110 ${
                                      item.highlight && isActive
                                        ? "text-white"
                                        : item.highlight
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : isActive
                                        ? "text-white dark:text-zinc-900"
                                        : "text-zinc-500 dark:text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-zinc-100"
                                    }`}
                                  />
                                  {!isCompact && (
                                    <span className="truncate tracking-tight font-medium">
                                      {item.label}
                                    </span>
                                  )}
                                </div>

                                {!isCompact && item.badge && (
                                  <Sidebar.MenuBadge variant="emerald">
                                    {item.badge}
                                  </Sidebar.MenuBadge>
                                )}

                                {!isCompact && item.aiBadge && (
                                  <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-mono">
                                    <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-spin" />
                                    AI
                                  </span>
                                )}

                                {!isCompact && item.shortcut && !item.badge && !item.aiBadge && (
                                  <span className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
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
                          {user?.role || "ADMIN"}
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
                          Terminal {activeBranch.code} Active
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
                          setShowShortcutsModal(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Keyboard className="w-4 h-4 text-zinc-400" />
                          <span>POS Shortcuts</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">Ctrl+B</span>
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

      {/* POS Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          onClick={() => setShowShortcutsModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-[11px] text-zinc-400">Boost your GM Fabrics cashier speed</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Toggle Sidebar (Icon / Full)</span>
                <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  Ctrl + B
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Open POS Cashier Counter</span>
                <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  F2
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Quick Menu Search</span>
                <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  ⌘K / Ctrl+K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-600 dark:text-zinc-400">Close Modals / Overlays</span>
                <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
