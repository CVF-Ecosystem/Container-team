import { db, VesselData } from '@/lib/db';
import { logger } from '@/lib/logger';
import { parseVesselExcelPerVessel } from '@/lib/vesselParser';
import * as XLSX from '@e965/xlsx';

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

// Import từ Excel — mỗi tàu 1 record riêng, populate vessel master list
export async function importVesselReportsFromExcel(file: File): Promise<{ count: number, errors: string[], periods: string[] }> {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const parsedData = parseVesselExcelPerVessel(workbook);
        if (parsedData.length === 0) {
            return { count: 0, errors: ['Không tìm thấy dữ liệu tàu trong file'], periods: [] };
        }

        logger.debug(`Parsed ${parsedData.length} vessel records from Excel`);

        let imported = 0;
        let updated = 0;
        const errors: string[] = [];

        for (const row of parsedData) {
            try {
                // Dedup: 1 tàu / 1 ngày (vessel_name + date)
                const existing = row.vessel_name
                    ? await db.vessel_data
                        .where('vessel_name')
                        .equals(row.vessel_name)
                        .filter(v => v.date === row.date)
                        .first()
                    : undefined;

                const raw: Omit<VesselData, 'id'> = {
                    stt: row.stt,
                    vessel_name: row.vessel_name,
                    voyage: row.voyage,
                    shipping_line: row.shipping_line,
                    atb: row.atb,
                    atw: row.atw,
                    atc: row.atc,
                    atd: row.atd,
                    date: row.date,
                    day: row.day,
                    month: row.month,
                    year: row.year,
                    nhap_tau: row.nhap_tau,
                    xuat_tau: row.xuat_tau,
                    shift_in: row.shift_in,
                    shift_out: row.shift_out,
                    total_moves: row.nhap_tau + row.xuat_tau + row.shift_in + row.shift_out,
                    teus: row.teus ?? 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                };

                // Compute productivity metrics (moves_per_hour = total / (ATC-ATW))
                const metrics = calculateProductivity(raw);
                const vesselData: Omit<VesselData, 'id'> = {
                    ...raw,
                    moves_per_hour: metrics.moves_per_hour,
                    teus_per_hour: metrics.teus_per_hour,
                    working_hours: metrics.working_hours,
                    berth_hours: metrics.berth_hours,
                };

                if (existing?.id) {
                    await db.vessel_data.put({ ...vesselData, id: existing.id, updated_at: new Date() });
                    updated++;
                } else {
                    await db.vessel_data.add(vesselData);
                    imported++;
                }
            } catch (err) {
                errors.push(`${row.vessel_name} ${row.date}: ${err}`);
            }
        }

        // Populate vessels master list with unique names
        const uniqueNames = [...new Set(
            parsedData.map(d => d.vessel_name).filter((n): n is string => Boolean(n))
        )];
        for (const name of uniqueNames) {
            const exists = await db.vessels.where('name').equals(name).count();
            if (!exists) {
                await db.vessels.add({ name, active: true });
            }
        }

        const periods = Array.from(
            new Set(parsedData.map(d => `${d.month}/${d.year}`))
        ).sort((a, b) => {
            const [am, ay] = a.split('/').map(Number);
            const [bm, by] = b.split('/').map(Number);
            return ay !== by ? ay - by : am - bm;
        });

        return { count: imported + updated, errors, periods };
    } catch (error) {
        logger.error('importVesselReportsFromExcel failed', error);
        throw error;
    }
}
