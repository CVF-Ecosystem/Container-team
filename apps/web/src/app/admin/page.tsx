"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Info,
  Rocket,
  RefreshCw,
  Ship,
  Users,
} from "lucide-react";
import apiClient, {
  type OperationsDashboard,
  type ProductionReadiness,
  type ReadinessCheckStatus,
} from "@/lib/apiClient";
import { useAuth } from "@/components/AuthProvider";
import {
  Badge,
  Card,
  CardHeader,
  KPICard,
  SectionLabel,
} from "@/components/cosmic";

type AdminTab = "operations" | "readiness" | "shortcuts" | "info";

const sysInfo = [
  { label: "Phiên bản", value: "v1.2.0" },
  { label: "Phạm vi", value: "Dashboard vận hành" },
  { label: "Dữ liệu", value: "Đồng bộ hệ thống" },
  { label: "Liên hệ", value: "IT Support" },
];

const TABS: { id: AdminTab; label: string; icon: typeof Activity }[] = [
  { id: "operations", label: "Vận hành realtime", icon: Activity },
  { id: "readiness", label: "Triển khai", icon: Rocket },
  { id: "shortcuts", label: "Quản lý", icon: Database },
  { id: "info", label: "Thông tin hệ thống", icon: Info },
];

const SHORTCUTS = [
  {
    title: "Nhân sự & Tàu",
    description: "Import danh sách nhân viên, quản lý danh sách tàu (Tally).",
    Icon: Users,
    href: "/admin/personnel",
    iconClass: "text-[var(--color-accent)]",
  },
  {
    title: "Dữ liệu hệ thống",
    description: "Backup/Restore database, xóa dữ liệu cũ, log hệ thống.",
    Icon: Database,
    href: "/admin/data",
    iconClass: "text-[var(--color-info)]",
  },
];

function statusIcon(status: ReadinessCheckStatus) {
  if (status === "pass") {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]"
        aria-hidden="true"
      />
    );
  }
  return (
    <AlertCircle
      className={`mt-0.5 h-4 w-4 shrink-0 ${status === "fail" ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"}`}
      aria-hidden="true"
    />
  );
}

function statusLabel(status: ReadinessCheckStatus) {
  if (status === "pass") return "Sẵn sàng";
  if (status === "fail") return "Chặn deploy";
  return "Cần rà soát";
}

