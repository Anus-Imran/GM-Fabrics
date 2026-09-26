"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, ShoppingCart, AlertCircle } from "lucide-react";
import { Sidebar } from "./sidebarPrimitives.jsx";
import api from "../../services/apiService.js";

export const TopbarHeader = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      if (res.data) setNotifications(res.data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Sidebar Trigger & Brand Title */}
      <div className="flex items-center gap-3">
        <Sidebar.Trigger className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline">
          GM Fabrics • POS Management Workspace
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Quick POS button */}
        <Link
          href="/pos"
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">New Sale</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 relative transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  System Alerts ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-400 p-4 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs ${n.isRead ? "opacity-60" : "bg-zinc-50 dark:bg-zinc-800/50"}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{n.title}</p>
                          <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">
                            {n.message}
                          </p>
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
