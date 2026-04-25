/**
 * Database Backup Service
 * Export/Import IndexedDB data to JSON and Excel
 */

import { db, DailyData, MonthlySummary, YearlySummary } from './db';
import { logger } from './logger';
import * as XLSX from '@e965/xlsx';

type BackupExcelRow = Record<string, string | number | undefined>;

// Types for backup data
export interface DatabaseBackup {
    version: string;
    exportDate: string;
    data: {
        daily: DailyData[];
        monthly: MonthlySummary[];
        yearly: YearlySummary[];
    };
    metadata: {
        totalDailyRecords: number;
        totalMonthlyRecords: number;
        totalYearlyRecords: number;
        years: number[];
    };
}

// ============= EXPORT FUNCTIONS =============

export interface ExportOptions {
    years?: number[];  // Filter by specific years, undefined = all
}

/**
 * Export toàn bộ database ra JSON
 */
export async function exportToJSON(options?: ExportOptions): Promise<string> {
    let daily = await db.daily_data.toArray();
    let monthly = await db.monthly_summary.toArray();
    let yearly = await db.yearly_summary.toArray();

    // Filter by years if specified
    if (options?.years && options.years.length > 0) {
        daily = daily.filter(d => options.years!.includes(d.year));
        monthly = monthly.filter(d => options.years!.includes(d.year));
        yearly = yearly.filter(d => options.years!.includes(d.year));
    }

    const years = [...new Set([
        ...daily.map(d => d.year),
        ...monthly.map(d => d.year),
        ...yearly.map(d => d.year),
    ])].sort();

    const backup: DatabaseBackup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
            daily,
            monthly,
            yearly,
        },
        metadata: {
            totalDailyRecords: daily.length,
            totalMonthlyRecords: monthly.length,
            totalYearlyRecords: yearly.length,
            years,
        },
    };

    return JSON.stringify(backup, null, 2);
}

// ============= FILE SYSTEM ACCESS API =============

// Store for directory handle
let savedDirectoryHandle: FileSystemDirectoryHandle | null = null;
const BACKUP_FOLDER_KEY = 'backup_folder_name';

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Get saved backup folder name (display only)
 */
export function getSavedBackupFolderName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(BACKUP_FOLDER_KEY);
}

/**
 * Pick a directory for backup and save handle
 */
export async function pickBackupFolder(): Promise<{ success: boolean; folderName?: string; error?: string }> {
    if (!isFileSystemAccessSupported()) {
        return { success: false, error: 'Trình duyệt không hỗ trợ chọn folder. Vui lòng dùng Chrome/Edge.' };
    }

    try {
        // @ts-expect-error - File System Access API is not fully typed in all TS DOM targets.
        savedDirectoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'downloads',
        });

        if (savedDirectoryHandle) {
            localStorage.setItem(BACKUP_FOLDER_KEY, savedDirectoryHandle.name);
            return { success: true, folderName: savedDirectoryHandle.name };
        }
        return { success: false, error: 'Không thể chọn folder' };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return { success: false, error: 'Đã hủy chọn folder' };
        }
        return { success: false, error: error instanceof Error ? error.message : 'Không thể chọn folder' };
    }
}

/**
 * Save file to selected directory or fallback to download
 */
async function saveToDirectory(content: string | Blob, filename: string): Promise<boolean> {
    if (!savedDirectoryHandle) {
        return false; // No directory selected, use fallback
    }

    try {
        // Request permission again if needed
        // @ts-expect-error - File System Access API permission typing varies by TS DOM target.
        const permission = await savedDirectoryHandle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            logger.warn('Backup folder permission denied, using download fallback');
            return false;
        }

        // Create file in directory
        const fileHandle = await savedDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();

        if (typeof content === 'string') {
            await writable.write(content);
        } else {
            await writable.write(content);
        }

        await writable.close();
        logger.info('Backup saved to selected folder', {
            folder: savedDirectoryHandle.name,
            filename,
        });
        return true;
    } catch (error) {
        console.error('[Backup] Save to directory failed:', error);
        return false;
    }
}

/**
 * Clear saved directory (reset to download mode)
 */
export function clearBackupFolder(): void {
    savedDirectoryHandle = null;
    localStorage.removeItem(BACKUP_FOLDER_KEY);
}

/**
 * Download JSON backup file - tries File System API first, then fallback
 */
