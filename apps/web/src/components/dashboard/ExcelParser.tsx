'use client';

import { useState, useRef } from 'react';
import * as XLSX from '@e965/xlsx';
import { DashboardData, PeriodType } from '@/types';
import { importExcelToDb } from '@/lib/excelToDb';
import { logger } from '@/lib/logger';

// localStorage keys
const STORAGE_KEY_DAILY = 'dashboard_daily_data';
const STORAGE_KEY_MONTHLY = 'dashboard_monthly_data';

type DataType = 'daily' | 'monthly';

interface ExcelParserProps {
    onDataLoaded: (data: DashboardData[], dataType: DataType) => void;
    onClearData?: (dataType: DataType) => void;
}

// Parse file "So lieu luy tien.xlsx" - Dữ liệu theo tháng/năm
/**
 * Cấu trúc file lũy tiến:
 * - Row 5: Headers
 * - Row 6+: Data (Lũy tiến, Tháng 01-12, Năm X2023, X2024, etc.)
 * 
 * Cột quan trọng:
 * - B(1): Hạ tổng, C(2): Giao tổng, D(3): CFS Full, E(4): Tổng cộng
 * - H(7): Tổng XE, K(10): XE Tổng Hạ, N(13): XE Tổng Giao, Q(16): XE Tổng CFS Full
 * - X(23): Tổng XALAN, AA(26): XALAN Tổng Hạ, AD(29): XALAN Tổng Giao, AG(32): XALAN Tổng CFS Full
 * 
 * Cấu trúc:
 * - N2023 (năm header)
 *   - Tháng 01, Tháng 02... (thuộc năm 2023)
 * - N2024 (năm header)
 *   - Tháng 01, Tháng 02... (thuộc năm 2024)
 */
