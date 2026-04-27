import type { ReactNode } from "react";

export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "muted";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const toneStyles: Record<BadgeTone, { bg: string; border: string; color: string }> = {
  success: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", color: "var(--color-success)" },
  warning: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "var(--color-warning)" },
  danger:  { bg: "rgba(244,63,94,0.10)",  border: "rgba(244,63,94,0.25)",  color: "var(--color-danger)"  },
  info:    { bg: "rgba(129,140,248,0.10)", border: "rgba(129,140,248,0.25)", color: "var(--color-info)"   },
  accent:  { bg: "rgba(14,165,233,0.10)", border: "rgba(14,165,233,0.25)", color: "var(--color-accent)" },
  muted:   { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.20)", color: "var(--color-text-muted)" },
};

export function Badge({ tone = "info", dot = false, children, className = "" }: BadgeProps) {
  const s = toneStyles[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: s.color }}
        />
      )}
      {children}
    </span>
  );
}
