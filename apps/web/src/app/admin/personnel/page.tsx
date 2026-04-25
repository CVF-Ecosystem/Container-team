"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "@e965/xlsx";
import {
  parseEmployeeExcel,
  importEmployees,
  parseVesselExcel,
} from "@/lib/personnelParser";
import {
  getAllEmployees,
  addVessel,
  updateVessel,
  deleteVessels,
  importVesselList,
  toggleVesselStatus,
  addEmployee,
  updateEmployee,
  deleteEmployees,
} from "@/lib/personnelService";
import { Employee, VesselList, db } from "@/lib/db";
import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  Ship,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

const DEPARTMENTS = [
  "Tổng hợp",
  "Thủ tục",
  "Bãi cont",
  "Điều hành",
  "Lãnh đạo",
  "Ban chỉ huy",
];
const SHIFTS = [
  "Hành chánh",
  "Ca 01",
  "Ca 02",
  "Ca 03",
  "Ca ngày",
  "Văn phòng",
  "Trưởng ca 01",
  "Phó ca 01",
  "Trưởng ca 02",
  "Phó ca 02",
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Thao tác thất bại";
}

export default function PersonnelAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vessels, setVessels] = useState<VesselList[]>([]);

  const [activeTab, setActiveTab] = useState<"employees" | "vessels">("employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);
  const [selectedVesselIds, setSelectedVesselIds] = useState<number[]>([]);

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    mscd: "",
    name: "",
    department: "Thủ tục",
    shift: "Hành chánh",
  });

  const [isVesselModalOpen, setIsVesselModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<VesselList | null>(null);
  const [vesselFormName, setVesselFormName] = useState("");

  const loadData = useCallback(async () => {
    const emps = await getAllEmployees();
    setEmployees(emps);
    const vsls = await db.vessels.toArray();
    setVessels(vsls);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleEmpSubmit = async () => {
    try {
      if (editingEmp) {
        await updateEmployee(editingEmp.id!, {
          mscd: empForm.mscd,
          name: empForm.name,
          department: empForm.department,
          shift: empForm.shift,
        });
        showMsg("success", "Đã cập nhật nhân viên");
      } else {
        await addEmployee({
          mscd: empForm.mscd,
          name: empForm.name,
          department: empForm.department,
          shift: empForm.shift,
          active: true,
        });
        showMsg("success", "Đã thêm nhân viên mới");
      }
      closeEmpModal();
      loadData();
    } catch (err: unknown) {
      showMsg("error", getErrorMessage(err));
    }
  };

  const openEmpModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmp(emp);
      setEmpForm({ mscd: emp.mscd, name: emp.name, department: emp.department, shift: emp.shift });
    } else {
      setEditingEmp(null);
      setEmpForm({ mscd: "", name: "", department: "Thủ tục", shift: "Hành chánh" });
    }
    setIsEmpModalOpen(true);
  };

  const closeEmpModal = () => {
    setIsEmpModalOpen(false);
    setEditingEmp(null);
  };

  const handleEmpDelete = async (ids: number[]) => {
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} nhân viên?`)) return;
    try {
      await deleteEmployees(ids);
      setSelectedEmpIds([]);
      loadData();
      showMsg("success", `Đã xóa ${ids.length} nhân viên`);
    } catch (err: unknown) {
      showMsg("error", getErrorMessage(err));
    }
  };

  const handleEmpImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportWarnings([]);
    setMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const { data, warnings } = parseEmployeeExcel(wb);
      if (warnings.length > 0) setImportWarnings(warnings);
      if (data.length === 0) {
        showMsg("error", "Không tìm thấy dữ liệu nhân viên hợp lệ.");
        e.target.value = "";
        return;
      }
      const res = await importEmployees(data);
      loadData();
      let resultMsg = `Import thành công: Mới ${res.imported}, Cập nhật ${res.updated}.`;
      if (warnings.length > 0) resultMsg += ` (Xem cảnh báo bên dưới)`;
      showMsg("success", resultMsg);
      e.target.value = "";
    } catch (err: unknown) {
      showMsg("error", "Lỗi import: " + getErrorMessage(err));
    }
  };

  const handleVesselSubmit = async () => {
    try {
      if (!vesselFormName.trim()) return;
      if (editingVessel) {
        await updateVessel(editingVessel.id!, vesselFormName);
        showMsg("success", "Đã cập nhật tên tàu");
      } else {
        await addVessel(vesselFormName);
        showMsg("success", "Đã thêm tàu mới");
      }
      closeVesselModal();
      loadData();
    } catch (err: unknown) {
      showMsg("error", getErrorMessage(err));
    }
  };

  const openVesselModal = (vsl?: VesselList) => {
    if (vsl) {
      setEditingVessel(vsl);
      setVesselFormName(vsl.name);
    } else {
      setEditingVessel(null);
      setVesselFormName("");
    }
    setIsVesselModalOpen(true);
  };

  const closeVesselModal = () => {
    setIsVesselModalOpen(false);
    setEditingVessel(null);
  };

  const handleVesselDelete = async (ids: number[]) => {
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} tàu?`)) return;
    try {
      await deleteVessels(ids);
      setSelectedVesselIds([]);
      loadData();
      showMsg("success", `Đã xóa ${ids.length} tàu`);
    } catch (err: unknown) {
      showMsg("error", getErrorMessage(err));
    }
  };

  const handleVesselImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const names = parseVesselExcel(wb);
      const count = await importVesselList(names);
      loadData();
      showMsg("success", `Đã import ${count} tàu mới`);
      e.target.value = "";
    } catch (err: unknown) {
      showMsg("error", "Lỗi import: " + getErrorMessage(err));
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.mscd.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVessels = vessels.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmpSelection = (id: number) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleVesselSelection = (id: number) => {
    setSelectedVesselIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllEmp = () => {
    if (selectedEmpIds.length === filteredEmployees.length) setSelectedEmpIds([]);
    else setSelectedEmpIds(filteredEmployees.map((e) => e.id!));
  };

  const selectAllVessel = () => {
    if (selectedVesselIds.length === filteredVessels.length) setSelectedVesselIds([]);
    else setSelectedVesselIds(filteredVessels.map((v) => v.id!));
  };

  const downloadTemplate = () => {
    const data = [
      ["STT", "Mã NV", "Họ và tên", "Bộ phận", "Thời gian làm việc", "Ghi chú"],
      [1, "NV01", "Nguyen Van A", "Thủ tục", "Ca 1", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_NhanVien.xlsx");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "employees"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          Nhân Viên ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vessels")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "vessels"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Ship className="h-4 w-4" aria-hidden="true" />
          Danh Sách Tàu ({vessels.length})
        </button>
      </div>

      {/* Notification */}
      {msg && (
        <div className={`rounded-xl px-5 py-4 text-sm border flex items-center justify-between ${
          msg.type === "success"
            ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]"
            : "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]"
        }`}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Đóng thông báo" className="ml-4 hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Import Warnings */}
      {importWarnings.length > 0 && (
        <div className="rounded-xl p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-warning)] text-sm max-h-40 overflow-y-auto">
          <div className="font-semibold mb-2 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Lưu ý khi Import ({importWarnings.length}):
            </span>
            <button type="button" onClick={() => setImportWarnings([])} className="text-xs underline hover:opacity-70 transition-opacity">
              Đóng
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Main Table Card */}
      <div className="cvf-card rounded-xl overflow-hidden flex flex-col min-h-96">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-wrap gap-3 justify-between items-center bg-[var(--color-elevated)]/20">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cvf-input rounded-lg pl-9 pr-4 py-2 text-sm w-56"
            />
          </div>

          <div className="flex gap-2 items-center">
            {activeTab === "employees" && (
              <>
                {selectedEmpIds.length > 0 ? (
                  <>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Đã chọn: {selectedEmpIds.length}
                    </span>
                    {selectedEmpIds.length === 1 && (
                      <button
                        type="button"
                        onClick={() => openEmpModal(employees.find((e) => e.id === selectedEmpIds[0]))}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white transition-colors bg-[var(--color-warning)]/80 hover:bg-[var(--color-warning)]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Sửa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEmpDelete(selectedEmpIds)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white transition-colors bg-[var(--color-danger)] hover:opacity-85"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Xóa
                    </button>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors bg-[var(--color-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]">
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      Import Excel
                      <input id="emp-upload" type="file" hidden accept=".xlsx" aria-label="Import danh sách nhân viên từ Excel" onChange={handleEmpImport} />
                    </label>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline transition-colors"
                    >
                      Mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => openEmpModal()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-accent)] hover:opacity-85"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Thêm Nhân Viên
                    </button>
                  </>
                )}
              </>
            )}

            {activeTab === "vessels" && (
              <>
                {selectedVesselIds.length > 0 ? (
                  <>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Đã chọn: {selectedVesselIds.length}
                    </span>
                    {selectedVesselIds.length === 1 && (
                      <button
                        type="button"
                        onClick={() => openVesselModal(vessels.find((v) => v.id === selectedVesselIds[0]))}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white transition-colors bg-[var(--color-warning)]/80 hover:bg-[var(--color-warning)]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Sửa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleVesselDelete(selectedVesselIds)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white transition-colors bg-[var(--color-danger)] hover:opacity-85"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Xóa
                    </button>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors bg-[var(--color-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]">
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      Import List
                      <input id="vsl-upload" type="file" hidden accept=".xlsx" aria-label="Import danh sách tàu từ Excel" onChange={handleVesselImport} />
                    </label>
                    <button
                      type="button"
                      onClick={() => openVesselModal()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-accent)] hover:opacity-85"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Thêm Tàu
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {activeTab === "employees" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]/40">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      title="Chọn tất cả nhân viên"
                      onChange={selectAllEmp}
                      checked={selectedEmpIds.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                      className="accent-[var(--color-accent)] rounded"
                    />
                  </th>
                  {["Mã NV", "Họ và Tên", "Bộ phận", "Ca", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={`border-t border-[var(--color-border)] transition-colors group ${
                      selectedEmpIds.includes(emp.id!) ? "bg-[var(--color-accent-dim)]" : "hover:bg-[var(--color-elevated)]/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        title="Chọn nhân viên"
                        checked={selectedEmpIds.includes(emp.id!)}
                        onChange={() => toggleEmpSelection(emp.id!)}
                        className="accent-[var(--color-accent)] rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--color-accent)] text-xs">{emp.mscd}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{emp.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{emp.department}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{emp.shift}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEmpModal(emp)}
                          aria-label={`Sửa nhân viên ${emp.name}`}
                          className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-accent)] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmpDelete([emp.id!])}
                          aria-label={`Xóa nhân viên ${emp.name}`}
                          className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-danger)] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]/40">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      title="Chọn tất cả tàu"
                      onChange={selectAllVessel}
                      checked={selectedVesselIds.length > 0 && selectedVesselIds.length === filteredVessels.length}
                      className="accent-[var(--color-accent)] rounded"
                    />
                  </th>
                  {["Tên Tàu", "Trạng thái", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVessels.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-t border-[var(--color-border)] transition-colors group ${
                      selectedVesselIds.includes(v.id!) ? "bg-[var(--color-accent-dim)]" : "hover:bg-[var(--color-elevated)]/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        title="Chọn tàu"
                        checked={selectedVesselIds.includes(v.id!)}
                        onChange={() => toggleVesselSelection(v.id!)}
                        className="accent-[var(--color-accent)] rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{v.name}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleVesselStatus(v.id!).then(loadData)}
                        className={`px-2.5 py-0.5 text-xs rounded-full font-medium border transition-colors ${
                          v.active
                            ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20 hover:bg-[var(--color-success)]/20"
                            : "bg-[var(--color-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {v.active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openVesselModal(v)}
                          aria-label={`Sửa tàu ${v.name}`}
                          className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-accent)] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVesselDelete([v.id!])}
                          aria-label={`Xóa tàu ${v.name}`}
                          className="p-1.5 rounded hover:bg-[var(--color-elevated)] text-[var(--color-danger)] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="cvf-card rounded-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              {editingEmp ? "Sửa Nhân Viên" : "Thêm Nhân Viên Mới"}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="emp-mscd" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Mã số cố định</label>
                <input
                  id="emp-mscd"
                  type="text"
                  value={empForm.mscd}
                  onChange={(e) => setEmpForm({ ...empForm, mscd: e.target.value })}
                  className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="VD: 1234"
                  readOnly={!!editingEmp}
                />
              </div>
              <div>
                <label htmlFor="emp-name" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Họ và tên</label>
                <input
                  id="emp-name"
                  type="text"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label htmlFor="emp-department" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Bộ phận</label>
                <select
                  id="emp-department"
                  title="Chọn bộ phận"
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="emp-shift" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ca làm việc (mặc định)</label>
                <select
                  id="emp-shift"
                  title="Chọn ca làm việc"
                  value={empForm.shift}
                  onChange={(e) => setEmpForm({ ...empForm, shift: e.target.value })}
                  className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEmpModal}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleEmpSubmit}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors bg-[var(--color-accent)] hover:opacity-85"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vessel Modal */}
      {isVesselModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="cvf-card rounded-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
              <Ship className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              {editingVessel ? "Sửa Tên Tàu" : "Thêm Tàu Mới"}
            </h2>
            <div className="mb-6">
              <label htmlFor="vessel-name-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tên Tàu</label>
              <input
                id="vessel-name-input"
                type="text"
                value={vesselFormName}
                onChange={(e) => setVesselFormName(e.target.value)}
                className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                placeholder="VD: MV PACIFIC STAR"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeVesselModal}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleVesselSubmit}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors bg-[var(--color-accent)] hover:opacity-85"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
