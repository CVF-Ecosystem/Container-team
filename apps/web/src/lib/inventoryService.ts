/**
 * Inventory Service
 * Xử lý logic tồn bãi container
 */

import { db, VesselData, InventorySettings } from './db';

// ============= INVENTORY SETTINGS =============

/**
 * Lấy inventory settings
 */
export async function getInventorySettings(): Promise<InventorySettings | undefined> {
    return db.inventory_settings.toCollection().first();
}

/**
 * Lưu inventory settings
 */
export async function saveInventorySettings(settings: Partial<InventorySettings>): Promise<void> {
    const existing = await getInventorySettings();

    if (existing?.id) {
        await db.inventory_settings.update(existing.id, {
            ...settings,
            updated_at: new Date()
        });
    } else {
        await db.inventory_settings.add({
            capacity: settings.capacity || 0,
            initial_stock: settings.initial_stock || 0,
            initial_date: settings.initial_date || new Date().toISOString().split('T')[0],
            updated_at: new Date()
        });
    }
}

// ============= VESSEL DATA =============

/**
 * Thêm hoặc cập nhật dữ liệu tàu
 */
export async function upsertVesselData(data: Omit<VesselData, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const existing = await db.vessel_data
        .where('[year+month+day]')
        .equals([data.year, data.month, data.day])
        .first();

    if (existing?.id) {
        await db.vessel_data.update(existing.id, {
            ...data,
            updated_at: new Date()
        });
        return existing.id;
    }

    return await db.vessel_data.add({
        ...data,
        created_at: new Date(),
        updated_at: new Date()
    });
}

/**
 * Lấy dữ liệu tàu theo range ngày
 */
export async function getVesselDataByDateRange(
    startDate: string,
    endDate: string
): Promise<VesselData[]> {
    return db.vessel_data
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
}

/**
 * Lấy dữ liệu tàu theo tháng/năm
 */
export async function getVesselDataByMonth(year: number, month: number): Promise<VesselData[]> {
    return db.vessel_data
        .where('[year+month]')
        .equals([year, month])
        .toArray();
}

// ============= INVENTORY CALCULATION =============

export interface DailyInventory {
    date: string;
    day: number;
    month: number;
    year: number;

    // Vào
    xe_ha: number;
    xalan_ha: number;
    nhap_tau: number;
    shift_in: number;
    total_in: number;

    // Ra
    xe_giao: number;
    xalan_giao: number;
    xuat_tau: number;
    shift_out: number;
    total_out: number;

    // Tồn
    stock_prev: number;     // Tồn ngày trước
    stock_change: number;   // Biến động = in - out
    stock_current: number;  // Tồn hiện tại

    // So với công suất
    capacity_percent: number;
}

/**
 * Tính toán tồn bãi theo ngày
 */
export async function calculateDailyInventory(
    year: number,
    month: number
): Promise<DailyInventory[]> {
    const settings = await getInventorySettings();
    if (!settings) {
        return [];
    }

    // Lấy dữ liệu daily
    const dailyData = await db.daily_data
        .where('[year+month]')
        .equals([year, month])
        .sortBy('day');

    // Lấy dữ liệu tàu
    const vesselData = await db.vessel_data
        .where('[year+month]')
        .equals([year, month])
        .toArray();

    const vesselMap = new Map(vesselData.map(v => [v.day, v]));

    // Tính tồn trước tháng này
    const prevStock = settings.initial_stock;

    // Nếu có data tháng trước, tính tồn cuối tháng trước
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevMonthData = await db.daily_data
        .where('[year+month]')
        .equals([prevYear, prevMonth])
        .toArray();

    if (prevMonthData.length > 0) {
        // Tính tổng in/out của tháng trước
        const prevVesselData = await db.vessel_data
            .where('[year+month]')
            .equals([prevYear, prevMonth])
            .toArray();

        for (const _d of prevMonthData) {
            // Reserved for future carry-over inventory calculation.
        }

        for (const _v of prevVesselData) {
            // Reserved for future carry-over vessel adjustment.
        }

        // Recursive calculation - simplified: just use last known
        // In real app, should calculate from initial_date
    }

    const result: DailyInventory[] = [];
    let runningStock = prevStock;

    for (const daily of dailyData) {
        const vessel = vesselMap.get(daily.day);

        const xe_ha = daily.xe_ha;
        const xalan_ha = daily.xalan_ha;
        const nhap_tau = vessel?.nhap_tau || 0;
        const shift_in = vessel?.shift_in || 0;
        const total_in = xe_ha + xalan_ha + nhap_tau + shift_in;

        const xe_giao = daily.xe_giao;
        const xalan_giao = daily.xalan_giao;
        const xuat_tau = vessel?.xuat_tau || 0;
        const shift_out = vessel?.shift_out || 0;
        const total_out = xe_giao + xalan_giao + xuat_tau + shift_out;

        const stock_change = total_in - total_out;
        const stock_current = runningStock + stock_change;

        result.push({
            date: daily.date,
            day: daily.day,
            month: daily.month,
            year: daily.year,

            xe_ha,
            xalan_ha,
            nhap_tau,
            shift_in,
            total_in,

            xe_giao,
            xalan_giao,
            xuat_tau,
            shift_out,
            total_out,

            stock_prev: runningStock,
            stock_change,
            stock_current,

            capacity_percent: settings.capacity > 0
                ? Math.round((stock_current / settings.capacity) * 100)
                : 0
        });

        runningStock = stock_current;
    }

    return result;
}

/**
 * Lấy tồn bãi cuối cùng
 */
export async function getLatestInventory(): Promise<{ stock: number; date: string } | null> {
    const settings = await getInventorySettings();
    if (!settings) return null;

    const latestDaily = await db.daily_data.orderBy('date').last();
    if (!latestDaily) {
        return { stock: settings.initial_stock, date: settings.initial_date };
    }

    const inventory = await calculateDailyInventory(latestDaily.year, latestDaily.month);
    const last = inventory[inventory.length - 1];

    if (last) {
        return { stock: last.stock_current, date: last.date };
    }

    return { stock: settings.initial_stock, date: settings.initial_date };
}
