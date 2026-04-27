/**
 * Shift Log Service - Sổ giao ca theo bộ phận
 *
 * Mỗi bộ phận có danh sách mặt hàng (shift_log_items) chia 2 nhóm: trong kho / ngoài kho.
 * Mỗi ca giao tạo các bản ghi (shift_log_entries) cho từng item: BÀN GIAO + XUẤT.
 * TỒN = BÀN GIAO − XUẤT (tính tự động ở UI, không lưu DB).
 * Đầu ca: BÀN GIAO mặc định = TỒN của ca trước (auto-fill, có thể sửa).
 */

import { db, ShiftLogEntry, ShiftLogGroup, ShiftLogItem } from "./db";

export const SHIFT_LOG_SHIFTS = ["Ca 01", "Ca 02", "Hành chánh"] as const;
export type ShiftLogShift = (typeof SHIFT_LOG_SHIFTS)[number];

export const SHIFT_LOG_SHIFT_HOURS: Record<ShiftLogShift, string> = {
    "Ca 01": "06:00 – 18:00",
    "Ca 02": "18:00 – 06:00",
    "Hành chánh": "07:30 – 16:30",
};

export const SHIFT_LOG_GROUP_LABEL: Record<ShiftLogGroup, string> = {
    in_warehouse: "Trong kho",
    outside_warehouse: "Ngoài kho",
};

export interface ShiftLogRow {
    item: ShiftLogItem;
    entry?: ShiftLogEntry;
    ban_giao: number;
    xuat: number;
    ton: number;
}

// ============= ITEMS =============

export async function getItems(department: string): Promise<ShiftLogItem[]> {
    const all = await db.shift_log_items.where("department").equals(department).toArray();
    return all.filter((i) => i.active).sort(byGroupThenOrder);
}

function byGroupThenOrder(a: ShiftLogItem, b: ShiftLogItem): number {
    if (a.group !== b.group) {
        // in_warehouse first
        return a.group === "in_warehouse" ? -1 : 1;
    }
    return a.sort_order - b.sort_order;
}

export async function saveItem(
    item: Omit<ShiftLogItem, "id" | "updated_at"> & { id?: number }
): Promise<number> {
    const payload: ShiftLogItem = {
        ...item,
        updated_at: new Date(),
    };
    if (item.id) {
        await db.shift_log_items.put(payload);
        return item.id;
    }
    return (await db.shift_log_items.add(payload)) as number;
}

export async function deleteItem(id: number): Promise<void> {
    await db.shift_log_items.delete(id);
}

/**
 * Seed default items theo ảnh người dùng cung cấp (chỉ chạy nếu bộ phận chưa có item nào).
 */
export async function seedDefaultItemsIfEmpty(department: string): Promise<void> {
    const count = await db.shift_log_items.where("department").equals(department).count();
    if (count > 0) return;

    const now = new Date();
    const defaults: Omit<ShiftLogItem, "id">[] = [];

    if (department === "thu_tuc") {
        const inWarehouse = ["GIẤY A4", "GIẤY A5", "GIẤY NHIỆT LỚN"];
        const outsideWarehouse = ["GIẤY A4", "GIẤY A5", "GIẤY NHIỆT LỚN"];
        inWarehouse.forEach((name, idx) => {
            defaults.push({
                department,
                name,
                group: "in_warehouse",
                sort_order: idx,
                active: true,
                updated_at: now,
            });
        });
        outsideWarehouse.forEach((name, idx) => {
            defaults.push({
                department,
                name,
                group: "outside_warehouse",
                sort_order: idx,
                active: true,
                updated_at: now,
            });
        });
    }

    if (defaults.length > 0) {
        await db.shift_log_items.bulkAdd(defaults as ShiftLogItem[]);
    }
}

// ============= ENTRIES =============

export async function getEntries(
    department: string,
    date: string,
    shift: string
): Promise<ShiftLogEntry[]> {
    return db.shift_log_entries
        .where("[department+date+shift]")
        .equals([department, date, shift])
        .toArray();
}

export async function saveEntry(
    entry: Omit<ShiftLogEntry, "id" | "updated_at"> & { id?: number }
): Promise<number> {
    // Look up existing entry by (department, date, shift, item_id) to avoid duplicates
    const existing = await db.shift_log_entries
        .where("[department+date+shift+item_id]")
        .equals([entry.department, entry.date, entry.shift, entry.item_id])
        .first();

    const payload: ShiftLogEntry = {
        department: entry.department,
        date: entry.date,
        shift: entry.shift,
        item_id: entry.item_id,
        ban_giao: entry.ban_giao,
        xuat: entry.xuat,
        note: entry.note,
        updated_at: new Date(),
    };

    if (existing?.id) {
        await db.shift_log_entries.put({ ...payload, id: existing.id });
        return existing.id;
    }
    return (await db.shift_log_entries.add(payload)) as number;
}

export async function deleteEntry(id: number): Promise<void> {
    await db.shift_log_entries.delete(id);
}

/**
 * Trả về ca liền kề trước đó để auto-fill BÀN GIAO của ca hiện tại.
 * Quy ước trật tự trong ngày: Ca 01 → Hành chánh → Ca 02 → (Ca 01 ngày sau).
 */
export function getPreviousShift(
    date: string,
    shift: string
): { date: string; shift: string } {
    if (shift === "Ca 02") return { date, shift: "Hành chánh" };
    if (shift === "Hành chánh") return { date, shift: "Ca 01" };
    // Ca 01: lấy Ca 02 của ngày hôm trước
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return { date: d.toISOString().split("T")[0], shift: "Ca 02" };
}

/**
 * Tổng hợp các dòng cho UI: ghép item + entry hiện tại; nếu chưa có entry thì auto-fill
 * BÀN GIAO = TỒN của ca trước (TỒN = ban_giao − xuat của ca trước).
 */
export async function getRowsForShift(
    department: string,
    date: string,
    shift: string
): Promise<ShiftLogRow[]> {
    const items = await getItems(department);
    const entries = await getEntries(department, date, shift);
    const entryByItem = new Map<number, ShiftLogEntry>();
    entries.forEach((e) => {
        if (e.item_id != null) entryByItem.set(e.item_id, e);
    });

    // Pre-load previous shift entries for auto-fill
    const prev = getPreviousShift(date, shift);
    const prevEntries = await getEntries(department, prev.date, prev.shift);
    const prevByItem = new Map<number, ShiftLogEntry>();
    prevEntries.forEach((e) => {
        if (e.item_id != null) prevByItem.set(e.item_id, e);
    });

    return items.map((item) => {
        const e = item.id != null ? entryByItem.get(item.id) : undefined;
        let ban_giao = e?.ban_giao ?? 0;
        const xuat = e?.xuat ?? 0;

        if (!e && item.id != null) {
            const prevEntry = prevByItem.get(item.id);
            if (prevEntry) {
                ban_giao = (prevEntry.ban_giao ?? 0) - (prevEntry.xuat ?? 0);
            }
        }

        return {
            item,
            entry: e,
            ban_giao,
            xuat,
            ton: ban_giao - xuat,
        };
    });
}
