"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white border border-transparent hover:bg-[var(--color-accent-hover)]",
  secondary:
    "bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]",
  danger:
    "bg-[rgba(244,63,94,0.08)] text-rose-300 border border-[rgba(244,63,94,0.25)] hover:bg-[rgba(244,63,94,0.15)]",
  success:
    "bg-[rgba(16,185,129,0.08)] text-[var(--color-success)] border border-[rgba(16,185,129,0.25)] hover:bg-[rgba(16,185,129,0.15)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] border border-transparent hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-1.5",
  lg: "h-11 px-5 text-sm gap-2",
};

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const isIconOnly = !children && Icon;
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${isIconOnly ? "!px-0 !w-9" : ""} ${className}`}
      {...rest}
    >
      {Icon && iconPosition === "left" && (
        <Icon className="shrink-0" size={iconSize[size]} aria-hidden="true" />
      )}
      {children}
      {Icon && iconPosition === "right" && (
        <Icon className="shrink-0" size={iconSize[size]} aria-hidden="true" />
      )}
    </button>
  );
}
