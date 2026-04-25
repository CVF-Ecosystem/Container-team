/**
 * Data Service - CRUD và Aggregate functions cho ContainerDB
 */

import {
    db,
    DailyData,
    MonthlySummary,
    YearlySummary,
    getCurrentYear,
    getQuarter,
    runDataRetention,
    setMetadata
} from './db';

// ============= IMPORT FUNCTIONS =============

/**
 * Import dữ liệu ngày từ Excel vào DB
 */
export async function importDailyData(data: Omit<DailyData, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    const now = new Date();
    const enrichedData = data.map(d => ({
        ...d,
        created_at: now,
        updated_at: now,
    }));

    // Clear existing data for the same dates
    const dates = [...new Set(data.map(d => d.date))];
    await db.daily_data.where('date').anyOf(dates).delete();

    // Insert new data
    const count = await db.daily_data.bulkAdd(enrichedData);

    // Auto-generate monthly summaries
    await generateMonthlySummaries(data[0]?.year || getCurrentYear());

    // Run data retention
    await runDataRetention();

    await setMetadata('last_daily_import', now.toISOString());

    return count;
}

/**
 * Import dữ liệu tháng từ Excel vào DB (cho các năm trước)
 */
export async function importMonthlySummary(data: Omit<MonthlySummary, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    const now = new Date();
    const enrichedData = data.map(d => ({
        ...d,
        quarter: getQuarter(d.month),
        created_at: now,
        updated_at: now,
    }));

    // Clear existing data for the same year/month
    for (const d of data) {
        await db.monthly_summary.where({ year: d.year, month: d.month }).delete();
    }

    // Insert new data
    const count = await db.monthly_summary.bulkAdd(enrichedData);

    // Auto-generate yearly summaries
    const years = [...new Set(data.map(d => d.year))];
    for (const year of years) {
        await generateYearlySummary(year);
    }

    await setMetadata('last_monthly_import', now.toISOString());

    return count;
}

/**
 * Import dữ liệu năm vào DB
 */
export async function importYearlySummary(data: Omit<YearlySummary, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    const now = new Date();
    const enrichedData = data.map(d => ({
        ...d,
        created_at: now,
        updated_at: now,
    }));

    // Upsert
    for (const d of enrichedData) {
        const existing = await db.yearly_summary.where({ year: d.year }).first();
        if (existing) {
            await db.yearly_summary.update(existing.id!, d);
        } else {
            await db.yearly_summary.add(d);
        }
    }

    await setMetadata('last_yearly_import', now.toISOString());

    return data.length;
}

// ============= AGGREGATE FUNCTIONS =============

/**
 * Generate monthly summaries từ daily data
 */
export async function generateMonthlySummaries(year: number): Promise<void> {
    const dailyData = await db.daily_data.where({ year }).toArray();

    // Group by month
    const monthlyGroups = new Map<number, DailyData[]>();
    for (const d of dailyData) {
        if (!monthlyGroups.has(d.month)) {
            monthlyGroups.set(d.month, []);
        }
        monthlyGroups.get(d.month)!.push(d);
    }

    // Aggregate each month
    const now = new Date();
    for (const [month, days] of monthlyGroups) {
        const summary: Omit<MonthlySummary, 'id'> = {
            year,
            month,
            quarter: getQuarter(month),
            xe_ha: days.reduce((sum, d) => sum + d.xe_ha, 0),
            xe_giao: days.reduce((sum, d) => sum + d.xe_giao, 0),
            xe_cfs: days.reduce((sum, d) => sum + d.xe_cfs, 0),
            xe_total: days.reduce((sum, d) => sum + d.xe_total, 0),
            xalan_ha: days.reduce((sum, d) => sum + d.xalan_ha, 0),
            xalan_giao: days.reduce((sum, d) => sum + d.xalan_giao, 0),
            xalan_cfs: days.reduce((sum, d) => sum + d.xalan_cfs, 0),
            xalan_total: days.reduce((sum, d) => sum + d.xalan_total, 0),
            total_in: days.reduce((sum, d) => sum + d.total_in, 0),
            total_out: days.reduce((sum, d) => sum + d.total_out, 0),
            total_cfs: days.reduce((sum, d) => sum + d.total_cfs, 0),
            total: days.reduce((sum, d) => sum + d.total, 0),
            created_at: now,
            updated_at: now,
        };

        // Calculate YoY change
        const lastYearData = await db.monthly_summary.where({ year: year - 1, month }).first();
        if (lastYearData && lastYearData.total > 0) {
            summary.yoy_change_percent = ((summary.total - lastYearData.total) / lastYearData.total) * 100;
        }

        // Upsert
        const existing = await db.monthly_summary.where({ year, month }).first();
        if (existing) {
            await db.monthly_summary.update(existing.id!, summary);
        } else {
            await db.monthly_summary.add(summary);
        }
    }

    // Generate yearly summary
    await generateYearlySummary(year);
}

