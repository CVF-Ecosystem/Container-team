"use client";

import {
  Anchor,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Database,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  Ship,
  Umbrella,
  User,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NavItem from "./NavItem";

interface AppSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
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
    items: [{ href: "/shift-log/thu-tuc", label: "Thủ tục", icon: BookOpen }],
  },
];

const adminItems = [
  { href: "/admin", label: "Admin hub", icon: ShieldCheck },
  { href: "/admin/data", label: "Dữ liệu hệ thống", icon: Database },
  { href: "/admin/personnel", label: "Nhân sự & tàu", icon: Users },
];

export default function AppSidebar({
  onNavigate,
  collapsed = false,
  onToggle,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { session, isAdmin, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

  const widthClass = collapsed ? "w-16" : "w-60";

  return (
    <aside
      className={`flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/95 transition-[width] duration-200 ${widthClass}`}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-3 border-b border-[var(--color-border)] ${collapsed ? "justify-center px-3 py-4" : "px-4 py-4"}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-gradient-to-br from-[var(--color-elevated)] to-[#1e4a7a]">
          <Anchor className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
              Cảng Tân Thuận
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Điều hành Cảng
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={!!isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Admin
              </p>
            )}
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={!!isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Hệ thống
            </p>
          )}
          <NavItem
            href="/settings"
            label="Cài đặt"
            icon={Settings}
            active={!!isActive("/settings")}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        </div>
      </nav>

      {/* Footer: user + collapse + logout */}
      <div className="border-t border-[var(--color-border)] p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-elevated)]">
              <User className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                {session?.name || session?.username || "Người dùng"}
              </p>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)]">
                {session?.role === "admin" ? "Admin" : "User"}
              </p>
            </div>
          </div>
        )}

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"} text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]`}
          >
            <Menu className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Thu gọn</span>}
          </button>
        )}

        <button
          type="button"
          onClick={logout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className={`flex w-full items-center gap-2 rounded-lg ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"} text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(244,63,94,0.10)] hover:text-rose-300`}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
