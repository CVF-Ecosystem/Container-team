"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export default function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
  onClick,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg ${collapsed ? "justify-center px-2 py-2" : "px-3 py-2"} text-sm transition-colors ${
        active
          ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-hover)] font-semibold"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)] font-normal"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-[var(--color-accent-hover)]" : ""}`}
        aria-hidden="true"
      />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {active && (
            <span
              aria-hidden="true"
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
            />
          )}
        </>
      )}
    </Link>
  );
}