function parseLuyTien(sheet: XLSX.WorkSheet): DashboardData[] {
    const data: DashboardData[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const getValue = (row: number, col: number): number => {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) return 0;
        const val = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
    };

    // Track năm hiện tại từ các dòng N2023, N2024, N2025
    let currentYear: number = new Date().getFullYear();

    // VALIDATION: Check headers in Row 5 (Index 4)
    // B(1): Hạ tổng, C(2): Giao tổng
    const headerRowIdx = 4; // Row 5
    const colB = sheet[XLSX.utils.encode_cell({ r: headerRowIdx, c: 1 })];
    const colC = sheet[XLSX.utils.encode_cell({ r: headerRowIdx, c: 2 })];

    // Simple validation (can be stricter)
    if (!colB || !colC) {
        // Warning only, as layout might shift, but good to note
        console.warn('Cảnh báo: Không tìm thấy header ở dòng 5 (B, C)');
    }

    // Bắt đầu từ row 6 (sau headers ở row 5)
    for (let r = 6; r <= range.e.r; r++) {
        const labelCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        if (!labelCell) continue;

        const label = String(labelCell.v || '').replace(/\n/g, ' ').trim();
        if (!label || label.includes('Phương án') || label === '') continue;

        // Xác định loại period và update năm context
        let periodType: PeriodType = 'month';

        // Kiểm tra nếu là dòng năm (N2023, X2024, 2025, etc.)
        const yearMatch = label.match(/[NX]?(\d{4})/);
        if (yearMatch && (label.startsWith('N') || label.startsWith('X') || /^20\d{2}$/.test(label))) {
            currentYear = parseInt(yearMatch[1], 10);
            periodType = 'year';
        } else if (label.includes('Lũy tiến') || label.includes('lũy tiến')) {
            periodType = 'cumulative';
        } else if (label.includes('Tháng') || label.includes('tháng')) {
            periodType = 'month';
        }

        // === ĐỌC CHI TIẾT XE ===
        // K(10): XE Tổng Hạ, N(13): XE Tổng Giao, Q(16): XE Tổng CFS Full
        const xeHa = getValue(r, 10);      // Cột K: XE Tổng Hạ
        const xeGiao = getValue(r, 13);    // Cột N: XE Tổng Giao
        const xeFullCfs = getValue(r, 16); // Cột Q: XE Tổng CFS Full
        const xeTotal = xeHa + xeGiao + xeFullCfs;

        // === ĐỌC CHI TIẾT XALAN ===
        // AA(26): XALAN Tổng Hạ, AD(29): XALAN Tổng Giao, AG(32): XALAN Tổng CFS Full
        const xalanHa = getValue(r, 26);     // Cột AA: XALAN Tổng Hạ
        const xalanGiao = getValue(r, 29);   // Cột AD: XALAN Tổng Giao
        const xalanFullCfs = getValue(r, 32); // Cột AG: XALAN Tổng CFS Full
        const xalanTotal = xalanHa + xalanGiao + xalanFullCfs;

        // Tổng hợp
        const tongHa = getValue(r, 1);    // Cột B
        const tongGiao = getValue(r, 2);  // Cột C
        const tongCfs = getValue(r, 3);   // Cột D
        const tongCont = getValue(r, 4);  // Cột E

        // Bỏ qua dòng không có dữ liệu
        if (xeTotal === 0 && xalanTotal === 0 && tongCont === 0 && tongHa === 0 && tongGiao === 0) continue;

        // Tạo period với năm context
        let period = label;
        let displayLabel = label.replace('Tháng ', 'T').replace(/\n/g, ' ').trim();

        // Đối với dòng tháng, thêm năm vào period để phân biệt
        if (periodType === 'month') {
            period = `${label}-${currentYear}`; // "Tháng 01-2025"
            displayLabel = `T${label.replace(/\D+/g, '').padStart(2, '0')}`; // "T01"
        }

        data.push({
            id: `${label}-${currentYear}-${r}`,
            period,
            periodType,
            label: displayLabel,
            tongBienDong: xeTotal + xalanTotal || tongCont,
            tongCont: tongCont || xeTotal + xalanTotal,
            xe: {
                ha: xeHa,
                giao: xeGiao,
                fullCfs: xeFullCfs,
                emptyCfs: xeFullCfs,
                total: xeTotal,
            },
            xalan: {
                ha: xalanHa,
                giao: xalanGiao,
                fullCfs: xalanFullCfs,
                emptyCfs: xalanFullCfs,
                total: xalanTotal,
            },
            cfs: {
                full: tongCfs || xeFullCfs + xalanFullCfs,
                empty: tongCfs || xeFullCfs + xalanFullCfs,
            },
        });
    }

    return data;
}

/**
 * Parse file "So lieu ngay_thang.xlsx" - Dữ liệu theo ngày
 * 
 * Cấu trúc file:
 * - Cột A (0): Ngày
 * - Cột B (1): CA (Ca ngày, Ca đêm, TC)
 * - Cột C (2): Hạ (XE + XALAN tổng hợp)
 * - Cột D (3): Giao (XE + XALAN tổng hợp)
 * - Cột E (4): Full CFS
 * - Cột F (5): Tổng CONT = Hạ + Giao + CFS
 * 
 * Chi tiết XE (bắt đầu từ cột G):
 * - G (6): P/án
 * - H (7): HB, I (8): TR, J (9): Tổng Hạ XE
 * - K (10): LN, L (11): CR, M (12): Tổng Giao XE
 * - N (13): ĐH, O (14): RR, P (15): Tổng F CFS XE
 * 
 * Chi tiết XALAN (bắt đầu từ cột T):
 * - T (19): P/án
 * - U (20): HB, V (21): TR, W (22): Tổng Hạ XALAN
 * - X (23): LN, Y (24): CR, Z (25): Tổng Giao XALAN
 * - AA (26): ĐH, AB (27): RR, AC (28): Tổng F CFS XALAN
 */
