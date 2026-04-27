import type { ReactNode } from "react";

export type StatusPillTone = "success" | "warning" | "danger" | "info";

interface StatusPillProps {
  tone?: StatusPillTone;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}

const toneMap: Record<StatusPillTone, { bg: string; border: string; color: string; dotColor: string }> = {
  success: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.20)",
    color: "var(--color-success)",
    dotColor: "var(--color-success)",
  },
  warning: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.20)",
    color: "var(--color-warning)",
    dotColor: "var(--color-warning)",
  },
  danger: {
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.20)",
    color: "var(--color-danger)",
    dotColor: "var(--color-danger)",
  },
  info: {
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.20)",
    color: "var(--color-accent)",
    dotColor: "var(--color-accent)",
  },
};

export function StatusPill({ tone = "info", children, className = "", pulse = true }: StatusPillProps) {
  const s = toneMap[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${className}`}
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ background: s.dotColor, boxShadow: `0 0 6px ${s.dotColor}` }}
      />
      {children}
    </span>
  );
}
