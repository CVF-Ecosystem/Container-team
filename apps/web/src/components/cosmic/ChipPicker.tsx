"use client";

import type { ReactNode } from "react";

interface ChipPickerOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface ChipPickerProps<T extends string> {
  label?: string;
  required?: boolean;
  value: T | "";
  onChange: (value: T) => void;
  options: ChipPickerOption<T>[];
  columns?: 2 | 3 | 4 | 5 | 6;
  size?: "sm" | "md";
  className?: string;
  hint?: ReactNode;
}

const colsClass: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-3 sm:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-6",
};

export function ChipPicker<T extends string>({
  label,
  required,
  value,
  onChange,
  options,
  columns = 5,
  size = "md",
  className = "",
  hint,
}: ChipPickerProps<T>) {
  const padding = size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {label}
          {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
        </label>
      )}
      <div className={`grid gap-2 ${colsClass[columns]}`}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`flex flex-col items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${padding} ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] font-semibold text-[var(--color-accent-hover)]"
                  : "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span>{opt.label}</span>
              {opt.hint && (
                <span className="mt-0.5 text-[10px] font-normal text-[var(--color-text-muted)]">
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {hint && <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  );
}
