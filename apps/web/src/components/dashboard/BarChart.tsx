'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
    data: {
        label: string;
        xe: number;
        xalan: number;
    }[];
    title?: string;
    maxItems?: number;
}

interface TooltipPayload {
    dataKey?: string;
    value?: number;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        const xe = payload.find((p) => p.dataKey === 'xe')?.value || 0;
        const xalan = payload.find((p) => p.dataKey === 'xalan')?.value || 0;
        const total = xe + xalan;

        return (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                <p className="text-white font-medium mb-2">{label}</p>
                <p className="text-amber-400 text-sm">
                    XE: <span className="font-bold">{xe.toLocaleString('vi-VN')}</span>
                </p>
                <p className="text-purple-400 text-sm">
                    XALAN: <span className="font-bold">{xalan.toLocaleString('vi-VN')}</span>
                </p>
                <div className="border-t border-gray-700 mt-2 pt-2">
                    <p className="text-gray-300 text-sm">
                        Tổng: <span className="font-bold text-white">{total.toLocaleString('vi-VN')}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function BarChart({ data, title, maxItems = 12 }: BarChartProps) {
    const displayData = data.slice(0, maxItems);

    return (
        <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700">
            {title && (
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            )}

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
                    <RechartsBarChart
                        data={displayData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        barGap={2}
                        barCategoryGap="15%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            axisLine={{ stroke: '#4B5563' }}
                            tickLine={{ stroke: '#4B5563' }}
                        />
                        <YAxis
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            axisLine={{ stroke: '#4B5563' }}
                            tickLine={{ stroke: '#4B5563' }}
                            tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => (
                                <span className="text-gray-300 text-sm">{value}</span>
                            )}
                        />
                        <Bar
                            dataKey="xe"
                            name="XE"
                            fill="url(#xeGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />
                        <Bar
                            dataKey="xalan"
                            name="XALAN"
                            fill="url(#xalanGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />

                        {/* Gradients */}
                        <defs>
                            <linearGradient id="xeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                                <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="xalanGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#A855F7" stopOpacity={1} />
                                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