function formatTime(value: string | null): string {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function ProductionReadinessSection() {
  const [data, setData] = useState<ProductionReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await apiClient.getProductionReadiness();
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error || "Không tải được production readiness");
        setData(null);
      } else {
        setError(null);
        setData(result.data);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const overall = data?.overallStatus ?? "warn";

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
            <SectionLabel className="!mb-0">Kiểm tra triển khai</SectionLabel>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Domain: {data?.targetOrigin ?? "https://ttport.vn"}
          </p>
        </div>
        <Badge
          tone={overall === "pass" ? "success" : overall === "fail" ? "danger" : "warning"}
          dot
        >
          {statusLabel(overall)}
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Đang kiểm tra cấu hình triển khai...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)] p-3 text-sm text-[var(--color-warning)]">
          {error}
        </div>
      ) : data ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.checks.map((c) => (
            <li
              key={c.key}
              className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-sm"
            >
              {statusIcon(c.status)}
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">{c.label}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function OperationsSection() {
  const [date, setDate] = useState(todayIsoDate);
  const [data, setData] = useState<OperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const result = await apiClient.getOperationsDashboard(date);
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error || "Không tải được dữ liệu vận hành");
        setData(null);
      } else {
        setError(null);
        setData(result.data);
      }
      setLoading(false);
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [date]);

  const generatedAt = data ? formatTime(data.generatedAt) : "Chưa có";

  return (
    <Card noPad>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
            <span>Bảng điều hành realtime</span>
          </div>
        }
        subtitle={`Cập nhật: ${generatedAt}`}
        action={
          <input
            type="date"
            aria-label="Chọn ngày"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="cvf-input h-9 rounded-lg px-3 text-sm"
          />
        }
      />
      <div className="p-5">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            Đang tải dữ liệu vận hành...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)] p-3 text-sm text-[var(--color-warning)]">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPICard
                icon={Activity}
                label="Ca đang mở"
                value={data.reportCoverage.openShifts}
                tone="warning"
              />
              <KPICard
                icon={CheckCircle2}
                label="Ca hoàn tất"
                value={data.reportCoverage.completedShifts}
                tone="success"
              />
              <KPICard
                icon={Database}
                label="Sản lượng ngày"
                value={data.todayTotals.totalMoves.toLocaleString("vi-VN")}
                tone="accent"
              />
              <KPICard
                icon={Ship}
                label="Tàu đang hoạt động"
                value={data.vesselActivity.activeCount}
                tone="info"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="border-b border-[var(--color-border)] bg-[var(--color-elevated)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Trạng thái báo cáo ca
                </div>
                <div className="max-h-72 overflow-auto">
                  {data.reportCoverage.items.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-[var(--color-text-secondary)]">
                      Chưa có báo cáo ca trong ngày này.
                    </p>
                  ) : (
                    data.reportCoverage.items.map((item) => (
                      <div
                        key={`${item.department}-${item.shift}`}
                        className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {item.department} - {item.shift}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Cập nhật: {formatTime(item.lastUpdatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={item.startSubmitted ? "success" : "warning"}>
                            Đầu ca
                          </Badge>
                          <Badge tone={item.endSubmitted ? "success" : "warning"}>
                            Cuối ca
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle
                      className="h-4 w-4 text-[var(--color-warning)]"
                      aria-hidden="true"
                    />
                    <SectionLabel className="!mb-0">Cảnh báo</SectionLabel>
                  </div>
                  <div className="space-y-2">
                    {data.alerts.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-[var(--color-success)]">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Không có cảnh báo vận hành.
                      </p>
                    ) : (
                      data.alerts.slice(0, 5).map((alert) => (
                        <p
                          key={`${alert.code}-${alert.department}-${alert.shift}`}
                          className="text-sm text-[var(--color-warning)]"
                        >
                          {alert.message}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                    <SectionLabel className="!mb-0">Tàu trong ngày</SectionLabel>
                  </div>
                  <div className="space-y-2">
                    {data.vesselActivity.items.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Chưa có dữ liệu tàu.
                      </p>
                    ) : (
                      data.vesselActivity.items.slice(0, 4).map((vessel) => (
                        <div
                          key={vessel.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-[var(--color-text-secondary)]">
                            {vessel.vesselName}
                          </span>
                          <span className="shrink-0 font-semibold text-[var(--color-text-primary)]">
                            {vessel.totalMoves.toLocaleString("vi-VN")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const isLocalSession = session?.mode === "local-dev";
  const [activeTab, setActiveTab] = useState<AdminTab>(
    isLocalSession ? "shortcuts" : "operations",
  );

  const visibleTabs = TABS.filter(
    (t) => !(isLocalSession && (t.id === "operations" || t.id === "readiness")),
  );

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="inline-flex w-fit gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {visibleTabs.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-elevated)] font-semibold text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`}
                aria-hidden="true"
              />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "operations" && !isLocalSession && <OperationsSection />}
      {activeTab === "readiness" && !isLocalSession && <ProductionReadinessSection />}

      {activeTab === "shortcuts" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SHORTCUTS.map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--color-accent)]">
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-elevated)] ring-1 ring-[var(--color-border)] transition-transform group-hover:scale-110 ${item.iconClass}`}
                >
                  <item.Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-accent)]">
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {item.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "info" && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
            <SectionLabel className="!mb-0">Thông tin hệ thống</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {sysInfo.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3"
              >
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  {item.label}
                </div>
                <div className="mt-1 font-medium text-[var(--color-text-primary)]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
