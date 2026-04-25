"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { getCurrentYear, VesselData } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getVesselReports,
  saveVesselReport,
  deleteVesselReport,
  deleteMultipleVesselReports,
  getUniqueShippingLines,
  getUniqueVesselNames,
  importVesselReportsFromExcel,
  calculateProductivity,
} from "@/services/vesselService";
import dynamic from "next/dynamic";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Package,
  Pencil,
  Plus,
  Search,
  Ship,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const ShipAnalytics = dynamic(
  () => import("@/components/ship-report/ShipAnalytics"),
  { ssr: false }
);

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026];

type CalculatedMetrics = {
  moves_per_hour?: number;
  teus_per_hour?: number;
  working_hours?: number;
  total_moves?: number;
};

const DateTimeInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (val: string) => void;
}) => {
  const inputId = `datetime-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        type="datetime-local"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
};

export default function ShipReportPage() {
  const [reports, setReports] = useState<VesselData[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingLines, setShippingLines] = useState<string[]>([]);
  const [vesselNames, setVesselNames] = useState<string[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedVessel, setSelectedVessel] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "analytics">("list");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<Partial<VesselData>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetrics | null>(null);

  const [listPage, setListPage] = useState(1);
  const LIST_PAGE_SIZE = 10;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVesselReports({ month: selectedMonth, year: selectedYear });
      data.sort((a, b) => {
        const dateA = a.atb ? new Date(a.atb).getTime() : 0;
        const dateB = b.atb ? new Date(b.atb).getTime() : 0;
        return dateB - dateA;
      });
      logger.debug("Loaded vessel reports", data);
      if (data.length > 0) {
        logger.debug("Sample vessel report", data[0]);
        logger.debug("Sample vessel report total moves", data[0].total_moves);
      }
      setReports(data);
      const years = Array.from(new Set(data.map((r) => r.year))).sort((a, b) => b - a);
      if (years.length > 0 && !years.includes(selectedYear)) setSelectedYear(years[0]);
      setSelectedIds([]);
    } catch (error) {
      logger.error("Failed to load reports", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadFilters = useCallback(async () => {
    try {
      const lines = await getUniqueShippingLines();
      setShippingLines(lines);
      const vessels = await getUniqueVesselNames();
      setVesselNames(vessels);
    } catch (error) {
      logger.error("Failed to load filters", error);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);
  useEffect(() => { void loadFilters(); }, [loadFilters]);

  useEffect(() => {
    if (isModalOpen) {
      const metrics = calculateProductivity(currentReport);
      setCalculatedMetrics({
        moves_per_hour: metrics.moves_per_hour,
        teus_per_hour: metrics.teus_per_hour,
        working_hours: metrics.working_hours,
        total_moves: metrics.total_moves,
      });
    }
  }, [currentReport, isModalOpen]);

  const handleSave = async () => {
    try {
      if (!currentReport.vessel_name) {
        alert("Vui lòng nhập tên tàu");
        return;
      }
      await saveVesselReport(currentReport as VesselData);
      setIsModalOpen(false);
      void loadReports();
      void loadFilters();
    } catch (error) {
      logger.error("Save failed", error);
      alert("Lỗi khi lưu báo cáo");
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReports.map((r) => Number(r.id)).filter((id) => !isNaN(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Bạn có chắc muốn xóa ${selectedIds.length} báo cáo tàu đã chọn?`)) {
      try {
        await deleteMultipleVesselReports(selectedIds);
        setSelectedIds([]);
        void loadReports();
      } catch (error) {
        logger.error("Delete failed", error);
        alert("Lỗi khi xóa!");
      }
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteVesselReport(deleteId);
      setIsDeleteModalOpen(false);
      setDeleteId(null);
      void loadReports();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLoading(true);
      try {
        const result = await importVesselReportsFromExcel(e.target.files[0]);
        const periodInfo =
          result.periods && result.periods.length > 0
            ? `\nDữ liệu tháng: ${result.periods.join(", ")}`
            : "\n(Không xác định được tháng)";
        alert(
          `Đã import thành công ${result.count} tàu.${periodInfo}\n${
            result.errors.length > 0 ? `Lỗi ${result.errors.length} dòng.` : ""
          }`
        );
        void loadReports();
        void loadFilters();
      } catch (error) {
        logger.error("Import error", error);
        alert("Lỗi khi import file");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        r.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.shipping_line?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLine = selectedLine ? r.shipping_line === selectedLine : true;
      const matchesVessel = selectedVessel ? r.vessel_name === selectedVessel : true;
      return matchesSearch && matchesLine && matchesVessel;
    });
  }, [reports, searchQuery, selectedLine, selectedVessel]);

  const stats = useMemo(() => {
    const totalMoves = filteredReports.reduce(
      (sum, r) =>
        sum +
        (r.total_moves ||
          (r.nhap_tau || 0) + (r.xuat_tau || 0) + (r.shift_in || 0) + (r.shift_out || 0) ||
          0),
      0
    );
    const totalTeus = filteredReports.reduce((sum, r) => sum + (r.teus || 0), 0);
    let validProductivityCount = 0;
    const totalProductivity = filteredReports.reduce((sum, r) => {
      let prod = r.moves_per_hour || 0;
      if (!prod) {
        const moves =
          r.total_moves ||
          (r.nhap_tau || 0) + (r.xuat_tau || 0) + (r.shift_in || 0) + (r.shift_out || 0);
        let hours = r.working_hours || 0;
        if (!hours && r.atw && r.atc) {
          const dist = new Date(r.atc).getTime() - new Date(r.atw).getTime();
          if (dist > 0) hours = dist / 3600000;
        }
        if (hours > 0) prod = moves / hours;
      }
      if (prod > 0) validProductivityCount++;
      return sum + prod;
    }, 0);
    const avgMovesPerHour =
      validProductivityCount > 0 ? totalProductivity / validProductivityCount : 0;
    return { totalMoves, totalTeus, avgMovesPerHour };
  }, [filteredReports]);

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, selectedLine, selectedVessel, selectedMonth, selectedYear]);

  const paginatedReports = useMemo(() => {
    const startIndex = (listPage - 1) * LIST_PAGE_SIZE;
    return filteredReports.slice(startIndex, startIndex + LIST_PAGE_SIZE);
  }, [filteredReports, listPage]);

  const getProductivityColor = (mph: number) => {
    if (mph >= 25) return "text-[var(--color-success)]";
    if (mph >= 15) return "text-[var(--color-warning)]";
    return "text-[var(--color-danger)]";
  };

  const totalPages = Math.ceil(filteredReports.length / LIST_PAGE_SIZE);

  const kpiCards = [
    {
      label: "Tổng Conts",
      value: stats.totalMoves.toLocaleString(),
      borderClass: "border-t-[var(--color-info)]",
      Icon: Ship,
    },
    {
      label: "Tổng TEUs",
      value: stats.totalTeus.toLocaleString(),
      borderClass: "border-t-[var(--color-success)]",
      Icon: Package,
    },
    {
      label: "Năng suất TB (Moves/h)",
      value: stats.avgMovesPerHour.toFixed(1),
      borderClass: "border-t-[var(--color-warning)]",
      Icon: BarChart2,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Controls */}
      <div className="cvf-card rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <select
            title="Chọn tháng"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="cvf-input rounded-lg px-3 py-2 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            title="Chọn năm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="cvf-input rounded-lg px-3 py-2 text-sm"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm tàu, hãng..."
              aria-label="Tìm kiếm tàu hoặc hãng"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cvf-input rounded-lg pl-9 pr-4 py-2 text-sm w-56"
            />
          </div>

          <select
            title="Lọc theo tên tàu"
            value={selectedVessel}
            onChange={(e) => setSelectedVessel(e.target.value)}
            className="cvf-input rounded-lg px-3 py-2 text-sm max-w-44"
          >
            <option value="">Tất cả tàu</option>
            {vesselNames.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            title="Lọc theo hãng tàu"
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="cvf-input rounded-lg px-3 py-2 text-sm max-w-40"
          >
            <option value="">Tất cả hãng</option>
            {shippingLines.map((line) => <option key={line} value={line}>{line}</option>)}
          </select>
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="flex bg-[var(--color-elevated)]/60 rounded-lg p-1 border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "bg-[var(--color-accent)] text-white shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              Danh Sách
            </button>
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "analytics"
                  ? "bg-[var(--color-info)] text-white shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
              Biểu Đồ
            </button>
          </div>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25 border border-[var(--color-success)]/30">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleImport} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => {
              setCurrentReport({ date: new Date().toISOString().split("T")[0] });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-accent)] hover:opacity-85"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm Tàu
          </button>
        </div>
      </div>

      {/* Bulk delete */}
      {selectedIds.length > 0 && viewMode === "list" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors bg-[var(--color-danger)] hover:opacity-85"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xóa {selectedIds.length} mục đã chọn
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`cvf-card rounded-xl p-4 border-t-4 ${card.borderClass}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{card.label}</p>
              <card.Icon className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="cvf-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]/40">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      className="accent-[var(--color-accent)] rounded"
                      checked={filteredReports.length > 0 && selectedIds.length === filteredReports.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {["Tàu / Chuyến", "Hãng", "Thời gian (ATB–ATD)", "Nhập/Xuất", "TEUs", "Productivity", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[var(--color-text-muted)]">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Ship className="h-8 w-8 mx-auto mb-3 text-[var(--color-text-muted)] opacity-40" aria-hidden="true" />
                      <p className="text-[var(--color-text-secondary)]">
                        Chưa có dữ liệu tàu nào trong tháng {selectedMonth}/{selectedYear}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      className={`border-t border-[var(--color-border)] transition-colors group ${
                        selectedIds.includes(Number(report.id))
                          ? "bg-[var(--color-accent-dim)]"
                          : "hover:bg-[var(--color-elevated)]/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Chọn tàu ${report.vessel_name}`}
                          className="accent-[var(--color-accent)] rounded"
                          checked={selectedIds.includes(Number(report.id))}
                          onChange={() => handleToggleSelect(Number(report.id))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">{report.vessel_name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{report.voyage}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-elevated)] text-[var(--color-text-secondary)]">
                          {report.shipping_line || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                        <div className="flex gap-1.5 mb-0.5">
                          <span className="text-[var(--color-text-muted)] w-9">ATB:</span>
                          {report.atb && !isNaN(new Date(report.atb).getTime()) ? (
                            new Date(report.atb).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          ) : (
                            <span className="text-[var(--color-danger)]">Thiếu Giờ</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <span className="text-[var(--color-text-muted)] w-9">ATD:</span>
                          {report.atd && !isNaN(new Date(report.atd).getTime()) ? (
                            new Date(report.atd).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          ) : (
                            <span className="text-[var(--color-danger)]">Thiếu Giờ</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="text-[var(--color-success)]">↓ {report.nhap_tau}</div>
                        <div className="text-[var(--color-warning)]">↑ {report.xuat_tau}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-success)]">
                        {report.teus?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-bold ${getProductivityColor(report.moves_per_hour || 0)}`}>
                          {report.moves_per_hour || 0} m/h
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">{report.working_hours}h</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => { setCurrentReport(report); setIsModalOpen(true); }}
                            className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-accent)] transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Xóa báo cáo này?")) {
                                setDeleteId(report.id as number);
                                setIsDeleteModalOpen(true);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-danger)] transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredReports.length > LIST_PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-elevated)]/20 flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">
                Hiển thị {(listPage - 1) * LIST_PAGE_SIZE + 1}–{Math.min(listPage * LIST_PAGE_SIZE, filteredReports.length)} trong {filteredReports.length} bản ghi
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Trang trước"
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  disabled={listPage === 1}
                  className="p-1.5 rounded hover:bg-[var(--color-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => Math.abs(page - listPage) <= 1 || page === 1 || page === totalPages)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setListPage(page)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                        listPage === page
                          ? "bg-[var(--color-accent)] text-white"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                <button
                  type="button"
                  aria-label="Trang sau"
                  onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                  disabled={listPage === totalPages}
                  className="p-1.5 rounded hover:bg-[var(--color-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ShipAnalytics data={filteredReports} />
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="cvf-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Ship className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                {currentReport.id ? "Chỉnh Sửa Tàu" : "Thêm Tàu Mới"}
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-text-muted)] transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* General Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="vessel-name" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tên Tàu *</label>
                  <input
                    id="vessel-name"
                    className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                    value={currentReport.vessel_name || ""}
                    onChange={(e) => setCurrentReport({ ...currentReport, vessel_name: e.target.value })}
                    placeholder="VD: MAERSK ALABAMA"
                  />
                </div>
                <div>
                  <label htmlFor="voyage" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Chuyến</label>
                  <input
                    id="voyage"
                    className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                    value={currentReport.voyage || ""}
                    onChange={(e) => setCurrentReport({ ...currentReport, voyage: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="shipping-line" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Hãng Tàu</label>
                  <input
                    id="shipping-line"
                    className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                    value={currentReport.shipping_line || ""}
                    onChange={(e) => setCurrentReport({ ...currentReport, shipping_line: e.target.value })}
                    list="lines-list"
                  />
                  <datalist id="lines-list">
                    {shippingLines.map((line) => <option key={line} value={line} />)}
                  </datalist>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-[var(--color-elevated)]/40 rounded-xl p-4 border border-[var(--color-border)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-4 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Mốc Thời Gian
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <DateTimeInput label="ATB (Cập cầu)" value={currentReport.atb} onChange={(val) => setCurrentReport({ ...currentReport, atb: val })} />
                  <DateTimeInput label="ATW (Làm hàng)" value={currentReport.atw} onChange={(val) => setCurrentReport({ ...currentReport, atw: val })} />
                  <DateTimeInput label="ATC (Hoàn thành)" value={currentReport.atc} onChange={(val) => setCurrentReport({ ...currentReport, atc: val })} />
                  <DateTimeInput label="ATD (Rời cầu)" value={currentReport.atd} onChange={(val) => setCurrentReport({ ...currentReport, atd: val })} />
                </div>
              </div>

              {/* Cargo Data */}
              <div className="bg-[var(--color-elevated)]/40 rounded-xl p-4 border border-[var(--color-border)]">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-success)] mb-4 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" aria-hidden="true" />
                  Sản Lượng
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {(
                    [
                      { id: "nhap-tau", label: "Nhập (D)", field: "nhap_tau" },
                      { id: "xuat-tau", label: "Xuất (L)", field: "xuat_tau" },
                      { id: "shift-in", label: "Shift In", field: "shift_in" },
                      { id: "shift-out", label: "Shift Out", field: "shift_out" },
                    ] as const
                  ).map(({ id, label, field }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-xs text-[var(--color-text-secondary)] mb-1.5">{label}</label>
                      <input
                        id={id}
                        type="number"
                        className="cvf-input w-full rounded-lg px-2 py-1.5 text-sm"
                        value={(currentReport[field as keyof VesselData] as number) || 0}
                        onChange={(e) => setCurrentReport({ ...currentReport, [field]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                  <div className="lg:col-span-2 border-l border-[var(--color-border)] pl-4">
                    <label htmlFor="teus" className="block text-xs font-bold text-[var(--color-accent)] mb-1.5">TEUs Total</label>
                    <input
                      id="teus"
                      type="number"
                      className="cvf-input w-full rounded-lg px-2 py-1.5 text-sm font-bold text-[var(--color-accent)]"
                      value={currentReport.teus || 0}
                      onChange={(e) => setCurrentReport({ ...currentReport, teus: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics Preview */}
              {calculatedMetrics && (
                <div className="grid grid-cols-3 gap-4 text-center bg-[var(--color-elevated)]/20 rounded-xl p-4 border border-[var(--color-border)]">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Giờ làm việc</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{calculatedMetrics.working_hours} h</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Tổng Moves</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{calculatedMetrics.total_moves}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Năng suất Net</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">{calculatedMetrics.moves_per_hour} m/h</p>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label htmlFor="remark" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ghi chú</label>
                <textarea
                  id="remark"
                  className="cvf-input w-full rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  value={currentReport.remark || ""}
                  onChange={(e) => setCurrentReport({ ...currentReport, remark: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-[var(--color-accent)] hover:opacity-85 transition-opacity"
              >
                Lưu Báo Cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="cvf-card rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">Xác nhận xóa?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Bạn có chắc muốn xóa báo cáo tàu này không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--color-danger)] hover:opacity-85 transition-opacity"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
