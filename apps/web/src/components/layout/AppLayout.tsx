"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

const bareRoutes = ["/login", "/admin-reset"];
const SIDEBAR_KEY = "ttport.sidebar.collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDEBAR_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (bareRoutes.some((route) => pathname?.startsWith(route))) {
    return <>{children}</>;
  }

  const padClass = collapsed ? "lg:pl-16" : "lg:pl-60";

  return (
    <div className="cvf-shell-surface min-h-screen text-[var(--color-text-primary)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
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

      <div className={padClass}>
        <AppHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
