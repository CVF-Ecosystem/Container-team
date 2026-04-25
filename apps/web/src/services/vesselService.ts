import { db, VesselData } from '@/lib/db';
import { logger } from '@/lib/logger';
import * as XLSX from '@e965/xlsx';

type ExcelRow = unknown[];

// Tính toán các chỉ số năng suất
export function calculateProductivity(data: Partial<VesselData>): Partial<VesselData> {
    const totalMoves = (Number(data.nhap_tau) || 0) +
        (Number(data.xuat_tau) || 0) +
        (Number(data.shift_in) || 0) +
        (Number(data.shift_out) || 0);

    let workingHours = 0;
    let berthHours = 0;
    let movesPerHour = 0;
    let teusPerHour = 0;

    // Calculate Working Hours (ATC - ATW)
    if (data.atw && data.atc) {
        const atwDate = new Date(data.atw);
        const atcDate = new Date(data.atc);
        if (!isNaN(atwDate.getTime()) && !isNaN(atcDate.getTime())) {
            const diffMs = atcDate.getTime() - atwDate.getTime();
            workingHours = diffMs / (1000 * 60 * 60); // hours
            workingHours = Math.round(workingHours * 100) / 100; // round to 2 decimals

            if (workingHours > 0) {
                movesPerHour = totalMoves / workingHours;
                movesPerHour = Math.round(movesPerHour * 100) / 100;

                if (data.teus) {
                    teusPerHour = Number(data.teus) / workingHours;
                    teusPerHour = Math.round(teusPerHour * 100) / 100;
                }
            }
        }
    }

    // Calculate Berth Hours (ATD - ATB)
    if (data.atb && data.atd) {
        const atbDate = new Date(data.atb);
        const atdDate = new Date(data.atd);
        if (!isNaN(atbDate.getTime()) && !isNaN(atdDate.getTime())) {
            const diffMs = atdDate.getTime() - atbDate.getTime();
            berthHours = diffMs / (1000 * 60 * 60);
            berthHours = Math.round(berthHours * 100) / 100;
        }
    }

    return {
        ...data,
        total_moves: totalMoves,
        working_hours: workingHours,
        berth_hours: berthHours,
        moves_per_hour: movesPerHour,
        teus_per_hour: teusPerHour
    };
}

// Lưu báo cáo tàu
export async function saveVesselReport(data: VesselData): Promise<number> {
    // Add date parsing if only atb/atw provided
    // Add date parsing if only atb/atw provided
    let reportDate = new Date();
    if (data.atb) {
        reportDate = new Date(data.atb);
    } else if (data.atw) {
        reportDate = new Date(data.atw);
    } else if (data.atc) {
        reportDate = new Date(data.atc);
    } else if (data.atd) {
        reportDate = new Date(data.atd);
    } else if (data.date) {
        reportDate = new Date(data.date);
    }

    const calculatedData = calculateProductivity(data);

    const reportToSave: VesselData = {
        ...data,
        ...calculatedData,
        date: reportDate.toISOString().split('T')[0],
        year: reportDate.getFullYear(),
        month: reportDate.getMonth() + 1,
        day: reportDate.getDate(),
        updated_at: new Date(),
        created_at: data.created_at || new Date()
    } as VesselData;

    return await db.vessel_data.put(reportToSave);
}

// Lấy danh sách báo cáo
export interface VesselFilter {
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    vesselName?: string;
    shippingLine?: string;
}

export async function getVesselReports(filter: VesselFilter): Promise<VesselData[]> {
    const collection = db.vessel_data.orderBy('date').reverse();

    if (filter.month && filter.year) {
        // Filter by month+year (using compound index logic or manual filter)
        // Since we defined [year+month] index:
        return await db.vessel_data
            .where('[year+month]')
            .equals([filter.year, filter.month])
            .reverse()
            .toArray();
    }

    if (filter.year) {
        return await db.vessel_data
            .where('year')
            .equals(filter.year)
            .reverse()
            .toArray();
    }

    let results = await collection.toArray();

    // Clientside filtering for other params
    if (filter.vesselName) {
        const term = filter.vesselName.toLowerCase();
        results = results.filter((r: VesselData) => r.vessel_name?.toLowerCase().includes(term));
    }

    if (filter.shippingLine) {
        const term = filter.shippingLine.toLowerCase();
        results = results.filter((r: VesselData) => r.shipping_line?.toLowerCase().includes(term));
    }

    return results;
}

// Xóa báo cáo
export async function deleteVesselReport(id: number): Promise<void> {
    await db.vessel_data.delete(id);
}

// Xóa nhiều báo cáo
export async function deleteMultipleVesselReports(ids: number[]): Promise<void> {
    await db.vessel_data.bulkDelete(ids);
}

