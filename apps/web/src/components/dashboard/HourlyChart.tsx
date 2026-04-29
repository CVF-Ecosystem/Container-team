'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HourlyChartProps {
  data: { hour: number; teus: number }[];
  title?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2 shadow-lg">
      <p className="text-xs text-[var(--color-text-muted)]">{label}:00 — {(label ?? 0) + 1}:00</p>
      <p className="text-sm font-bold text-[var(--color-accent)]">
        {(payload[0]?.value ?? 0).toLocaleString('vi-VN')} lượt
      </p>
    </div>
  );
};

export default function HourlyChart({ data, title = '⏱ Biến động theo giờ' }: HourlyChartProps) {
  const displayData = data.filter(d => d.teus > 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {displayData.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          Chưa có dữ liệu theo giờ cho ngày này.
        </p>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => `${h}h`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border-strong)' }}
                tickLine={{ stroke: 'var(--color-border-strong)' }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border-strong)' }}
                tickLine={{ stroke: 'var(--color-border-strong)' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar
                dataKey="teus"
                name="Lượt"
                fill="var(--color-accent)"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
