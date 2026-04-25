import * as XLSX from "@e965/xlsx";
import { db, InventorySnapshot } from "./db";

function getCell(sheet: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  return sheet[XLSX.utils.encode_cell({ r, c })];
}

function str(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const cell = getCell(sheet, r, c);
  return cell ? String(cell.v ?? "").trim() : "";
}

export interface SnapshotImportResult {
  success: boolean;
  message: string;
  total: number;
}

export async function importInventorySnapshot(
  file: File,
  type: "ton_cu" | "ton_moi"
): Promise<SnapshotImportResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { success: false, message: "File trống", total: 0 };

    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

    // Find data start row: skip header row(s)
    // Header is row 0, data starts row 1
    let dataStart = 1;
    for (let r = 0; r <= Math.min(3, range.e.r); r++) {
      const v = str(sheet, r, 1).toLowerCase();
      if (v === "container" || v.includes("cont")) {
        dataStart = r + 1;
        break;
      }
    }

    let total = 0, cont_20 = 0, cont_40 = 0;
    let full = 0, empty = 0;
    let nhap = 0, xuat = 0, luu = 0;

    for (let r = dataStart; r <= range.e.r; r++) {
      const container = str(sheet, r, 1);
      const size = str(sheet, r, 2).toUpperCase();
      if (!container || !size) continue;

      const direction = str(sheet, r, 13).toUpperCase();
      const fe = str(sheet, r, 15).toUpperCase();

      total++;

      if (size.startsWith("20")) cont_20++;
      else cont_40++;

      if (fe === "F" || fe === "FULL") full++;
      else empty++;

      if (direction.includes("IMPORT") || direction === "NHẬP") nhap++;
      else if (direction.includes("EXPORT") || direction === "XUẤT") xuat++;
      else luu++; // Storage Empty, Lưu bãi, etc.
    }

    if (total === 0) {
      return { success: false, message: "Không tìm thấy dữ liệu container trong file", total: 0 };
    }

    const snapshot: Omit<InventorySnapshot, "id"> = {
      type,
      filename: file.name,
      total,
      cont_20,
      cont_40,
      full,
      empty,
      nhap,
      xuat,
      luu,
      imported_at: new Date(),
    };

    const existing = await db.inventory_snapshots.where("type").equals(type).first();
    if (existing?.id) {
      await db.inventory_snapshots.put({ ...snapshot, id: existing.id });
    } else {
      await db.inventory_snapshots.add(snapshot);
    }

    const label = type === "ton_cu" ? "Tồn Cũ" : "Tồn Mới";
    return { success: true, message: `Đã import ${label}: ${total} containers`, total };
  } catch (error) {
    return { success: false, message: `Lỗi: ${error}`, total: 0 };
  }
}

export async function getInventorySnapshots(): Promise<{
  ton_cu?: InventorySnapshot;
  ton_moi?: InventorySnapshot;
}> {
  const all = await db.inventory_snapshots.toArray();
  return {
    ton_cu: all.find((s) => s.type === "ton_cu"),
    ton_moi: all.find((s) => s.type === "ton_moi"),
  };
}

export async function clearInventorySnapshot(type: "ton_cu" | "ton_moi"): Promise<void> {
  await db.inventory_snapshots.where("type").equals(type).delete();
}
