"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, ariaLabel, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: checked ? "var(--color-accent)" : "var(--color-elevated)",
        borderColor: checked ? "var(--color-accent)" : "var(--color-border)",
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: `translateX(${checked ? 20 : 2}px)` }}
        aria-hidden="true"
      />
    </button>
  );
}
