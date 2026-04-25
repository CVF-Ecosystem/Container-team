/**
 * IndexedDB Database với Dexie.js
 *
 * Schema:
 * - daily_data: Chi tiết từng ngày (chỉ năm hiện tại)
 * - monthly_summary: Tổng hợp theo tháng (3 năm gần nhất)
 * - yearly_summary: Tổng hợp theo năm (tất cả)
 * - metadata: Thông tin cấu hình
 * - sync_queue: Persistent offline sync queue
 */

import Dexie, { type Table } from 'dexie';
import { logger } from './logger';

// ============= INTERFACES =============

export interface DailyData {
    id?: number;
    date: string;           // YYYY-MM-DD
    year: number;
    month: number;          // 1-12
    day: number;            // 1-31

    // XE - Tổng hợp
    xe_ha: number;
    xe_giao: number;
    xe_cfs: number;
    xe_total: number;

    // XE - Chi tiết phương án
    xe_hb?: number;         // Hạ bãi
    xe_tr?: number;         // Trả rỗng
    xe_ln?: number;         // Lấy nguyên
    xe_cr?: number;         // Cấp rỗng
    xe_dh?: number;         // Đóng hàng (Full CFS)
    xe_rr?: number;         // Rút ruột (Full CFS)
    xe_dh_empty?: number;   // Đóng hàng empty
    xe_rr_empty?: number;   // Rút ruột empty

    // XALAN - Tổng hợp
    xalan_ha: number;
    xalan_giao: number;
    xalan_cfs: number;
    xalan_total: number;

    // XALAN - Chi tiết phương án
    xalan_hb?: number;
    xalan_tr?: number;
    xalan_ln?: number;
    xalan_cr?: number;
    xalan_dh?: number;
    xalan_rr?: number;
    xalan_dh_empty?: number;
    xalan_rr_empty?: number;

    // Tổng
    total_in: number;       // xe_ha + xalan_ha
    total_out: number;      // xe_giao + xalan_giao
    total_cfs: number;      // xe_cfs + xalan_cfs
    total: number;          // xe_total + xalan_total

    created_at: Date;
    updated_at: Date;
}

export interface MonthlySummary {
    id?: number;
    year: number;
    month: number;          // 1-12
    quarter: number;        // 1-4

    // XE
    xe_ha: number;
    xe_giao: number;
    xe_cfs: number;
    xe_total: number;

    // XALAN
    xalan_ha: number;
    xalan_giao: number;
    xalan_cfs: number;
    xalan_total: number;

    // Tổng
    total_in: number;
    total_out: number;
    total_cfs: number;
    total: number;

    // So sánh cùng kỳ
    yoy_change_percent?: number;  // % thay đổi so với năm trước

    created_at: Date;
    updated_at: Date;
}

export interface YearlySummary {
    id?: number;
    year: number;

    // XE
    xe_ha: number;
    xe_giao: number;
    xe_cfs: number;
    xe_total: number;

    // XALAN
    xalan_ha: number;
    xalan_giao: number;
    xalan_cfs: number;
    xalan_total: number;

    // Tổng
    total_in: number;
    total_out: number;
    total_cfs: number;
    total: number;

    created_at: Date;
    updated_at: Date;
}

export interface Metadata {
    key: string;
    value: string | number | boolean | null;
    updated_at: Date;
}

// ============= VESSEL DATA (Tàu) =============


export interface VesselData {
    id?: number;

    // Thông tin tàu
    stt?: number;
    vessel_name?: string;      // Tên tàu
    voyage?: string;           // 🆕 Chuyến (Voyage) - from user template
    shipping_line?: string;    // 🆕 Hãng tàu (Maersk, MSC...)

    // 4 mốc thời gian (ISO 8601 string or Date object)
    atb?: string;              // Arrival Time Berth
    atw?: string;              // 🆕 At Work
    atc?: string;              // 🆕 At Completed
    atd?: string;              // Actual Time Departure

    // Thời gian (cho index/filter)
    date: string;              // YYYY-MM-DD (Ngày báo cáo/Ngày cập cầu)
    year: number;
    month: number;
    day: number;

