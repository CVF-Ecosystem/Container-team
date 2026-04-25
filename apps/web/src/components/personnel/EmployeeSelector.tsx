"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Employee } from "@/lib/db";
import { getAllEmployees } from "@/lib/personnelService";

interface EmployeeSelectorProps {
  label: string;
  department?: string; // Filter by department if provided
  shift?: string; // Filter by shift if provided
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  description?: string; // e.g. "Chọn nhiều người"
  mode?: "single" | "multiple";
}

export default function EmployeeSelector({
  label,
  department,
  shift,
  selectedIds,
  onChange,
  placeholder = "Chọn nhân viên",
  description,
  mode = "multiple",
}: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [allEmployees, setAllEmployees] = useState<Map<number, Employee>>(
    new Map()
  );

  const loadEmployees = useCallback(async () => {
    const all = (await getAllEmployees()).filter((e) => e.active);
    let list = all;

    if (department) {
      const byDepartment = all.filter((e) =>
        sameGroup(e.department, department)
      );
      if (byDepartment.length > 0) list = byDepartment;
    }

    if (shift) {
      const byShift = list.filter((e) => sameShift(e.shift, shift));
      if (byShift.length > 0) list = byShift;
    }

    setEmployees(list);
  }, [department, shift]);

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen, loadEmployees]);

  // Also load initially to show names of selected IDs
  // Optimization: Load all active once in parent? Or just load all here.
  // For simplicity, let's load all employees once to get names for tags

  useEffect(() => {
    getAllEmployees().then((list) => {
      const map = new Map(list.map((e) => [e.id!, e]));
      setAllEmployees(map);
    });
  }, []);

  const filteredList = useMemo(() => {
    const query = normalizeText(searchQuery);
    return employees
      .filter((e) => {
        if (!query) return true;
        return (
          normalizeText(e.name).includes(query) ||
          normalizeText(e.mscd).includes(query) ||
          normalizeText(e.department).includes(query)
        );
      })
      .sort((a, b) => {
        const aSelected = selectedIds.includes(a.id ?? -1) ? 0 : 1;
        const bSelected = selectedIds.includes(b.id ?? -1) ? 0 : 1;
        if (aSelected !== bSelected) return aSelected - bSelected;
        return a.name.localeCompare(b.name, "vi");
      });
  }, [employees, searchQuery, selectedIds]);

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else if (mode === "single") {
      onChange([id]);
      setIsOpen(false);
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Get selected employee objects
  const selectedEmployees = selectedIds
    .map((id) => allEmployees.get(id))
    .filter((e): e is Employee => !!e);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
        {label}
        {description && (
          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
            ({description})
          </span>
        )}
      </label>

      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/55 px-2 py-1.5">
        {/* Selected Tags */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selectedEmployees.map((emp) => (
            <span
              key={emp.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-dim)] px-2 py-1 text-sm text-blue-100"
            >
              <span className="truncate">{emp.name}</span>
              <button
                type="button"
                onClick={() => handleToggle(emp.id!)}
                className="shrink-0 text-blue-300 hover:text-white"
                aria-label={`Bỏ chọn ${emp.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="shrink-0 rounded-md bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-accent-dim)] hover:text-[var(--color-text-primary)]"
        >
          {selectedIds.length === 0 ? `+ ${placeholder}` : mode === "single" ? "Đổi" : "+ Thêm"}
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
            {/* Header */}
            <div className="z-10 flex items-center justify-between rounded-t-xl border-b border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                {label}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {department ? `${department}` : "Tất cả bộ phận"}
                  {shift ? ` • ${shift}` : ""}
                  {mode === "single" ? " • Chọn 1 người" : " • Có thể chọn nhiều người"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <input
                type="text"
                placeholder="Tìm tên, mã NV hoặc bộ phận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
              {filteredList.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  Không tìm thấy nhân viên nào.
                  <br />
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredList.map((emp) => {
                    const isSelected = selectedIds.includes(emp.id!);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleToggle(emp.id!)}
                        className={`
                                                    flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all
                                                    ${
                                                      isSelected
                                                        ? "border border-[var(--color-accent)] bg-[var(--color-accent-dim)]"
                                                        : "border border-[var(--color-border)] bg-[var(--color-elevated)]/45 hover:bg-[var(--color-elevated)]"
                                                    }
                                                `}
                      >
                        <div className="flex flex-col">
                          <span
                            className={`font-medium ${
                              isSelected ? "text-blue-200" : "text-[var(--color-text-primary)]"
                            }`}
                          >
                            {emp.name}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {emp.mscd} • {emp.department}
                            {emp.shift ? ` • ${emp.shift}` : ""}
                          </span>
                        </div>
                        <div
                          className={`
                                                    flex h-5 w-5 items-center justify-center rounded border
                                                    ${
                                                      isSelected
                                                        ? "bg-blue-500 border-blue-500"
                                                        : "border-[var(--color-text-muted)]"
                                                    }
                                                `}
                        >
                          {isSelected && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between rounded-b-xl border-t border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Đã chọn: {selectedIds.length}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sameGroup(actual: string, expected: string): boolean {
  const a = normalizeText(actual);
  const e = normalizeText(expected);
  return a === e || a.includes(e) || e.includes(a);
}

function sameShift(actual: string, expected: string): boolean {
  const a = normalizeText(actual).replace(/\b0(\d)\b/g, "$1");
  const e = normalizeText(expected).replace(/\b0(\d)\b/g, "$1");
  return a === e || a.includes(e) || e.includes(a);
}
