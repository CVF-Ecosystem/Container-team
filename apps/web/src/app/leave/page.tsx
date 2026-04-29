"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Save,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import CascadingSelect from "@/components/CascadingSelect";
import { mockNhanVien } from "@/data/mockData";
import { logger } from "@/lib/logger";
import { NhanVien, CA_LAM_VIEC, CaLamViec, BaoCao } from "@/types";
import { saveReport, getLeaveStats } from "@/services/reportService";
import {
  Button,
  Card,
  ChipPicker,
  KPICard,
  SectionLabel,
} from "@/components/cosmic";

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
    new Date().toISOString().split("T")[0],
  );
  const [lyDoNghi, setLyDoNghi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [leaveStats, setLeaveStats] = useState({ thisMonth: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(NHAN_VIEN_KEY);
    setNhanVienList(saved ? JSON.parse(saved) : mockNhanVien);
    setLeaveStats(getLeaveStats());
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
    setLeaveStats(getLeaveStats());

    setIsSubmitting(false);
    setSubmitStatus("success");
    setLyDoNghi("");
    setGhiChu("");

    setTimeout(() => setSubmitStatus("idle"), 3000);
  };

  const isFormValid = selectedNhanVien && selectedCa && lyDoNghi;

  return (
    <div className="space-y-5 pb-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          icon={ClipboardList}
          label="Yêu cầu tháng này"
          value={String(leaveStats.thisMonth)}
          tone="accent"
        />
        <KPICard
          icon={Clock}
          label="Chờ phê duyệt"
          value={String(leaveStats.pending)}
          tone="warning"
        />
        <KPICard
          icon={CheckCircle2}
          label="Đã duyệt"
          value={String(leaveStats.approved)}
          tone="success"
        />
        <KPICard
          icon={XCircle}
          label="Từ chối"
          value={String(leaveStats.rejected)}
          tone="danger"
        />
      </div>

      {submitStatus === "success" && (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(16,185,129,0.30)] bg-[rgba(16,185,129,0.10)] px-4 py-3 text-sm font-medium text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Đã đăng ký nghỉ phép thành công.
        </div>
      )}

      {/* Time + shift */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Thời gian nghỉ</SectionLabel>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="leave-date"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Ngày nghỉ
            </label>
            <input
              id="leave-date"
              type="date"
              aria-label="Chọn ngày nghỉ"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm md:max-w-xs"
            />
          </div>
          <ChipPicker<CaLamViec>
            label="Ca nghỉ"
            value={selectedCa}
            onChange={setSelectedCa}
            options={CA_LAM_VIEC.map((ca) => ({ value: ca, label: ca }))}
            columns={CA_LAM_VIEC.length === 5 ? 5 : 4}
            size="sm"
            required
          />
        </div>
      </Card>

      {/* Person */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-info)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Người nghỉ phép</SectionLabel>
        </div>
        <CascadingSelect
          nhanVienList={nhanVienList}
          onSelect={setSelectedNhanVien}
          selectedNhanVien={selectedNhanVien}
        />
      </Card>

      {/* Reason */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Lý do nghỉ</SectionLabel>
        </div>
        <ChipPicker
          value={lyDoNghi}
          onChange={setLyDoNghi}
          options={LY_DO_NGHI.map((l) => ({ value: l, label: l }))}
          columns={3}
          required
        />
      </Card>

      {/* Notes */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare
            className="h-4 w-4 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <SectionLabel className="!mb-0">Ghi chú</SectionLabel>
        </div>
        <textarea
          aria-label="Ghi chú thêm"
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          placeholder="Ghi chú thêm về lý do nghỉ..."
          rows={3}
          className="cvf-input w-full resize-none rounded-lg px-3 py-2 text-sm"
        />
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          icon={isSubmitting ? Loader2 : Save}
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Đăng ký nghỉ phép"}
        </Button>
      </div>
    </div>
  );
}
