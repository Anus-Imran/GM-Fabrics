"use client";

import React from "react";
import { CartProvider } from "../../context/cartContext.jsx";
import { SidebarNav } from "../../components/navigation/sidebarNav.jsx";
import { TopbarHeader } from "../../components/navigation/topbarHeader.jsx";

export default function DashboardLayout({ children }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen bg-slate-50/60 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0">
          <TopbarHeader />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </CartProvider>
  );
}
