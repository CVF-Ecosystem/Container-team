'use client';

import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Ship,
    TrendingDown,
    TrendingUp,
    Truck,
    type LucideIcon,
} from 'lucide-react';
import { DashboardSummary } from '@/types';

interface KPICardsProps {
    summary: DashboardSummary;
    previousSummary?: DashboardSummary;
}

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
    if (!previous || previous === 0) return null;

    const change = ((current - previous) / previous) * 100;
    const isUp = change > 0;
    const isStable = Math.abs(change) < 1;

    if (isStable) {
        return <span className="text-[var(--color-text-secondary)] text-sm">→ 0%</span>;
    }

    return (
        <span className={`text-sm flex items-center justify-center gap-1 ${isUp ? 'text-emerald-300' : 'text-rose-300'}`}>
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}%
        </span>
    );
}

export default function KPICards({ summary, previousSummary }: KPICardsProps) {
    const cards: {
        title: string;
        value: number;
        previous?: number;
        accent: string;
        Icon: LucideIcon;
        subtext?: string;
    }[] = [
        {
            title: 'Tổng Vào',
            value: summary.totalIn,
            previous: previousSummary?.totalIn,
            accent: 'var(--color-accent)',
            Icon: ArrowDownToLine,
        },
        {
            title: 'Tổng Ra',
            value: summary.totalOut,
            previous: previousSummary?.totalOut,
            accent: 'var(--color-success)',
            Icon: ArrowUpFromLine,
        },
        {
            title: 'XE',
            value: summary.xeTotal,
            previous: previousSummary?.xeTotal,
            accent: 'var(--color-warning)',
            Icon: Truck,
            subtext: `${summary.xePercent.toFixed(0)}%`
        },
        {
            title: 'XALAN',
            value: summary.xalanTotal,
            previous: previousSummary?.xalanTotal,
            accent: 'var(--color-info)',
            Icon: Ship,
            subtext: `${summary.xalanPercent.toFixed(0)}%`
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className="cvf-card rounded-xl border-t-4 p-4 text-center"
                    style={{ borderTopColor: card.accent }}
                >
                    <div className="mb-3 flex justify-center">
                        <div
                            className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-bg)]/60"
                            style={{ color: card.accent }}
                        >
                            <card.Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{card.title}</p>
                    <p className="my-1 text-3xl font-bold text-[var(--color-text-primary)]">
                        {card.value.toLocaleString('vi-VN')}
                    </p>
                    {card.subtext && (
                        <p className="text-xs text-[var(--color-text-muted)]">Tỷ lệ: {card.subtext}</p>
                    )}
                    <div className="mt-2">
                        <TrendIndicator current={card.value} previous={card.previous} />
                    </div>
                </div>
            ))}
        </div>
    );
}
