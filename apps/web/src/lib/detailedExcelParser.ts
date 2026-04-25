/**
 * Detailed Excel Parser
 * Parse chi tiết phương án từ file Excel - RIÊNG BIỆT với parser cũ
 * 
 * File: So lieu ngay_thang.xlsx
 * Columns XE (index 0-based):
 *  - 9: HB (Hạ bãi)
 *  - 10: TR (Trả rỗng)
 *  - 11: Tổng Hạ = HB + TR
 *  - 12: LN (Lấy nguyên)
 *  - 13: CR (Cấp rỗng)
 *  - 14: Tổng Giao = LN + CR
 *  - 15: ĐH (Đóng hàng Full)
 *  - 16: RR (Rút ruột Full)
 *  - 17: Tổng F CFS
 *  - 18: EĐH (Đóng hàng Empty)
 *  - 19: ERR (Rút ruột Empty)
 *  - 20: Tổng E CFS
 * 
 * Columns XALAN (index 0-based):
 *  - 25: HB
 *  - 26: TR
 *  - 27: Tổng Hạ
 *  - 28: LN
 *  - 29: CR
 *  - 30: Tổng Giao
 *  - 31: ĐH
 *  - 32: RR
 *  - 33: Tổng F CFS
 *  - 34: EĐH
 *  - 35: ERR
 *  - 36: Tổng E CFS
 */

import * as XLSX from '@e965/xlsx';
import { db } from './db';

export interface DetailedDayData {
    day: number;
    month: number;
    year: number;
    date: string;

    // XE chi tiết
    xe_hb: number;
    xe_tr: number;
    xe_ha: number;      // = xe_hb + xe_tr
    xe_ln: number;
    xe_cr: number;
    xe_giao: number;    // = xe_ln + xe_cr
    xe_dh: number;
    xe_rr: number;
    xe_cfs: number;     // Full CFS
    xe_dh_empty: number;
    xe_rr_empty: number;
    xe_cfs_empty: number;
    xe_total: number;

    // XALAN chi tiết
    xalan_hb: number;
    xalan_tr: number;
    xalan_ha: number;
    xalan_ln: number;
    xalan_cr: number;
    xalan_giao: number;
    xalan_dh: number;
    xalan_rr: number;
    xalan_cfs: number;
    xalan_dh_empty: number;
    xalan_rr_empty: number;
    xalan_cfs_empty: number;
    xalan_total: number;

    // Tổng
    total: number;
}

/**
 * Parse file ngày_tháng với chi tiết phương án
 * Chỉ dùng cho Inventory module, KHÔNG ảnh hưởng Dashboard
 */