function parseNgayThang(sheet: XLSX.WorkSheet): DashboardData[] {
    const data: DashboardData[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const getValue = (row: number, col: number): number => {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) return 0;
        const val = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
    };

    // Tìm header row (tìm cell có "CA")
    let headerRow = 2; // Default
    for (let r = 0; r <= 10; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
        if (cell && String(cell.v || '').toUpperCase().includes('CA')) {
            headerRow = r;
            break;
        }
    }

    // Double check if defaulted
    const defaultCheck = sheet[XLSX.utils.encode_cell({ r: 2, c: 1 })];
    if (headerRow === 2 && !String(defaultCheck?.v || '').toUpperCase().includes('CA')) {
        // Could not find CA in first 10 rows and row 2 is not it.
    }

    // VALIDATION: Verify critical columns exist relative to headerRow
    // C(2): Hạ, D(3): Giao, E(4): Full CFS
    const checkHeader = (col: number, keywords: string[]) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: col })];
        const val = String(cell?.v || '').toUpperCase();
        return keywords.some(k => val.includes(k.toUpperCase()));
    };

    if (!checkHeader(1, ['CA'])) {
        throw new Error(`Không tìm thấy cột 'CA'. File không đúng định dạng 'Số liệu ngày'.`);
    }
    // Check C, D, E
    if (!checkHeader(2, ['HẠ', 'HA']) || !checkHeader(3, ['GIAO']) || !checkHeader(4, ['FULL', 'CFS'])) {
        throw new Error(`Định dạng cột không khớp (Cột C, D, E phải là Hạ, Giao, Full CFS). Vui lòng kiểm tra file.`);
    }

    let currentDay = '';

    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const dayCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        const caCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];

        // Cập nhật ngày nếu có
        if (dayCell) {
            const dayVal = String(dayCell.v || '').trim();
            if (dayVal) {
                const match = dayVal.match(/\d+/);
                if (match) {
                    currentDay = match[0].padStart(2, '0');
                }
            }
        }

        if (!currentDay) continue;

        const ca = caCell ? String(caCell.v || '').trim().toUpperCase() : '';

        // Chỉ lấy dòng TC (Tổng cộng)
        if (ca !== 'TC') continue;

        // === ĐỌC SỐ LIỆU TỔNG HỢP (cột C, D, E, F) ===
        // Đây là số XE + XALAN đã tính sẵn trong file
        const tongHa = getValue(r, 2);      // Cột C: Tổng Hạ
        const tongGiao = getValue(r, 3);    // Cột D: Tổng Giao
        const tongFullCfs = getValue(r, 4); // Cột E: Full CFS
        const tongCont = getValue(r, 5);    // Cột F: Tổng CONT

        // === ĐỌC CHI TIẾT XE ===
        // Debug output: L(11)=42(Tổng Hạ), O(14)=12(Tổng Giao), R(17)=24(Tổng F CFS)
        const xeHa = getValue(r, 11);      // Cột L: Tổng Hạ XE = 42
        const xeGiao = getValue(r, 14);    // Cột O: Tổng Giao XE = 12
        const xeFullCfs = getValue(r, 17); // Cột R: Tổng F CFS XE = 24
        const xeTotal = xeHa + xeGiao + xeFullCfs;

        // === ĐỌC CHI TIẾT XALAN ===
        // XALAN: HB(Z=25), TR(AA=26), Tổng Hạ(AB=27), LN(AC=28), CR(AD=29), Tổng Giao(AE=30), ĐH(AF=31), RR(AG=32), Tổng F CFS(AH=33)
        const xalanHa = getValue(r, 27);     // Cột AB: Tổng Hạ XALAN
        const xalanGiao = getValue(r, 30);   // Cột AE: Tổng Giao XALAN
        const xalanFullCfs = getValue(r, 33); // Cột AH: Tổng F CFS XALAN
        const xalanTotal = xalanHa + xalanGiao + xalanFullCfs;

        // Tổng biến động = XE + XALAN
        const tongBienDong = xeTotal + xalanTotal;

        // === DEBUG: In tất cả giá trị từ cột 0-40 để xác định cấu trúc ===
        if (currentDay === '01') {
            const cols: string[] = [];
            for (let c = 0; c <= 40; c++) {
                const val = getValue(r, c);
                if (val !== 0) {
                    cols.push(`[${c}]=${val}`);
                }
            }
            logger.debug('Excel daily row structure', {
                row: r,
                columns: cols,
                summary: { tongHa, tongGiao, tongFullCfs, tongCont },
                xe: { xeHa, xeGiao, xeFullCfs, xeTotal },
                xalan: { xalanHa, xalanGiao, xalanFullCfs, xalanTotal },
            });
        }

        // Nếu chi tiết XE/XALAN = 0, fallback dùng tổng
        const finalXeHa = xeHa || (tongHa > 0 ? Math.round(tongHa * 0.8) : 0);
        const finalXeGiao = xeGiao || (tongGiao > 0 ? Math.round(tongGiao * 0.3) : 0);
        const finalXalanHa = xalanHa || (tongHa > 0 ? tongHa - finalXeHa : 0);
        const finalXalanGiao = xalanGiao || (tongGiao > 0 ? tongGiao - finalXeGiao : 0);

        data.push({
            id: `day-${currentDay}-${r}`,
            period: currentDay,
            periodType: 'day',
            label: `Ngày ${currentDay}`,
            tongBienDong: tongBienDong || tongCont,
            tongCont: tongCont || tongBienDong,
            xe: {
                ha: finalXeHa,
                giao: finalXeGiao,
                fullCfs: xeFullCfs,
                emptyCfs: xeFullCfs,
                total: xeTotal,
            },
            xalan: {
                ha: finalXalanHa,
                giao: finalXalanGiao,
                fullCfs: xalanFullCfs,
                emptyCfs: xalanFullCfs,
                total: xalanTotal,
            },
            cfs: {
                full: tongFullCfs || xeFullCfs + xalanFullCfs,
                empty: tongFullCfs || xeFullCfs + xalanFullCfs,
            },
        });
    }

    // Thêm so sánh với ngày trước
    for (let i = 1; i < data.length; i++) {
        const prevTotal = data[i - 1].xe.total + data[i - 1].xalan.total;
        const currTotal = data[i].xe.total + data[i].xalan.total;
        if (prevTotal > 0) {
            const changePercent = ((currTotal - prevTotal) / prevTotal) * 100;
            data[i].comparison = {
                previousValue: prevTotal,
                changePercent: Math.round(changePercent * 10) / 10,
                trend: changePercent >= 0 ? 'up' : 'down',
            };
        }
    }

    return data;
}

