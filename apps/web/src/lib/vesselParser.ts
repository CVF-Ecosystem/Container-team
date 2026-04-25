/**
 * Vessel Excel Parser
 *
 * Hỗ trợ 2 format:
 * A) File gốc của cảng (Tau 2025.xlsx) — multi-level header, 61 cột
 *    Row 2 (0-indexed): Vessel, ATB, ATD, LINE ở cols 3,6,9,17
 *    Row 7+: data, date lấy từ ATB col 6, nhap=col24, xuat=col32, shiftIn=col42, shiftOut=col50
 * B) Template app — single header row với STT/Ngày/Tên tàu/ATB/ATD/Nhập/Xuất/ShiftIn/ShiftOut
 */

import * as XLSX from "@e965/xlsx";
import { db, VesselData } from "./db";

export interface ParsedVesselData {
  stt?: number;
  date: string;
  day: number;
  month: number;
  year: number;
  vessel_name?: string;
  voyage?: string;
  shipping_line?: string;
  atb?: string;
  atw?: string;
  atc?: string;
  atd?: string;
  nhap_tau: number;
  xuat_tau: number;
  shift_in: number;
  shift_out: number;
  teus?: number;
}

// Parse "dd/mm/yyyy HH:MM" hoặc "dd/mm/yyyy" hoặc Excel date number
function parseDateFromCell(cell: XLSX.CellObject | undefined): { day: number; month: number; year: number; date: string } | null {
  if (!cell) return null;

  let day = 0, month = 0, year = 0;

  if (typeof cell.v === "number") {
    const d = XLSX.SSF.parse_date_code(cell.v);
    day = d.d; month = d.m; year = d.y;
  } else {
    const str = String(cell.v || "");
    // Matches dd/mm/yyyy or dd-mm-yyyy (time part optional)
    const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!m) return null;
    day = parseInt(m[1], 10);
    month = parseInt(m[2], 10);
    year = parseInt(m[3], 10);
  }

  if (!day || !month || !year) return null;
  if (year < 2000 || year > 2099) return null;
  return {
    day, month, year,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function getCell(sheet: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r, c })];
}

function str(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const cell = getCell(sheet, r, c);
  return cell ? String(cell.v ?? "").trim() : "";
}

function num(sheet: XLSX.WorkSheet, r: number, c: number): number {
  const cell = getCell(sheet, r, c);
  if (!cell) return 0;
  const v = typeof cell.v === "number" ? cell.v : parseFloat(String(cell.v).replace(/,/g, ""));
  return isNaN(v) ? 0 : v;
}

