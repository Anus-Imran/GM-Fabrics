"use client";

import React from "react";
import { CartProvider } from "../../context/cartContext.jsx";
import { SidebarLayout, SidebarBackdrop } from "../../components/navigation/sidebarPrimitives.jsx";
import { SidebarNav } from "../../components/navigation/sidebarNav.jsx";
import { TopbarHeader } from "../../components/navigation/topbarHeader.jsx";

export default function DashboardLayout({ children }) {
  return (
    <CartProvider>
      <SidebarLayout>
        {/* Mobile Backdrop for Offcanvas mode */}
        <SidebarBackdrop />

        {/* PrimeReact-style Collapsible Sidebar */}
        <SidebarNav />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <TopbarHeader />
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </SidebarLayout>
    </CartProvider>
  );
}
