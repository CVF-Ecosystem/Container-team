/**
 * API Client for Tan Thuan Port Backend
 */

import type {
  ApiResult,
  AuthResponse,
  AuthUser,
  DailyDataItem,
  DailyDataInput,
  EmployeeRecord,
  EmployeeInput,
  ReportRecord,
  ReportInput,
  VesselRecord,
  VesselInput,
  VesselDataRecord,
  VesselDataInput,
  DashboardSummary,
  MonthlyStats,
  QuarterlyStats,
  YearComparison,
  OperationsDashboard,
  ExecutiveKpis,
  ProductionReadiness,
  ReadinessCheckStatus,
  ExecutiveReportPack,
} from "@tanthuan/shared-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type ApiResponse<T> = ApiResult<T>;
type Employee = EmployeeRecord;
type Report = ReportRecord;
type Vessel = VesselRecord;
type VesselData = VesselDataRecord;

export type {
  DailyDataItem,
  DailyDataInput,
  Employee,
  EmployeeInput,
  Report,
  ReportInput,
  Vessel,
  VesselInput,
  VesselData,
  VesselDataInput,
  DashboardSummary,
  MonthlyStats,
  QuarterlyStats,
  YearComparison,
  OperationsDashboard,
  ExecutiveKpis,
  ProductionReadiness,
  ReadinessCheckStatus,
  ExecutiveReportPack,
};

class ApiClient {
  setToken(_token: string | null) {
    // Backward-compatible no-op for legacy callers. Auth now relies on the
    // server-set HTTP-only cookie and fetch credentials.
  }

  getToken(): string | null {
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          return { error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
        }
        return { error: data.error || "Request failed" };
      }

