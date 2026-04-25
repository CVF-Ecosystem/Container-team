"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download } from "lucide-react";
import * as XLSX from "@e965/xlsx";
import {
  getAllReports,
  deleteReport,
  getReportStats,
  SavedReport,
} from "@/services/reportService";

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getReportStats> | null>(null);
  const [filter, setFilter] = useState({ loai: "", boPhan: "", dateFrom: "", dateTo: "" });

  const loadData = useCallback(() => {
    setReports(getAllReports());
    setStats(getReportStats());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa báo cáo này?")) {
      deleteReport(id);
      loadData();
    }
  };

  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (filter.loai && r.LoaiBaoCao !== filter.loai) return false;
        if (filter.boPhan && r.BoPhan !== filter.boPhan) return false;
        if (filter.dateFrom && r.Ngay < filter.dateFrom) return false;
        if (filter.dateTo && r.Ngay > filter.dateTo) return false;
        return true;
      })
      .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime());
  }, [reports, filter]);

  const chartData = useMemo(() => {
    const byBoPhan: Record<string, number> = {};
    const byLoai: Record<string, number> = {};
    reports.forEach((r) => {
      byBoPhan[r.BoPhan] = (byBoPhan[r.BoPhan] || 0) + 1;
      byLoai[r.LoaiBaoCao] = (byLoai[r.LoaiBaoCao] || 0) + 1;
    });
    return { byBoPhan, byLoai };
  }, [reports]);

  const handleExportExcel = () => {
    const exportData = filteredReports.map((r) => ({
      Ngày: r.Ngay,
      Ca: r.Ca,
      Loại: r.LoaiBaoCao === "NhanSu" ? "Nhân sự" : r.LoaiBaoCao === "SoLieu" ? "Số liệu" : "Nghỉ phép",
      "Bộ phận": r.BoPhan,
      Nhóm: r.Nhom,
      "Người lập": r.NguoiLap_HoTen,
      "Mã NV": r.NguoiLap_MaNV,
      "Ghi chú": r.GhiChu || "",
      "Lý do nghỉ": r.LyDoNghi || "",
      "Thời gian tạo": new Date(r.Created).toLocaleString("vi-VN"),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({ wch: Math.max(key.length, 15) }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `BaoCao_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");

  const SimpleBarChart = ({ data, title, barClass }: { data: Record<string, number>; title: string; barClass: string }) => {
    const maxValue = Math.max(...Object.values(data), 1);
    const getWidthClass = (v: number) => {
      const p = (v / maxValue) * 100;
      if (p >= 100) return "w-full";
      if (p >= 90) return "w-11/12";
      if (p >= 80) return "w-4/5";
      if (p >= 70) return "w-3/4";
      if (p >= 60) return "w-3/5";
      if (p >= 50) return "w-1/2";
      if (p >= 40) return "w-2/5";
      if (p >= 30) return "w-1/3";
      if (p >= 20) return "w-1/4";
      if (p >= 10) return "w-1/6";
      return "w-1/12";
    };
    return (
      <div className="cvf-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">{title}</h3>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] text-xs w-24 truncate">{key}</span>
              <div className="flex-1 bg-[var(--color-elevated)] rounded-full h-3 overflow-hidden">
                <div className={`h-full ${barClass} ${getWidthClass(value)} transition-all duration-500`} />
              </div>
              <span className="text-[var(--color-text-primary)] text-xs w-6 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getLoaiLabel = (loai: string) => {
    switch (loai) {
      case "NhanSu": return "Nhân sự";
      case "SoLieu": return "Số liệu";
      case "NghiPhep": return "Nghỉ phép";
      default: return loai;
    }
  };

  const getLoaiBadgeClass = (loai: string) => {
    switch (loai) {
      case "NhanSu": return "bg-[var(--color-success)]/10 text-[var(--color-success)]";
      case "SoLieu": return "bg-[var(--color-accent-dim)] text-[var(--color-accent)]";
      case "NghiPhep": return "bg-[var(--color-warning)]/10 text-[var(--color-warning)]";
      default: return "bg-[var(--color-elevated)] text-[var(--color-text-secondary)]";
    }
  };

  const getBoPhanBadgeClass = (boPhan: string) => {
    switch (boPhan) {
      case "Điều hành": return "bg-[var(--color-accent-dim)] text-[var(--color-accent)]";
      case "Thủ tục": return "bg-[var(--color-info)]/10 text-[var(--color-info)]";
      case "Bãi cont": return "bg-[var(--color-success)]/10 text-[var(--color-success)]";
      default: return "bg-[var(--color-warning)]/10 text-[var(--color-warning)]";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Tổng báo cáo", value: stats.total, colorClass: "text-[var(--color-text-primary)]" },
            { label: "Hôm nay", value: stats.today, colorClass: "text-[var(--color-success)]" },
            { label: "Tháng này", value: stats.thisMonth, colorClass: "text-[var(--color-accent)]" },
            { label: "Nhân sự", value: stats.byLoai.NhanSu, colorClass: "text-[var(--color-success)]" },
            { label: "Số liệu", value: stats.byLoai.SoLieu, colorClass: "text-[var(--color-info)]" },
          ].map((card) => (
            <div key={card.label} className="cvf-card rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.colorClass}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {reports.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          <SimpleBarChart data={chartData.byBoPhan} title="Báo cáo theo Bộ phận" barClass="bg-[var(--color-accent)]" />
          <SimpleBarChart
            data={Object.fromEntries(Object.entries(chartData.byLoai).map(([k, v]) => [getLoaiLabel(k), v]))}
            title="Báo cáo theo Loại"
            barClass="bg-[var(--color-info)]"
          />
        </div>
      )}

      {/* Filters */}
      <div className="cvf-card rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Loại báo cáo</label>
            <select title="Chọn loại báo cáo" value={filter.loai} onChange={(e) => setFilter({ ...filter, loai: e.target.value })} className="cvf-input w-full rounded-lg px-3 py-2 text-sm">
              <option value="">Tất cả</option>
              <option value="NhanSu">Nhân sự (Đầu ca)</option>
              <option value="SoLieu">Số liệu (Cuối ca)</option>
              <option value="NghiPhep">Nghỉ phép</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Bộ phận</label>
            <select title="Chọn bộ phận" value={filter.boPhan} onChange={(e) => setFilter({ ...filter, boPhan: e.target.value })} className="cvf-input w-full rounded-lg px-3 py-2 text-sm">
              <option value="">Tất cả</option>
              <option value="Bãi cont">Bãi cont</option>
              <option value="Điều hành">Điều hành</option>
              <option value="Thủ tục">Thủ tục</option>
              <option value="Tổng hợp">Tổng hợp</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Từ ngày</label>
            <input type="date" title="Chọn ngày bắt đầu" value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} className="cvf-input w-full rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Đến ngày</label>
            <input type="date" title="Chọn ngày kết thúc" value={filter.dateTo} onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })} className="cvf-input w-full rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cvf-card rounded-xl overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4 opacity-30">○</p>
            <p className="text-[var(--color-text-secondary)]">Chưa có báo cáo nào</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Hãy tạo báo cáo đầu tiên!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]/40">
                  {["Ngày", "Ca", "Loại", "Bộ phận", "Người lập", "Chi tiết", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-elevated)]/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{formatDate(report.Ngay)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{report.Ca.split(" ")[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getLoaiBadgeClass(report.LoaiBaoCao)}`}>
                        {getLoaiLabel(report.LoaiBaoCao)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getBoPhanBadgeClass(report.BoPhan)}`}>
                        {report.BoPhan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{report.NguoiLap_HoTen}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] max-w-xs truncate">{report.LyDoNghi || report.GhiChu || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => handleDelete(report.id)} className="text-xs text-[var(--color-danger)] hover:opacity-70 transition-opacity">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-elevated)]/20 flex justify-between items-center">
          <span className="text-xs text-[var(--color-text-muted)]">
            Hiển thị {filteredReports.length} / {reports.length} báo cáo
          </span>
          {filteredReports.length > 0 && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-xs text-[var(--color-success)] hover:opacity-80 transition-opacity"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Top action bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={filteredReports.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-success)] hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Excel
        </button>
      </div>
    </div>
  );
}
