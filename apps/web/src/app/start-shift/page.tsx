"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Plus, Save, Ship, Star, Users, X } from "lucide-react";
import { VesselList } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getActiveVessels } from "@/lib/personnelService";
import EmployeeSelector from "@/components/personnel/EmployeeSelector";
import {
  Badge,
  Button,
  Card,
  ChipPicker,
  SectionLabel,
} from "@/components/cosmic";

const SHIFTS = ["Ca 01", "Ca 02", "Ca 03", "Hành chánh", "Ca ngày"];

const DEPARTMENTS = [
  {
    id: "tong_hop",
    name: "Bộ phận Tổng hợp",
    positions: ["Tổng hợp số liệu", "Báo cáo số liệu"],
  },
  {
    id: "thu_tuc",
    name: "Bộ phận Thủ tục",
    positions: [
      "Hành chánh",
      "Trực ca",
      "Trực VSL",
      "Trực Hotline",
      "Tăng cường cổng",
      "Nghỉ bù",
      "Nghỉ phép",
    ],
  },
  {
    id: "bai_cont",
    name: "Bộ phận Bãi cont",
    positions: [
      "Phụ trách chung",
      "Hàng nhập",
      "Hàng rỗng",
      "Kiểm cổng",
      "Gate In",
      "Gate Out",
      "CFS/Salan",
      "Kế hoạch Bãi",
      "Checkpoint",
      "Tăng cường C4",
      "Nghỉ bù",
      "Nghỉ phép",
    ],
  },
  {
    id: "dieu_hanh",
    name: "Bộ phận Điều hành",
    positions: ["Trực ca", "Tăng cường bãi", "Nghỉ bù", "Nghỉ phép"],
  },
];

type AssignmentMap = Record<string, Record<string, number[]>>;

interface TallyAssignment {
  vesselId: number;
  employeeIds: number[];
}

