"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Pencil, Save, Ship, X } from "lucide-react";
import { db, getCurrentYear, InventorySettings } from "@/lib/db";
import {
  getInventorySettings,
  saveInventorySettings,
  calculateDailyInventory,
  DailyInventory,
} from "@/lib/inventoryService";
import { importVesselExcelFile, downloadVesselTemplate } from "@/lib/vesselParser";

export default function InventoryPage() {
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tempCapacity, setTempCapacity] = useState("");
  const [tempInitialStock, setTempInitialStock] = useState("");
  const [tempInitialDate, setTempInitialDate] = useState("");

  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [inventoryData, setInventoryData] = useState<DailyInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const vesselFileRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState("");

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

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadInventory(); }, [loadInventory, settings]);

  const handleSaveSettings = async () => {
    await saveInventorySettings({
      capacity: parseInt(tempCapacity) || 0,
      initial_stock: parseInt(tempInitialStock) || 0,
      initial_date: tempInitialDate || new Date().toISOString().split("T")[0],
    });
    await loadSettings();
    setEditMode(false);
  };

  const handleVesselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMessage("Đang import...");
    const result = await importVesselExcelFile(file);
    setUploadMessage(result.message);
    if (result.success) await loadInventory();
    if (vesselFileRef.current) vesselFileRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    downloadVesselTemplate();
    setUploadMessage("Đã tải xuống file template mẫu");
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

      {/* Filter + vessel actions */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Năm</label>
          <select title="Chọn năm" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="cvf-input rounded-lg px-3 py-2 text-sm">
            {(availableYears || [getCurrentYear()]).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tháng</label>
          <select title="Chọn tháng" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="cvf-input rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="file" title="Chọn file Excel" ref={vesselFileRef} accept=".xlsx,.xls" onChange={handleVesselUpload} className="hidden" />
          <button type="button" onClick={() => vesselFileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] transition-colors">
            <Ship className="h-4 w-4" aria-hidden="true" />
            Upload Data Tàu
          </button>
          <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <Download className="h-4 w-4" aria-hidden="true" />
            Tải Template
          </button>
        </div>
      </div>

      {uploadMessage && (
        <div className="rounded-lg px-4 py-3 text-sm border bg-[var(--color-accent-dim)] border-[var(--color-border-strong)] text-[var(--color-accent)]">
          {uploadMessage}
        </div>
      )}

      {/* Summary cards */}
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

      {/* Data table */}
      <div className="cvf-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center text-[var(--color-text-muted)] text-sm">Đang tải dữ liệu...</div>
          ) : inventoryData.length === 0 ? (
            <div className="p-10 text-center text-[var(--color-text-muted)] text-sm">
              Không có dữ liệu cho tháng {selectedMonth}/{selectedYear}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
