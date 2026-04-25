"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Loader2, MessageSquare, Save, Tag, User } from "lucide-react";
import CascadingSelect from "@/components/CascadingSelect";
import { mockNhanVien } from "@/data/mockData";
import { logger } from "@/lib/logger";
import { NhanVien, CA_LAM_VIEC, CaLamViec, BaoCao } from "@/types";
import { saveReport } from "@/services/reportService";

const NHAN_VIEN_KEY = "daily_report_nhan_vien";

const LY_DO_NGHI = [
  "Nghỉ phép năm",
  "Nghỉ ốm",
  "Nghỉ việc riêng",
  "Nghỉ bù",
  "Nghỉ không lương",
  "Khác",
];

export default function LeaveReportPage() {
  const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
  const [selectedNhanVien, setSelectedNhanVien] = useState<NhanVien | null>(null);
  const [selectedCa, setSelectedCa] = useState<CaLamViec | "">("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [lyDoNghi, setLyDoNghi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const saved = localStorage.getItem(NHAN_VIEN_KEY);
    setNhanVienList(saved ? JSON.parse(saved) : mockNhanVien);
  }, []);

  const handleSubmit = async () => {
    if (!selectedNhanVien || !selectedCa || !lyDoNghi) {
      alert("Vui lòng chọn đầy đủ thông tin");
      return;
    }

    setIsSubmitting(true);

    const baoCao: BaoCao = {
      Ngay: selectedDate,
      Ca: selectedCa,
      LoaiBaoCao: "NghiPhep",
      NguoiLap_MaNV: selectedNhanVien.Ma_NV,
      NguoiLap_HoTen: selectedNhanVien.Ho_Ten,
      BoPhan: selectedNhanVien.Bo_Phan,
      Nhom: selectedNhanVien.Nhom,
      LyDoNghi: lyDoNghi,
      GhiChu: ghiChu,
      TrangThai: "Draft",
      Created: new Date().toISOString(),
      Modified: new Date().toISOString(),
      SyncStatus: "pending",
    };

    saveReport(baoCao);
    logger.info("Saved leave report", baoCao);

    setIsSubmitting(false);
    setSubmitStatus("success");
    setLyDoNghi("");
    setGhiChu("");

    setTimeout(() => setSubmitStatus("idle"), 3000);
  };

  const isFormValid = selectedNhanVien && selectedCa && lyDoNghi;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {submitStatus === "success" && (
        <div className="rounded-xl px-5 py-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)] text-sm font-medium">
          Đã đăng ký nghỉ phép thành công.
        </div>
      )}

      {/* Thời gian */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
          Thời gian nghỉ
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="leave-date" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Ngày nghỉ
            </label>
            <input
              id="leave-date"
              type="date"
              title="Chọn ngày nghỉ"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="ca-select" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Ca nghỉ
            </label>
            <select
              id="ca-select"
              title="Chọn ca nghỉ"
              value={selectedCa}
              onChange={(e) => setSelectedCa(e.target.value as CaLamViec)}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
            >
              <option value="">-- Chọn ca --</option>
              {CA_LAM_VIEC.map((ca) => (
                <option key={ca} value={ca}>{ca}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Người nghỉ */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-info)]" aria-hidden="true" />
          Người nghỉ phép
        </h2>
        <CascadingSelect
          nhanVienList={nhanVienList}
          onSelect={setSelectedNhanVien}
          selectedNhanVien={selectedNhanVien}
        />
      </div>

      {/* Lý do */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
          Lý do nghỉ
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {LY_DO_NGHI.map((lyDo) => (
            <button
              key={lyDo}
              type="button"
              onClick={() => setLyDoNghi(lyDo)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                lyDoNghi === lyDo
                  ? "bg-[var(--color-accent-dim)] border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              {lyDo}
            </button>
          ))}
        </div>
      </div>

      {/* Ghi chú */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          Ghi chú
        </h2>
        <textarea
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          placeholder="Ghi chú thêm về lý do nghỉ..."
          rows={3}
          className="cvf-input w-full rounded-lg px-4 py-2 text-sm resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Đăng ký nghỉ phép
            </>
          )}
        </button>
      </div>
    </div>
  );
}
