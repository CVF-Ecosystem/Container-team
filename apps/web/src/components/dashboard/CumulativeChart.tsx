/**
 * CumulativeChart Component
 * Hiển thị biểu đồ lũy tiến theo thời gian
 */

'use client';

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface DataPoint {
    label: string;
    xe_total: number;
    xalan_total: number;
    total: number;
}

interface CumulativeChartProps {
    data: DataPoint[];
    title?: string;
}

interface CumulativeDataPoint {
    label: string;
    xe_cumulative: number;
    xalan_cumulative: number;
    total_cumulative: number;
    xe_original: number;
    xalan_original: number;
    total_original: number;
}

interface TooltipPayload {
    payload?: CumulativeDataPoint;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}

export default function CumulativeChart({ data, title = 'Biểu đồ Lũy Tiến' }: CumulativeChartProps) {
    // Calculate cumulative values
    const cumulativeData = useMemo(() => {
        let cumXe = 0;
        let cumXalan = 0;
        let cumTotal = 0;

        return data.map(item => {
            cumXe += item.xe_total;
            cumXalan += item.xalan_total;
            cumTotal += item.total;

            return {
                label: item.label,
                xe_cumulative: cumXe,
                xalan_cumulative: cumXalan,
                total_cumulative: cumTotal,
                // Original values for tooltip
                xe_original: item.xe_total,
                xalan_original: item.xalan_total,
                total_original: item.total,
            };
        });
    }, [data]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
        if (!active || !payload || payload.length === 0) return null;

        const dataPoint = payload[0]?.payload;
        if (!dataPoint) return null;

        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg p-3 shadow-xl">
                <p className="text-white font-medium mb-2">{label}</p>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-orange-400">XE:</span>
                        <span className="text-white">
                            +{dataPoint.xe_original?.toLocaleString()} → {dataPoint.xe_cumulative?.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-purple-400">XALAN:</span>
                        <span className="text-white">
                            +{dataPoint.xalan_original?.toLocaleString()} → {dataPoint.xalan_cumulative?.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-[var(--color-border)]">
                        <span className="text-[var(--color-accent)]">Tổng lũy tiến:</span>
                        <span className="text-white font-medium">{dataPoint.total_cumulative?.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-[var(--color-surface)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
                <div className="h-64 flex items-center justify-center text-[var(--color-text-muted)]">
                    Không có dữ liệu để hiển thị
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--color-surface)] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📈 {title}</h3>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                    <AreaChart
                        data={cumulativeData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorXe" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorXalan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                        <XAxis
                            dataKey="label"
                            stroke="var(--color-border-strong)"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="var(--color-border-strong)"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                            tickFormatter={(value) => {
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return value;
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => (
                                <span className="text-[var(--color-text-secondary)]">{value}</span>
                            )}
                        />
                        <Area
                            type="monotone"
                            dataKey="xe_cumulative"
                            name="XE (lũy tiến)"
                            stroke="#f97316"
                            fillOpacity={1}
                            fill="url(#colorXe)"
                            stackId="1"
                        />
                        <Area
                            type="monotone"
                            dataKey="xalan_cumulative"
                            name="XALAN (lũy tiến)"
                            stroke="#a855f7"
                            fillOpacity={1}
                            fill="url(#colorXalan)"
                            stackId="1"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-[var(--color-elevated)] rounded-lg p-3">
                    <p className="text-[var(--color-text-secondary)] text-xs">Tổng XE</p>
                    <p className="text-orange-400 text-lg font-bold">
                        {cumulativeData[cumulativeData.length - 1]?.xe_cumulative?.toLocaleString() || 0}
                    </p>
                </div>
                <div className="bg-[var(--color-elevated)] rounded-lg p-3">
                    <p className="text-[var(--color-text-secondary)] text-xs">Tổng XALAN</p>
                    <p className="text-purple-400 text-lg font-bold">
                        {cumulativeData[cumulativeData.length - 1]?.xalan_cumulative?.toLocaleString() || 0}
                    </p>
                </div>
                <div className="bg-[var(--color-elevated)] rounded-lg p-3">
                    <p className="text-[var(--color-text-secondary)] text-xs">Tổng Cộng</p>
                    <p className="text-[var(--color-accent)] text-lg font-bold">
                        {cumulativeData[cumulativeData.length - 1]?.total_cumulative?.toLocaleString() || 0}
                    </p>
                </div>
            </div>
        </div>
    );
}
