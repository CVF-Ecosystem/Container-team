'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
    type LucideIcon,
} from 'lucide-react';
import apiClient, {
    type OperationsDashboard,
    type ProductionReadiness,
    type ReadinessCheckStatus,
} from '@/lib/apiClient';
import { useAuth } from '@/components/AuthProvider';

interface MenuItem {
    title: string;
    description: string;
    Icon: LucideIcon;
    href: string;
    iconClass: string;
}

const menuItems: MenuItem[] = [
    {
        title: 'Nhân sự & Tàu',
        description: 'Import danh sách nhân viên, quản lý danh sách tàu (Tally).',
        Icon: Users,
        href: '/admin/personnel',
        iconClass: 'text-[var(--color-accent)]',
    },
    {
        title: 'Dữ liệu hệ thống',
        description: 'Backup/Restore database, xóa dữ liệu cũ, log hệ thống.',
        Icon: Database,
        href: '/admin/data',
        iconClass: 'text-[var(--color-info)]',
    },
];

const sysInfo = [
    { label: 'Phiên bản', value: 'v1.2.0' },
    { label: 'Phạm vi', value: 'Dashboard vận hành' },
    { label: 'Dữ liệu', value: 'Đồng bộ hệ thống' },
    { label: 'Liên hệ', value: 'IT Support' },
];

function statusIcon(status: ReadinessCheckStatus) {
    if (status === 'pass') {
        return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />;
    }
    return <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${status === 'fail' ? 'text-red-400' : 'text-yellow-400'}`} aria-hidden="true" />;
}

function statusLabel(status: ReadinessCheckStatus) {
    if (status === 'pass') return 'Sẵn sàng';
    if (status === 'fail') return 'Chặn deploy';
    return 'Cần rà soát';
}

function ProductionReadinessCard() {
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
                setError(result.error || 'Không tải được production readiness');
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

    const overall = data?.overallStatus ?? 'warn';

    return (
        <div className="cvf-card rounded-xl p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        <Rocket className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                        Kiểm tra triển khai
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Domain: {data?.targetOrigin ?? 'https://ttport.vn'}
                    </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${overall === 'pass' ? 'bg-green-400/10 text-green-300' : overall === 'fail' ? 'bg-red-400/10 text-red-300' : 'bg-yellow-400/10 text-yellow-300'}`}>
                    {statusLabel(overall)}
                </span>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Đang kiểm tra cấu hình triển khai...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">
                    {error}
                </div>
            ) : data ? (
                <ul className="grid gap-3 md:grid-cols-2">
                    {data.checks.map((c) => (
                        <li key={c.key} className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm">
                            {statusIcon(c.status)}
                            <div>
                                <p className="font-medium text-[var(--color-text-secondary)]">{c.label}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{c.detail}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string | null): string {
    if (!value) return 'Chưa có';
    return new Date(value).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function OperationsDashboardCard() {
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
                setError(result.error || 'Không tải được dữ liệu vận hành');
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

    const generatedAt = data ? formatTime(data.generatedAt) : 'Chưa có';

    return (
        <div className="cvf-card rounded-xl p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        <Activity className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                        Bảng điều hành realtime
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Cập nhật: {generatedAt}
                    </p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                />
            </div>

            {loading && !data ? (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Đang tải dữ liệu vận hành...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">
                    {error}
                </div>
            ) : data ? (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-[var(--color-bg)]/60 p-4">
                            <p className="text-xs text-[var(--color-text-muted)]">Ca đang mở</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--color-warning)]">
                                {data.reportCoverage.openShifts}
                            </p>
                        </div>
                        <div className="rounded-lg bg-[var(--color-bg)]/60 p-4">
                            <p className="text-xs text-[var(--color-text-muted)]">Ca hoàn tất</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--color-success)]">
                                {data.reportCoverage.completedShifts}
                            </p>
                        </div>
                        <div className="rounded-lg bg-[var(--color-bg)]/60 p-4">
                            <p className="text-xs text-[var(--color-text-muted)]">Sản lượng ngày</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                                {data.todayTotals.totalMoves.toLocaleString('vi-VN')}
                            </p>
                        </div>
                        <div className="rounded-lg bg-[var(--color-bg)]/60 p-4">
                            <p className="text-xs text-[var(--color-text-muted)]">Tàu đang hoạt động</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--color-accent)]">
                                {data.vesselActivity.activeCount}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-lg border border-[var(--color-border)]">
                            <div className="border-b border-[var(--color-border)] px-4 py-3 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
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
                                                <span className={`rounded-full px-2 py-1 text-xs ${item.startSubmitted ? 'bg-green-400/10 text-green-300' : 'bg-yellow-400/10 text-yellow-300'}`}>
                                                    Đầu ca
                                                </span>
                                                <span className={`rounded-full px-2 py-1 text-xs ${item.endSubmitted ? 'bg-green-400/10 text-green-300' : 'bg-yellow-400/10 text-yellow-300'}`}>
                                                    Cuối ca
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                                    <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                                    Cảnh báo
                                </h4>
                                <div className="space-y-2">
                                    {data.alerts.length === 0 ? (
                                        <p className="flex items-center gap-2 text-sm text-green-300">
                                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                            Không có cảnh báo vận hành.
                                        </p>
                                    ) : (
                                        data.alerts.slice(0, 5).map((alert) => (
                                            <p key={`${alert.code}-${alert.department}-${alert.shift}`} className="text-sm text-yellow-200">
                                                {alert.message}
                                            </p>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--color-border)] p-4">
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                                    <Ship className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                                    Tàu trong ngày
                                </h4>
                                <div className="space-y-2">
                                    {data.vesselActivity.items.length === 0 ? (
                                        <p className="text-sm text-[var(--color-text-secondary)]">Chưa có dữ liệu tàu.</p>
                                    ) : (
                                        data.vesselActivity.items.slice(0, 4).map((vessel) => (
                                            <div key={vessel.id} className="flex items-center justify-between gap-3 text-sm">
                                                <span className="truncate text-[var(--color-text-secondary)]">{vessel.vesselName}</span>
                                                <span className="shrink-0 font-semibold text-[var(--color-text-primary)]">
                                                    {vessel.totalMoves.toLocaleString('vi-VN')}
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
    );
}

export default function AdminDashboardPage() {
    const { session } = useAuth();
    const isLocalSession = session?.mode === 'local-dev';

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {!isLocalSession && <OperationsDashboardCard />}

            {/* Menu grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href} className="group block">
                        <div className="cvf-card h-full rounded-2xl p-6 transition-all duration-200 hover:border-[var(--color-accent)] hover:-translate-y-0.5">
                            <div
                                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-bg)]/60 ring-1 ring-[var(--color-border)] transition-transform group-hover:scale-110 ${item.iconClass}`}
                            >
                                <item.Icon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="mb-2 text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-accent)]">
                                {item.title}
                            </h2>
                            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                {item.description}
                            </p>
                        </div>
                    </Link>
                ))}

            </div>

            {/* System info */}
            <div className="cvf-card rounded-xl p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                    <Info className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                    Thông tin hệ thống
                </h3>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {sysInfo.map((item) => (
                        <div key={item.label}>
                            <dt className="text-xs text-[var(--color-text-muted)] mb-0.5">{item.label}</dt>
                            <dd className="font-medium text-[var(--color-text-secondary)]">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {!isLocalSession && <ProductionReadinessCard />}
        </div>
    );
}
