'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { MonthlySummary } from '@/lib/db';

interface YoYComparisonChartProps {
    data: MonthlySummary[] | undefined;
    month: number;
    title?: string;
}

const MONTH_NAMES = [
    '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export default function YoYComparisonChart({ data, month, title }: YoYComparisonChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map((d) => ({
            name: d.year.toString(),
            'XE': d.xe_total,
            'XALAN': d.xalan_total,
            'Tổng': d.total,
            year: d.year,
        }));
    }, [data]);

    const yoyChange = useMemo(() => {
        if (!data || data.length < 2) return null;

        const sorted = [...data].sort((a, b) => b.year - a.year);
        const thisYear = sorted[0];
        const lastYear = sorted[1];

        if (lastYear.total === 0) return null;

        const change = ((thisYear.total - lastYear.total) / lastYear.total) * 100;
        return change;
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                    {title || `So sánh cùng kỳ ${MONTH_NAMES[month]}`}
                </h3>
                <p className="text-gray-400 text-center py-8">
                    Chưa có dữ liệu để so sánh
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                    {title || `So sánh cùng kỳ ${MONTH_NAMES[month]}`}
                </h3>
                {yoyChange !== null && (
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium ${yoyChange >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                        }`}>
                        {yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yoyChange).toFixed(1)}% YoY
                    </div>
                )}
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={{ stroke: '#4b5563' }}
                        />
                        <YAxis
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={{ stroke: '#4b5563' }}
                            tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            formatter={(value) => value !== undefined ? [value.toLocaleString(), ''] : ['0', '']}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                        />
                        <Bar dataKey="XE" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="XALAN" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Summary Table */}
            <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="text-left py-2 text-gray-400">Năm</th>
                            <th className="text-right py-2 text-gray-400">XE</th>
                            <th className="text-right py-2 text-gray-400">XALAN</th>
                            <th className="text-right py-2 text-gray-400 font-semibold">Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((row) => (
                            <tr key={row.year} className="border-b border-gray-700/50">
                                <td className="py-2 font-medium">{row.year}</td>
                                <td className="text-right text-orange-400">{row['XE'].toLocaleString()}</td>
                                <td className="text-right text-purple-400">{row['XALAN'].toLocaleString()}</td>
                                <td className="text-right font-semibold">{row['Tổng'].toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
