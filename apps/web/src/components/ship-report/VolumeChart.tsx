"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { VesselData } from "@/lib/db";

interface VolumeChartProps {
  data: VesselData[];
}

interface ChartDataItem {
  name: string | undefined;
  fullName: string | undefined;
  voyage: string | undefined;
  import: number;
  export: number;
  shift: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}

// Move CustomTooltip outside of the component
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.import + data.export + data.shift;
    return (
      <div className="bg-gray-800 border border-gray-700 p-3 rounded shadow-lg text-sm">
        <p className="font-bold text-white mb-1">{data.fullName}</p>
        <p className="text-gray-400 text-xs mb-2">{data.voyage}</p>
        <div className="space-y-1">
          <p className="text-blue-400 flex justify-between gap-4">
            <span>⬇️ Nhập:</span> <span>{data.import}</span>
          </p>
          <p className="text-orange-400 flex justify-between gap-4">
            <span>⬆️ Xuất:</span> <span>{data.export}</span>
          </p>
          <p className="text-purple-400 flex justify-between gap-4">
            <span>🔄 Shift:</span> <span>{data.shift}</span>
          </p>
          <div className="border-t border-gray-600 pt-1 mt-1 font-bold text-white flex justify-between">
            <span>Tổng:</span> <span>{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function VolumeChart({ data }: VolumeChartProps) {
  const chartData: ChartDataItem[] = [...data].reverse().map((d) => ({
    name: d.vessel_name?.split(" ")[0] || d.vessel_name?.substring(0, 10),
    fullName: d.vessel_name,
    voyage: d.voyage,
    import: d.nhap_tau || 0,
    export: d.xuat_tau || 0,
    shift: (d.shift_in || 0) + (d.shift_out || 0),
  }));

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 h-[22rem] min-h-[22rem] flex flex-col">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📦 Sản Lượng Theo Tàu{" "}
        <span className="text-xs font-normal text-gray-400">(Conts)</span>
      </h3>
      <div className="grow w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            stackOffset="sign"
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
            <Legend wrapperStyle={{ paddingTop: "10px" }} />

            <Bar
              dataKey="import"
              name="Nhập"
              stackId="a"
              fill="#3B82F6"
              radius={[0, 0, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="export"
              name="Xuất"
              stackId="a"
              fill="#F97316"
              radius={[0, 0, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="shift"
              name="Shift"
              stackId="a"
              fill="#A855F7"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
