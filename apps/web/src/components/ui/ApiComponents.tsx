/**
 * UI Components for API Integration
 */

"use client";

import { ReactNode } from "react";

// ============= LOADING SPINNER =============

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-blue-500`}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ============= LOADING OVERLAY =============

export function LoadingOverlay({
  message = "Đang tải...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-white mt-4">{message}</p>
      </div>
    </div>
  );
}

// ============= SKELETON LOADER =============

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-800 rounded-lg">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-gray-800/50 rounded-lg">
          {[1, 2, 3, 4].map((j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============= ERROR MESSAGE =============

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-xl">⚠️</span>
        <div className="flex-1">
          <p className="text-red-400">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-blue-400 hover:underline"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= EMPTY STATE =============

export function EmptyState({
  icon = "📭",
  title = "Không có dữ liệu",
  description,
  action,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <span className="text-5xl mb-4 block">{icon}</span>
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ============= DATA SOURCE BADGE =============

export function DataSourceBadge({
  source,
}: {
  source: "api" | "indexeddb" | "demo";
}) {
  const config = {
    api: {
      label: "API",
      color: "bg-green-600",
      icon: "🌐",
    },
    indexeddb: {
      label: "Offline",
      color: "bg-yellow-600",
      icon: "💾",
    },
    demo: {
      label: "Demo",
      color: "bg-purple-600",
      icon: "🎭",
    },
  };

  const { label, color, icon } = config[source];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 ${color} text-white text-xs font-medium rounded`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ============= SYNC STATUS =============

export function SyncStatus({
  syncing,
  lastSync,
  error,
  onSync,
}: {
  syncing: boolean;
  lastSync?: Date | null;
  error?: string | null;
  onSync?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {syncing ? (
        <div className="flex items-center gap-2 text-blue-400">
          <LoadingSpinner size="sm" />
          <span>Đang đồng bộ...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400">
          <span>⚠️</span>
          <span>Lỗi đồng bộ</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400">
          <span>✓</span>
          <span>
            {lastSync
              ? `Đồng bộ: ${lastSync.toLocaleTimeString("vi-VN")}`
              : "Chưa đồng bộ"}
          </span>
        </div>
      )}
      {onSync && !syncing && (
        <button
          onClick={onSync}
          className="text-blue-400 hover:text-blue-300"
          title="Đồng bộ ngay"
        >
          🔄
        </button>
      )}
    </div>
  );
}

// ============= TOAST NOTIFICATION =============

export function Toast({
  type = "info",
  message,
  onClose,
}: {
  type?: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
}) {
  const config = {
    success: { bg: "bg-green-900/90", border: "border-green-600", icon: "✓" },
    error: { bg: "bg-red-900/90", border: "border-red-600", icon: "✕" },
    info: { bg: "bg-blue-900/90", border: "border-blue-600", icon: "ℹ" },
    warning: { bg: "bg-yellow-900/90", border: "border-yellow-600", icon: "⚠" },
  };

  const { bg, border, icon } = config[type];

  return (
    <div
      className={`fixed bottom-4 right-4 ${bg} ${border} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 z-50`}
    >
      <span className="text-lg">{icon}</span>
      <p className="text-white text-sm">{message}</p>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ×
        </button>
      )}
    </div>
  );
}
