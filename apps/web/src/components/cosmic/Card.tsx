"use client";

import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  noPad?: boolean;
  accent?: "accent" | "success" | "warning" | "danger" | "info";
}

const accentVar: Record<NonNullable<CardProps["accent"]>, string> = {
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

export function Card({ children, className = "", style, noPad = false, accent }: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${noPad ? "" : "p-5"} ${className}`}
      style={style}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, ${accentVar[accent]}, transparent)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
      <div>
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