// Lấy danh sách hãng tàu duy nhất
export async function getUniqueShippingLines(): Promise<string[]> {
    const reports = await db.vessel_data.toArray();
    const lines = new Set<string>();
    reports.forEach((r: VesselData) => {
        if (r.shipping_line) lines.add(r.shipping_line);
    });
    return Array.from(lines).sort();
}

// Lấy danh sách tên tàu duy nhất
export async function getUniqueVesselNames(): Promise<string[]> {
    const reports = await db.vessel_data.toArray();
    const vessels = new Set<string>();
    reports.forEach((r: VesselData) => {
        if (r.vessel_name) vessels.add(r.vessel_name);
    });
    return Array.from(vessels).sort();
}

// Import từ Excel (sử dụng template chuẩn)
// Import từ Excel (sử dụng template chuẩn)
export async function importVesselReportsFromExcel(file: File): Promise<{ count: number, errors: string[], periods: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                // Enable cellDates to let XLSX parse dates automatically
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON with raw values
                const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { header: 1 });
                if (!jsonData || jsonData.length === 0) {
                    return resolve({ count: 0, errors: ['File empty'], periods: [] });
                }

                // Find header row (row containing 'Vessel' or 'Tàu')
                let headerRowIndex = 0;
                let headers: string[] = [];

                for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                    const row = jsonData[i].map(c => String(c).trim().toLowerCase());
                    if (row.some(c => c.includes('vessel') || c.includes('tên tàu') || c.includes('hãng'))) {
                        headerRowIndex = i;
                        headers = row;
                        break;
                    }
                }

                // If no header found, assume row 0 but warn in console
                if (headers.length === 0) {
                    console.warn('Could not find header row, assuming row 0');
                    headers = jsonData[0].map(c => String(c).trim().toLowerCase());
                }

                const rows = jsonData.slice(headerRowIndex + 1);
                logger.debug('Detected vessel import headers', headers);

                let successCount = 0;
                const errors: string[] = [];
                const importedPeriods = new Set<string>();

                // Map standard headers
                const valid = (idx: number) => idx !== -1;
                const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

                const colMap = {
                    vessel: findCol(['vessel', 'tên tàu', 'ten tau']),
                    voyage: findCol(['voyage', 'chuyến', 'chuyen']),
                    line: findCol(['line', 'hãng', 'hang']),
                    atb: findCol(['atb', 'arrival', 'cập']),
                    atw: findCol(['atw', 'làm hàng', 'lam hang']),
                    atc: findCol(['atc', 'hoàn thành', 'hoan thanh']),
                    atd: findCol(['atd', 'departure', 'rời']),
                    import: findCol(['import', 'nhập', 'nhap', 'discharge']),
                    export: findCol(['export', 'xuất', 'xuat', 'loading']),
                    shift: findCol(['shift', 'di chuyển']),
                    shiftIn: findCol(['shift in']),
                    shiftOut: findCol(['shift out']),
                    teus: findCol(['teu']),
                    remark: findCol(['remark', 'ghi chú', 'ghi chu', 'note']),
                    date: findCol(['date', 'ngày', 'ngay']) // Backup date column
                };

                // Helper to ensure number, fallback to 0
                const num = (val: unknown) => {
                    if (val === undefined || val === null || val === '') return 0;
                    const n = Number(val);
                    return isNaN(n) ? 0 : n;
                };

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;

                    // Skip empty rows (require Vessel Name or ATB or Voyage)
                    if (!valid(colMap.vessel) && !valid(colMap.atb) && !valid(colMap.voyage)) continue;
                    if (valid(colMap.vessel) && !row[colMap.vessel]) continue;

                    try {
                        // Calculate shifts
                        let sIn = 0;
                        let sOut = 0;

                        if (valid(colMap.shiftIn) && row[colMap.shiftIn] !== undefined) {
                            sIn = num(row[colMap.shiftIn]);
                        } else if (valid(colMap.shift) && row[colMap.shift] !== undefined) {
                            sIn = num(row[colMap.shift]) / 2;
                        }

                        if (valid(colMap.shiftOut) && row[colMap.shiftOut] !== undefined) {
                            sOut = num(row[colMap.shiftOut]);
                        } else if (valid(colMap.shift) && row[colMap.shift] !== undefined) {
                            sOut = num(row[colMap.shift]) / 2;
                        }

                        // Parse Dates
                        const atb = valid(colMap.atb) ? parseExcelDate(row[colMap.atb]) : undefined;
                        const atw = valid(colMap.atw) ? parseExcelDate(row[colMap.atw]) : undefined;
                        const atc = valid(colMap.atc) ? parseExcelDate(row[colMap.atc]) : undefined;
                        const atd = valid(colMap.atd) ? parseExcelDate(row[colMap.atd]) : undefined;

                        // Fallback Date Logic
                        // If ATB missing, try to use 'date' column, or today
                        let baseDate = new Date();
                        if (atb) baseDate = new Date(atb);
                        else if (valid(colMap.date)) {
                            const d = parseExcelDate(row[colMap.date]);
                            if (d) baseDate = new Date(d);
                        }

                        // Collect Period
                        const m = baseDate.getMonth() + 1;
                        const y = baseDate.getFullYear();
                        importedPeriods.add(`${m}/${y}`);

                        const vesselData: VesselData = {
                            date: '', // Will be set in saveVesselReport based on ATB or logic below
                            year: 0,
                            month: 0,
                            day: 0,
                            vessel_name: valid(colMap.vessel) ? String(row[colMap.vessel] ?? '') : 'Unknown',
                            voyage: valid(colMap.voyage) ? String(row[colMap.voyage] ?? '') : '',
                            shipping_line: valid(colMap.line) ? String(row[colMap.line] ?? '') : '',

                            atb, atw, atc, atd,

                            nhap_tau: valid(colMap.import) ? num(row[colMap.import]) : 0,
                            xuat_tau: valid(colMap.export) ? num(row[colMap.export]) : 0,
                            shift_in: sIn,
                            shift_out: sOut,

                            total_moves: 0, // Recalculated below
                            teus: valid(colMap.teus) ? num(row[colMap.teus]) : 0,
                            remark: valid(colMap.remark) ? String(row[colMap.remark] ?? '') : '',

                            created_at: new Date(),
                            updated_at: new Date()
                        };

                        // Recalculate total_moves explicitly before saving to be safe
                        // vesselData.total_moves -> Note: saveVesselReport will auto-calculate this via calculateProductivity

                        // Ensure saveVesselReport uses our discovered date if ATB is missing
                        vesselData.date = baseDate.toISOString().split('T')[0];

                        // Prevent Duplicates: Check if record exists
                        // Criteria: Same Vessel Name AND Same Voyage (if exists) OR Same ATB (if exists)
                        // If duplicates found, update existing ID
                        let existingItem;
                        const vVoyage = vesselData.voyage?.toLowerCase();

                        // Query all potentially matching vessels by name first (fastest index)
                        const candidates = await db.vessel_data.where('vessel_name').equals(vesselData.vessel_name || '').toArray();

                        // Refine match
                        // 1. By Voyage if available
                        if (vVoyage) {
                            existingItem = candidates.find(c => c.voyage?.toLowerCase() === vVoyage);
                        }
                        // 2. Fallback by ATB if no voyage or no match by voyage
                        if (!existingItem && vesselData.atb) {
                            existingItem = candidates.find(c => c.atb === vesselData.atb);
                        }

                        if (existingItem) {
                            vesselData.id = existingItem.id; // Update existing
                        }

                        await saveVesselReport(vesselData);
                        successCount++;
                    } catch (err) {
                        errors.push(`Row ${i + headerRowIndex + 2}: ${err}`);
                    }
                }

                resolve({ count: successCount, errors, periods: Array.from(importedPeriods) });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// Helper to parse dates from Excel (which can be strings or serial numbers)
