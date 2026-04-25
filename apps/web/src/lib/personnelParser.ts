import * as XLSX from '@e965/xlsx';
import { db } from './db';

export interface ParsedEmployee {
    mscd: string;
    name: string;
    department: string;
    shift: string;
}

const COLUMN_MAPPING = {
    mscd: ['mscđ', 'mã số', 'mã nv', 'code', 'id'],
    name: ['họ và tên', 'họ tên', 'tên', 'name', 'fullname'],
    department: ['bộ phận', 'phòng ban', 'đội', 'department', 'team'],
    shift: ['thời gian làm việc', 'ca', 'ca làm việc', 'shift', 'time']
};

type ExcelRow = Record<string, unknown>;

export interface ImportResult {
    data: ParsedEmployee[];
    warnings: string[];
}

export function parseEmployeeExcel(workbook: XLSX.WorkBook): ImportResult {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { data: [], warnings: ["Không tìm thấy sheet dữ liệu"] };

    const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 'A' });
    const warnings: string[] = [];

    if (data.length < 2) return { data: [], warnings: ["File không có đủ dữ liệu"] };

    // Detect header row
    let headerRowIndex = 0;
    let headerMap: { [key: string]: string } = {}; // 'A' -> 'mscd'

    // Simple heuristic: look for row containing "mscđ" or "họ tên"
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        let matchCount = 0;
        const currentMap: { [key: string]: string } = {};

        for (const [key, val] of Object.entries(row)) {
            const cellText = String(val).toLowerCase().trim();

            for (const [field, keywords] of Object.entries(COLUMN_MAPPING)) {
                if (keywords.some(k => cellText.includes(k))) {
                    currentMap[key] = field;
                    matchCount++;
                    break;
                }
            }
        }

        if (matchCount >= 2) {
            headerRowIndex = i;
            headerMap = currentMap;
            break;
        }
    }

    const employees: ParsedEmployee[] = [];
    const seenCodes = new Set<string>();

    // Parse data rows
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        const emp: Partial<ParsedEmployee> = {};
        let hasData = false;
        const rawValues = [];

        for (const [colKey, field] of Object.entries(headerMap)) {
            const val = row[colKey];
            if (val !== undefined && val !== null) {
                const textValue = String(val).trim();
                emp[field as keyof ParsedEmployee] = textValue;
                hasData = true;
                rawValues.push(textValue);
            }
        }

        if (!hasData) continue; // Skip completely empty rows safely

        if (emp.mscd && emp.name) {
            // Check literal duplicate in file
            if (seenCodes.has(emp.mscd)) {
                warnings.push(`Dòng ${i + 1}: Trùng mã nhân viên '${emp.mscd}' (đã có ở dòng trước)`);
            } else {
                seenCodes.add(emp.mscd);
                employees.push({
                    mscd: emp.mscd,
                    name: emp.name,
                    department: normalizeDepartment(emp.department || 'Chưa phân loại'),
                    shift: normalizeShift(emp.shift || 'Hành chánh')
                });
            }
        } else {
            // Row has some data but missing mandatory fields
            // Try to identify row by any content
            const preview = rawValues.join(', ').substring(0, 30);
            warnings.push(`Dòng ${i + 1}: Bỏ qua do thiếu Mã hoặc Tên (${preview}...)`);
        }
    }

    return { data: employees, warnings };
}

function normalizeDepartment(dept: string): string {
    // Normalization logic if needed
    // e.g., "Thủ tục (Gate)" -> "Thủ tục"
    return dept;
}

function normalizeShift(shift: string): string {
    // e.g., "Ca 1 (06:00-14:00)" -> "Ca 1"
    return shift;
}

export async function importEmployees(employees: ParsedEmployee[]): Promise<{ imported: number, updated: number, errors: string[] }> {
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    await db.transaction('rw', db.employees, async () => {
        for (const emp of employees) {
            try {
                const existing = await db.employees.where('mscd').equals(emp.mscd).first();

                if (existing) {
                    await db.employees.update(existing.id!, {
                        name: emp.name,
                        department: emp.department,
                        shift: emp.shift,
                        updated_at: new Date()
                    });
                    updated++;
                } else {
                    await db.employees.add({
                        mscd: emp.mscd,
                        name: emp.name,
                        department: emp.department,
                        shift: emp.shift,
                        active: true,
                        updated_at: new Date()
                    });
                    imported++;
                }
            } catch (error) {
                console.error(error);
                errors.push(`Error importing ${emp.mscd}: ${error}`);
            }
        }
    });

    return { imported, updated, errors };
}

export function parseVesselExcel(workbook: XLSX.WorkBook): string[] {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 'A' });
    const vessels: string[] = [];

    // Simple parser: Look for values that look like vessel names
    for (const row of data) {
        for (const val of Object.values(row)) {
            if (typeof val === 'string' && val.trim().length > 2) {
                // Ignore headers if they contain specific keywords
                const s = val.toLowerCase();
                if (!s.includes('tên tàu') && !s.includes('stt') && !s.includes('name')) {
                    vessels.push(val.trim());
                }
            }
        }
    }
    return vessels;
}
