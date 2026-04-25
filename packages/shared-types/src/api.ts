/**
 * API Types - Auto-generated from OpenAPI spec
 * Các types dùng cho API requests/responses
 */

// ============ VESSEL TYPES ============
export type VesselStatus =
  | "approaching"
  | "berthing"
  | "working"
  | "idle"
  | "departing"
  | "departed";

export interface Vessel {
  id: string;
  name: string;
  voyage?: string;
  imo?: string;
  loa: number;
  beam?: number;
  draft?: number;
  flag?: string;
  shipping_line?: string;
  status: VesselStatus;
  created_at: string;
  updated_at: string;
}

export interface VesselCreate {
  name: string;
  voyage?: string;
  imo?: string;
  loa: number;
  beam?: number;
  draft?: number;
  flag?: string;
  shipping_line?: string;
}

export interface VesselUpdate {
  name?: string;
  voyage?: string;
  loa?: number;
  beam?: number;
  draft?: number;
  status?: VesselStatus;
}

export interface VesselPosition {
  vessel_id: string;
  berth_id?: string;
  start_position?: number;
  end_position?: number;
  latitude?: number;
  longitude?: number;
  heading?: number;
  updated_at: string;
}

export interface VesselSummary {
  id: string;
  name: string;
  voyage?: string;
  loa: number;
}

// ============ BERTH TYPES ============
export type BerthStatus = "available" | "occupied" | "reserved" | "maintenance";

export interface Berth {
  id: string;
  name: string;
  zone_id: string;
  start_m: number;
  end_m: number;
  length: number;
  draft_limit: number;
  status: BerthStatus;
  is_standalone?: boolean;
}

export interface BerthSummary {
  id: string;
  name: string;
  zone_id: string;
}

export interface BerthZone {
  id: string;
  name: string;
  segments: Berth[];
}

export interface BerthOccupancy {
  id: string;
  berth_id: string;
  vessel_id: string;
  vessel_name: string;
  start_time: string;
  end_time?: string;
  status: "active" | "planned" | "completed";
}

export interface QCCrane {
  id: string;
  name: string;
  position_m: number;
  status: "idle" | "working" | "moving" | "maintenance";
}

// ============ PLAN TYPES ============
export type PlanStatus =
  | "draft"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Plan {
  id: string;
  vessel_id: string;
  vessel_name: string;
  berth_id: string;
  berth_name: string;
  eta: string;
  etd: string;
  atb?: string;
  atd?: string;
  status: PlanStatus;
  created_at: string;
}

export interface PlanCreate {
  vessel_id: string;
  berth_id: string;
  eta: string;
  etd: string;
  notes?: string;
}

export interface PlanUpdate {
  berth_id?: string;
  eta?: string;
  etd?: string;
  atb?: string;
  atd?: string;
  status?: PlanStatus;
}

export interface PlanSummary {
  id: string;
  eta: string;
  etd: string;
  status: string;
}

export interface OptimizeConstraints {
  min_turnaround?: number;
  max_wait_time?: number;
  priority_vessels?: string[];
}

export interface OptimizedPlan {
  plans: Plan[];
  utilization: number;
  conflicts: string[];
  recommendations: string[];
}

// ============ OPERATION TYPES ============
export type OperationType = "import" | "export" | "shift";

export interface Operation {
  id: string;
  vessel_id: string;
  plan_id?: string;
  type: OperationType;
  container_count: number;
  teus?: number;
  start_time?: string;
  end_time?: string;
  crane_id?: string;
}

export interface OperationCreate {
  vessel_id: string;
  plan_id?: string;
  type: OperationType;
  container_count: number;
  teus?: number;
  crane_id?: string;
}

export interface OperationSummary {
  id: string;
  type: OperationType;
  container_count: number;
  timestamp: string;
}

// ============ REPORT TYPES ============
export interface DailyReport {
  date: string;
  vessels_served: number;
  total_moves: number;
  import_moves: number;
  export_moves: number;
  total_teus: number;
  berth_utilization: number;
  avg_turnaround_hours: number;
  by_berth: {
    berth_id: string;
    berth_name: string;
    vessels: number;
    moves: number;
    utilization: number;
  }[];
}

export interface ProductivityReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    total_vessels: number;
    total_moves: number;
    avg_moves_per_hour: number;
    avg_turnaround: number;
  };
  by_period: {
    date: string;
    vessels: number;
    moves: number;
    teus: number;
  }[];
}

// ============ AUTH TYPES ============
export type UserRole = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// ============ COMMON TYPES ============
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ConflictError {
  code: "BERTH_CONFLICT";
  message: string;
  conflicts: {
    berth_id: string;
    existing_vessel: string;
    time_range: {
      from: string;
      to: string;
    };
  }[];
}

// ============ API RESPONSE TYPES ============
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface VesselListResponse extends ListResponse<Vessel> {}

export interface BerthListResponse {
  data: Berth[];
  zones: BerthZone[];
}

export interface PlanListResponse extends ListResponse<Plan> {}

export interface OperationListResponse extends ListResponse<Operation> {
  summary: {
    total_import: number;
    total_export: number;
    total_teus: number;
  };
}

// ============ API REQUEST PARAMS ============
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface VesselListParams extends PaginationParams {
  status?: VesselStatus;
  berth_id?: string;
}

export interface BerthListParams {
  zone?: string;
  status?: BerthStatus;
}

export interface PlanListParams extends PaginationParams {
  date?: string;
  status?: PlanStatus;
}

export interface OperationListParams extends PaginationParams {
  vessel_id?: string;
  date?: string;
}

export interface ReportExportRequest {
  type: "daily" | "weekly" | "monthly" | "custom";
  format: "pdf" | "excel" | "csv";
  date_range?: {
    from: string;
    to: string;
  };
}
