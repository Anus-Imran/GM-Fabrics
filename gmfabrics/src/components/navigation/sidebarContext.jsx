"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const defaultContext = {
  open: true,
  setOpen: () => {},
  openMobile: false,
  setOpenMobile: () => {},
  isMobile: false,
  toggleSidebar: () => {},
  state: "expanded",
  variant: "sidebar",
  setVariant: () => {},
  collapsible: "icon",
  setCollapsible: () => {},
  isMounted: false,
};

const SidebarContext = createContext(defaultContext);

export const SidebarProvider = ({
  children,
  defaultOpen = true,
  defaultVariant = "sidebar", // "sidebar" | "floating" | "inset"
  defaultCollapsible = "icon", // "icon" | "offcanvas" | "none"
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [variant, setVariant] = useState(defaultVariant);
  const [collapsible, setCollapsible] = useState(defaultCollapsible);
  const [isMounted, setIsMounted] = useState(false);

  // Responsive mobile detector
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setOpenMobile(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Restore saved collapse preference on desktop
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("gm_sidebar_collapsed");
        if (saved !== null) {
          setOpen(saved !== "true");
        }
        const savedVariant = localStorage.getItem("gm_sidebar_variant");
        if (savedVariant) {
          setVariant(savedVariant);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Keyboard shortcut: Ctrl + B or Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (isMobile) {
          setOpenMobile((prev) => !prev);
        } else {
          setOpen((prev) => {
            const next = !prev;
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("gm_sidebar_collapsed", (!next).toString());
              }
            } catch {
              // Ignore storage errors
            }
            return next;
          });
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => {
        const next = !prev;
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("gm_sidebar_collapsed", (!next).toString());
          }
        } catch {
          // Ignore storage errors
        }
        return next;
      });
    }
  }, [isMobile]);

  const changeVariant = useCallback((newVariant) => {
    setVariant(newVariant);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("gm_sidebar_variant", newVariant);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const state = open ? "expanded" : "collapsed";

  const contextValue = {
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
    state,
    variant,
    setVariant: changeVariant,
    collapsible,
    setCollapsible,
    isMounted,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  return context || defaultContext;
};
