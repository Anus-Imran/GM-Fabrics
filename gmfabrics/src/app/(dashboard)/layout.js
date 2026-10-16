"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { CartProvider } from "../../context/cartContext.jsx";
import { useAuth } from "../../context/authContext.jsx";
import { SidebarLayout, SidebarBackdrop } from "../../components/navigation/sidebarPrimitives.jsx";
import { SidebarNav } from "../../components/navigation/sidebarNav.jsx";
import { TopbarHeader } from "../../components/navigation/topbarHeader.jsx";
import { GlobalShortcuts } from "../../components/navigation/globalShortcuts.jsx";
import { Loader } from "../../components/common/loader.jsx";
import { canAccessPath } from "../../config/navigation.js";

const AccessDenied = () => (
  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-24">
    <ShieldAlert className="w-12 h-12 text-amber-500" />
    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Admin access required</h2>
    <p className="text-xs text-zinc-500 max-w-sm">
      This section contains purchase costs, profit or user settings. Ask the shop admin if you need access.
    </p>
    <Link href="/pos" className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold">
      Go to POS Counter
    </Link>
  </div>
);

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Route guard: no session → login page.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <Loader variant="page" text="Checking your session..." />;
  }

  const allowed = canAccessPath(pathname, user.role);

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
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{allowed ? children : <AccessDenied />}</main>
        </div>
        <GlobalShortcuts />
      </SidebarLayout>
    </CartProvider>
  );
}
