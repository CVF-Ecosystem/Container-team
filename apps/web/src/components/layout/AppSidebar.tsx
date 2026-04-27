"use client";

import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  Database,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Ship,
  Umbrella,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NavItem from "./NavItem";

interface AppSidebarProps {
  onNavigate?: () => void;
}

const groups = [
  {
    label: "Tổng quan",
    items: [{ href: "/dashboard", label: "Dashboard", icon: BarChart3 }],
  },
  {
    label: "Nghiệp vụ",
    items: [
      { href: "/start-shift", label: "Đầu ca", icon: CalendarCheck },
      { href: "/end-shift", label: "Cuối ca", icon: ClipboardList },
      { href: "/leave", label: "Nghỉ phép", icon: Umbrella },
    ],
  },
  {
    label: "Dữ liệu",
    items: [
      { href: "/history", label: "Lịch sử", icon: ClipboardList },
      { href: "/inventory", label: "Tồn bãi container", icon: Package },
      { href: "/ship-report", label: "Báo cáo tàu", icon: Ship },
    ],
  },
  {
    label: "Sổ giao ca",
    items: [
      { href: "/shift-log/thu-tuc", label: "Thủ tục", icon: BookOpen },
    ],
  },
];

const adminItems = [
  { href: "/admin", label: "Admin hub", icon: ShieldCheck },
  { href: "/admin/data", label: "Dữ liệu hệ thống", icon: Database },
  { href: "/admin/personnel", label: "Nhân sự & tàu", icon: Users },
];

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { session, isAdmin, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/95">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-accent-dim)] text-[var(--color-accent-hover)] ring-1 ring-[var(--color-border-strong)]">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
            Cảng Tân Thuận
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Đội Container
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <p className="px-3 pb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Admin
            </p>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Hệ thống
          </p>
          <NavItem
            href="/settings"
            label="Cài đặt"
            icon={Settings}
            active={isActive("/settings")}
            onClick={onNavigate}
          />
        </div>
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <div className="mb-3 rounded-lg bg-[var(--color-bg)]/60 p-3">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {session?.name || session?.username || "Người dùng"}
          </p>
          <p className="text-xs uppercase text-[var(--color-text-secondary)]">
            {session?.role === "admin" ? "Admin" : "User"}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-text-primary)]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