// Convert Excel datetime cell → ISO string "YYYY-MM-DDTHH:MM:00"
// Handles: numeric serial (Excel stores dates as numbers), "dd/mm/yyyy HH:MM" string, cell.w formatted text
function cellToISODatetime(cell: XLSX.CellObject | undefined): string | undefined {
  if (!cell) return undefined;
  const p2 = (n: number) => String(n).padStart(2, "0");

  // 1. Numeric serial — most reliable for Excel datetime
  if (typeof cell.v === "number") {
    const d = XLSX.SSF.parse_date_code(cell.v);
    if (!d || d.y < 2000 || d.y > 2099) return undefined;
    return `${d.y}-${p2(d.m)}-${p2(d.d)}T${p2(d.H)}:${p2(d.M)}:${p2(d.S)}`;
  }

  // 2. Try cell.w (formatted display string) or cell.v string
  const s = (cell.w ?? String(cell.v ?? "")).trim();
  if (!s) return undefined;

  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(\d{1,2})?:?(\d{2})?/);
  if (m) {
    const [, d, mo, y, h = "0", min = "00"] = m;
    const year = parseInt(y, 10);
    if (year < 2000 || year > 2099) return undefined;
    return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}T${p2(parseInt(h,10))}:${min}:00`;
  }
  return undefined;
}

/**
 * Format A — File gốc của cảng (Tau 2025.xlsx, 61 cột)
 * Nhận dạng: range.e.c >= 30 VÀ row 2 col 6 = "ATB"
 * Date từ ATB (col 6), aggregate nhiều tàu/ngày thành 1 record.
 */
function parsePortNativeFormat(sheet: XLSX.WorkSheet, range: XLSX.Range): ParsedVesselData[] {
  // Confirmed column indices from file analysis:
  const COL = { ATB: 6, ATD: 9, VESSEL: 3, LINE: 17,
    NHAP: 24, XUAT: 32, SHIFT_IN: 42, SHIFT_OUT: 50 };

  // Aggregate per date: nhiều tàu cùng ngày → cộng dồn
  const byDate = new Map<string, ParsedVesselData>();

  for (let r = 7; r <= range.e.r; r++) {          // data bắt đầu từ row index 7
    const vesselName = str(sheet, r, COL.VESSEL);

    if (!vesselName || vesselName === "Vessel" || vesselName.startsWith("TỔNG")) continue;

    const dateInfo = parseDateFromCell(getCell(sheet, r, COL.ATB));
    if (!dateInfo) continue;

    const nhap_tau  = num(sheet, r, COL.NHAP);
    const xuat_tau  = num(sheet, r, COL.XUAT);
    const shift_in  = num(sheet, r, COL.SHIFT_IN);
    const shift_out = num(sheet, r, COL.SHIFT_OUT);
    if (nhap_tau === 0 && xuat_tau === 0 && shift_in === 0 && shift_out === 0) continue;

    const existing = byDate.get(dateInfo.date);
    if (existing) {
      existing.nhap_tau  += nhap_tau;
      existing.xuat_tau  += xuat_tau;
      existing.shift_in  += shift_in;
      existing.shift_out += shift_out;
      // vessel_name: danh sách tàu trong ngày
      existing.vessel_name = [existing.vessel_name, vesselName].filter(Boolean).join(", ");
    } else {
      byDate.set(dateInfo.date, {
        ...dateInfo,
        vessel_name: vesselName,
        atb: str(sheet, r, COL.ATB) || undefined,
        atd: str(sheet, r, COL.ATD) || undefined,
        nhap_tau, xuat_tau, shift_in, shift_out,
      });
    }
  }

  return Array.from(byDate.values());
}

/**
 * Format A (per-vessel) — 1 record mỗi tàu, đầy đủ ATW/ATC/TEUs/Voyage
 * Col layout (0-indexed): D=3 Vessel, F=5 Voyage, G=6 ATB, H=7 ATW, I=8 ATC, J=9 ATD
 *   R=17 LINE, Y=24 Nhập Conts, Z=25 Nhập Teus, AG=32 Xuất Conts, AH=33 Xuất Teus
 *   AQ=42 Shift In, AY=50 Shift Out
 */
function parsePortNativeFormatPerVessel(sheet: XLSX.WorkSheet, range: XLSX.Range): ParsedVesselData[] {
  const COL = {
    VESSEL: 3, VOYAGE: 5,
    ATB: 6, ATW: 7, ATC: 8, ATD: 9,
    LINE: 17,
    NHAP_C: 24, NHAP_T: 25,
    XUAT_C: 32, XUAT_T: 33,
    SHIFT_IN: 42, SHIFT_OUT: 50,
  };

  const results: ParsedVesselData[] = [];

  for (let r = 7; r <= range.e.r; r++) {
    const vesselName = str(sheet, r, COL.VESSEL);
    if (!vesselName || vesselName === "Vessel" || vesselName.startsWith("TỔNG")) continue;

    const dateInfo = parseDateFromCell(getCell(sheet, r, COL.ATB));
    if (!dateInfo) continue;

    const nhap_tau  = num(sheet, r, COL.NHAP_C);
    const xuat_tau  = num(sheet, r, COL.XUAT_C);
    const shift_in  = num(sheet, r, COL.SHIFT_IN);
    const shift_out = num(sheet, r, COL.SHIFT_OUT);
    if (nhap_tau === 0 && xuat_tau === 0 && shift_in === 0 && shift_out === 0) continue;

    const line = str(sheet, r, COL.LINE);
    const teus = num(sheet, r, 59); // BH = TỔNG CỘNG N+X+SHIFTING TEUs

    results.push({
      ...dateInfo,
      vessel_name: vesselName,
      voyage: str(sheet, r, COL.VOYAGE) || undefined,
      shipping_line: (line && line !== "0") ? line : undefined,
      atb: cellToISODatetime(getCell(sheet, r, COL.ATB)),
      atw: cellToISODatetime(getCell(sheet, r, COL.ATW)),
      atc: cellToISODatetime(getCell(sheet, r, COL.ATC)),
      atd: cellToISODatetime(getCell(sheet, r, COL.ATD)),
      nhap_tau, xuat_tau, shift_in, shift_out,
      teus: teus > 0 ? teus : undefined,
    });
  }

  return results;
}

/**
 * Format B — Template app (STT | Ngày | Tên tàu | ATB | ATD | Nhập | Xuất | ShiftIn | ShiftOut)
 */
function parseTemplateFormat(sheet: XLSX.WorkSheet, range: XLSX.Range): ParsedVesselData[] {
  const data: ParsedVesselData[] = [];

  // Find header row: tìm dòng có "stt" hoặc "ngày" ở cột 0
  let headerRow = 0;
  for (let r = 0; r <= Math.min(5, range.e.r); r++) {
    const text = str(sheet, r, 0).toLowerCase();
    if (text.includes("stt") || text.includes("ngày") || text.includes("ngay")) {
      headerRow = r;
      break;
    }
  }

  const hasStt = str(sheet, headerRow, 0).toLowerCase().includes("stt");
  const dateCol = hasStt ? 1 : 0;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const dateInfo = parseDateFromCell(getCell(sheet, r, dateCol));
    if (!dateInfo) continue;

    const nhap_tau  = num(sheet, r, dateCol + 4);
    const xuat_tau  = num(sheet, r, dateCol + 5);
    const shift_in  = num(sheet, r, dateCol + 6);
    const shift_out = num(sheet, r, dateCol + 7);
    if (nhap_tau === 0 && xuat_tau === 0 && shift_in === 0 && shift_out === 0) continue;

    data.push({
      ...dateInfo,
      stt:         hasStt ? num(sheet, r, 0) : undefined,
      vessel_name: str(sheet, r, dateCol + 1) || undefined,
      atb:         str(sheet, r, dateCol + 2) || undefined,
      atd:         str(sheet, r, dateCol + 3) || undefined,
      nhap_tau, xuat_tau, shift_in, shift_out,
    });
  }

  return data;
}

/**
 * Parse file Excel tàu — tự nhận dạng format
 */
export function parseVesselExcel(workbook: XLSX.WorkBook): ParsedVesselData[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  // Nhận dạng format: file gốc cảng có >= 30 cột VÀ col 6 row 2 = "ATB"
  const isPortNative = range.e.c >= 30 && str(sheet, 2, 6) === "ATB";

  return isPortNative
    ? parsePortNativeFormat(sheet, range)
    : parseTemplateFormat(sheet, range);
}

/**
 * Parse file Excel tàu — per-vessel (dùng cho ship-report page)
 * Trả về 1 record mỗi tàu, không gộp theo ngày.
 */
export function parseVesselExcelPerVessel(workbook: XLSX.WorkBook): ParsedVesselData[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const isPortNative = range.e.c >= 30 && str(sheet, 2, 6) === "ATB";
  return isPortNative
    ? parsePortNativeFormatPerVessel(sheet, range)
    : parseTemplateFormat(sheet, range);
}

/**
 * Import dữ liệu tàu vào IndexedDB
 */
export async function importVesselData(
  parsedData: ParsedVesselData[]
): Promise<{ imported: number; updated: number; errors: string[] }> {
  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of parsedData) {
    try {
      const existing = await db.vessel_data
        .where("[year+month+day]")
        .equals([row.year, row.month, row.day])
        .first();

      const vesselData: Omit<VesselData, "id"> = {
        stt: row.stt,
        vessel_name: row.vessel_name,
        atb: row.atb,
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
        teus: 0, // Will be calculated later if needed
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (existing?.id) {
        await db.vessel_data.update(existing.id, {
          ...vesselData,
          updated_at: new Date(),
        });
        updated++;
      } else {
        await db.vessel_data.add(vesselData);
        imported++;
      }
    } catch (err) {
      errors.push(`Ngày ${row.day}/${row.month}/${row.year}: ${err}`);
    }
  }

  return { imported, updated, errors };
}

/**
 * Import từ File object
 */
export async function importVesselExcelFile(
  file: File
): Promise<{
  success: boolean;
  message: string;
  imported: number;
  updated: number;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const parsedData = parseVesselExcel(workbook);

    if (parsedData.length === 0) {
      return {
        success: false,
        message: "Không tìm thấy dữ liệu tàu trong file",
        imported: 0,
        updated: 0,
      };
    }

    const result = await importVesselData(parsedData);

    return {
      success: true,
      message: `Đã import ${result.imported} dòng mới, cập nhật ${result.updated} dòng`,
      imported: result.imported,
      updated: result.updated,
    };
  } catch (err) {
    return {
      success: false,
      message: `Lỗi: ${err}`,
      imported: 0,
      updated: 0,
    };
  }
}

/**
 * Download Vessel Excel Template
 */
export function downloadVesselTemplate() {
  // 1. Define Valid Headers
  const headers = [
    [
      "STT",
      "Ngày",
      "Tên tàu",
      "ATB",
      "ATD",
      "Nhập tàu",
      "Xuất tàu",
      "Shift In",
      "Shift Out",
    ],
  ];

  // 2. Define Sample Row
  const sampleData = [
    [
      1,
      "01/01/2025",
      "MV SAMPLE VESSEL",
      "01/01/2025 08:00",
      "02/01/2025 08:00",
      100,
      50,
      10,
      5,
    ],
    [
      2,
      "02/01/2025",
      "MV ANOTHER SHIP",
      "02/01/2025 14:00",
      "03/01/2025 06:00",
      120,
      80,
      0,
      0,
    ],
  ];

  // 3. Create Workbook and Worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);

  // 4. Set Column Widths (Optional but good for UX)
  const wscols = [
    { wch: 5 }, // STT
    { wch: 12 }, // Ngày
    { wch: 25 }, // Tên tàu
    { wch: 18 }, // ATB
    { wch: 18 }, // ATD
    { wch: 10 }, // Nhập
    { wch: 10 }, // Xuất
    { wch: 10 }, // Shift In
    { wch: 10 }, // Shift Out
  ];
  ws["!cols"] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, "Data Tàu");

  // 5. Trigger Download
  XLSX.writeFile(wb, "Template_DuLieuTau.xlsx");
}