/**
 * Generate yearly summary từ monthly data
 */
export async function generateYearlySummary(year: number): Promise<void> {
    const monthlyData = await db.monthly_summary.where({ year }).toArray();
    if (monthlyData.length === 0) return;

    const now = new Date();
    const summary: Omit<YearlySummary, 'id'> = {
        year,
        xe_ha: monthlyData.reduce((sum, d) => sum + d.xe_ha, 0),
        xe_giao: monthlyData.reduce((sum, d) => sum + d.xe_giao, 0),
        xe_cfs: monthlyData.reduce((sum, d) => sum + d.xe_cfs, 0),
        xe_total: monthlyData.reduce((sum, d) => sum + d.xe_total, 0),
        xalan_ha: monthlyData.reduce((sum, d) => sum + d.xalan_ha, 0),
        xalan_giao: monthlyData.reduce((sum, d) => sum + d.xalan_giao, 0),
        xalan_cfs: monthlyData.reduce((sum, d) => sum + d.xalan_cfs, 0),
        xalan_total: monthlyData.reduce((sum, d) => sum + d.xalan_total, 0),
        total_in: monthlyData.reduce((sum, d) => sum + d.total_in, 0),
        total_out: monthlyData.reduce((sum, d) => sum + d.total_out, 0),
        total_cfs: monthlyData.reduce((sum, d) => sum + d.total_cfs, 0),
        total: monthlyData.reduce((sum, d) => sum + d.total, 0),
        created_at: now,
        updated_at: now,
    };

    // Upsert
    const existing = await db.yearly_summary.where({ year }).first();
    if (existing) {
        await db.yearly_summary.update(existing.id!, summary);
    } else {
        await db.yearly_summary.add(summary);
    }
}

// ============= QUERY FUNCTIONS =============

/**
 * Lấy dữ liệu ngày của năm hiện tại
 */
export async function getDailyData(year?: number, month?: number): Promise<DailyData[]> {
    try {
        let data: DailyData[];

        if (year !== undefined) {
            // Get all data for the year, then sort
            data = await db.daily_data.where('year').equals(year).toArray();
            data.sort((a, b) => a.date.localeCompare(b.date));
        } else {
            // Get all data ordered by date
            data = await db.daily_data.orderBy('date').toArray();
        }

        // Filter by month if specified
        if (month !== undefined) {
            data = data.filter(d => d.month === month);
        }

        return data;
    } catch (error) {
        console.error('[DB] Error fetching daily data:', error);
        return [];
    }
}

/**
 * Lấy dữ liệu tháng
 */
export async function getMonthlyData(year?: number): Promise<MonthlySummary[]> {
    try {
        let data: MonthlySummary[];

        if (year !== undefined) {
            data = await db.monthly_summary.where('year').equals(year).toArray();
            data.sort((a, b) => a.month - b.month);
        } else {
            data = await db.monthly_summary.toArray();
            data.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
        }

        return data;
    } catch (error) {
        console.error('[DB] Error fetching monthly data:', error);
        return [];
    }
}

/**
 * Lấy dữ liệu năm
 */
export async function getYearlyData(): Promise<YearlySummary[]> {
    return db.yearly_summary.orderBy('year').toArray();
}

/**
 * Lấy dữ liệu so sánh cùng kỳ (YoY) cho tháng
 */
export async function getYoYComparisonMonthly(month: number, years: number = 3): Promise<MonthlySummary[]> {
    const currentYear = getCurrentYear();
    const startYear = currentYear - years + 1;

    return db.monthly_summary
        .where('month').equals(month)
        .filter(d => d.year >= startYear && d.year <= currentYear)
        .sortBy('year');
}

