"use client";

import { useState, useEffect, useMemo } from "react";
import { CalendarDays, FileText, Save, User } from "lucide-react";
import { Employee } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllEmployees } from "@/lib/personnelService";
import { mockHangMucCongViec } from "@/data/mockData";

const VALID_SHIFTS = ["Ca 01", "Ca 02", "Ca 03", "Hành chánh", "Ca ngày"];

const DEPARTMENTS = [
  "Tổng hợp",
  "Thủ tục",
  "Bãi cont",
  "Điều hành",
  "Ban chỉ huy",
];

export default function EndShiftReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("Ca 01");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedReporterId, setSelectedReporterId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workItems, setWorkItems] = useState<Record<string, string | number>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getAllEmployees().then(setEmployees);
  }, []);

  const currentWorkItems = useMemo(() => {
    if (!selectedDept) return [];
    return mockHangMucCongViec
      .filter((item) => item.BoPhan === selectedDept && item.Active)
      .sort((a, b) => a.ThuTu - b.ThuTu);
  }, [selectedDept]);

  const filteredEmployees = useMemo(() => {
    if (!selectedDept || !shift) return [];

    const list = employees.filter((e) => {
      if (e.department !== selectedDept) return false;
      const shiftCode = shift.replace("Ca ", "").trim();
      if (shift === "Hành chánh" || shift === "Ca ngày") return e.shift === shift;
      return e.shift.includes(shiftCode);
    });

    return list.sort((a, b) => {
      const getScore = (s: string) => {
        const lower = s.toLowerCase();
        if (lower.includes("trưởng ca") || lower.includes("đội trưởng")) return 3;
        if (lower.includes("phó ca") || lower.includes("đội phó")) return 2;
        return 1;
      };
      const scoreA = getScore(a.shift);
      const scoreB = getScore(b.shift);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
  }, [employees, selectedDept, shift]);

  const handleSubmit = () => {
    const reporter = employees.find((e) => e.id === selectedReporterId);
    const report = {
      date,
      shift,
      period: "end_shift",
      reporter: { id: reporter?.id, name: reporter?.name, department: selectedDept, shift },
      workItems,
      notes,
      created_at: new Date(),
    };
    logger.info("Submitting end shift report", report);
    alert("Đã lưu báo cáo (Demo log)");
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-5">

      {/* Thời gian */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
          Thời gian
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="date-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Ngày báo cáo
            </label>
            <input
              id="date-input"
              type="date"
              title="Chọn ngày báo cáo"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="shift-select" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Ca làm việc
            </label>
            <select
              id="shift-select"
              title="Chọn ca làm việc"
              value={shift}
              onChange={(e) => {
                setShift(e.target.value);
                setSelectedReporterId(null);
              }}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
            >
              {VALID_SHIFTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Người lập báo cáo */}
      <div className="cvf-card rounded-xl p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-info)]" aria-hidden="true" />
          Người lập báo cáo
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="dept-select" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Bộ phận
            </label>
            <select
              id="dept-select"
              title="Chọn bộ phận"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedReporterId(null);
              }}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
            >
              <option value="">-- Chọn bộ phận --</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="employee-select" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
              Họ và tên
            </label>
            <select
              id="employee-select"
              title="Chọn nhân viên lập báo cáo"
              value={selectedReporterId || ""}
              onChange={(e) => setSelectedReporterId(Number(e.target.value))}
              disabled={!selectedDept}
              className="cvf-input w-full rounded-lg px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedDept
                  ? "-- Vui lòng chọn bộ phận trước --"
                  : filteredEmployees.length === 0
                  ? "-- Không tìm thấy nhân viên trong ca này --"
                  : "-- Chọn nhân viên --"}
              </option>
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.shift.includes("Trưởng") || emp.shift.includes("Phó")
                    ? `★ ${emp.name} (${emp.shift})`
                    : emp.name}{" "}
                  ({emp.mscd})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Danh sách lọc theo <span className="font-medium text-[var(--color-text-secondary)]">{shift}</span> — ưu tiên Trưởng ca / Phó ca.
            </p>
          </div>
        </div>
      </div>

      {/* Công việc trong ca */}
      {selectedDept && (
        <div className="cvf-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
            Công việc trong ca — {selectedDept}
          </h2>

          <div className="space-y-6">
            {currentWorkItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentWorkItems.map((item) => (
                  <div
                    key={item.id}
                    className={item.LoaiNhapLieu === "Text" ? "md:col-span-2" : ""}
                  >
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                      {item.TenHangMuc}
                    </label>
                    {item.LoaiNhapLieu === "Text" ? (
                      <textarea
                        className="cvf-input w-full rounded-lg px-3 py-2 text-sm resize-none"
                        rows={2}
                        placeholder="Nhập nội dung..."
                        value={workItems[item.id] || ""}
                        onChange={(e) =>
                          setWorkItems({ ...workItems, [item.id]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        type="number"
                        className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                        value={workItems[item.id] || ""}
                        onChange={(e) =>
                          setWorkItems({ ...workItems, [item.id]: Number(e.target.value) })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] italic">
                Chưa có hạng mục công việc mẫu cho bộ phận này.
              </p>
            )}

            <div className="pt-5 border-t border-[var(--color-border)]">
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                Ghi chú thêm
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="cvf-input w-full rounded-lg px-4 py-2 text-sm resize-none"
                placeholder="Ghi chú quan trọng cần lưu ý..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedReporterId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--color-elevated)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Lưu báo cáo cuối ca
        </button>
        {!selectedReporterId && (
          <p className="mt-2 text-right text-xs text-[var(--color-text-muted)]">
            Vui lòng chọn người báo cáo để lưu
          </p>
        )}
      </div>
    </div>
  );
}
