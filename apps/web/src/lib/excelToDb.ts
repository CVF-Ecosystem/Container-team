/**
 * Excel to Database Converter
 * Chuyển đổi dữ liệu parse từ Excel sang format phù hợp với IndexedDB
 */

import { DailyData, MonthlySummary, YearlySummary, getCurrentYear, getQuarter } from './db';
import { importDailyData, importMonthlySummary, importYearlySummary } from './dataService';
import { DashboardData } from '@/types';

/**
 * Xác định năm và tháng từ sheet name hoặc filename
 */
function extractYearMonth(sheetName: string, fileName: string): { year: number; month: number } {
    // Thử tìm pattern "T9-N2025" hoặc "THANG 09-2025"
    const patterns = [
        /T(\d{1,2})[-_]?N?(\d{4})/i,      // T9-N2025
        /THANG\s*(\d{1,2})[-_](\d{4})/i,  // THANG 09-2025
        /(\d{1,2})[-_](\d{4})/,           // 09-2025
    ];

    const text = `${sheetName} ${fileName}`;
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return {
                month: parseInt(match[1], 10),
                year: parseInt(match[2], 10)
            };
        }
    }

    // Default: năm hiện tại, tháng hiện tại
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Convert DashboardData (từ ExcelParser) sang DailyData (cho DB)
 */
export function convertToDailyData(
    dashboardData: DashboardData[],
    year: number,
    month: number
): Omit<DailyData, 'id' | 'created_at' | 'updated_at'>[] {
    return dashboardData
        .filter(d => d.periodType === 'day')
        .map(d => {
            const day = parseInt(d.period, 10) || 1;
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            return {
                date: dateStr,
                year,
                month,
                day,
                xe_ha: d.xe.ha,
                xe_giao: d.xe.giao,
                xe_cfs: d.xe.fullCfs,
                xe_total: d.xe.total,
                xalan_ha: d.xalan.ha,
                xalan_giao: d.xalan.giao,
                xalan_cfs: d.xalan.fullCfs,
                xalan_total: d.xalan.total,
                total_in: d.xe.ha + d.xalan.ha,
                total_out: d.xe.giao + d.xalan.giao,
                total_cfs: d.cfs.full,
                total: d.xe.total + d.xalan.total,
            };
        });
}

/**
 * Convert DashboardData (từ file lũy tiến) sang MonthlySummary
 * Format period mới: "Tháng 01-2025" hoặc "Tháng 01" (fallback năm hiện tại)
 */
export function convertToMonthlySummary(
    dashboardData: DashboardData[]
): Omit<MonthlySummary, 'id' | 'created_at' | 'updated_at'>[] {
    return dashboardData
        .filter(d => d.periodType === 'month')
        .map(d => {
            // Parse "Tháng 01-2025" → month = 1, year = 2025
            // Hoặc "Tháng 01" → month = 1, year = current
            const monthMatch = d.period.match(/(?:Tháng|thang|T)\s*(\d{1,2})/i);
            const month = monthMatch ? parseInt(monthMatch[1], 10) : 1;

            // Lấy năm từ format "Tháng 01-2025" hoặc từ cuối period
            const yearMatch = d.period.match(/[-](\d{4})$/) || d.period.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1], 10) : getCurrentYear();

            return {
                year,
                month,
                quarter: getQuarter(month),
                xe_ha: d.xe.ha,
                xe_giao: d.xe.giao,
                xe_cfs: d.xe.fullCfs,
                xe_total: d.xe.total,
                xalan_ha: d.xalan.ha,
                xalan_giao: d.xalan.giao,
                xalan_cfs: d.xalan.fullCfs,
                xalan_total: d.xalan.total,
                total_in: d.xe.ha + d.xalan.ha,
                total_out: d.xe.giao + d.xalan.giao,
                total_cfs: d.cfs.full,
                total: d.xe.total + d.xalan.total,
            };
        });
}

/**
 * Convert DashboardData (từ file lũy tiến) sang YearlySummary
 */
export function convertToYearlySummary(
    dashboardData: DashboardData[]
): Omit<YearlySummary, 'id' | 'created_at' | 'updated_at'>[] {
    return dashboardData
        .filter(d => d.periodType === 'year')
        .map(d => {
            // Parse "N2023" hoặc "X2023" hoặc "2023"
            const yearMatch = d.period.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1], 10) : getCurrentYear();

            return {
                year,
                xe_ha: d.xe.ha,
                xe_giao: d.xe.giao,
                xe_cfs: d.xe.fullCfs,
                xe_total: d.xe.total,
                xalan_ha: d.xalan.ha,
                xalan_giao: d.xalan.giao,
                xalan_cfs: d.xalan.fullCfs,
                xalan_total: d.xalan.total,
                total_in: d.xe.ha + d.xalan.ha,
                total_out: d.xe.giao + d.xalan.giao,
                total_cfs: d.cfs.full,
                total: d.xe.total + d.xalan.total,
            };
        });
}

/**
 * Import dữ liệu từ Excel vào DB
 * @param dashboardData - Dữ liệu đã parse từ Excel
 * @param dataType - 'daily' hoặc 'monthly'
 * @param sheetName - Tên sheet để xác định năm/tháng
 * @param fileName - Tên file để xác định năm/tháng
 */
export async function importExcelToDb(
    dashboardData: DashboardData[],
    dataType: 'daily' | 'monthly',
    sheetName: string,
    fileName: string
): Promise<{ success: boolean; message: string; count: number }> {
    try {
        if (dataType === 'daily') {
            // Xác định năm/tháng từ sheet/file name
            const { year, month } = extractYearMonth(sheetName, fileName);

            // Convert và import
            const dailyData = convertToDailyData(dashboardData, year, month);
            const count = await importDailyData(dailyData);

            return {
                success: true,
                message: `Đã import ${count} ngày vào DB (${month}/${year})`,
                count
            };
        } else {
            // File lũy tiến - import tất cả loại
            const monthlyData = convertToMonthlySummary(dashboardData);
            const yearlyData = convertToYearlySummary(dashboardData);

            let totalCount = 0;

            if (monthlyData.length > 0) {
                totalCount += await importMonthlySummary(monthlyData);
            }

            if (yearlyData.length > 0) {
                totalCount += await importYearlySummary(yearlyData);
            }

            return {
                success: true,
                message: `Đã import ${monthlyData.length} tháng + ${yearlyData.length} năm vào DB`,
                count: totalCount
            };
        }
    } catch (error) {
        console.error('Import error:', error);
        return {
            success: false,
            message: `Lỗi import: ${error instanceof Error ? error.message : 'Unknown'}`,
            count: 0
        };
    }
}
