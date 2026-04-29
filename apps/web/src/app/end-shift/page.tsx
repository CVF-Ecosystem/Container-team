"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, BarChart3, CalendarDays, FileText, Save, Ship, TrendingUp, User } from "lucide-react";
import { Employee } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllEmployees } from "@/lib/personnelService";
import { mockHangMucCongViec } from "@/data/mockData";
import { getVesselReports } from "@/services/vesselService";
import {
  Badge,
  Button,
  Card,
  ChipPicker,
  KPICard,
  SectionLabel,
} from "@/components/cosmic";

const SHIFT_HOURS: Record<string, number> = {
  "Ca 01": 8, "Ca 02": 8, "Ca 03": 8,
  "Hành chánh": 9, "Ca ngày": 12,
};

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
  const [incidents, setIncidents] = useState(0);
  const [incidentDesc, setIncidentDesc] = useState("");
  const [vesselKpis, setVesselKpis] = useState({
    bocTeu: 0, doTeu: 0, totalTeu: 0, teuPerHour: 0,
  });

  const loadVesselKpis = useCallback(async () => {
    try {
      const reports = await getVesselReports({ startDate: date, endDate: date });
      const bocTeu = reports.reduce((s, r) => s + (r.xuat_tau ?? 0), 0);
      const doTeu  = reports.reduce((s, r) => s + (r.nhap_tau  ?? 0), 0);
      const totalTeu = reports.reduce((s, r) => s + (r.teus ?? 0), 0);
      const totalHours = reports.reduce((s, r) => s + (r.working_hours ?? 0), 0);
      const elapsed = totalHours > 0 ? totalHours : (SHIFT_HOURS[shift] ?? 8);
      const teuPerHour = elapsed > 0 ? Math.round((totalTeu / elapsed) * 10) / 10 : 0;
      setVesselKpis({ bocTeu, doTeu, totalTeu, teuPerHour });
    } catch {
      // IndexedDB may not be populated
    }
  }, [date, shift]);

  useEffect(() => {
    void loadVesselKpis();
    const timer = window.setInterval(() => void loadVesselKpis(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadVesselKpis]);

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
      incidents: incidents > 0 ? { count: incidents, description: incidentDesc } : null,
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
    <div className="space-y-5 pb-24">
      {/* Live vessel KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard icon={Ship}       label="TEU bốc"         value={String(vesselKpis.bocTeu)}    tone="success" hint="Xuất tàu" />
        <KPICard icon={Ship}       label="TEU dỡ"          value={String(vesselKpis.doTeu)}     tone="danger"  hint="Nhập tàu" />
        <KPICard icon={BarChart3}  label="Tổng TEU"        value={String(vesselKpis.totalTeu)}  tone="accent"  hint="Trong ngày" />
        <KPICard icon={TrendingUp} label="Năng suất TEU/h" value={String(vesselKpis.teuPerHour)} tone="info"   hint="Tự động tính" />
      </div>

      {/* Time + shift */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4 text-[var(--color-accent)]"
            aria-hidden="true"
          />
          <SectionLabel className="!mb-0">Thời gian</SectionLabel>
        </div>
        <div className="space-y-4">
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
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm md:max-w-xs"
            />
          </div>
          <ChipPicker
            label="Ca làm việc"
            value={shift}
            onChange={(v) => {
              setShift(v);
              setSelectedReporterId(null);
            }}
            options={VALID_SHIFTS.map((s) => ({ value: s, label: s }))}
            columns={5}
            size="sm"
            required
          />
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
          <ChipPicker
            label="Bộ phận"
            value={selectedDept}
            onChange={(v) => {
              setSelectedDept(v);
              setSelectedReporterId(null);
            }}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            columns={5}
            size="sm"
            required
          />

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

      {/* Incidents */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Sự cố trong ca</SectionLabel>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="incidents-count"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Số sự cố
            </label>
            <input
              id="incidents-count"
              type="number"
              min={0}
              max={99}
              value={incidents}
              onChange={(e) => setIncidents(Math.max(0, Number(e.target.value)))}
              className="cvf-input w-28 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {incidents > 0 && (
            <div>
              <label
                htmlFor="incidents-desc"
                className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Mô tả sự cố
              </label>
              <textarea
                id="incidents-desc"
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                rows={3}
                placeholder="Mô tả ngắn gọn các sự cố xảy ra trong ca..."
                className="cvf-input w-full resize-none rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </Card>

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
