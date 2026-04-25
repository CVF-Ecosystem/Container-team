"use client";

import { useState, useEffect } from "react";
import { useAvailableYears } from "@/lib/hooks";
import { getCurrentYear } from "@/lib/db";

interface DateFilterProps {
  onFilterChange: (filter: DateFilterValue) => void;
  mode?: "daily" | "monthly";
}

export interface DateFilterValue {
  year: number;
  month?: number; // 1-12, undefined = all months
  quarter?: number; // 1-4, undefined = not filtered by quarter
  dateRange?: {
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
  };
}

const MONTHS = [
  { value: 0, label: "Tất cả tháng" },
  { value: 1, label: "Tháng 1" },
  { value: 2, label: "Tháng 2" },
  { value: 3, label: "Tháng 3" },
  { value: 4, label: "Tháng 4" },
  { value: 5, label: "Tháng 5" },
  { value: 6, label: "Tháng 6" },
  { value: 7, label: "Tháng 7" },
  { value: 8, label: "Tháng 8" },
  { value: 9, label: "Tháng 9" },
  { value: 10, label: "Tháng 10" },
  { value: 11, label: "Tháng 11" },
  { value: 12, label: "Tháng 12" },
];

const QUARTERS = [
  { value: 0, label: "Tất cả quý" },
  { value: 1, label: "Quý 1 (T1-T3)" },
  { value: 2, label: "Quý 2 (T4-T6)" },
  { value: 3, label: "Quý 3 (T7-T9)" },
  { value: 4, label: "Quý 4 (T10-T12)" },
];

export default function DateFilter({
  onFilterChange,
}: DateFilterProps) {
  const availableYears = useAvailableYears();
  const currentYear = getCurrentYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = all months
  const [selectedQuarter, setSelectedQuarter] = useState(0); // 0 = all quarters
  const [filterMode, setFilterMode] = useState<"month" | "quarter" | "range">(
    "month"
  );

  // Get years to display (available years or fallback to current ± 2)
  const years =
    availableYears && availableYears.length > 0
      ? availableYears
      : [currentYear - 2, currentYear - 1, currentYear];

  // Notify parent when filter changes
  useEffect(() => {
    const filter: DateFilterValue = { year: selectedYear };

    if (filterMode === "month" && selectedMonth > 0) {
      filter.month = selectedMonth;
    } else if (filterMode === "quarter" && selectedQuarter > 0) {
      filter.quarter = selectedQuarter;
    }

    onFilterChange(filter);
  }, [
    selectedYear,
    selectedMonth,
    selectedQuarter,
    filterMode,
    onFilterChange,
  ]);

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Label */}
        <span className="text-gray-400 text-sm font-medium">🔍 Lọc theo:</span>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-filter" className="text-gray-400 text-sm">
            Năm:
          </label>
          <select
            id="year-filter"
            title="Chọn năm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 
                                 focus:border-blue-500 focus:outline-none"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Mode Toggle */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => {
              setFilterMode("month");
              setSelectedQuarter(0);
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              filterMode === "month"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Tháng
          </button>
          <button
            onClick={() => {
              setFilterMode("quarter");
              setSelectedMonth(0);
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              filterMode === "quarter"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Quý
          </button>
        </div>

        {/* Month/Quarter Selector */}
        {filterMode === "month" && (
          <select
            aria-label="Chọn tháng"
            title="Chọn tháng"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 
                                 focus:border-blue-500 focus:outline-none"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        {filterMode === "quarter" && (
          <select
            aria-label="Chọn quý"
            title="Chọn quý"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(Number(e.target.value))}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 
                                 focus:border-blue-500 focus:outline-none"
          >
            {QUARTERS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => {
              setSelectedYear(currentYear);
              setSelectedMonth(new Date().getMonth() + 1);
              setFilterMode("month");
            }}
            className="px-3 py-1.5 text-sm bg-amber-600/20 text-amber-400 rounded-lg 
                                 hover:bg-amber-600/30 transition-all"
          >
            📅 Tháng hiện tại
          </button>
          <button
            onClick={() => {
              setSelectedYear(currentYear);
              setSelectedMonth(0);
              setSelectedQuarter(0);
              setFilterMode("month");
            }}
            className="px-3 py-1.5 text-sm bg-green-600/20 text-green-400 rounded-lg 
                                 hover:bg-green-600/30 transition-all"
          >
            📊 Cả năm {currentYear}
          </button>
          <button
            onClick={() => {
              setSelectedYear(currentYear);
              setSelectedMonth(0);
              setSelectedQuarter(0);
              setFilterMode("month");
            }}
            title="Reset filter về mặc định"
            className="px-3 py-1.5 text-sm bg-gray-600/30 text-gray-400 rounded-lg 
                                 hover:bg-gray-600/50 hover:text-white transition-all"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Current Filter Display */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Đang xem:
          <span className="ml-2 text-white font-medium">
            {filterMode === "month" && selectedMonth > 0
              ? `Tháng ${selectedMonth}/${selectedYear}`
              : filterMode === "quarter" && selectedQuarter > 0
              ? `Quý ${selectedQuarter}/${selectedYear}`
              : `Năm ${selectedYear}`}
          </span>
        </span>

        {/* Year comparison hint */}
        {years.length >= 2 && (
          <span className="text-xs text-gray-500">
            💡 So sánh: {years.slice(-3).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
