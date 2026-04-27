"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { ShiftLogGroup, ShiftLogItem } from "@/lib/db";
import {
    SHIFT_LOG_GROUP_LABEL,
    SHIFT_LOG_SHIFT_HOURS,
    SHIFT_LOG_SHIFTS,
    ShiftLogRow,
    ShiftLogShift,
    deleteItem,
    getRowsForShift,
    saveEntry,
    saveItem,
    seedDefaultItemsIfEmpty,
} from "@/lib/shiftLogService";

const DEPARTMENT = "thu_tuc";
const DEPARTMENT_LABEL = "Bộ phận Thủ tục";

interface DraftRow {
    ban_giao: string;
    xuat: string;
}

export default function ShiftLogThuTucPage() {
    const today = new Date().toISOString().split("T")[0];
    const [date, setDate] = useState(today);
    const [shift, setShift] = useState<ShiftLogShift>("Ca 01");

    const [rows, setRows] = useState<ShiftLogRow[]>([]);
    const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [editingItems, setEditingItems] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemGroup, setNewItemGroup] = useState<ShiftLogGroup>("in_warehouse");

    const loadRows = useCallback(async () => {
        setIsLoading(true);
        try {
            await seedDefaultItemsIfEmpty(DEPARTMENT);
            const data = await getRowsForShift(DEPARTMENT, date, shift);
            setRows(data);
            const next: Record<number, DraftRow> = {};
            data.forEach((r) => {
                if (r.item.id != null) {
                    next[r.item.id] = {
                        ban_giao: String(r.ban_giao ?? 0),
                        xuat: String(r.xuat ?? 0),
                    };
                }
            });
            setDrafts(next);
        } catch (err) {
            console.error(err);
            setMessage("Không thể tải dữ liệu.");
        }
        setIsLoading(false);
    }, [date, shift]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const grouped = useMemo(() => {
        const inWh: ShiftLogRow[] = [];
        const outWh: ShiftLogRow[] = [];
        rows.forEach((r) => {
            if (r.item.group === "in_warehouse") inWh.push(r);
            else outWh.push(r);
        });
        return { in_warehouse: inWh, outside_warehouse: outWh };
    }, [rows]);

    const handleDraftChange = (itemId: number, field: keyof DraftRow, value: string) => {
        setDrafts((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value },
        }));
    };

    const computeTon = (itemId: number): number => {
        const d = drafts[itemId];
        if (!d) return 0;
        return (parseInt(d.ban_giao) || 0) - (parseInt(d.xuat) || 0);
    };

    const handleSaveAll = async () => {
        try {
            for (const r of rows) {
                if (r.item.id == null) continue;
                const d = drafts[r.item.id];
                if (!d) continue;
                await saveEntry({
                    department: DEPARTMENT,
                    date,
                    shift,
                    item_id: r.item.id,
                    ban_giao: parseInt(d.ban_giao) || 0,
                    xuat: parseInt(d.xuat) || 0,
                });
            }
            setMessage("Đã lưu sổ giao ca.");
            await loadRows();
        } catch (err) {
            console.error(err);
            setMessage("Lỗi khi lưu.");
        }
    };

    const handleAddItem = async () => {
        const name = newItemName.trim();
        if (!name) return;
        const sameGroup = rows.filter((r) => r.item.group === newItemGroup).length;
        await saveItem({
            department: DEPARTMENT,
            name,
            group: newItemGroup,
            sort_order: sameGroup,
            active: true,
        });
        setNewItemName("");
        await loadRows();
    };

    const handleRenameItem = async (item: ShiftLogItem, name: string) => {
        if (!name.trim() || name === item.name) return;
        await saveItem({
            id: item.id,
            department: item.department,
            name: name.trim(),
            group: item.group,
            sort_order: item.sort_order,
            active: item.active,
        });
        await loadRows();
    };

    const handleDeleteItem = async (item: ShiftLogItem) => {
        if (item.id == null) return;
        if (!confirm(`Xóa mặt hàng "${item.name}"? Các bản ghi cũ vẫn được giữ.`)) return;
        await deleteItem(item.id);
        await loadRows();
    };

    const renderGroup = (group: ShiftLogGroup, label: string) => {
        const groupRows = grouped[group];
        return (
            <>
                <tr className="bg-[var(--color-elevated)]/60">
                    <td colSpan={editingItems ? 6 : 5} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        {label}
                    </td>
                </tr>
                {groupRows.length === 0 && (
                    <tr>
                        <td colSpan={editingItems ? 6 : 5} className="px-3 py-3 text-center text-xs text-[var(--color-text-muted)]">
                            Chưa có mặt hàng. Bấm "Chỉnh sửa danh sách" để thêm.
                        </td>
                    </tr>
                )}
                {groupRows.map((r, idx) => {
                    const itemId = r.item.id;
                    if (itemId == null) return null;
                    const draft = drafts[itemId] || { ban_giao: "0", xuat: "0" };
                    return (
                        <tr key={itemId} className="border-t border-[var(--color-border)] hover:bg-[var(--color-elevated)]/30">
                            <td className="px-3 py-2 text-center text-xs text-[var(--color-text-muted)]">{idx + 1}</td>
                            <td className="px-3 py-2 text-sm text-[var(--color-text-primary)]">
                                {editingItems ? (
                                    <input
                                        type="text"
                                        defaultValue={r.item.name}
                                        onBlur={(e) => handleRenameItem(r.item, e.target.value)}
                                        className="cvf-input w-full rounded-md px-2 py-1 text-sm"
                                        aria-label="Tên mặt hàng"
                                    />
                                ) : (
                                    r.item.name
                                )}
                            </td>
                            <td className="px-3 py-2 text-right">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={draft.ban_giao}
                                    onChange={(e) => handleDraftChange(itemId, "ban_giao", e.target.value)}
                                    className="cvf-input w-24 rounded-md px-2 py-1 text-right text-sm"
                                    aria-label={`Bàn giao ${r.item.name}`}
                                />
                            </td>
                            <td className="px-3 py-2 text-right">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={draft.xuat}
                                    onChange={(e) => handleDraftChange(itemId, "xuat", e.target.value)}
                                    className="cvf-input w-24 rounded-md px-2 py-1 text-right text-sm"
                                    aria-label={`Xuất ${r.item.name}`}
                                />
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-[var(--color-text-primary)]">
                                {computeTon(itemId).toLocaleString()}
                            </td>
                            {editingItems && (
                                <td className="px-3 py-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(r.item)}
                                        className="text-[var(--color-danger)] hover:opacity-70"
                                        aria-label={`Xóa ${r.item.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </td>
                            )}
                        </tr>
                    );
                })}
            </>
        );
    };

    return (
        <div className="space-y-5">
            <div className="cvf-card rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
                            Sổ giao ca — {DEPARTMENT_LABEL}
                        </h1>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            BÀN GIAO của ca mới được lấy tự động từ TỒN của ca trước (có thể sửa).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setEditingItems((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {editingItems ? "Đóng chỉnh sửa" : "Chỉnh sửa danh sách"}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors"
                        >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            Lưu ca
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label htmlFor="shift-log-date" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ngày</label>
                        <input
                            id="shift-log-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="cvf-input rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="shift-log-shift" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Ca</label>
                        <select
                            id="shift-log-shift"
                            value={shift}
                            onChange={(e) => setShift(e.target.value as ShiftLogShift)}
                            className="cvf-input rounded-lg px-3 py-2 text-sm w-40"
                        >
                            {SHIFT_LOG_SHIFTS.map((s) => (
                                <option key={s} value={s}>
                                    {s} ({SHIFT_LOG_SHIFT_HOURS[s]})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {message && (
                    <div className="mt-4 rounded-lg px-3 py-2 text-xs border bg-[var(--color-accent-dim)] border-[var(--color-border-strong)] text-[var(--color-accent)]">
                        {message}
                    </div>
                )}
            </div>

            <div className="cvf-card rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">Đang tải...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-accent-dim)]/40">
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] w-12">STT</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">KHO</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] w-32">BÀN GIAO</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] w-32">XUẤT</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] w-28">TỒN</th>
                                    {editingItems && <th className="px-3 py-3 text-center text-xs font-semibold text-[var(--color-text-secondary)] w-16">Xóa</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {renderGroup("in_warehouse", SHIFT_LOG_GROUP_LABEL.in_warehouse)}
                                {renderGroup("outside_warehouse", SHIFT_LOG_GROUP_LABEL.outside_warehouse)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editingItems && (
                <div className="cvf-card rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                        Thêm mặt hàng mới
                    </h2>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <label htmlFor="new-item-name" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Tên mặt hàng</label>
                            <input
                                id="new-item-name"
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="VD: GIẤY A4"
                                className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="new-item-group" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">Nhóm</label>
                            <select
                                id="new-item-group"
                                value={newItemGroup}
                                onChange={(e) => setNewItemGroup(e.target.value as ShiftLogGroup)}
                                className="cvf-input rounded-lg px-3 py-2 text-sm w-40"
                            >
                                <option value="in_warehouse">{SHIFT_LOG_GROUP_LABEL.in_warehouse}</option>
                                <option value="outside_warehouse">{SHIFT_LOG_GROUP_LABEL.outside_warehouse}</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            disabled={!newItemName.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Thêm
                        </button>
                        <button
                            type="button"
                            onClick={() => { setEditingItems(false); setNewItemName(""); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