function parseExcelDate(value: unknown): string | undefined {
    if (!value) return undefined;

    // 0. If it's already a Date object (thanks to cellDates: true)
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return undefined;
        // Convert to local ISO string YYYY-MM-DDTHH:mm:ss
        const offset = value.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(value.getTime() - offset)).toISOString().slice(0, -1);
        return localISOTime.split('.')[0];
    }

    // 1. If it's a number (Excel serial date) - Fallback
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            const p = (n: number) => n.toString().padStart(2, '0');
            const year = date.y < 100 ? date.y + 2000 : date.y;
            return `${year}-${p(date.m)}-${p(date.d)}T${p(date.H)}:${p(date.M)}:${p(date.S)}`;
        }
    }

    // 2. If it's a string
    if (typeof value === 'string') {
        const textStr = value.trim();
        if (!textStr) return undefined;

        // Try YYYY-MM-DD
        if (textStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            const date = new Date(textStr);
            if (!isNaN(date.getTime())) return date.toISOString().split('.')[0];
        }

        // Try DD/MM/YYYY
        const dmyMatch = textStr.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const mont = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            const hour = (dmyMatch[4] || '00').padStart(2, '0');
            const min = (dmyMatch[5] || '00').padStart(2, '0');
            const sec = (dmyMatch[6] || '00').padStart(2, '0');
            return `${year}-${mont}-${day}T${hour}:${min}:${sec}`;
        }
    }

    return undefined;
}
