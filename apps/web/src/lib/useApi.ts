/**
 * React Hooks for API Integration
 * Use these hooks to connect components with the backend API
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient, {
  DailyDataItem,
  DailyDataInput,
  Employee,
  EmployeeInput,
  DashboardSummary,
  MonthlyStats,
  VesselData,
} from "./apiClient";

// ============= GENERIC FETCH HOOK =============

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useFetch<T>(
  fetchFn: () => Promise<{ data?: T; error?: string }>,
  deps: unknown[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ============= AUTH HOOKS =============

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const result = await apiClient.getMe();
      if (result.data?.user) {
        setUser(result.data.user);
      } else {
        void apiClient.logout();
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.login(username, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return false;
    }

    if (result.data?.user) {
      setUser(result.data.user);
    }
    setLoading(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    void apiClient.logout();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return { user, loading, error, login, logout, isAuthenticated, isAdmin };
}

// ============= DAILY DATA HOOKS =============

export function useDailyData(params?: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useFetch<{ data: DailyDataItem[] }>(
    () => apiClient.getDailyData(params),
    [
      params?.year,
      params?.month,
      params?.startDate,
      params?.endDate,
      params?.limit,
    ]
  );
}

export function useDailyDataByDate(date: string) {
  return useFetch<{ data: DailyDataItem }>(
    () => apiClient.getDailyDataByDate(date),
    [date]
  );
}

export function useDailyDataMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsert = useCallback(async (data: DailyDataInput) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.upsertDailyData(data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    return result.data;
  }, []);

  const bulkUpsert = useCallback(async (data: DailyDataInput[]) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.bulkUpsertDailyData(data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    return result.data;
  }, []);

  const remove = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.deleteDailyData(date);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    return true;
  }, []);

  return { upsert, bulkUpsert, remove, loading, error };
}

// ============= EMPLOYEE HOOKS =============

export function useEmployees(params?: {
  department?: string;
  shift?: string;
  active?: boolean;
  search?: string;
}) {
  return useFetch<{ data: Employee[] }>(
    () => apiClient.getEmployees(params),
    [params?.department, params?.shift, params?.active, params?.search]
  );
}

export function useDepartments() {
  return useFetch<{ data: string[] }>(() => apiClient.getDepartments(), []);
}

export function useShifts() {
  return useFetch<{ data: string[] }>(() => apiClient.getShifts(), []);
}

export function useEmployeeMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: EmployeeInput) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.createEmployee(data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    return result.data;
  }, []);

  const update = useCallback(
    async (id: string, data: Partial<EmployeeInput>) => {
      setLoading(true);
      setError(null);
      const result = await apiClient.updateEmployee(id, data);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return null;
      }
      return result.data;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.deleteEmployee(id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    return true;
  }, []);

  return { create, update, remove, loading, error };
}

// ============= STATISTICS HOOKS =============

export function useDashboardSummary(year?: number) {
  return useFetch<DashboardSummary>(() => apiClient.getSummary(year), [year]);
}

export function useMonthlyStats(year?: number) {
  return useFetch<MonthlyStats>(() => apiClient.getMonthlyStats(year), [year]);
}

export function useQuarterlyStats(year?: number) {
  return useFetch(() => apiClient.getQuarterlyStats(year), [year]);
}

export function useYearComparison(year1: number, year2: number) {
  return useFetch(
    () => apiClient.getYearComparison(year1, year2),
    [year1, year2]
  );
}

// ============= VESSEL HOOKS =============

export function useVessels(active?: boolean) {
  return useFetch(() => apiClient.getVessels(active), [active]);
}

export function useVesselData(params?: {
  year?: number;
  month?: number;
  vesselName?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useFetch<{ data: VesselData[] }>(
    () => apiClient.getVesselData(params),
    [
      params?.year,
      params?.month,
      params?.vesselName,
      params?.startDate,
      params?.endDate,
      params?.limit,
    ]
  );
}

// ============= UTILITY HOOKS =============

/**
 * Hook to check API health
 */
export function useApiHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_API_URL?.replace("/api", "/health") ||
            "http://localhost:3001/health"
        );
        setHealthy(response.ok);
      } catch {
        setHealthy(false);
      }
      setChecking(false);
    };

    check();
  }, []);

  return { healthy, checking };
}

/**
 * Hook to determine data source (API vs IndexedDB)
 */
export function useDataSource() {
  const { healthy, checking } = useApiHealth();

  // Use API if healthy, otherwise fallback to IndexedDB
  const source = healthy ? "api" : "indexeddb";
  const ready = !checking;

  return { source, ready, apiAvailable: healthy };
}
