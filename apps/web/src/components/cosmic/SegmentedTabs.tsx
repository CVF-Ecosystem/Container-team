"use client";

interface SegmentedTabsOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedTabsOption<T>[];
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className = "",
}: SegmentedTabsProps<T>) {
  const padding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div
      className={`inline-flex gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-0.5 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium transition-colors ${padding} ${
              active
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
