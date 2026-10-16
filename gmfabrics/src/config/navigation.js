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
  Wallet,
  ClipboardList,
  PackagePlus,
  UserCog,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

/**
 * Single source of truth for the sidebar, route permissions and navigation shortcuts.
 * `adminOnly` items are hidden for cashiers and their routes are blocked by the layout guard.
 */
export const NAV_GROUPS = [
  {
    label: "MAIN NAVIGATION",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "Alt+Shift+D" },
      { label: "POS Counter", href: "/pos", icon: ShoppingCart, highlight: true, badge: "LIVE", shortcut: "F2" },
      { label: "Day Open / Close", href: "/day-close", icon: Wallet, shortcut: "Alt+Shift+K" },
      { label: "Notes & To-Do", href: "/notes", icon: StickyNote, shortcut: "Alt+Shift+N" },
    ],
  },
  {
    label: "INVENTORY & STOCK",
    items: [
      { label: "Products Catalog", href: "/products", icon: Package, shortcut: "Alt+Shift+P" },
      { label: "Stock Purchases", href: "/stock-entries", icon: PackagePlus, adminOnly: true, shortcut: "Alt+Shift+I" },
      { label: "Stock Adjustments", href: "/stock-adjustments", icon: ClipboardList, adminOnly: true, shortcut: "Alt+Shift+A" },
      { label: "Categories", href: "/categories", icon: Layers },
      { label: "Brands & Labels", href: "/brands", icon: Tag },
      { label: "Measurement Units", href: "/units", icon: Ruler },
    ],
  },
  {
    label: "FINANCE & SALES",
    items: [
      { label: "Sales History", href: "/sales", icon: Receipt, shortcut: "Alt+Shift+S" },
      { label: "Customers & Khata", href: "/customers", icon: Users, shortcut: "Alt+Shift+C" },
      { label: "Suppliers & Payables", href: "/suppliers", icon: Truck, adminOnly: true },
      { label: "Expenses Log", href: "/expenses", icon: TrendingDown, shortcut: "Alt+Shift+E" },
      { label: "Returns & Refunds", href: "/returns", icon: RotateCcw, shortcut: "Alt+Shift+R" },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3, adminOnly: true, shortcut: "Alt+Shift+G" },
      { label: "Users & Access", href: "/users", icon: UserCog, adminOnly: true },
      { label: "Audit Log", href: "/audit-logs", icon: ShieldCheck, adminOnly: true },
      { label: "My Account", href: "/account", icon: KeyRound },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const visibleNavGroups = (role) =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || role === "ADMIN") })).filter(
    (g) => g.items.length > 0
  );

/** True when the current user may open this path. */
export const canAccessPath = (pathname, role) => {
  const item = ALL_NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return !item?.adminOnly || role === "ADMIN";
};

/** Shortcuts that work on every screen (shown in the help panel). */
export const GLOBAL_SHORTCUTS = [
  { combo: "Ctrl+K", description: "Search the menu" },
  { combo: "Ctrl+B", description: "Collapse / expand the sidebar" },
  { combo: "/", description: "Focus the search box on the current page" },
  { combo: "Shift+?", description: "Show all keyboard shortcuts" },
  { combo: "Escape", description: "Close dialogs" },
];

export const POS_SHORTCUTS = [
  { combo: "F3", description: "Focus product search / barcode" },
  { combo: "Enter", description: "Add scanned barcode to cart (in search box)" },
  { combo: "F4", description: "Proceed to payment (press again to confirm)" },
  { combo: "F7", description: "Select customer / khata" },
  { combo: "F8", description: "Hold (park) the current bill" },
  { combo: "F9", description: "Show held bills" },
  { combo: "F10", description: "Clear the cart" },
  { combo: "Alt+D", description: "Apply bill discount" },
];

export const PAYMENT_SHORTCUTS = [
  { combo: "Alt+1", description: "Pay by cash" },
  { combo: "Alt+2", description: "Pay by card" },
  { combo: "Alt+3", description: "Khata (credit)" },
  { combo: "Alt+X", description: "Exact cash amount" },
  { combo: "Ctrl+Enter", description: "Confirm sale" },
];

export const RECEIPT_SHORTCUTS = [
  { combo: "Ctrl+P", description: "Print receipt" },
  { combo: "Alt+W", description: "Share on WhatsApp" },
  { combo: "Alt+N", description: "Start a new sale" },
];