export async function downloadJSONBackup(options?: ExportOptions): Promise<void> {
    const jsonData = await exportToJSON(options);
    const yearLabel = options?.years?.length ? `_${options.years.join('-')}` : '';
    const filename = `backup_container${yearLabel}_${new Date().toISOString().split('T')[0]}.json`;

    // Try to save to selected directory first
    if (savedDirectoryHandle) {
        const saved = await saveToDirectory(jsonData, filename);
        if (saved) return;
    }

    // Fallback to browser download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export database ra Excel (multiple sheets)
 */
export async function downloadExcelBackup(options?: ExportOptions): Promise<void> {
    let daily = await db.daily_data.toArray();
    let monthly = await db.monthly_summary.toArray();
    let yearly = await db.yearly_summary.toArray();

    // Filter by years if specified
    if (options?.years && options.years.length > 0) {
        daily = daily.filter(d => options.years!.includes(d.year));
        monthly = monthly.filter(d => options.years!.includes(d.year));
        yearly = yearly.filter(d => options.years!.includes(d.year));
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Daily Data
    if (daily.length > 0) {
        const dailySheet = daily.map(d => ({
            'Ngày': d.day,
            'Tháng': d.month,
            'Năm': d.year,
            'XE Hạ': d.xe_ha,
            'XE Giao': d.xe_giao,
            'XE CFS': d.xe_cfs,
            'XE Tổng': d.xe_total,
            'XALAN Hạ': d.xalan_ha,
            'XALAN Giao': d.xalan_giao,
            'XALAN CFS': d.xalan_cfs,
            'XALAN Tổng': d.xalan_total,
            'Tổng Vào': d.total_in,
            'Tổng Ra': d.total_out,
            'Tổng CFS': d.total_cfs,
            'Tổng': d.total,
        }));
        const ws1 = XLSX.utils.json_to_sheet(dailySheet);
        XLSX.utils.book_append_sheet(wb, ws1, 'Dữ Liệu Ngày');
    }

    // Sheet 2: Monthly Summary
    if (monthly.length > 0) {
        const monthlySheet = monthly.map(d => ({
            'Tháng': d.month,
            'Năm': d.year,
            'Quý': d.quarter,
            'XE Hạ': d.xe_ha,
            'XE Giao': d.xe_giao,
            'XE CFS': d.xe_cfs,
            'XE Tổng': d.xe_total,
            'XALAN Hạ': d.xalan_ha,
            'XALAN Giao': d.xalan_giao,
            'XALAN CFS': d.xalan_cfs,
            'XALAN Tổng': d.xalan_total,
            'Tổng Vào': d.total_in,
            'Tổng Ra': d.total_out,
            'Tổng CFS': d.total_cfs,
            'Tổng': d.total,
            'YoY %': d.yoy_change_percent?.toFixed(1) || '-',
        }));
        const ws2 = XLSX.utils.json_to_sheet(monthlySheet);
        XLSX.utils.book_append_sheet(wb, ws2, 'Tổng Hợp Tháng');
    }

    // Sheet 3: Yearly Summary
    if (yearly.length > 0) {
        const yearlySheet = yearly.map(d => ({
            'Năm': d.year,
            'XE Hạ': d.xe_ha,
            'XE Giao': d.xe_giao,
            'XE CFS': d.xe_cfs,
            'XE Tổng': d.xe_total,
            'XALAN Hạ': d.xalan_ha,
            'XALAN Giao': d.xalan_giao,
            'XALAN CFS': d.xalan_cfs,
            'XALAN Tổng': d.xalan_total,
            'Tổng Vào': d.total_in,
            'Tổng Ra': d.total_out,
            'Tổng CFS': d.total_cfs,
            'Tổng': d.total,
        }));
        const ws3 = XLSX.utils.json_to_sheet(yearlySheet);
        XLSX.utils.book_append_sheet(wb, ws3, 'Tổng Hợp Năm');
    }

    // Download
    const yearLabel = options?.years?.length ? `_${options.years.join('-')}` : '';
    const filename = `backup_container${yearLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ============= IMPORT FUNCTIONS =============

/**
 * Import database từ JSON file
 */
export async function importFromJSON(jsonString: string): Promise<{
    success: boolean;
    message: string;
    imported?: { daily: number; monthly: number; yearly: number };
}> {
    try {
        const backup: DatabaseBackup = JSON.parse(jsonString);

        // Validate structure
        if (!backup.version || !backup.data) {
            return { success: false, message: 'File backup không hợp lệ' };
        }

        // Clear existing data
        await db.daily_data.clear();
        await db.monthly_summary.clear();
        await db.yearly_summary.clear();

        // Import data
        let dailyCount = 0;
        let monthlyCount = 0;
        let yearlyCount = 0;

        if (backup.data.daily && backup.data.daily.length > 0) {
            // Remove id to let Dexie auto-generate
            const dailyData = backup.data.daily.map(({ id: _id, ...rest }) => rest);
            dailyCount = await db.daily_data.bulkAdd(dailyData as DailyData[]);
        }

        if (backup.data.monthly && backup.data.monthly.length > 0) {
            const monthlyData = backup.data.monthly.map(({ id: _id, ...rest }) => rest);
            monthlyCount = await db.monthly_summary.bulkAdd(monthlyData as MonthlySummary[]);
        }

        if (backup.data.yearly && backup.data.yearly.length > 0) {
            const yearlyData = backup.data.yearly.map(({ id: _id, ...rest }) => rest);
            yearlyCount = await db.yearly_summary.bulkAdd(yearlyData as YearlySummary[]);
        }

        return {
            success: true,
            message: `Import thành công! Ngày: ${dailyCount}, Tháng: ${monthlyCount}, Năm: ${yearlyCount}`,
            imported: { daily: dailyCount, monthly: monthlyCount, yearly: yearlyCount },
        };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, message: 'Lỗi đọc file JSON: ' + (error as Error).message };
    }
}

/**
 * Import database từ Excel backup file
 */
export async function importFromExcel(file: File): Promise<{
    success: boolean;
    message: string;
    imported?: { daily: number; monthly: number; yearly: number };
}> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                let dailyCount = 0;
                let monthlyCount = 0;
                let yearlyCount = 0;

                // Process Daily sheet
                if (workbook.SheetNames.includes('Dữ Liệu Ngày')) {
                    const sheet = workbook.Sheets['Dữ Liệu Ngày'];
                    const rows = XLSX.utils.sheet_to_json<BackupExcelRow>(sheet);

                    if (rows.length > 0) {
                        await db.daily_data.clear();
                        const dailyData: Omit<DailyData, 'id'>[] = rows.map((row) => {
                            const day = Number(row['Ngày']) || 0;
                            const month = Number(row['Tháng']) || 0;
                            const year = Number(row['Năm']) || 0;
                            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            return {
                                date: dateStr,
                                day,
                                month,
                                year,
                                xe_ha: Number(row['XE Hạ']) || 0,
                                xe_giao: Number(row['XE Giao']) || 0,
                                xe_cfs: Number(row['XE CFS']) || 0,
                                xe_total: Number(row['XE Tổng']) || 0,
                                xalan_ha: Number(row['XALAN Hạ']) || 0,
                                xalan_giao: Number(row['XALAN Giao']) || 0,
                                xalan_cfs: Number(row['XALAN CFS']) || 0,
                                xalan_total: Number(row['XALAN Tổng']) || 0,
                                total_in: Number(row['Tổng Vào']) || 0,
                                total_out: Number(row['Tổng Ra']) || 0,
                                total_cfs: Number(row['Tổng CFS']) || 0,
                                total: Number(row['Tổng']) || 0,
                                created_at: new Date(),
                                updated_at: new Date(),
                            };
                        });
                        dailyCount = await db.daily_data.bulkAdd(dailyData as DailyData[]);
                    }
                }

                // Process Monthly sheet
                if (workbook.SheetNames.includes('Tổng Hợp Tháng')) {
                    const sheet = workbook.Sheets['Tổng Hợp Tháng'];
                    const rows = XLSX.utils.sheet_to_json<BackupExcelRow>(sheet);

                    if (rows.length > 0) {
                        await db.monthly_summary.clear();
                        const monthlyData: Omit<MonthlySummary, 'id'>[] = rows.map((row) => ({
                            month: Number(row['Tháng']) || 0,
                            year: Number(row['Năm']) || 0,
                            quarter: Number(row['Quý']) || Math.ceil((Number(row['Tháng']) || 0) / 3),
                            xe_ha: Number(row['XE Hạ']) || 0,
                            xe_giao: Number(row['XE Giao']) || 0,
                            xe_cfs: Number(row['XE CFS']) || 0,
                            xe_total: Number(row['XE Tổng']) || 0,
                            xalan_ha: Number(row['XALAN Hạ']) || 0,
                            xalan_giao: Number(row['XALAN Giao']) || 0,
                            xalan_cfs: Number(row['XALAN CFS']) || 0,
                            xalan_total: Number(row['XALAN Tổng']) || 0,
                            total_in: Number(row['Tổng Vào']) || 0,
                            total_out: Number(row['Tổng Ra']) || 0,
                            total_cfs: Number(row['Tổng CFS']) || 0,
                            total: Number(row['Tổng']) || 0,
                            yoy_change_percent: row['YoY %'] !== '-' ? Number(row['YoY %']) : undefined,
                            created_at: new Date(),
                            updated_at: new Date(),
                        }));
                        monthlyCount = await db.monthly_summary.bulkAdd(monthlyData as MonthlySummary[]);
                    }
                }

                // Process Yearly sheet
                if (workbook.SheetNames.includes('Tổng Hợp Năm')) {
                    const sheet = workbook.Sheets['Tổng Hợp Năm'];
                    const rows = XLSX.utils.sheet_to_json<BackupExcelRow>(sheet);

                    if (rows.length > 0) {
                        await db.yearly_summary.clear();
                        const yearlyData: Omit<YearlySummary, 'id'>[] = rows.map((row) => ({
                            year: Number(row['Năm']) || 0,
                            xe_ha: Number(row['XE Hạ']) || 0,
                            xe_giao: Number(row['XE Giao']) || 0,
                            xe_cfs: Number(row['XE CFS']) || 0,
                            xe_total: Number(row['XE Tổng']) || 0,
                            xalan_ha: Number(row['XALAN Hạ']) || 0,
                            xalan_giao: Number(row['XALAN Giao']) || 0,
                            xalan_cfs: Number(row['XALAN CFS']) || 0,
                            xalan_total: Number(row['XALAN Tổng']) || 0,
                            total_in: Number(row['Tổng Vào']) || 0,
                            total_out: Number(row['Tổng Ra']) || 0,
                            total_cfs: Number(row['Tổng CFS']) || 0,
                            total: Number(row['Tổng']) || 0,
                            created_at: new Date(),
                            updated_at: new Date(),
                        }));
                        yearlyCount = await db.yearly_summary.bulkAdd(yearlyData as YearlySummary[]);
                    }
                }

                resolve({
                    success: true,
                    message: `Import thành công! Ngày: ${dailyCount}, Tháng: ${monthlyCount}, Năm: ${yearlyCount}`,
                    imported: { daily: dailyCount, monthly: monthlyCount, yearly: yearlyCount },
                });
            } catch (error) {
                console.error('Excel import error:', error);
                resolve({ success: false, message: 'Lỗi đọc file Excel: ' + (error as Error).message });
            }
        };

        reader.onerror = () => {
            resolve({ success: false, message: 'Lỗi đọc file' });
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
    daily: number;
    monthly: number;
    yearly: number;
    years: number[];
    lastBackup?: string;
}> {
    const daily = await db.daily_data.count();
    const monthly = await db.monthly_summary.count();
    const yearly = await db.yearly_summary.count();

    const allYears = await db.monthly_summary.orderBy('year').uniqueKeys() as number[];

    return {
        daily,
        monthly,
        yearly,
        years: allYears,
    };
}

// ============= AUTO BACKUP FUNCTIONS =============

const AUTO_BACKUP_KEY = 'auto_backup_enabled';
const LAST_AUTO_BACKUP_KEY = 'last_auto_backup';
const BACKUP_INTERVAL_DAYS = 7; // 1 week

/**
 * Check if auto backup is enabled
 */
export function isAutoBackupEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_BACKUP_KEY) === 'true';
}

/**
 * Toggle auto backup setting
 */
export function setAutoBackupEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
}

/**
 * Get last auto backup date
 */
export function getLastAutoBackup(): Date | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    return stored ? new Date(stored) : null;
}

/**
 * Set last auto backup date
 */
export function setLastAutoBackup(date: Date): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, date.toISOString());
}

/**
 * Check if auto backup is due (more than 7 days since last backup)
 */
export function isAutoBackupDue(): boolean {
    if (!isAutoBackupEnabled()) return false;

    const lastBackup = getLastAutoBackup();
    if (!lastBackup) return true; // Never backed up

    const daysSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceBackup >= BACKUP_INTERVAL_DAYS;
}

/**
 * Run auto backup if due
 * Returns true if backup was performed
 */
export async function runAutoBackupIfDue(): Promise<boolean> {
    if (!isAutoBackupDue()) return false;

    try {
        await downloadJSONBackup();
        setLastAutoBackup(new Date());
        logger.info('Weekly auto backup completed');
        return true;
    } catch (error) {
        console.error('[Auto Backup] Failed:', error);
        return false;
    }
}

/**
 * Get auto backup status info
 */
export function getAutoBackupStatus(): {
    enabled: boolean;
    lastBackup: Date | null;
    nextBackup: Date | null;
    isDue: boolean;
} {
    const enabled = isAutoBackupEnabled();
    const lastBackup = getLastAutoBackup();

    let nextBackup: Date | null = null;
    if (enabled && lastBackup) {
        nextBackup = new Date(lastBackup.getTime() + BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    }

    return {
        enabled,
        lastBackup,
        nextBackup,
        isDue: isAutoBackupDue(),
    };
}