export function parseDetailedNgayThang(
    workbook: XLSX.WorkBook,
    targetYear: number,
    targetMonth: number
): DetailedDayData[] {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const data: DetailedDayData[] = [];

    const getValue = (row: number, col: number): number => {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) return 0;
        const val = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
    };

    // Tìm header row
    let headerRow = 2;
    for (let r = 0; r <= 10; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
        if (cell && String(cell.v || '').toUpperCase().includes('CA')) {
            headerRow = r;
            break;
        }
    }

    let currentDay = 0;

    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const dayCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        const caCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];

        // Cập nhật ngày
        if (dayCell) {
            const dayVal = String(dayCell.v || '').trim();
            const match = dayVal.match(/\d+/);
            if (match) {
                currentDay = parseInt(match[0], 10);
            }
        }

        if (!currentDay) continue;

        const ca = caCell ? String(caCell.v || '').trim().toUpperCase() : '';

        // Chỉ lấy dòng TC (Tổng cộng)
        if (ca !== 'TC') continue;

        // === XE chi tiết ===
        const xe_hb = getValue(r, 9);
        const xe_tr = getValue(r, 10);
        const xe_ha = getValue(r, 11) || (xe_hb + xe_tr);
        const xe_ln = getValue(r, 12);
        const xe_cr = getValue(r, 13);
        const xe_giao = getValue(r, 14) || (xe_ln + xe_cr);
        const xe_dh = getValue(r, 15);
        const xe_rr = getValue(r, 16);
        const xe_cfs = getValue(r, 17) || (xe_dh + xe_rr);
        const xe_dh_empty = getValue(r, 18);
        const xe_rr_empty = getValue(r, 19);
        const xe_cfs_empty = getValue(r, 20) || (xe_dh_empty + xe_rr_empty);
        const xe_total = xe_ha + xe_giao + xe_cfs;

        // === XALAN chi tiết ===
        const xalan_hb = getValue(r, 25);
        const xalan_tr = getValue(r, 26);
        const xalan_ha = getValue(r, 27) || (xalan_hb + xalan_tr);
        const xalan_ln = getValue(r, 28);
        const xalan_cr = getValue(r, 29);
        const xalan_giao = getValue(r, 30) || (xalan_ln + xalan_cr);
        const xalan_dh = getValue(r, 31);
        const xalan_rr = getValue(r, 32);
        const xalan_cfs = getValue(r, 33) || (xalan_dh + xalan_rr);
        const xalan_dh_empty = getValue(r, 34);
        const xalan_rr_empty = getValue(r, 35);
        const xalan_cfs_empty = getValue(r, 36) || (xalan_dh_empty + xalan_rr_empty);
        const xalan_total = xalan_ha + xalan_giao + xalan_cfs;

        const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

        data.push({
            day: currentDay,
            month: targetMonth,
            year: targetYear,
            date: dateStr,
            xe_hb, xe_tr, xe_ha, xe_ln, xe_cr, xe_giao,
            xe_dh, xe_rr, xe_cfs, xe_dh_empty, xe_rr_empty, xe_cfs_empty, xe_total,
            xalan_hb, xalan_tr, xalan_ha, xalan_ln, xalan_cr, xalan_giao,
            xalan_dh, xalan_rr, xalan_cfs, xalan_dh_empty, xalan_rr_empty, xalan_cfs_empty, xalan_total,
            total: xe_total + xalan_total
        });
    }

    return data;
}

/**
 * Cập nhật DailyData trong IndexedDB với chi tiết phương án
 * CHỈ update các fields mới, KHÔNG ảnh hưởng fields cũ
 */
export async function updateDailyDataWithDetails(
    detailedData: DetailedDayData[]
): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const detail of detailedData) {
        try {
            // Tìm record hiện có
            const existing = await db.daily_data
                .where('[year+month+day]')
                .equals([detail.year, detail.month, detail.day])
                .first();

            if (existing?.id) {
                // Chỉ update chi tiết, giữ nguyên tổng hợp cũ
                await db.daily_data.update(existing.id, {
                    xe_hb: detail.xe_hb,
                    xe_tr: detail.xe_tr,
                    xe_ln: detail.xe_ln,
                    xe_cr: detail.xe_cr,
                    xe_dh: detail.xe_dh,
                    xe_rr: detail.xe_rr,
                    xe_dh_empty: detail.xe_dh_empty,
                    xe_rr_empty: detail.xe_rr_empty,
                    xalan_hb: detail.xalan_hb,
                    xalan_tr: detail.xalan_tr,
                    xalan_ln: detail.xalan_ln,
                    xalan_cr: detail.xalan_cr,
                    xalan_dh: detail.xalan_dh,
                    xalan_rr: detail.xalan_rr,
                    xalan_dh_empty: detail.xalan_dh_empty,
                    xalan_rr_empty: detail.xalan_rr_empty,
                    updated_at: new Date()
                });
                updated++;
            }
        } catch (err) {
            errors.push(`Ngày ${detail.day}/${detail.month}: ${err}`);
        }
    }

    return { updated, errors };
}

/**
 * Parse file từ File object và tự động update DB
 */
export async function importDetailedExcel(
    file: File,
    year: number,
    month: number
): Promise<{ success: boolean; message: string; updated: number }> {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const detailedData = parseDetailedNgayThang(workbook, year, month);

        if (detailedData.length === 0) {
            return { success: false, message: 'Không tìm thấy dữ liệu chi tiết', updated: 0 };
        }

        const result = await updateDailyDataWithDetails(detailedData);

        if (result.errors.length > 0) {
            console.warn('Lỗi khi cập nhật chi tiết:', result.errors);
        }

        return {
            success: true,
            message: `Đã cập nhật chi tiết cho ${result.updated} ngày`,
            updated: result.updated
        };
    } catch (err) {
        return {
            success: false,
            message: `Lỗi: ${err}`,
            updated: 0
        };
    }
}
