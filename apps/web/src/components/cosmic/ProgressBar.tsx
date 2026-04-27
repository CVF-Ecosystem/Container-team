interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--color-accent)",
  height = 4,
  label,
  className = "",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      <div
        className="overflow-hidden rounded-full bg-[var(--color-elevated)]"
        style={{ height: `${height}px` }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {label && (
        <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{label}</div>
      )}
    </div>
  );
}
