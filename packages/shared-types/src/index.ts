/**
 * @tanthuan/shared-types
 *
 * Single source of truth for all shared TypeScript interfaces
 * used across apps/web, apps/api, and apps/3d-viewer.
 *
 * Usage:
 *   import type { DailyData, VesselData } from '@tanthuan/shared-types';
 */

export * from "./api-contracts";

// ============= CORE DATA TYPES =============

export interface DailyData {
  id?: string | number;
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  day: number; // 1-31

  // XE (Xe lẻ) — Tổng hợp
  xe_ha: number; // Hạ bãi
  xe_giao: number; // Giao hàng
  xe_cfs: number; // CFS total
  xe_total: number; // Tổng XE

  // XE — Chi tiết phương án (optional)
  xe_hb?: number; // Hạ bãi
  xe_tr?: number; // Trả rỗng
  xe_ln?: number; // Lấy nguyên
  xe_cr?: number; // Cấp rỗng
  xe_dh?: number; // Đóng hàng (Full CFS)
  xe_rr?: number; // Rút ruột (Empty CFS)

  // XALAN (Xe lớn) — Tổng hợp
  xalan_ha: number;
  xalan_giao: number;
  xalan_cfs: number;
  xalan_total: number;

  // XALAN — Chi tiết phương án (optional)
  xalan_hb?: number;
  xalan_tr?: number;
  xalan_ln?: number;
  xalan_cr?: number;
  xalan_dh?: number;
  xalan_rr?: number;

  // Tổng hợp
  total_in: number; // xe_ha + xalan_ha
  total_out: number; // xe_giao + xalan_giao
  total_cfs: number; // xe_cfs + xalan_cfs
  total: number; // xe_total + xalan_total

  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface MonthlySummary {
  id?: string | number;
  year: number;
  month: number; // 1-12
  quarter: number; // 1-4

  xe_ha: number;
  xe_giao: number;
  xe_cfs: number;
  xe_total: number;

  xalan_ha: number;
  xalan_giao: number;
  xalan_cfs: number;
  xalan_total: number;

  total_in: number;
  total_out: number;
  total_cfs: number;
  total: number;

  yoy_change_percent?: number; // % thay đổi so với năm trước

  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface YearlySummary {
  id?: string | number;
  year: number;

  xe_ha: number;
  xe_giao: number;
  xe_cfs: number;
  xe_total: number;

  xalan_ha: number;
  xalan_giao: number;
  xalan_cfs: number;
  xalan_total: number;

  total_in: number;
  total_out: number;
  total_cfs: number;
  total: number;

  created_at?: Date | string;
  updated_at?: Date | string;
}

// ============= VESSEL DATA =============

export interface VesselData {
  id?: string | number;

  // Thông tin tàu
  stt?: number;
  vessel_name?: string; // Tên tàu
  voyage?: string; // Chuyến (Voyage)
  shipping_line?: string; // Hãng tàu (Maersk, MSC...)

  // 4 mốc thời gian
  atb?: string; // Arrival Time Berth
  atw?: string; // At Work
  atc?: string; // At Completed
  atd?: string; // Actual Time Departure

  // Thời gian (cho index/filter)
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;

  // Số lượng container (Moves)
  nhap_tau: number; // Discharge
  xuat_tau: number; // Loading
  shift_in: number; // Shifting in
  shift_out: number; // Shifting out
  total_moves: number; // Tổng moves

  // Sản lượng TEUs
  teus: number;

  // Chỉ số năng suất (tự động tính)
  moves_per_hour?: number;
  teus_per_hour?: number;
  working_hours?: number; // (atc - atw)
  berth_hours?: number; // (atd - atb)

  remark?: string; // Ghi chú

  created_at?: Date | string;
  updated_at?: Date | string;
}

// ============= PERSONNEL =============

export interface Employee {
  id?: string | number;
  mscd: string; // Mã số cố định (Unique)
  name: string; // Họ và tên
  department: string; // Bộ phận
  shift: string; // Ca làm việc
  role?: string | null; // Vai trò (optional)
  active: boolean; // Còn làm việc hay không
  updated_at?: Date | string;
}

export interface VesselList {
  id?: string | number;
  name: string; // Tên tàu (Unique)
  shipping_line?: string | null;
  imo_number?: string | null;
  active: boolean; // Đang hoạt động
}

// ============= INVENTORY =============

export interface InventorySettings {
  id?: string | number;
  capacity: number; // Công suất thiết kế (số cont tối đa)
  initial_stock: number; // Tồn đầu kỳ
  initial_date: string; // Ngày bắt đầu tính tồn (YYYY-MM-DD)
  updated_at?: Date | string;
}

// ============= API RESPONSE TYPES =============

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total?: number;
  };
  error?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ============= AUTH TYPES =============

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string | null;
}

export interface AuthToken {
  token: string;
  user: User;
}

// ============= DASHBOARD TYPES =============

export interface DashboardSummary {
  year: number;
  xe: {
    ha: number;
    giao: number;
    cfs: number;
    total: number;
  };
  xalan: {
    ha: number;
    giao: number;
    cfs: number;
    total: number;
  };
  total: {
    in: number;
    out: number;
    cfs: number;
    all: number;
  };
  daysWithData: number;
  employeeCount: number;
  vesselOperations: number;
}

export interface MonthlyStats {
  year: number;
  months: Array<{
    month: number;
    xe: { ha: number; giao: number; cfs: number };
    xalan: { ha: number; giao: number; cfs: number };
    daysWithData: number;
  }>;
}

export interface QuarterlyStats {
  year: number;
  quarters: Array<{
    quarter: number;
    xe_total: number;
    xalan_total: number;
    total: number;
  }>;
}

export interface YearComparison {
  year1: { year: number; xe_total: number; xalan_total: number; total: number };
  year2: { year: number; xe_total: number; xalan_total: number; total: number };
  change: { absolute: number; percent: number };
}

// ============= REPORT TYPES =============

export type ReportType = "start_shift" | "end_shift" | "inventory" | "leave";
export type ReportStatus = "draft" | "submitted" | "approved";

export interface ShiftReport {
  id?: string;
  report_type: ReportType;
  date: string; // YYYY-MM-DD
  shift: string;
  department: string;
  reporter_name?: string | null;
  data: Record<string, unknown>;
  status: ReportStatus;
  created_at?: string;
  updated_at?: string;
}

// ============= UTILITY TYPES =============

/** Omit id and timestamps for create operations */
export type CreateInput<T> = Omit<T, "id" | "created_at" | "updated_at">;

/** Make all properties optional for update operations */
export type UpdateInput<T> = Partial<CreateInput<T>>;
