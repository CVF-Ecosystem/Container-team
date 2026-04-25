/**
 * Vessel Excel Parser
 * Parse file Excel dữ liệu tàu
 *
 * Format file:
 * Row 1: Header title
 * Row 2: Empty
 * Row 3: Column headers (STT, Ngày, Tên tàu, ATB, ATD, Nhập tàu, Xuất tàu, Shift In, Shift Out)
 * Row 4+: Data
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
  atb?: string;
  atd?: string;
  nhap_tau: number;
  xuat_tau: number;
  shift_in: number;
  shift_out: number;
}

/**
 * Parse file Excel tàu
 */
export function parseVesselExcel(workbook: XLSX.WorkBook): ParsedVesselData[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const data: ParsedVesselData[] = [];

  const getValue = (row: number, col: number): number => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return 0;
    const val =
      typeof cell.v === "number"
        ? cell.v
        : parseFloat(String(cell.v).replace(/,/g, ""));
    return isNaN(val) ? 0 : val;
  };

  const getStringValue = (row: number, col: number): string => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return "";
    return String(cell.v || "").trim();
  };

  const getDateValue = (
    row: number,
    col: number
  ): { day: number; month: number; year: number; date: string } | null => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (!cell) return null;

    let dateStr = "";
    let day = 0,
      month = 0,
      year = 0;

    // Handle Excel date number
    if (typeof cell.v === "number") {
      const excelDate = XLSX.SSF.parse_date_code(cell.v);
      day = excelDate.d;
      month = excelDate.m;
      year = excelDate.y;
      dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    } else {
      // Handle string date (dd/mm/yyyy or dd-mm-yyyy)
      const str = String(cell.v || "");
      const match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
        dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
      }
    }

    if (!dateStr) return null;
    return { day, month, year, date: dateStr };
  };

  // Find header row (look for "STT" or "Ngày" or "Tên tàu")
  let headerRow = 2;
  for (let r = 0; r <= 5; r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const cellText = String(cell?.v || "").toLowerCase();
    if (cellText.includes("stt") || cellText.includes("ngày")) {
      headerRow = r;
      break;
    }
  }

  // Detect column mapping
  // Expected: STT | Ngày | Tên tàu | ATB | ATD | Nhập tàu | Xuất tàu | Shift In | Shift Out
  // But could also be: Ngày | Tên tàu | ATB | ATD | Nhập tàu | Xuất tàu | Shift In | Shift Out
  let colOffset = 0;
  const firstHeaderCell = getStringValue(headerRow, 0).toLowerCase();
  if (firstHeaderCell.includes("stt")) {
    colOffset = 0; // Has STT column
  } else if (firstHeaderCell.includes("ngày")) {
    colOffset = -1; // No STT column, shift indexes
  }

  // Parse data rows
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Date is in column 1 (or 0 if no STT)
    const dateCol = colOffset === 0 ? 1 : 0;
    const dateInfo = getDateValue(r, dateCol);
    if (!dateInfo) continue;

    const stt = colOffset === 0 ? getValue(r, 0) : undefined;
    const vessel_name = getStringValue(r, dateCol + 1);
    const atb = getStringValue(r, dateCol + 2);
    const atd = getStringValue(r, dateCol + 3);
    const nhap_tau = getValue(r, dateCol + 4);
    const xuat_tau = getValue(r, dateCol + 5);
    const shift_in = getValue(r, dateCol + 6);
    const shift_out = getValue(r, dateCol + 7);

    // Skip empty rows
    if (nhap_tau === 0 && xuat_tau === 0 && shift_in === 0 && shift_out === 0) {
      continue;
    }

    data.push({
      ...dateInfo,
      stt,
      vessel_name: vessel_name || undefined,
      atb: atb || undefined,
      atd: atd || undefined,
      nhap_tau,
      xuat_tau,
      shift_in,
      shift_out,
    });
  }

  return data;
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
