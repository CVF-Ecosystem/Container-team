"use client";

import { useState, useEffect, useMemo } from "react";
import { CalendarDays, FileText, Save, User } from "lucide-react";
import { Employee } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllEmployees } from "@/lib/personnelService";
import { mockHangMucCongViec } from "@/data/mockData";
import { Badge, Button, Card, SectionLabel } from "@/components/cosmic";

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
  const [selectedReporterId, setSelectedReporterId] = useState<number | null>(
    null,
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workItems, setWorkItems] = useState<Record<string, string | number>>(
    {},
  );
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
      if (shift === "Hành chánh" || shift === "Ca ngày")
        return e.shift === shift;
      return e.shift.includes(shiftCode);
    });

    return list.sort((a, b) => {
      const getScore = (s: string) => {
        const lower = s.toLowerCase();
        if (lower.includes("trưởng ca") || lower.includes("đội trưởng"))
          return 3;
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
      reporter: {
        id: reporter?.id,
        name: reporter?.name,
        department: selectedDept,
        shift,
      },
      workItems,
      notes,
      created_at: new Date(),
    };
    logger.info("Submitting end shift report", report);
    alert("Đã lưu báo cáo (Demo log)");
  };

  const completedItems = currentWorkItems.filter(
    (item) =>
      workItems[item.id] !== undefined &&
      workItems[item.id] !== "" &&
      workItems[item.id] !== 0,
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      {/* Time + shift */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4 text-[var(--color-accent)]"
            aria-hidden="true"
          />
          <SectionLabel className="!mb-0">Thời gian</SectionLabel>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="date-input"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Ngày báo cáo
            </label>
            <input
              id="date-input"
              type="date"
              aria-label="Chọn ngày báo cáo"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="shift-select"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Ca làm việc
            </label>
            <select
              id="shift-select"
              aria-label="Chọn ca làm việc"
              value={shift}
              onChange={(e) => {
                setShift(e.target.value);
                setSelectedReporterId(null);
              }}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            >
              {VALID_SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Reporter */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <User
            className="h-4 w-4 text-[var(--color-info)]"
            aria-hidden="true"
          />
          <SectionLabel className="!mb-0">Người lập báo cáo</SectionLabel>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="dept-select"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Bộ phận
            </label>
            <select
              id="dept-select"
              aria-label="Chọn bộ phận"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedReporterId(null);
              }}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-- Chọn bộ phận --</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="employee-select"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Họ và tên
            </label>
            <select
              id="employee-select"
              aria-label="Chọn nhân viên lập báo cáo"
              value={selectedReporterId || ""}
              onChange={(e) => setSelectedReporterId(Number(e.target.value))}
              disabled={!selectedDept}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Danh sách lọc theo{" "}
              <span className="font-medium text-[var(--color-text-secondary)]">
                {shift}
              </span>{" "}
              — ưu tiên Trưởng ca / Phó ca.
            </p>
          </div>
        </div>
      </Card>

      {/* Work items */}
      {selectedDept && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText
                className="h-4 w-4 text-[var(--color-warning)]"
                aria-hidden="true"
              />
              <SectionLabel className="!mb-0">
                Công việc trong ca — {selectedDept}
              </SectionLabel>
            </div>
            {currentWorkItems.length > 0 && (
              <Badge
                tone={completedItems === currentWorkItems.length ? "success" : "warning"}
              >
                {completedItems}/{currentWorkItems.length} hạng mục
              </Badge>
            )}
          </div>

          <div className="space-y-5">
            {currentWorkItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {currentWorkItems.map((item) => (
                  <div
                    key={item.id}
                    className={item.LoaiNhapLieu === "Text" ? "md:col-span-2" : ""}
                  >
                    <label
                      htmlFor={`work-${item.id}`}
                      className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
                    >
                      {item.TenHangMuc}
                    </label>
                    {item.LoaiNhapLieu === "Text" ? (
                      <textarea
                        id={`work-${item.id}`}
                        className="cvf-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Nhập nội dung..."
                        value={workItems[item.id] || ""}
                        onChange={(e) =>
                          setWorkItems({
                            ...workItems,
                            [item.id]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <input
                        id={`work-${item.id}`}
                        type="number"
                        className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                        placeholder="0"
                        value={workItems[item.id] || ""}
                        onChange={(e) =>
                          setWorkItems({
                            ...workItems,
                            [item.id]: Number(e.target.value),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-[var(--color-text-muted)]">
                Chưa có hạng mục công việc mẫu cho bộ phận này.
              </p>
            )}

            <div className="border-t border-[var(--color-border)] pt-5">
              <label
                htmlFor="notes-input"
                className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Ghi chú thêm
              </label>
              <textarea
                id="notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="cvf-input w-full resize-none rounded-lg px-3 py-2 text-sm"
                placeholder="Ghi chú quan trọng cần lưu ý..."
              />
            </div>
          </div>
        </Card>
      )}

      {/* Sticky submit footer */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            Kết thúc {shift}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {selectedReporterId
              ? `Người lập: ${employees.find((e) => e.id === selectedReporterId)?.name || "—"}`
              : "Vui lòng chọn người báo cáo để lưu"}
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          icon={Save}
          onClick={handleSubmit}
          disabled={!selectedReporterId}
        >
          Lưu báo cáo cuối ca
        </Button>
      </div>
    </div>
  );
}
