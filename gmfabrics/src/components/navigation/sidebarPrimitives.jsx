"use client";

import React, { createContext, useContext, useState } from "react";
import { useSidebar, SidebarProvider } from "./sidebarContext.jsx";
import { ChevronRight, PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Sub-context for individual MenuItem state (such as sub-menu open state)
const MenuItemContext = createContext({
  isOpen: false,
  toggle: () => {},
  collapsible: false,
});

/**
 * Sidebar.Layout: Root outer wrapper that coordinates Sidebar and Main content
 */
export const SidebarLayout = ({ children, className = "" }) => {
  return (
    <div
      className={`min-h-screen flex w-full relative bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Sidebar.Backdrop: Mobile overlay backdrop that closes sidebar when clicked
 */
export const SidebarBackdrop = ({ className = "" }) => {
  const { openMobile, setOpenMobile, isMobile } = useSidebar();

  if (!isMobile || !openMobile) return null;

  return (
    <div
      onClick={() => setOpenMobile(false)}
      role="button"
      tabIndex={0}
      aria-label="Close navigation"
      className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-in fade-in ${className}`}
    />
  );
};

/**
 * Sidebar.Root: Core container controlling sidebar width, responsiveness, and variants
 */
export const SidebarRoot = ({
  children,
  id = "main-sidebar",
  className = "",
  side = "left", // "left" | "right"
}) => {
  const { open, openMobile, isMobile, variant, collapsible } = useSidebar();

  // Desktop width computation
  let desktopWidth = "w-68"; // 17rem (272px)
  if (collapsible === "icon" && !open) {
    desktopWidth = "w-20"; // 5rem (80px)
  } else if (collapsible === "offcanvas" && !open) {
    desktopWidth = "w-0 overflow-hidden";
  }

  // Variant styling
  let variantStyles = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm";
  if (variant === "floating") {
    variantStyles =
      "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl my-3 ml-3 h-[calc(100vh-1.5rem)]";
  } else if (variant === "inset") {
    variantStyles =
      "bg-zinc-100/80 dark:bg-zinc-950/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 my-2 ml-2 h-[calc(100vh-1rem)]";
  } else {
    // default "sidebar"
    variantStyles = `bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen sticky top-0`;
  }

  return (
    <aside
      id={id}
      data-state={open ? "expanded" : "collapsed"}
      data-side={side}
      data-variant={variant}
      className={`shrink-0 z-30 transition-all duration-300 ease-in-out select-none ${
        isMobile
          ? `fixed inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-72 z-50 shadow-2xl ${
              openMobile ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
            }`
          : `${desktopWidth} ${variantStyles}`
      } ${className}`}
    >
      <div className="flex flex-col h-full w-full relative overflow-hidden">{children}</div>
    </aside>
  );
};

export const SidebarAside = ({ children, className = "" }) => (
  <div className={`flex flex-col h-full w-full ${className}`}>{children}</div>
);

export const SidebarPanel = ({ children, className = "" }) => (
  <div className={`flex flex-col h-full w-full ${className}`}>{children}</div>
);

/**
 * Sidebar.Header: Store / App Brand Header area
 */
export const SidebarHeader = ({ children, className = "" }) => {
  return (
    <div
      className={`p-3 border-b border-zinc-100 dark:border-zinc-800/70 shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xs flex items-center justify-between gap-2 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Sidebar.Content: Scrollable body for navigation menus
 */
export const SidebarContent = ({ children, className = "" }) => {
  return (
    <div
      className={`flex-1 overflow-y-auto px-2.5 py-3 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Sidebar.Group: Logical group of navigation items
 */
export const SidebarGroup = ({ children, className = "" }) => {
  return <div className={`space-y-1 ${className}`}>{children}</div>;
};

/**
 * Sidebar.GroupLabel: Section Header / Label
 */
export const SidebarGroupLabel = ({ children, className = "" }) => {
  const { open, isMobile } = useSidebar();

  if (!open && !isMobile) {
    return <div className="h-2 w-full" />;
  }

  return (
    <div
      className={`px-3 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-mono flex items-center justify-between select-none ${className}`}
    >
      <span>{children}</span>
    </div>
  );
};

export const SidebarGroupContent = ({ children, className = "" }) => {
  return <div className={`space-y-1 ${className}`}>{children}</div>;
};

export const SidebarMenu = ({ children, className = "" }) => {
  return <ul className={`space-y-1 list-none p-0 m-0 ${className}`}>{children}</ul>;
};

/**
 * Sidebar.MenuItem: Single navigation item or collapsible parent with sub-items
 */
export const SidebarMenuItem = ({
  children,
  className = "",
  collapsible = false,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    if (collapsible) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <MenuItemContext.Provider value={{ isOpen, toggle, collapsible }}>
      <li className={`relative group/item ${className}`} data-open={isOpen ? "true" : undefined}>
        {children}
      </li>
    </MenuItemContext.Provider>
  );
};

/**
 * Sidebar.MenuButton: The interactive button/link inside MenuItem
 */
export const SidebarMenuButton = React.forwardRef(
  (
    {
      children,
      as: Component = "button",
      isActive = false,
      variant = "default", // "default" | "highlight" | "ghost"
      className = "",
      tooltip,
      onClick,
      ...props
    },
    ref
  ) => {
    const { open, isMobile } = useSidebar();
    const { toggle, collapsible } = useContext(MenuItemContext);

    const handleClick = (e) => {
      if (collapsible) {
        toggle();
      }
      if (onClick) onClick(e);
    };

    const isCompact = !open && !isMobile;

    let baseTheme = "";
    if (variant === "highlight" || props.highlight) {
      baseTheme = isActive
        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/25"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-bold";
    } else {
      baseTheme = isActive
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs"
        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 font-medium";
    }

    return (
      <div className="relative">
        <Component
          ref={ref}
          onClick={handleClick}
          data-active={isActive ? "true" : undefined}
          title={isCompact && tooltip ? tooltip : undefined}
          className={`w-full flex items-center ${
            isCompact ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
          } rounded-xl text-xs transition-all duration-200 cursor-pointer outline-hidden ${baseTheme} ${className}`}
          {...props}
        >
          {children}
        </Component>

        {/* Collapsed floating tooltip */}
        {isCompact && tooltip && (
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 hidden group-hover/item:flex items-center px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold whitespace-nowrap shadow-xl border border-zinc-700/50 animate-in fade-in zoom-in-95 duration-150">
            {tooltip}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-100" />
          </div>
        )}
      </div>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

/**
 * Sidebar.MenuBadge: Counter or status badge
 */
export const SidebarMenuBadge = ({ children, variant = "default", className = "" }) => {
  const { open, isMobile } = useSidebar();

  if (!open && !isMobile) return null;

  let badgeColor = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300";
  if (variant === "emerald") badgeColor = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (variant === "amber") badgeColor = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (variant === "rose") badgeColor = "bg-rose-500/15 text-rose-600 dark:text-rose-400";

  return (
    <span
      className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono shrink-0 ml-auto ${badgeColor} ${className}`}
    >
      {children}
    </span>
  );
};

/**
 * Sidebar.MenuAction: Hover icon action on an item
 */
export const SidebarMenuAction = ({ children, onClick, className = "" }) => {
  const { open, isMobile } = useSidebar();
  if (!open && !isMobile) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      className={`p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors opacity-0 group-hover/item:opacity-100 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Sidebar.MenuSub: Accordion collapsible sub-menu
 */
export const SidebarMenuSub = ({ children, className = "" }) => {
  const { isOpen } = useContext(MenuItemContext);
  const { open, isMobile } = useSidebar();

  if (!open && !isMobile) {
    return null;
  }

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
      }`}
    >
      <ul
        className={`ml-4 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-1 list-none py-1 ${className}`}
      >
        {children}
      </ul>
    </div>
  );
};

export const SidebarMenuSubItem = ({ children, className = "" }) => {
  return <li className={`relative ${className}`}>{children}</li>;
};

export const SidebarMenuSubButton = ({
  children,
  as: Component = "button",
  isActive = false,
  className = "",
  ...props
}) => {
  return (
    <Component
      data-active={isActive ? "true" : undefined}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
        isActive
          ? "bg-zinc-100 dark:bg-zinc-800/80 text-emerald-600 dark:text-emerald-400 font-bold"
          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 font-medium"
      } ${className}`}
      {...props}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full transition-transform ${
          isActive
            ? "bg-emerald-500 scale-125"
            : "bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400"
        }`}
      />
      <span>{children}</span>
    </Component>
  );
};

/**
 * Sidebar.Footer: Bottom profile / actions area
 */
export const SidebarFooter = ({ children, className = "" }) => {
  return (
    <div
      className={`p-3 border-t border-zinc-100 dark:border-zinc-800/70 shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xs flex flex-col gap-2 ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Sidebar.Rail: Subtle interactive rail on the border to expand/collapse
 */
export const SidebarRail = ({ className = "" }) => {
  const { toggleSidebar, open, isMobile } = useSidebar();

  if (isMobile) return null;

  return (
    <button
      onClick={toggleSidebar}
      title={open ? "Collapse Sidebar (Ctrl+B)" : "Expand Sidebar (Ctrl+B)"}
      aria-label="Toggle Sidebar"
      className={`absolute top-0 right-0 translate-x-1/2 w-4 h-full cursor-col-resize group z-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 outline-none ${className}`}
    >
      <div className="w-1 h-12 rounded-full bg-emerald-500 shadow-md group-hover:scale-y-125 transition-transform" />
    </button>
  );
};

/**
 * Sidebar.Trigger: Universal toggle button
 */
export const SidebarTrigger = ({
  className = "",
  as: Component = "button",
  children,
  ...props
}) => {
  const { toggleSidebar, open, isMobile, openMobile } = useSidebar();

  const isCurrentlyOpen = isMobile ? openMobile : open;

  return (
    <Component
      onClick={toggleSidebar}
      title={isCurrentlyOpen ? "Collapse navigation (Ctrl+B)" : "Expand navigation (Ctrl+B)"}
      aria-label="Toggle navigation"
      className={`p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors outline-hidden ${className}`}
      {...props}
    >
      {children ||
        (isCurrentlyOpen ? (
          <PanelLeftClose className="w-4.5 h-4.5" />
        ) : (
          <PanelLeftOpen className="w-4.5 h-4.5" />
        ))}
    </Component>
  );
};

/**
 * Sidebar.Spacer: Visual flexible filler
 */
export const SidebarSpacer = () => <div className="flex-1" />;

/**
 * Sidebar.Main: Wrapper for the main content adjacent to the sidebar
 */
export const SidebarMain = ({ children, className = "" }) => {
  return <div className={`flex-1 flex flex-col min-w-0 ${className}`}>{children}</div>;
};

// Composed object for PrimeReact style <Sidebar.*> usage
export const Sidebar = {
  Provider: SidebarProvider,
  Layout: SidebarLayout,
  Backdrop: SidebarBackdrop,
  Root: SidebarRoot,
  Aside: SidebarAside,
  Panel: SidebarPanel,
  Header: SidebarHeader,
  Content: SidebarContent,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  GroupContent: SidebarGroupContent,
  Menu: SidebarMenu,
  MenuItem: SidebarMenuItem,
  MenuButton: SidebarMenuButton,
  MenuBadge: SidebarMenuBadge,
  MenuAction: SidebarMenuAction,
  MenuSub: SidebarMenuSub,
  MenuSubItem: SidebarMenuSubItem,
  MenuSubButton: SidebarMenuSubButton,
  Footer: SidebarFooter,
  Rail: SidebarRail,
  Trigger: SidebarTrigger,
  Spacer: SidebarSpacer,
  Main: SidebarMain,
};
