"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Menu, RefreshCw, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useSyncStatus } from "@/lib/hooks";
import { syncAll, type SyncStatus } from "@/lib/syncService";
import {
  enablePushNotifications,
  type NotificationSetupStatus,
} from "@/lib/notificationService";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard vận hành",
  "/start-shift": "Báo cáo đầu ca",
  "/end-shift": "Báo cáo cuối ca",
  "/history": "Lịch sử báo cáo",
  "/inventory": "Tồn bãi container",
  "/ship-report": "Báo cáo tàu",
  "/leave": "Nghỉ phép",
  "/settings": "Cài đặt",
  "/admin": "Admin hub",
  "/admin/data": "Dữ liệu hệ thống",
  "/admin/personnel": "Nhân sự & tàu",
};

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const handleSyncNow = () => { void syncAll(); };

  if (status.isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-400">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span className="hidden sm:inline">Đang đồng bộ</span>
      </div>
    );
  }

  if (!status.isOnline && status.pendingChanges > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400" title={`${status.pendingChanges} thay đổi chờ khi có mạng`}>
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{status.pendingChanges} chờ • Offline</span>
        <span className="inline sm:hidden">{status.pendingChanges}</span>
      </div>
    );
  }

  if (!status.isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-400">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  if (status.pendingChanges > 0) {
    return (
      <button
        type="button"
        onClick={handleSyncNow}
        className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
        title={`${status.pendingChanges} thay đổi chờ đồng bộ — nhấn để đồng bộ ngay`}
      >
        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="hidden sm:inline">{status.pendingChanges} chờ đồng bộ</span>
        <span className="inline sm:hidden">{status.pendingChanges}</span>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-400" title={status.lastSyncAt ? `Đồng bộ lúc ${status.lastSyncAt.toLocaleTimeString("vi-VN")}` : "Đã kết nối"}>
      <span className="h-2 w-2 rounded-full bg-green-400" />
      <span className="hidden sm:inline">Đã kết nối</span>
    </div>
  );
}

interface AppHeaderProps {
  onMenuClick: () => void;
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();
  const { session } = useAuth();
  const syncStatus = useSyncStatus();
  const [now, setNow] = useState<Date | null>(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationSetupStatus | "idle" | "working">("idle");

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const title = useMemo(() => {
    const match = Object.entries(pageTitles)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => pathname?.startsWith(path));
    return match?.[1] || "Cảng Tân Thuận";
  }, [pathname]);

  const handleEnableNotifications = async () => {
    setNotificationStatus("working");
    setNotificationStatus(await enablePushNotifications());
  };

  const notificationTitle: Record<typeof notificationStatus, string> = {
    idle: "Bật thông báo giao ca",
    working: "Đang bật thông báo",
    unsupported: "Trình duyệt không hỗ trợ thông báo",
    blocked: "Thông báo đang bị chặn",
    "not-configured": "Server chưa cấu hình VAPID",
    subscribed: "Đã bật thông báo",
    failed: "Không bật được thông báo",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="hidden text-xs text-[var(--color-text-secondary)] sm:block">
            {now
              ? now.toLocaleString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Đang đồng bộ thời gian"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleEnableNotifications}
          disabled={notificationStatus === "working" || notificationStatus === "subscribed"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          title={notificationTitle[notificationStatus]}
          aria-label={notificationTitle[notificationStatus]}
        >
          {notificationStatus === "blocked" || notificationStatus === "failed" || notificationStatus === "unsupported" ? (
            <BellOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bell className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5">
          <SyncStatusBadge status={syncStatus} />
        </div>
        <div className="rounded-full bg-[var(--color-accent-dim)] px-3 py-1.5 text-xs font-semibold uppercase text-[var(--color-text-primary)]">
          {session?.role === "admin" ? "Admin" : "User"}
        </div>
      </div>
    </header>
  );
}
