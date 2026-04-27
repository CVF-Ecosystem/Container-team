"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 440,
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside
        className="absolute right-0 top-0 flex h-screen flex-col border-l border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl"
        style={{ width: `${width}px` }}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between border-b border-[var(--color-border)] p-5">
            <div className="min-w-0">
              {title && (
                <div className="text-base font-semibold text-[var(--color-text-primary)]">{title}</div>
              )}
              {subtitle && (
                <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</div>
              )}
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Đóng" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-[var(--color-border)] p-4">{footer}</div>
        )}
      </aside>
    </div>
  );
}
