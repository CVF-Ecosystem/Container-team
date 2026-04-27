"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

interface BaseProps {
  label?: string;
  note?: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
}

const baseInput =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-dim)] disabled:cursor-not-allowed disabled:opacity-50";

function FieldShell({
  label,
  note,
  error,
  required,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {label}
          {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-[11px] text-[var(--color-danger)]">{error}</span>
      ) : note ? (
        <span className="text-[11px] text-[var(--color-text-muted)]">{note}</span>
      ) : null}
    </div>
  );
}

type TextInputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, note, error, required, icon: Icon, className = "", ...rest },
  ref,
) {
  return (
    <FieldShell label={label} note={note} error={error} required={required}>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            size={14}
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          className={`${baseInput} ${Icon ? "pl-9" : ""} ${className}`}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

type SelectInputProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    options: { value: string | number; label: string }[];
  };

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, note, error, required, icon: Icon, options, className = "", ...rest },
  ref,
) {
  return (
    <FieldShell label={label} note={note} error={error} required={required}>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            size={14}
            aria-hidden="true"
          />
        )}
        <select
          ref={ref}
          className={`${baseInput} appearance-none cursor-pointer ${Icon ? "pl-9" : ""} ${className}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
});

type TextAreaInputProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
  function TextAreaInput({ label, note, error, required, className = "", ...rest }, ref) {
    return (
      <FieldShell label={label} note={note} error={error} required={required}>
        <textarea
          ref={ref}
          className={`${baseInput} resize-y ${className}`}
          {...rest}
        />
      </FieldShell>
    );
  },
);