export default function StartShiftReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("Ca 01");
  const [activeTab, setActiveTab] = useState("tong_hop");
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [tallyAssignments, setTallyAssignments] = useState<TallyAssignment[]>([
    { vesselId: 0, employeeIds: [] },
  ]);
  const [vessels, setVessels] = useState<VesselList[]>([]);
  const [captainId, setCaptainId] = useState<number[]>([]);
  const [viceCaptainId, setViceCaptainId] = useState<number[]>([]);
  const [yardManagerId, setYardManagerId] = useState<number[]>([]);

  useEffect(() => {
    getActiveVessels().then(setVessels);
  }, []);

  const handleAssignmentChange = (
    deptId: string,
    position: string,
    ids: number[],
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [deptId]: { ...prev[deptId], [position]: ids },
    }));
  };

  const handleTallyChange = (
    index: number,
    field: "vesselId" | "employeeIds",
    value: number | number[],
  ) => {
    const newTally = [...tallyAssignments];
    newTally[index] = { ...newTally[index], [field]: value };
    setTallyAssignments(newTally);
  };

  const addTallyRow = () => {
    setTallyAssignments([...tallyAssignments, { vesselId: 0, employeeIds: [] }]);
  };

  const removeTallyRow = (index: number) => {
    setTallyAssignments(tallyAssignments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const report = {
      date,
      shift,
      leaders: {
        captain: captainId,
        viceCaptain: viceCaptainId,
        yardManager: yardManagerId,
      },
      departments: assignments,
      tally: tallyAssignments,
      created_at: new Date(),
    };
    logger.info("Submitting start shift report", report);
    alert("Đã lưu báo cáo (Demo log console)");
  };

  // Counts for footer summary
  const totalAssigned =
    captainId.length +
    viceCaptainId.length +
    yardManagerId.length +
    Object.values(assignments).reduce(
      (sum, dept) =>
        sum + Object.values(dept).reduce((s, ids) => s + ids.length, 0),
      0,
    );
  const tallyVesselCount = tallyAssignments.filter((t) => t.vesselId > 0).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24">
      {/* Session info */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Thông tin ca</SectionLabel>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="date-input"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Ngày
            </label>
            <input
              id="date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <ChipPicker
            label="Ca làm việc"
            value={shift}
            onChange={setShift}
            options={SHIFTS.map((s) => ({ value: s, label: s }))}
            columns={5}
            size="sm"
            required
          />
        </div>
      </Card>

      {/* Leaders */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
          <SectionLabel className="!mb-0">Ban chỉ huy</SectionLabel>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <EmployeeSelector
            label="Đội trưởng"
            department="Ban chỉ huy"
            selectedIds={captainId}
            onChange={setCaptainId}
            placeholder="Chọn"
            mode="single"
          />
          <EmployeeSelector
            label="Đội phó"
            department="Ban chỉ huy"
            selectedIds={viceCaptainId}
            onChange={setViceCaptainId}
            placeholder="Chọn"
            mode="single"
          />
          <EmployeeSelector
            label="Trưởng bãi"
            department="Ban chỉ huy"
            selectedIds={yardManagerId}
            onChange={setYardManagerId}
            placeholder="Chọn"
            mode="single"
          />
        </div>
      </Card>

      {/* Department tabs */}
      <Card noPad>
        <div className="flex overflow-x-auto border-b border-[var(--color-border)]">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setActiveTab(dept.id)}
              className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === dept.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-[var(--color-accent-hover)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        <div className="p-5">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.id}
              className={activeTab === dept.id ? "block" : "hidden"}
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                {dept.positions.map((pos) => (
                  <EmployeeSelector
                    key={pos}
                    label={pos}
                    department={dept.name.replace("Bộ phận ", "")}
                    shift={
                      ["Hành chánh", "Văn phòng"].includes(pos)
                        ? "Hành chánh"
                        : shift
                    }
                    selectedIds={assignments[dept.id]?.[pos] || []}
                    onChange={(ids) => handleAssignmentChange(dept.id, pos, ids)}
                  />
                ))}
              </div>

              {dept.id === "bai_cont" && (
                <div className="mt-8 border-t border-[var(--color-border)] pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ship
                        className="h-4 w-4 text-[var(--color-accent)]"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Tally Tàu &amp; Tác nghiệp Tàu
                      </h3>
                      {tallyVesselCount > 0 && (
                        <Badge tone="accent">{tallyVesselCount} tàu</Badge>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Plus}
                      onClick={addTallyRow}
                    >
                      Thêm tàu
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {tallyAssignments.map((tally, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                            Tàu #{idx + 1}
                          </span>
                          {idx > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={X}
                              onClick={() => removeTallyRow(idx)}
                              aria-label="Xóa tàu"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <label
                              htmlFor={`tally-vessel-${idx}`}
                              className="mb-1 block text-xs text-[var(--color-text-muted)]"
                            >
                              Chọn Tàu
                            </label>
                            <select
                              id={`tally-vessel-${idx}`}
                              value={tally.vesselId}
                              onChange={(e) =>
                                handleTallyChange(
                                  idx,
                                  "vesselId",
                                  Number(e.target.value),
                                )
                              }
                              className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                            >
                              <option value={0}>-- Chọn tàu --</option>
                              {vessels.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <EmployeeSelector
                              label="Nhân viên Tally"
                              department="Bãi cont"
                              selectedIds={tally.employeeIds}
                              onChange={(ids) =>
                                handleTallyChange(idx, "employeeIds", ids)
                              }
                              placeholder="Chọn nhân viên Tally"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Sticky submit footer */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span>{shift}</span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span>{date}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{totalAssigned} nhân viên đã phân công</span>
            {tallyVesselCount > 0 && (
              <>
                <span>·</span>
                <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tallyVesselCount} tàu tally</span>
              </>
            )}
          </div>
        </div>
        <Button variant="primary" size="lg" icon={Save} onClick={handleSubmit}>
          Lưu báo cáo đầu ca
        </Button>
      </div>
    </div>
  );
}