      return { data };
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        console.error("API request failed:", error);
      }
      return { error: "Network error" };
    }
  }

  // ============= AUTH =============

  async login(username: string, password: string) {
    const result = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    return result;
  }

  async register(data: {
    username: string;
    password: string;
    name: string;
    department?: string;
  }) {
    const result = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return result;
  }

  async getMe() {
    return this.request<{ user: AuthUser }>("/auth/me");
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout() {
    this.setToken(null);
    await this.request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  }

  // ============= DAILY DATA =============

  async getDailyData(params?: {
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.year) query.set("year", String(params.year));
    if (params?.month) query.set("month", String(params.month));
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.limit) query.set("limit", String(params.limit));

    const endpoint = `/daily-data${
      query.toString() ? "?" + query.toString() : ""
    }`;
    return this.request<{ data: DailyDataItem[] }>(endpoint);
  }

  async getDailyDataByDate(date: string) {
    return this.request<{ data: DailyDataItem }>(`/daily-data/${date}`);
  }

  async upsertDailyData(data: DailyDataInput) {
    return this.request<{ data: DailyDataItem }>("/daily-data", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkUpsertDailyData(data: DailyDataInput[]) {
    return this.request<{ inserted: number }>("/daily-data/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteDailyData(date: string) {
    return this.request<{ deleted: number }>(`/daily-data/${date}`, {
      method: "DELETE",
    });
  }

  // ============= EMPLOYEES =============

  async getEmployees(params?: {
    department?: string;
    shift?: string;
    active?: boolean;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.department) query.set("department", params.department);
    if (params?.shift) query.set("shift", params.shift);
    if (params?.active !== undefined)
      query.set("active", String(params.active));
    if (params?.search) query.set("search", params.search);

    const endpoint = `/employees${
      query.toString() ? "?" + query.toString() : ""
    }`;
    return this.request<{ data: Employee[] }>(endpoint);
  }

  async getDepartments() {
    return this.request<{ data: string[] }>("/employees/departments");
  }

  async getShifts() {
    return this.request<{ data: string[] }>("/employees/shifts");
  }

  async createEmployee(data: EmployeeInput) {
    return this.request<{ data: Employee }>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: Partial<EmployeeInput>) {
    return this.request<{ data: Employee }>(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id: string) {
    return this.request<{ deleted: number }>(`/employees/${id}`, {
      method: "DELETE",
    });
  }

  async bulkUpsertEmployees(data: EmployeeInput[]) {
    return this.request<{ inserted: number }>("/employees/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============= REPORTS =============

  async getReports(params?: {
    reportType?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    shift?: string;
    department?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.reportType) query.set("reportType", params.reportType);
    if (params?.date) query.set("date", params.date);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.shift) query.set("shift", params.shift);
    if (params?.department) query.set("department", params.department);
    if (params?.status) query.set("status", params.status);

    const endpoint = `/reports${
      query.toString() ? "?" + query.toString() : ""
    }`;
    return this.request<{ data: Report[] }>(endpoint);
  }

  async createReport(data: ReportInput) {
    return this.request<{ data: Report }>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateReport(
    id: string,
    data: { data?: Record<string, unknown>; status?: string }
  ) {
    return this.request<{ data: Report }>(`/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ============= VESSELS =============

  async getVessels(active?: boolean) {
    const query = active !== undefined ? `?active=${active}` : "";
    return this.request<{ data: Vessel[] }>(`/vessels${query}`);
  }

  async createVessel(data: VesselInput) {
    return this.request<{ data: Vessel }>("/vessels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getVesselData(params?: {
    year?: number;
    month?: number;
    vesselName?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.year) query.set("year", String(params.year));
    if (params?.month) query.set("month", String(params.month));
    if (params?.vesselName) query.set("vesselName", params.vesselName);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.limit) query.set("limit", String(params.limit));

    const endpoint = `/vessels/data/list${
      query.toString() ? "?" + query.toString() : ""
    }`;
    return this.request<{ data: VesselData[] }>(endpoint);
  }

  async createVesselData(data: VesselDataInput) {
    return this.request<{ data: VesselData }>("/vessels/data", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkUpsertVesselData(data: VesselDataInput[]) {
    return this.request<{ inserted: number; updated: number }>(
      "/vessels/data/bulk",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteVesselData(id: string) {
    return this.request<{ deleted: number }>(`/vessels/data/${id}`, {
      method: "DELETE",
    });
  }

  // ============= STATS =============

  async getSummary(year?: number) {
    const query = year ? `?year=${year}` : "";
    return this.request<DashboardSummary>(`/stats/summary${query}`);
  }

  async getMonthlyStats(year?: number) {
    const query = year ? `?year=${year}` : "";
    return this.request<MonthlyStats>(`/stats/monthly${query}`);
  }

  async getQuarterlyStats(year?: number) {
    const query = year ? `?year=${year}` : "";
    return this.request<QuarterlyStats>(`/stats/quarterly${query}`);
  }

  async getYearComparison(year1: number, year2: number) {
    return this.request<YearComparison>(
      `/stats/compare?year1=${year1}&year2=${year2}`
    );
  }

  // ============= OPERATIONS =============

  async getOperationsDashboard(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<OperationsDashboard>(`/ops/dashboard${query}`);
  }

  async getExecutiveKpis(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<ExecutiveKpis>(`/ops/executive-kpis${query}`);
  }

  async downloadExecutiveReportCsv(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const url = `${API_BASE_URL}/ops/executive-report${query}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Request failed" }));
        if (response.status === 401) {
          return { error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
        }
        return { error: data.error || "Request failed" };
      }

      return { data: await response.blob() };
    } catch {
      return { error: "Network error" };
    }
  }

  async getExecutiveReportPack(date?: string) {
    const query = new URLSearchParams({ format: "json" });
    if (date) query.set("date", date);
    return this.request<ExecutiveReportPack>(
      `/ops/executive-report?${query.toString()}`
    );
  }

  async getProductionReadiness() {
    return this.request<ProductionReadiness>("/readiness/production");
  }

  // ============= NOTIFICATIONS =============

  async getVapidPublicKey() {
    return this.request<{ publicKey: string | null; configured: boolean }>(
      "/notifications/vapid-public-key"
    );
  }

  async registerPushSubscription(subscription: PushSubscriptionJSON) {
    return this.request<{ subscribed: boolean }>("/notifications/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
