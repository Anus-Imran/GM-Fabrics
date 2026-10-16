"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, ShoppingCart, AlertCircle, PackageX, Wallet, BookOpen, Keyboard } from "lucide-react";
import { Sidebar } from "./sidebarPrimitives.jsx";
import { Tooltip } from "../common/tooltip.jsx";
import { formatDateTime } from "../../utils/formatDate.js";
import api from "../../services/apiService.js";

const POLL_MS = 60000;

const iconFor = (type) => {
  if (type === "OUT_OF_STOCK") return <PackageX className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />;
  if (type === "KHATA_PAYMENT") return <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
  if (type === "CASH_DIFFERENCE") return <Wallet className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
  return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
};

export const TopbarHeader = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const boxRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data || []);
      setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : (res.data || []).filter((n) => !n.isRead).length);
    } catch {
      // Notifications are non-critical; ignore network errors.
    }
  }, []);

  // Poll while the tab is visible so low-stock alerts appear without a page reload.
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <Tooltip label="Toggle sidebar" shortcut="Ctrl+B" side="bottom">
          <Sidebar.Trigger className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" />
        </Tooltip>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline">GM Fabrics • POS Management Workspace</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Tooltip label="Keyboard shortcuts" shortcut="Shift+?" side="bottom">
          <button
            onClick={() => window.__gmOpenShortcuts?.()}
            className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer hidden sm:inline-flex"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip label="Open POS counter" shortcut="F2" side="bottom">
          <Link
            href="/pos"
            aria-keyshortcuts="F2"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Sale</span>
          </Link>
        </Tooltip>

        <div className="relative" ref={boxRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 relative transition-colors cursor-pointer"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">System Alerts ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-400 p-4 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 text-xs ${n.isRead ? "opacity-60" : "bg-zinc-50 dark:bg-zinc-800/50"}`}>
                      <div className="flex items-start gap-2">
                        {iconFor(n.type)}
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{n.title}</p>
                          <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
