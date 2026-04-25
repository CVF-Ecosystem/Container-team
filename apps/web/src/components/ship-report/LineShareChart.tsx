"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { VesselData } from "@/lib/db";
import { useMemo } from "react";

interface LineShareChartProps {
  data: VesselData[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A855F7",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
];

interface ChartDataItem {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  chartData: ChartDataItem[];
}

// Move CustomTooltip outside of the component
function CustomTooltip({ active, payload, chartData }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = chartData.reduce((acc, c) => acc + c.value, 0);
    const percent =
      total > 0 ? (((data.value as number) / total) * 100).toFixed(1) : "0";
    return (
      <div className="bg-gray-800 border border-gray-700 p-2 rounded shadow-lg text-sm">
        <p className="font-bold text-white">{data.name}</p>
        <p className="text-emerald-400">
          📦 {(data.value as number).toLocaleString()} TEUs
        </p>
        <p className="text-gray-400 text-xs">({percent}%)</p>
      </div>
    );
  }
  return null;
}

export default function LineShareChart({ data }: LineShareChartProps) {
  const chartData = useMemo(() => {
    const lines: Record<string, number> = {};

    data.forEach((d) => {
      const line = d.shipping_line || "Khác";
      const value = d.teus || 0; // Changed to TEUs
      lines[line] = (lines[line] || 0) + value;
    });

    return Object.entries(lines)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort desc
  }, [data]);

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 h-[22rem] min-h-[22rem] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        🚢 Tỷ Trọng Hãng Tàu{" "}
        <span className="text-xs font-normal text-gray-400">(% TEUs)</span>
      </h3>
      <div className="grow w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip chartData={chartData} />} />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ paddingLeft: "10px", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Stats */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none md:hidden">
          {/* Only show on desktop if donut, but this is pie. So keeping clean. */}
        </div>
      </div>
    </div>
  );
}