    // Số lượng container (Moves)
    nhap_tau: number;          // Discharge
    xuat_tau: number;          // Loading
    shift_in: number;          // Shifting in
    shift_out: number;         // Shifting out
    total_moves: number;       // 🆕 Tổng moves (Nhập+Xuất+Shift)

    // 🆕 Sản lượng TEUs
    teus: number;

    // 🆕 Chỉ số năng suất (tự động tính)
    moves_per_hour?: number;
    teus_per_hour?: number;
    working_hours?: number;    // (atc - atw)
    berth_hours?: number;      // (atd - atb)

    // Khác
    remark?: string;           // Ghi chú

    created_at: Date;
    updated_at: Date;
}

// ============= PERSONNEL & SHIP LIST =============

export interface Employee {
    id?: number;
    mscd: string;           // Mã số cố định (Unique)
    name: string;           // Họ và tên
    department: string;     // Bộ phận (Tổng hợp, Thủ tục, Bãi cont, Điều hành...)
    shift: string;          // Ca làm việc (Ca 1, Ca 2, Hành chánh...)
    active: boolean;        // Còn làm việc hay không
    updated_at: Date;
}

export interface VesselList {
    id?: number;
    name: string;           // Tên tàu (Unique)
    active: boolean;        // Đang hoạt động
}

// ============= INVENTORY SETTINGS =============

export interface InventorySettings {
    id?: number;
    capacity: number;           // Công suất thiết kế (số cont tối đa)
    initial_stock: number;      // Tồn đầu kỳ
    initial_date: string;       // Ngày bắt đầu tính tồn (YYYY-MM-DD)
    updated_at: Date;
}

// ============= INVENTORY SNAPSHOT (Tồn bãi container) =============

export interface InventorySnapshot {
    id?: number;
    type: 'ton_cu' | 'ton_moi';  // TON CU = tồn cũ, TON MOI = tồn mới
    filename?: string;
    date: string;        // YYYY-MM-DD (ngày lấy tồn)
    year: number;
    month: number;
    day: number;
    total: number;
    cont_20: number;     // 20' containers
    cont_40: number;     // 40'+ containers
    full: number;        // Full (F)
    empty: number;       // Empty (E)
    nhap: number;        // Hướng: Import/Nhập
    xuat: number;        // Hướng: Export/Xuất
    luu: number;         // Hướng: Storage/Lưu bãi
    imported_at: Date;
}

// ============= SYNC QUEUE (Persistent offline queue) =============

export interface SyncQueueItem {
    id?: number;
    table_name: string;                          // Target table name
    operation: 'insert' | 'update' | 'delete';  // Operation type
    data: string;                                // JSON-serialized payload
    timestamp: Date;
    synced: boolean;
    retry_count: number;                         // Number of failed sync attempts
}

// ============= DATABASE CLASS =============

export class ContainerDB extends Dexie {
    daily_data!: Table<DailyData>;
    monthly_summary!: Table<MonthlySummary>;
    yearly_summary!: Table<YearlySummary>;
    metadata!: Table<Metadata>;
    vessel_data!: Table<VesselData>;
    inventory_settings!: Table<InventorySettings>;
    inventory_snapshots!: Table<InventorySnapshot>;
    employees!: Table<Employee>;
    vessels!: Table<VesselList>;
    sync_queue!: Table<SyncQueueItem>;

