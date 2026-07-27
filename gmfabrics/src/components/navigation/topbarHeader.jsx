"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Search, ShoppingCart, AlertCircle } from "lucide-react";
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
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Search Input */}
      <div className="relative w-80">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search catalog products or barcode..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 dark:bg-zinc-800 border-none rounded-xl text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-0 transition-colors"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick POS button */}
        <Link
          href="/pos"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-xs"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>New Sale</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2.5 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 relative transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  System Alerts ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs ${n.isRead ? "opacity-60" : "bg-slate-50 dark:bg-zinc-800/50"}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-zinc-100">{n.title}</p>
                          <p className="text-slate-600 dark:text-zinc-400 text-[11px] mt-0.5">
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
