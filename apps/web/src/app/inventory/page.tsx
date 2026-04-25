"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Save, Upload, X } from "lucide-react";
import { db, getCurrentYear, InventorySettings, InventorySnapshot } from "@/lib/db";
import {
  getInventorySettings,
  saveInventorySettings,
  calculateDailyInventory,
  DailyInventory,
} from "@/lib/inventoryService";
import {
  importInventorySnapshot,
  getInventorySnapshots,
  getSnapshotDays,
} from "@/lib/inventorySnapshotParser";

export default function InventoryPage() {
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tempCapacity, setTempCapacity] = useState("");
  const [tempInitialStock, setTempInitialStock] = useState("");
  const [tempInitialDate, setTempInitialDate] = useState("");

  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(0);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

  const [inventoryData, setInventoryData] = useState<DailyInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [snapshots, setSnapshots] = useState<{ ton_cu?: InventorySnapshot; ton_moi?: InventorySnapshot }>({});
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [tonCuDate, setTonCuDate] = useState(new Date().toISOString().split("T")[0]);
  const [tonMoiDate, setTonMoiDate] = useState(new Date().toISOString().split("T")[0]);
  const tonCuRef = useRef<HTMLInputElement>(null);
  const tonMoiRef = useRef<HTMLInputElement>(null);

  const availableYears = useLiveQuery(async () => {
    const years = await db.daily_data.orderBy("year").uniqueKeys();
    return (years as number[]).sort((a, b) => b - a);
  }, []);

  const loadSettings = useCallback(async () => {
    const s = await getInventorySettings();
    if (s) {
      setSettings(s);
      setTempCapacity(s.capacity.toString());
      setTempInitialStock(s.initial_stock.toString());
      setTempInitialDate(s.initial_date);
    } else {
      setEditMode(true);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calculateDailyInventory(selectedYear, selectedMonth);
      setInventoryData(data);
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
    setIsLoading(false);
  }, [selectedYear, selectedMonth]);

  const loadAvailableDays = useCallback(async () => {
    const days = await getSnapshotDays(selectedYear, selectedMonth);
    setAvailableDays(days);
    setSelectedDay(days.length > 0 ? days[days.length - 1] : 0);
  }, [selectedYear, selectedMonth]);

  const loadSnapshots = useCallback(async () => {
    if (selectedDay === 0) { setSnapshots({}); return; }
    const s = await getInventorySnapshots(selectedYear, selectedMonth, selectedDay);
    setSnapshots(s);
  }, [selectedYear, selectedMonth, selectedDay]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadInventory(); }, [loadInventory, settings]);
  useEffect(() => { loadAvailableDays(); }, [loadAvailableDays]);
  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  const handleSaveSettings = async () => {
    await saveInventorySettings({
      capacity: parseInt(tempCapacity) || 0,
      initial_stock: parseInt(tempInitialStock) || 0,
      initial_date: tempInitialDate || new Date().toISOString().split("T")[0],
    });
    await loadSettings();
    setEditMode(false);
  };

  const handleSnapshotImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "ton_cu" | "ton_moi"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const date = type === "ton_cu" ? tonCuDate : tonMoiDate;
    setSnapshotMessage("Đang import...");
    const result = await importInventorySnapshot(file, type, date);
    setSnapshotMessage(result.message);
    if (result.success) { await loadAvailableDays(); }
    e.target.value = "";
  };

  const summary = useMemo(() => {
    if (inventoryData.length === 0) return null;
    const last = inventoryData[inventoryData.length - 1];
    const totalIn = inventoryData.reduce((sum, d) => sum + d.total_in, 0);
    const totalOut = inventoryData.reduce((sum, d) => sum + d.total_out, 0);
    return { latestStock: last.stock_current, capacityPercent: last.capacity_percent, totalIn, totalOut, netChange: totalIn - totalOut };
  }, [inventoryData]);

  const getCapacityBadge = (percent: number) => {
    if (percent >= 100) return "text-[var(--color-danger)] bg-[var(--color-danger)]/10";
    if (percent >= 90) return "text-[var(--color-warning)] bg-[var(--color-warning)]/10";
    if (percent >= 80) return "text-[var(--color-warning)]/70 bg-[var(--color-warning)]/5";
    return "text-[var(--color-success)] bg-[var(--color-success)]/10";
  };

  const snapshotRows = useMemo(() => {
    const cu = snapshots.ton_cu;
    const moi = snapshots.ton_moi;
    if (!cu && !moi) return null;

    const diff = (a?: number, b?: number) => {
      if (a == null || b == null) return null;
      return b - a;
    };
    const fmtDiff = (d: number | null) => {
      if (d == null) return "—";
      return d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString();
    };
    const diffColor = (d: number | null) => {
      if (d == null) return "text-[var(--color-text-muted)]";
      if (d > 0) return "text-[var(--color-success)]";
      if (d < 0) return "text-[var(--color-danger)]";
      return "text-[var(--color-text-muted)]";
    };

    const rows = [
      { label: "Tổng cộng", cu: cu?.total, moi: moi?.total },
      { label: "Cont 20'", cu: cu?.cont_20, moi: moi?.cont_20 },
      { label: "Cont 40'+", cu: cu?.cont_40, moi: moi?.cont_40 },
      { label: "Full (F)", cu: cu?.full, moi: moi?.full },
      { label: "Empty (E)", cu: cu?.empty, moi: moi?.empty },
      { label: "Hướng Nhập", cu: cu?.nhap, moi: moi?.nhap },
      { label: "Hướng Xuất", cu: cu?.xuat, moi: moi?.xuat },
      { label: "Lưu bãi", cu: cu?.luu, moi: moi?.luu },
    ];

    return rows.map((r) => {
      const d = diff(r.cu, r.moi);
      return { ...r, diff: d, diffColor: diffColor(d), fmtDiff: fmtDiff(d) };
    });
  }, [snapshots]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Settings panel */}
      <div className="cvf-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Cài đặt tồn bãi</h2>
          {!editMode && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Chỉnh sửa
            </button>
          )}
        </div>

        {editMode ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="capacity-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Công suất thiết kế (cont)</label>
              <input id="capacity-input" type="number" value={tempCapacity} onChange={(e) => setTempCapacity(e.target.value)} placeholder="VD: 5000" className="cvf-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="stock-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tồn đầu kỳ (cont)</label>
              <input id="stock-input" type="number" value={tempInitialStock} onChange={(e) => setTempInitialStock(e.target.value)} placeholder="VD: 2500" className="cvf-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="start-date-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ngày bắt đầu</label>
              <input id="start-date-input" type="date" title="Chọn ngày bắt đầu" value={tempInitialDate} onChange={(e) => setTempInitialDate(e.target.value)} className="cvf-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="button" onClick={handleSaveSettings} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors">
                <Save className="h-4 w-4" aria-hidden="true" />
                Lưu
              </button>
              {settings && (
                <button
                  type="button"
                  onClick={() => { setTempCapacity(settings.capacity.toString()); setTempInitialStock(settings.initial_stock.toString()); setTempInitialDate(settings.initial_date); setEditMode(false); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Hủy
                </button>
              )}
            </div>
          </div>
        ) : settings ? (
          <dl className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Công suất", value: settings.capacity.toLocaleString() },
              { label: "Tồn đầu kỳ", value: settings.initial_stock.toLocaleString() },
              { label: "Ngày bắt đầu", value: settings.initial_date },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-[var(--color-text-secondary)] mb-1">{item.label}</dt>
                <dd className="text-xl font-bold text-[var(--color-text-primary)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Chưa có cài đặt. Vui lòng nhập thông tin.</p>
        )}
      </div>

      {/* Year / Month filter — controls both snapshot and daily table */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Năm</label>
          <select title="Chọn năm" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="cvf-input w-28 rounded-lg px-3 py-2 text-sm">
            {(availableYears && availableYears.length > 0 ? availableYears : [getCurrentYear()]).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tháng</label>
          <select title="Chọn tháng" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="cvf-input w-36 rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ngày</label>
          <select title="Chọn ngày" value={selectedDay} onChange={(e) => setSelectedDay(parseInt(e.target.value))} className="cvf-input w-28 rounded-lg px-3 py-2 text-sm">
            {availableDays.length === 0
              ? <option value={0}>— Chưa có —</option>
              : availableDays.map((d) => (
                  <option key={d} value={d}>Ngày {d}</option>
                ))
            }
          </select>
        </div>
      </div>

      {/* TON CU / TON MOI snapshot section */}
      <div className="cvf-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Tồn Bãi Container</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" ref={tonCuRef} accept=".xlsx,.xls" onChange={(e) => handleSnapshotImport(e, "ton_cu")} className="hidden" />
            <input type="file" ref={tonMoiRef} accept=".xlsx,.xls" onChange={(e) => handleSnapshotImport(e, "ton_moi")} className="hidden" />
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                title="Ngày lấy Tồn Cũ"
                value={tonCuDate}
                onChange={(e) => setTonCuDate(e.target.value)}
                className="cvf-input rounded-lg px-2 py-1.5 text-xs w-32"
              />
              <button
                type="button"
                onClick={() => tonCuRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Import Tồn Cũ
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                title="Ngày lấy Tồn Mới"
                value={tonMoiDate}
                onChange={(e) => setTonMoiDate(e.target.value)}
                className="cvf-input rounded-lg px-2 py-1.5 text-xs w-32"
              />
              <button
                type="button"
                onClick={() => tonMoiRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] transition-colors"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Import Tồn Mới
              </button>
            </div>
          </div>
        </div>

        {snapshotMessage && (
          <div className="mb-4 rounded-lg px-3 py-2 text-xs border bg-[var(--color-accent-dim)] border-[var(--color-border-strong)] text-[var(--color-accent)]">
            {snapshotMessage}
          </div>
        )}

        {snapshotRows ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 pr-6 text-left text-xs font-semibold text-[var(--color-text-muted)] w-32">Loại</th>
                  <th className="py-2 px-4 text-right text-xs font-semibold text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-end gap-1">
                      <ArrowDownToLine className="h-3 w-3" aria-hidden="true" />
                      Tồn Cũ
                    </div>
                  </th>
                  <th className="py-2 px-4 text-right text-xs font-semibold text-[var(--color-accent)]">
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpFromLine className="h-3 w-3" aria-hidden="true" />
                      Tồn Mới
                    </div>
                  </th>
                  <th className="py-2 px-4 text-right text-xs font-semibold text-[var(--color-text-muted)]">+/−</th>
                </tr>
              </thead>
              <tbody>
                {snapshotRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-t border-[var(--color-border)] ${i === 0 ? "font-bold" : ""}`}
                  >
                    <td className="py-2 pr-6 text-[var(--color-text-secondary)] text-xs">{row.label}</td>
                    <td className="py-2 px-4 text-right text-[var(--color-text-primary)]">
                      {row.cu != null ? row.cu.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-[var(--color-accent)]">
                      {row.moi != null ? row.moi.toLocaleString() : "—"}
                    </td>
                    <td className={`py-2 px-4 text-right text-xs font-medium ${row.diffColor}`}>
                      {row.fmtDiff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Chưa có dữ liệu. Import file Tồn Cũ và Tồn Mới để xem bảng so sánh.
          </p>
        )}
      </div>

      {/* Summary cards + Daily movement table — only shown when there is daily data */}
      {isLoading && (
        <div className="p-6 text-center text-[var(--color-text-muted)] text-sm">Đang tải...</div>
      )}
      {!isLoading && inventoryData.length > 0 && (
        <>
        {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={`cvf-card rounded-xl p-4 text-center ${getCapacityBadge(summary.capacityPercent)}`}>
            <p className="text-xs opacity-80 mb-1">Tồn Hiện Tại</p>
            <p className="text-2xl font-bold">{summary.latestStock.toLocaleString()}</p>
            <p className="text-xs mt-1">{summary.capacityPercent}% công suất</p>
          </div>
          <div className="cvf-card rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-success)] mb-1">Tổng Vào</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">+{summary.totalIn.toLocaleString()}</p>
          </div>
          <div className="cvf-card rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-danger)] mb-1">Tổng Ra</p>
            <p className="text-2xl font-bold text-[var(--color-danger)]">-{summary.totalOut.toLocaleString()}</p>
          </div>
          <div className="cvf-card rounded-xl p-4 text-center">
            <p className={`text-xs mb-1 ${summary.netChange >= 0 ? "text-[var(--color-accent)]" : "text-[var(--color-warning)]"}`}>Biến Động</p>
            <p className={`text-2xl font-bold ${summary.netChange >= 0 ? "text-[var(--color-accent)]" : "text-[var(--color-warning)]"}`}>
              {summary.netChange >= 0 ? "+" : ""}{summary.netChange.toLocaleString()}
            </p>
          </div>
          <div className="cvf-card rounded-xl p-4 text-center">
            <p className="text-xs text-[var(--color-info)] mb-1">Công Suất</p>
            <p className="text-2xl font-bold text-[var(--color-info)]">{settings?.capacity.toLocaleString() || 0}</p>
          </div>
        </div>
        )}

        <div className="cvf-card rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-1 border-b border-[var(--color-border)] flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Biến Động Hàng Ngày</span>
            <span className="text-xs text-[var(--color-text-muted)]">(XE + XALAN + Tàu)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]/40">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)]">Ngày</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">Tồn Trước</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-success)]">XE Hạ</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-success)]">XALAN Hạ</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-success)]">Tàu Nhập</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-success)]">Shift In</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-danger)]">XE Giao</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-danger)]">XALAN Giao</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-danger)]">Tàu Xuất</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-danger)]">Shift Out</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-accent)]">Biến Động</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-primary)]">Tồn</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)]">%</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.map((row) => (
                  <tr key={row.date} className="border-t border-[var(--color-border)] hover:bg-[var(--color-elevated)]/30 transition-colors">
                    <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                      {String(row.day).padStart(2, "0")}/{String(row.month).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">{row.stock_prev.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-success)]">{row.xe_ha}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-success)]">{row.xalan_ha}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-success)]">{row.nhap_tau}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-success)]">{row.shift_in}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-danger)]">{row.xe_giao}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-danger)]">{row.xalan_giao}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-danger)]">{row.xuat_tau}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-danger)]">{row.shift_out}</td>
                    <td className={`px-3 py-2 text-right font-medium ${row.stock_change > 0 ? "text-[var(--color-success)]" : row.stock_change < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
                      {row.stock_change > 0 ? "+" : ""}{row.stock_change}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[var(--color-text-primary)]">{row.stock_current.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right ${row.capacity_percent >= 90 ? "text-[var(--color-danger)]" : row.capacity_percent >= 80 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
                      {row.capacity_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