    constructor() {
        super('ContainerDB');

        // Version 1: Original schema
        this.version(1).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key'
        });

        // Version 2: Add vessel_data and inventory_settings
        this.version(2).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            inventory_settings: '++id'
        });

        // Version 3: Personnel Management
        this.version(3).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            inventory_settings: '++id',
            employees: '++id, &mscd, department, shift, [department+shift], active',
            vessels: '++id, &name, active'
        });

        // Version 4: Enhanced Vessel Data
        this.version(4).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            // Added shipping_line to index for filtering
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day], shipping_line, vessel_name',
            inventory_settings: '++id',
            employees: '++id, &mscd, department, shift, [department+shift], active',
            vessels: '++id, &name, active'
        });

        // Version 5: Persistent Sync Queue (survives page reloads)
        this.version(5).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day], shipping_line, vessel_name',
            inventory_settings: '++id',
            employees: '++id, &mscd, department, shift, [department+shift], active',
            vessels: '++id, &name, active',
            sync_queue: '++id, table_name, synced, timestamp'
        });

        // Version 6: Inventory Snapshots (TON CU / TON MOI) — unique per type
        this.version(6).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day], shipping_line, vessel_name',
            inventory_settings: '++id',
            inventory_snapshots: '++id, &type',
            employees: '++id, &mscd, department, shift, [department+shift], active',
            vessels: '++id, &name, active',
            sync_queue: '++id, table_name, synced, timestamp'
        });

        // Version 7: Snapshots stored per date (one per type per month)
        this.version(7).stores({
            daily_data: '++id, date, year, month, day, [year+month], [year+month+day]',
            monthly_summary: '++id, year, month, quarter, [year+month], [year+quarter]',
            yearly_summary: '++id, &year',
            metadata: '&key',
            vessel_data: '++id, date, year, month, day, [year+month], [year+month+day], shipping_line, vessel_name',
            inventory_settings: '++id',
            inventory_snapshots: '++id, type, [type+year+month], year, [year+month]',
            employees: '++id, &mscd, department, shift, [department+shift], active',
            vessels: '++id, &name, active',
            sync_queue: '++id, table_name, synced, timestamp'
        }).upgrade(async tx => {
            // Populate date/year/month/day on existing v6 records
            await tx.table('inventory_snapshots').toCollection().modify((s) => {
                if (!s.year) {
                    const d = s.imported_at ? new Date(s.imported_at) : new Date();
                    s.date = d.toISOString().split('T')[0];
                    s.year = d.getFullYear();
                    s.month = d.getMonth() + 1;
                    s.day = d.getDate();
                }
            });
        });
    }
}


// Singleton instance
export const db = new ContainerDB();

// ============= HELPER FUNCTIONS =============

/**
 * Lấy năm hiện tại
 */
export function getCurrentYear(): number {
    return new Date().getFullYear();
}

/**
 * Lấy quý từ tháng
 */
export function getQuarter(month: number): number {
    return Math.ceil(month / 3);
}

/**
 * Kiểm tra năm có trong phạm vi 3 năm gần nhất không
 */
export function isWithinThreeYears(year: number): boolean {
    const currentYear = getCurrentYear();
    return year >= currentYear - 2 && year <= currentYear;
}

/**
 * Xóa dữ liệu daily của các năm cũ (chỉ giữ năm hiện tại)
 */
export async function archiveOldDailyData(): Promise<void> {
    const currentYear = getCurrentYear();
    await db.daily_data.where('year').below(currentYear).delete();
    logger.info(`Archived daily data older than ${currentYear}`);
}

/**
 * Xóa dữ liệu monthly của năm quá 3 năm (chuyển sang chỉ còn yearly)
 */
export async function archiveOldMonthlyData(): Promise<void> {
    const currentYear = getCurrentYear();
    const oldestAllowedYear = currentYear - 2; // Giữ 3 năm: 2023, 2024, 2025
    await db.monthly_summary.where('year').below(oldestAllowedYear).delete();
    logger.info(`Archived monthly data older than ${oldestAllowedYear}`);
}

/**
 * Chạy data retention policy
 */
export async function runDataRetention(): Promise<void> {
    await archiveOldDailyData();
    await archiveOldMonthlyData();

    // Update metadata
    await db.metadata.put({
        key: 'last_retention_run',
        value: new Date().toISOString(),
        updated_at: new Date()
    });
}

// ============= METADATA HELPERS =============

export async function getMetadata(key: string): Promise<Metadata | undefined> {
    return db.metadata.get(key);
}

export async function setMetadata(key: string, value: string | number | boolean | null): Promise<void> {
    await db.metadata.put({
        key,
        value,
        updated_at: new Date()
    });
}
