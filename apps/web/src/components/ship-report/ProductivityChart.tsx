"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { VesselData } from "@/lib/db";

interface ProductivityChartProps {
  data: VesselData[];
}

interface ChartDataItem {
  name: string | undefined;
  fullName: string | undefined;
  voyage: string | undefined;
  productivity: number;
  teus_productivity: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataItem }>;
}

// Move CustomTooltip outside of the component
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 p-3 rounded shadow-lg text-sm">
        <p className="font-bold text-white mb-1">{item.fullName}</p>
        <p className="text-gray-400 text-xs mb-2">Chuyến: {item.voyage}</p>
        <p className="text-cyan-400">
          ⚡ Moves/h: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
}

export default function ProductivityChart({ data }: ProductivityChartProps) {
  // Process data: sort by date or use as is (filtered list is usually sorted by date desc)
  // We might want to sort by productivity for better visualization?
  // Or just show in chronological order to see trend?
  // Let's reverse it to show oldest to newest left to right if input is new->old
  const chartData: ChartDataItem[] = [...data].reverse().map((d) => {
    // Fallback calculations if DB values are missing/zero
    const totalMoves =
      d.total_moves ||
      (d.nhap_tau || 0) +
        (d.xuat_tau || 0) +
        (d.shift_in || 0) +
        (d.shift_out || 0);

    let workingHours = d.working_hours || 0;
    if (!workingHours && d.atw && d.atc) {
      const dist = new Date(d.atc).getTime() - new Date(d.atw).getTime();
      if (dist > 0) workingHours = dist / 3600000;
    }

    const productivity =
      d.moves_per_hour ||
      (workingHours > 0 ? Number((totalMoves / workingHours).toFixed(2)) : 0);
    const teus =
      d.teus_per_hour ||
      (workingHours > 0 && d.teus
        ? Number((d.teus / workingHours).toFixed(2))
        : 0);

    return {
      name: d.vessel_name?.split(" ")[0] || d.vessel_name?.substring(0, 10),
      fullName: d.vessel_name,
      voyage: d.voyage,
      productivity, // Moves/h
      teus_productivity: teus, // TEUs/h
    };
  });

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 h-[22rem] min-h-[22rem] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        ⚡ Năng Suất Khai Thác{" "}
        <span className="text-xs font-normal text-gray-400">(Moves/h)</span>
      </h3>

      <div className="grow w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "#374151", opacity: 0.4 }}
            />
            <Bar dataKey="productivity" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.productivity > 40
                      ? "#10B981"
                      : entry.productivity > 25
                      ? "#F59E0B"
                      : "#EF4444"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
