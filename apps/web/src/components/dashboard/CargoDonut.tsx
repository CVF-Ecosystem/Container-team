'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CargoDonutProps {
  ha: number;
  giao: number;
  cfsIn: number;
  cfsOut: number;
}

const SEGMENTS = [
  { key: 'ha',     label: 'Hạ',       color: '#10b981' },
  { key: 'giao',   label: 'Giao',     color: '#f43f5e' },
  { key: 'cfsIn',  label: 'CFS Đóng', color: '#0ea5e9' },
  { key: 'cfsOut', label: 'CFS Rút',  color: '#818cf8' },
];

interface TooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2 shadow-lg">
      <p className="text-sm text-[var(--color-text-secondary)]">{payload[0]?.name}</p>
      <p className="font-bold text-[var(--color-text-primary)]">
        {(payload[0]?.value ?? 0).toLocaleString('vi-VN')}
      </p>
    </div>
  );
};

export default function CargoDonut({ ha, giao, cfsIn, cfsOut }: CargoDonutProps) {
  const values: Record<string, number> = { ha, giao, cfsIn, cfsOut };
  const total = ha + giao + cfsIn + cfsOut;

  if (total === 0) return null;

  const data = SEGMENTS.map(s => ({ name: s.label, value: values[s.key], color: s.color }));

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-center text-sm font-semibold text-[var(--color-text-primary)]">
        Phân loại Biến Động
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={38}
              outerRadius={66}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={entry.color} stroke={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