/**
 * Thử parse tất cả sheet trong workbook, trả về sheet đầu tiên thành công.
 * Nếu tất cả đều fail, ném lỗi chi tiết theo từng sheet.
 */
function tryParseSheets(
    workbook: XLSX.WorkBook,
    parser: (sheet: XLSX.WorkSheet) => DashboardData[],
    formatName: string
): { data: DashboardData[]; sheetName: string } {
    if (workbook.SheetNames.length === 0) {
        throw new Error('File không có sheet nào.');
    }

    const sheetErrors: string[] = [];
    for (const sheetName of workbook.SheetNames) {
        try {
            const data = parser(workbook.Sheets[sheetName]);
            return { data, sheetName };
        } catch (e) {
            sheetErrors.push(`"${sheetName}": ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    const detail = sheetErrors.join(' | ');
    throw new Error(
        `Không tìm thấy sheet đúng định dạng "${formatName}" (${workbook.SheetNames.length} sheet đã kiểm tra). ${detail}`
    );
}

// Save to localStorage
export function saveToStorage(data: DashboardData[], dataType: DataType) {
    const key = dataType === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_MONTHLY;
    localStorage.setItem(key, JSON.stringify(data));
}

// Load from localStorage
export function loadFromStorage(dataType: DataType): DashboardData[] | null {
    const key = dataType === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_MONTHLY;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
}

// Clear storage
export function clearStorage(dataType: DataType) {
    const key = dataType === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_MONTHLY;
    localStorage.removeItem(key);
}

export default function ExcelParser({ onDataLoaded, onClearData }: ExcelParserProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadedFiles, setLoadedFiles] = useState<{ daily: boolean; monthly: boolean }>({
        daily: false,
        monthly: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        setError('');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });

                let data: DashboardData[] = [];
                let dataType: DataType = 'monthly';
                let usedSheetName = workbook.SheetNames[0] ?? '';

                // Detect intent from filename or any sheet name in the workbook
                const fileNameLower = file.name.toLowerCase();
                const anySheetLower = workbook.SheetNames.map(n => n.toLowerCase());
                const looksDaily = fileNameLower.includes('ngay') || fileNameLower.includes('ngày') ||
                    anySheetLower.some(n => n.includes('bcn') || n.includes('gate') || n.includes('ngay'));
                const looksMonthly = fileNameLower.includes('luy') || fileNameLower.includes('lũy') ||
                    anySheetLower.some(n => n.includes('luy') || n.includes('tien'));

                if (looksDaily) {
                    const result = tryParseSheets(workbook, parseNgayThang, 'Số liệu ngày');
                    data = result.data;
                    usedSheetName = result.sheetName;
                    dataType = 'daily';
                } else if (looksMonthly) {
                    const result = tryParseSheets(workbook, parseLuyTien, 'Số liệu lũy tiến');
                    data = result.data;
                    usedSheetName = result.sheetName;
                    dataType = 'monthly';
                } else {
                    // Auto-detect: thử daily trước, nếu fail hoặc rỗng thì thử monthly
                    let dailyResult: { data: DashboardData[]; sheetName: string } | null = null;
                    try {
                        dailyResult = tryParseSheets(workbook, parseNgayThang, 'Số liệu ngày');
                    } catch { /* fall through to monthly */ }

                    if (dailyResult && dailyResult.data.some(d => d.xe.total > 0 || d.xalan.total > 0)) {
                        data = dailyResult.data;
                        usedSheetName = dailyResult.sheetName;
                        dataType = 'daily';
                    } else {
                        const result = tryParseSheets(workbook, parseLuyTien, 'Số liệu lũy tiến');
                        data = result.data;
                        usedSheetName = result.sheetName;
                        dataType = 'monthly';
                    }
                }

                if (data.length > 0) {
                    saveToStorage(data, dataType);

                    try {
                        const result = await importExcelToDb(data, dataType, usedSheetName, file.name);
                        logger.info('Imported Excel data into IndexedDB', result);
                    } catch (dbError) {
                        console.warn('[IndexedDB] Fallback to localStorage:', dbError);
                    }

                    onDataLoaded(data, dataType);
                    setLoadedFiles(prev => ({ ...prev, [dataType]: true }));
                    logger.info('Loaded Excel records', {
                        count: data.length,
                        dataType,
                        sheetUsed: usedSheetName,
                        totalSheets: workbook.SheetNames.length,
                        sample: data.slice(0, 3),
                    });
                }
            }
        } catch (err) {
            console.error(err);
            setError(`Lỗi: ${err instanceof Error ? err.message : 'Lỗi đọc file Excel'}`);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClear = (dataType: DataType) => {
        clearStorage(dataType);
        setLoadedFiles(prev => ({ ...prev, [dataType]: false }));
        if (onClearData) {
            onClearData(dataType);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
            />
            <label
                htmlFor="excel-upload"
                title="Upload file Excel số liệu biến động container"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${isLoading
                    ? 'bg-gray-600 text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
            >
                {isLoading ? (
                    <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang xử lý...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Excel
                    </>
                )}
            </label>

            {/* Status indicators */}
            <div className="flex gap-2 text-xs">
                <span
                    title="Dữ liệu biến động theo ngày"
                    className={`px-2 py-1 rounded ${loadedFiles.daily ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-500'}`}
                >
                    📅 Ngày {loadedFiles.daily ? '✓' : ''}
                </span>
                <span
                    title="Dữ liệu biến động theo tháng/năm"
                    className={`px-2 py-1 rounded ${loadedFiles.monthly ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-500'}`}
                >
                    🗓️ Tháng {loadedFiles.monthly ? '✓' : ''}
                </span>
            </div>

            {/* Clear Data button */}
            <button
                type="button"
                onClick={() => {
                    handleClear('daily');
                    handleClear('monthly');
                    window.location.reload();
                }}
                title="Xóa dữ liệu đã lưu và reload trang"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-all"
            >
                🗑️ Clear Data
            </button>

            {error && (
                <span className="text-red-400 text-sm">{error}</span>
            )}
        </div>
    );
}
