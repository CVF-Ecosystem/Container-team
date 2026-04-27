"use client";

import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

export type KPITone = "accent" | "success" | "warning" | "danger" | "info";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  tone?: KPITone;
  hint?: string;
  onClick?: () => void;
}

const toneVar: Record<KPITone, string> = {
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

const baseClass =
  "relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors text-left";

export function KPICard({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  deltaDir,
  spark,
  tone = "accent",
  hint,
  onClick,
}: KPICardProps) {
  const color = toneVar[tone];

  const inner: ReactNode = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div className="flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "rgba(14,165,233,0.10)" }}
        >
          <Icon size={18} color={color} aria-hidden="true" />
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={color} />}
      </div>
      <div>
        <div className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--color-text-primary)]">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-medium text-[var(--color-text-muted)]">
              {unit}
            </span>
          )}
        </div>
        <div className="mt-1.5 text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </div>
      </div>
      {delta && deltaDir && (
        <div
          className="flex items-center gap-1 text-xs"
          style={{
            color: deltaDir === "up" ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          {deltaDir === "up" ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{delta}</span>
          {hint && <span className="text-[var(--color-text-muted)]">{hint}</span>}
        </div>
      )}
      {!delta && hint && (
        <div className="text-xs text-[var(--color-text-muted)]">{hint}</div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer hover:border-[var(--color-border-strong)]`}
      >
        {inner}
      </button>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
