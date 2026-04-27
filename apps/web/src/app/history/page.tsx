"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Inbox,
  Trash2,
} from "lucide-react";
import * as XLSX from "@e965/xlsx";
import {
  getAllReports,
  deleteReport,
  getReportStats,
  SavedReport,
} from "@/services/reportService";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Drawer,
  KPICard,
  SectionLabel,
  type BadgeTone,
} from "@/components/cosmic";

const LOAI_LABEL: Record<string, string> = {
  NhanSu: "Nhân sự",
  SoLieu: "Số liệu",
  NghiPhep: "Nghỉ phép",
};

const LOAI_TONE: Record<string, BadgeTone> = {
  NhanSu: "success",
  SoLieu: "accent",
  NghiPhep: "warning",
};

const BOPHAN_TONE: Record<string, BadgeTone> = {
  "Điều hành": "accent",
  "Thủ tục": "info",
  "Bãi cont": "success",
  "Tổng hợp": "warning",
};

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getReportStats> | null>(null);
  const [filter, setFilter] = useState({
    loai: "",
    boPhan: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selected, setSelected] = useState<SavedReport | null>(null);

  const loadData = useCallback(() => {
    setReports(getAllReports());
    setStats(getReportStats());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa báo cáo này?")) {
      deleteReport(id);
      setSelected((s) => (s?.id === id ? null : s));
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

  const handleExportExcel = () => {
    const exportData = filteredReports.map((r) => ({
      Ngày: r.Ngay,
      Ca: r.Ca,
      Loại: LOAI_LABEL[r.LoaiBaoCao] || r.LoaiBaoCao,
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
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `BaoCao_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Stats KPI row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KPICard
            icon={ClipboardList}
            label="Tổng báo cáo"
            value={stats.total.toLocaleString("vi-VN")}
            tone="accent"
          />
          <KPICard
            icon={Calendar}
            label="Hôm nay"
            value={stats.today.toLocaleString("vi-VN")}
            tone="success"
          />
          <KPICard
            icon={Calendar}
            label="Tháng này"
            value={stats.thisMonth.toLocaleString("vi-VN")}
            tone="info"
          />
          <KPICard
            icon={ClipboardList}
            label="Nhân sự"
            value={(stats.byLoai.NhanSu || 0).toLocaleString("vi-VN")}
            tone="success"
          />
          <KPICard
            icon={ClipboardList}
            label="Số liệu"
            value={(stats.byLoai.SoLieu || 0).toLocaleString("vi-VN")}
            tone="info"
          />
        </div>
      )}

      {/* Filter toolbar */}
      <Card noPad>
        <CardHeader
          title="Bộ lọc"
          subtitle="Lọc theo loại báo cáo, bộ phận và khoảng ngày"
          action={
            <Button
              variant="primary"
              icon={Download}
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredReports.length === 0}
            >
              Xuất Excel
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Loại báo cáo
            </label>
            <select
              aria-label="Loại báo cáo"
              value={filter.loai}
              onChange={(e) => setFilter({ ...filter, loai: e.target.value })}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="NhanSu">Nhân sự (Đầu ca)</option>
              <option value="SoLieu">Số liệu (Cuối ca)</option>
              <option value="NghiPhep">Nghỉ phép</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Bộ phận
            </label>
            <select
              aria-label="Bộ phận"
              value={filter.boPhan}
              onChange={(e) => setFilter({ ...filter, boPhan: e.target.value })}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="Bãi cont">Bãi cont</option>
              <option value="Điều hành">Điều hành</option>
              <option value="Thủ tục">Thủ tục</option>
              <option value="Tổng hợp">Tổng hợp</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Từ ngày
            </label>
            <input
              type="date"
              aria-label="Từ ngày"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              Đến ngày
            </label>
            <input
              type="date"
              aria-label="Đến ngày"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card noPad>
        <CardHeader
          title={`${filteredReports.length} / ${reports.length} báo cáo`}
          subtitle="Click vào dòng để xem chi tiết"
          action={
            (filter.loai || filter.boPhan || filter.dateFrom || filter.dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                icon={Filter}
                onClick={() =>
                  setFilter({ loai: "", boPhan: "", dateFrom: "", dateTo: "" })
                }
              >
                Xoá lọc
              </Button>
            )
          }
        />

        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Inbox className="h-10 w-10 text-[var(--color-text-muted)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                {reports.length === 0
                  ? "Chưa có báo cáo nào"
                  : "Không tìm thấy báo cáo phù hợp"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {reports.length === 0
                  ? "Hãy tạo báo cáo đầu tiên từ trang Đầu ca / Cuối ca."
                  : "Thử điều chỉnh bộ lọc hoặc xoá để xem tất cả."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Ngày", "Ca", "Loại", "Bộ phận", "Người lập", "Chi tiết", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, i) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelected(report)}
                    className={`cursor-pointer transition-colors hover:bg-[rgba(14,165,233,0.04)] ${
                      i < filteredReports.length - 1
                        ? "border-b border-[var(--color-border)]"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {formatDate(report.Ngay)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {report.Ca.split(" ")[0]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={LOAI_TONE[report.LoaiBaoCao] || "muted"}>
                        {LOAI_LABEL[report.LoaiBaoCao] || report.LoaiBaoCao}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={BOPHAN_TONE[report.BoPhan] || "muted"}>
                        {report.BoPhan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {report.NguoiLap_HoTen}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[var(--color-text-muted)]">
                      {report.LyDoNghi || report.GhiChu || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight
                        className="ml-auto h-4 w-4 text-[var(--color-text-muted)]"
                        aria-hidden="true"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Chi tiết báo cáo"
        subtitle={selected?.id}
        footer={
          selected && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => handleDelete(selected.id)}
              >
                Xoá
              </Button>
              <Button variant="primary" onClick={() => setSelected(null)}>
                Đóng
              </Button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={LOAI_TONE[selected.LoaiBaoCao] || "muted"}>
                {LOAI_LABEL[selected.LoaiBaoCao] || selected.LoaiBaoCao}
              </Badge>
              <Badge tone={BOPHAN_TONE[selected.BoPhan] || "muted"}>
                {selected.BoPhan}
              </Badge>
            </div>

            <div>
              <SectionLabel>Thông tin chung</SectionLabel>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Ngày", formatDate(selected.Ngay)],
                  ["Ca", selected.Ca],
                  ["Người lập", selected.NguoiLap_HoTen],
                  ["Mã NV", selected.NguoiLap_MaNV],
                  ["Bộ phận", selected.BoPhan],
                  ["Nhóm", selected.Nhom],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3"
                  >
                    <div className="text-[11px] text-[var(--color-text-muted)]">{k}</div>
                    <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                      {v || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(selected.LyDoNghi || selected.GhiChu) && (
              <div>
                <SectionLabel>Nội dung</SectionLabel>
                <div className="space-y-3">
                  {selected.LyDoNghi && (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Lý do nghỉ
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                        {selected.LyDoNghi}
                      </div>
                    </div>
                  )}
                  {selected.GhiChu && (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Ghi chú
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
                        {selected.GhiChu}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <SectionLabel>Thời gian</SectionLabel>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    Tạo lúc
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                    {formatDateTime(selected.Created)}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    Cập nhật
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                    {formatDateTime(selected.Modified)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