/**
 * Lấy dữ liệu so sánh quý
 */
export async function getQuarterlyData(year?: number): Promise<{ quarter: number; year: number; total: number; xe_total: number; xalan_total: number }[]> {
    let monthlyData: MonthlySummary[];

    if (year !== undefined) {
        monthlyData = await db.monthly_summary.where({ year }).toArray();
    } else {
        monthlyData = await db.monthly_summary.toArray();
    }

    // Group by year and quarter
    const quarterlyMap = new Map<string, { quarter: number; year: number; total: number; xe_total: number; xalan_total: number }>();

    for (const m of monthlyData) {
        const key = `${m.year}-Q${m.quarter}`;
        if (!quarterlyMap.has(key)) {
            quarterlyMap.set(key, { quarter: m.quarter, year: m.year, total: 0, xe_total: 0, xalan_total: 0 });
        }
        const q = quarterlyMap.get(key)!;
        q.total += m.total;
        q.xe_total += m.xe_total;
        q.xalan_total += m.xalan_total;
    }

    return Array.from(quarterlyMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.quarter - b.quarter;
    });
}

/**
 * Lấy tổng lũy tiến (YTD - Year To Date)
 */
export async function getYTD(year: number): Promise<{ total: number; xe_total: number; xalan_total: number }> {
    const currentMonth = new Date().getMonth() + 1;
    const monthlyData = await db.monthly_summary
        .where({ year })
        .filter(d => d.month <= currentMonth)
        .toArray();

    return {
        total: monthlyData.reduce((sum, d) => sum + d.total, 0),
        xe_total: monthlyData.reduce((sum, d) => sum + d.xe_total, 0),
        xalan_total: monthlyData.reduce((sum, d) => sum + d.xalan_total, 0),
    };
}

/**
 * Lấy dữ liệu so sánh cùng kỳ (YoY) cho quý
 */
export async function getYoYComparisonQuarterly(quarter: number, years: number = 3): Promise<{ year: number; quarter: number; xe_total: number; xalan_total: number; total: number }[]> {
    const currentYear = getCurrentYear();
    const startYear = currentYear - years + 1;

    const results: { year: number; quarter: number; xe_total: number; xalan_total: number; total: number }[] = [];

    for (let year = startYear; year <= currentYear; year++) {
        const quarterMonths = getQuarterMonths(quarter);
        const monthlyData = await db.monthly_summary
            .where({ year })
            .filter(d => quarterMonths.includes(d.month))
            .toArray();

        if (monthlyData.length > 0) {
            results.push({
                year,
                quarter,
                xe_total: monthlyData.reduce((sum, d) => sum + d.xe_total, 0),
                xalan_total: monthlyData.reduce((sum, d) => sum + d.xalan_total, 0),
                total: monthlyData.reduce((sum, d) => sum + d.total, 0),
            });
        }
    }

    return results.sort((a, b) => a.year - b.year);
}

/**
 * Lấy dữ liệu so sánh năm (YoY)
 */
export async function getYoYComparisonYearly(years: number = 3): Promise<YearlySummary[]> {
    const currentYear = getCurrentYear();
    const startYear = currentYear - years + 1;

    return db.yearly_summary
        .filter(d => d.year >= startYear && d.year <= currentYear)
        .sortBy('year');
}

// Helper: Get months in quarter
function getQuarterMonths(quarter: number): number[] {
    switch (quarter) {
        case 1: return [1, 2, 3];
        case 2: return [4, 5, 6];
        case 3: return [7, 8, 9];
        case 4: return [10, 11, 12];
        default: return [];
    }
}

// ============= CLEAR FUNCTIONS =============

/**
 * Xóa tất cả dữ liệu
 */
export async function clearAllData(): Promise<void> {
    await db.daily_data.clear();
    await db.monthly_summary.clear();
    await db.yearly_summary.clear();
    await db.metadata.clear();
}

/**
 * Xóa dữ liệu của một năm cụ thể
 */
export async function clearYearData(year: number): Promise<void> {
    await db.daily_data.where({ year }).delete();
    await db.monthly_summary.where({ year }).delete();
    await db.yearly_summary.where({ year }).delete();
}
