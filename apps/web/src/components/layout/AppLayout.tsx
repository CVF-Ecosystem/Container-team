"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

const bareRoutes = ["/login", "/admin-reset"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (bareRoutes.some((route) => pathname?.startsWith(route))) {
    return <>{children}</>;
  }

  return (
    <div className="cvf-shell-surface min-h-screen text-[var(--color-text-primary)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <AppSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        <AppHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
