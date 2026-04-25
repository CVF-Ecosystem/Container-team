/**
 * API boundary contracts shared by apps/web and apps/api.
 *
 * These types describe JSON payloads crossing the HTTP boundary. They are kept
 * separate from local IndexedDB/cache types and database implementation details.
 */

export interface ApiResult<T> {
  data?: T;
  error?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface DailyDataItem {
  id: string;
  date: string;
  year: number;
  month: number;
  day: number;
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
  xe_hb?: number;
  xe_tr?: number;
  xe_ln?: number;
  xe_cr?: number;
  xe_dh?: number;
  xe_rr?: number;
  xalan_hb?: number;
  xalan_tr?: number;
  xalan_ln?: number;
  xalan_cr?: number;
  xalan_dh?: number;
  xalan_rr?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyDataInput {
  date: string;
  xe_ha?: number;
  xe_giao?: number;
  xe_cfs?: number;
  xe_hb?: number;
  xe_tr?: number;
  xe_ln?: number;
  xe_cr?: number;
  xe_dh?: number;
  xe_rr?: number;
  xalan_ha?: number;
  xalan_giao?: number;
  xalan_cfs?: number;
  xalan_hb?: number;
  xalan_tr?: number;
  xalan_ln?: number;
  xalan_cr?: number;
  xalan_dh?: number;
  xalan_rr?: number;
}

export interface EmployeeRecord {
  id: string;
  mscd: string;
  name: string;
  department: string;
  shift: string;
  role: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeInput {
  mscd: string;
  name: string;
  department: string;
  shift: string;
  role?: string;
  active?: boolean;
}

export type ReportType = "start_shift" | "end_shift" | "inventory" | "leave";
export type ReportStatus = "draft" | "submitted" | "approved";

export interface ReportRecord {
  id: string;
  report_type: string;
  date: string;
  shift: string;
  department: string;
  reporter_name: string | null;
  data: Record<string, unknown>;
  status: string;
}

export interface ReportInput {
  reportType: ReportType;
  date: string;
  shift: string;
  department: string;
  reporterName?: string;
  data: Record<string, unknown>;
  status?: ReportStatus;
}

export interface VesselRecord {
  id: string;
  name: string;
  shipping_line: string | null;
  imo_number: string | null;
  active: boolean;
}

export interface VesselInput {
  name: string;
  shippingLine?: string;
  imoNumber?: string;
  active?: boolean;
}

export interface VesselDataRecord {
  id: string;
  vessel_name: string;
  voyage: string | null;
  shipping_line: string | null;
  date: string;
  year: number;
  month: number;
  stt?: number | null;
  atb?: string | null;
  atw?: string | null;
  atc?: string | null;
  atd?: string | null;
  nhap_tau: number;
  xuat_tau: number;
  shift_in: number;
  shift_out: number;
  total_moves: number;
  teus: number;
  working_hours?: number | null;
  berth_hours?: number | null;
  berth_name?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VesselDataInput {
  id?: string;
  vesselName: string;
  voyage?: string;
  shippingLine?: string;
  date: string;
  stt?: number;
  atb?: string;
  atw?: string;
  atc?: string;
  atd?: string;
  nhapTau?: number;
  xuatTau?: number;
  shiftIn?: number;
  shiftOut?: number;
  teus?: number;
  workingHours?: number;
  berthHours?: number;
  berthName?: string;
  note?: string;
}

export interface DashboardSummary {
  year: number;
  xe: { ha: number; giao: number; cfs: number; total: number };
  xalan: { ha: number; giao: number; cfs: number; total: number };
  total: { in: number; out: number; cfs: number; all: number };
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

export interface OperationsShiftCoverage {
  shift: string;
  department: string;
  startSubmitted: boolean;
  endSubmitted: boolean;
  startReporter: string | null;
  endReporter: string | null;
  lastUpdatedAt: string | null;
}

export interface OperationsAlert {
  severity: "info" | "warning" | "critical";
  code: "NO_ACTIVITY" | "MISSING_START_SHIFT" | "MISSING_END_SHIFT";
  message: string;
  shift?: string;
  department?: string;
}

export interface OperationsVesselActivity {
  id: string;
  vesselName: string;
  voyage: string | null;
  berthName: string | null;
  totalMoves: number;
  teus: number;
  atb: string | null;
  atd: string | null;
}

export interface OperationsDashboard {
  date: string;
  generatedAt: string;
  reportCoverage: {
    totalStartShift: number;
    totalEndShift: number;
    openShifts: number;
    completedShifts: number;
    items: OperationsShiftCoverage[];
  };
  todayTotals: {
    totalIn: number;
    totalOut: number;
    totalCfs: number;
    totalMoves: number;
    hasDailyData: boolean;
  };
  vesselActivity: {
    activeCount: number;
    totalMoves: number;
    items: OperationsVesselActivity[];
  };
  alerts: OperationsAlert[];
}

export interface ExecutiveKpis {
  date: string;
  year: number;
  month: number;
  generatedAt: string;
  daily: {
    totalMoves: number;
    totalIn: number;
    totalOut: number;
    totalCfs: number;
    vesselMoves: number;
    vesselTeus: number;
    leaveRequests: number;
    reportCompletionRate: number;
  };
  monthToDate: {
    totalMoves: number;
    vesselMoves: number;
    vesselTeus: number;
    reportCount: number;
  };
  yearToDate: {
    totalMoves: number;
    vesselMoves: number;
    vesselTeus: number;
    daysWithData: number;
  };
  workforce: {
    activeEmployees: number;
    departments: number;
    shifts: number;
  };
}

export type ReadinessCheckStatus = "pass" | "warn" | "fail";

export interface ProductionReadinessCheck {
  key: string;
  label: string;
  status: ReadinessCheckStatus;
  detail: string;
  required: boolean;
}

export interface ProductionReadiness {
  generatedAt: string;
  targetOrigin: string;
  overallStatus: ReadinessCheckStatus;
  checks: ProductionReadinessCheck[];
}

export interface ExecutiveReportDailyRow {
  date: string;
  total_in: number;
  total_out: number;
  total_cfs: number;
  total_moves: number;
  vessel_moves: number;
  vessel_teus: number;
  report_count: number;
  leave_requests: number;
}

export interface ExecutiveReportPack {
  generatedAt: string;
  generatedBy: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: Omit<ExecutiveReportDailyRow, "date">;
  rows: ExecutiveReportDailyRow[];
}
