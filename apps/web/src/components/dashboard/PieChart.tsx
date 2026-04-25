'use client';

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartProps {
    xe: number;
    xalan: number;
    size?: number;
}

const COLORS = {
    xe: '#F59E0B',
    xalan: '#A855F7',
};

interface PieDataPoint {
    name: string;
    value: number;
    percent: number;
}

interface TooltipPayload {
    name?: string;
    value?: number;
    payload: PieDataPoint;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
}

interface PieLabelProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                <p className="text-white font-medium">
                    {data.name}: <span className="font-bold">{(data.value ?? 0).toLocaleString('vi-VN')}</span>
                </p>
                <p className="text-gray-400 text-sm">
                    ({(data.payload.percent * 100).toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

// Custom label for pie slices
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelProps) => {
    if (
        cx === undefined ||
        cy === undefined ||
        midAngle === undefined ||
        innerRadius === undefined ||
        outerRadius === undefined ||
        percent === undefined ||
        percent < 0.05
    ) return null; // Don't show label for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fontWeight="bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function PieChart({ xe, xalan }: PieChartProps) {
    const total = xe + xalan;
    if (total === 0) return null;

    const data = [
        { name: 'XE', value: xe, percent: xe / total },
        { name: 'XALAN', value: xalan, percent: xalan / total },
    ];

    return (
        <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">
                Tỷ Lệ XE / XALAN
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    <RechartsPieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            labelLine={false}
                            label={renderCustomLabel}
                        >
                            <Cell key="xe" fill={COLORS.xe} stroke={COLORS.xe} />
                            <Cell key="xalan" fill={COLORS.xalan} stroke={COLORS.xalan} />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            formatter={(value) => {
                                const item = data.find((entry) => entry.name === value);
                                return (
                                    <span className="text-gray-300 text-sm">
                                        {value}: {(item?.value ?? 0).toLocaleString('vi-VN')}
                                    </span>
                                );
                            }}
                        />

                        {/* Center text */}
                        <text
                            x="50%"
                            y="45%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white text-2xl font-bold"
                            style={{ fontSize: '24px', fontWeight: 'bold', fill: 'white' }}
                        >
                            {total.toLocaleString('vi-VN')}
                        </text>
                        <text
                            x="50%"
                            y="55%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fontSize: '12px', fill: '#9CA3AF' }}
                        >
                            Tổng cộng
                        </text>
                    </RechartsPieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
