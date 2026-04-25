/**
 * Data Provider - Hybrid data layer (API + IndexedDB fallback)
 *
 * This provider checks if API is available:
 * - If yes: use API for real-time data from PostgreSQL
 * - If no: fallback to IndexedDB for offline support
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import apiClient, {
  DashboardSummary as ApiDashboardSummary,
} from "./apiClient";
import {
  db,
  DailyData as DbDailyData,
  MonthlySummary as DbMonthlySummary,
} from "./db";

// ============= TYPES =============

export type DataSource = "api" | "indexeddb" | "checking";

export interface DailyDataRecord {
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
}

export interface MonthlyDataRecord {
  id: string;
  year: number;
  month: number;
  quarter: number;
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
}

export interface DataProviderState {
  source: DataSource;
  apiAvailable: boolean;
  loading: boolean;
  error: string | null;
}

export interface DataProviderContext extends DataProviderState {
  // Daily data methods
  getDailyData: (params?: {
    year?: number;
    month?: number;
    limit?: number;
  }) => Promise<DailyDataRecord[]>;

  // Monthly data methods
  getMonthlyData: (year?: number) => Promise<MonthlyDataRecord[]>;

  // Dashboard summary
  getDashboardSummary: (year?: number) => Promise<ApiDashboardSummary | null>;

  // Force refresh
  refresh: () => void;
}

const DataContext = createContext<DataProviderContext | null>(null);

// ============= PROVIDER COMPONENT =============

export function DataProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<DataSource>("checking");
  const [apiAvailable, setApiAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkApiHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL?.replace("/api", "/health") ||
          "http://localhost:3001/health",
        { method: "GET", signal: AbortSignal.timeout(3000) }
      );

      if (response.ok) {
        setApiAvailable(true);
        setSource("api");
      } else {
        setApiAvailable(false);
        setSource("indexeddb");
      }
    } catch {
      setApiAvailable(false);
      setSource("indexeddb");
    }
    setLoading(false);
  }, []);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  const refresh = useCallback(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  // ============= DATA FETCHING METHODS =============

  const getDailyData = async (params?: {
    year?: number;
    month?: number;
    limit?: number;
  }): Promise<DailyDataRecord[]> => {
    const year = params?.year || new Date().getFullYear();
    const month = params?.month;
    const limit = params?.limit;

    if (source === "api" && apiAvailable) {
      // Fetch from API (limit is passed to API for server-side pagination)
      try {
        const result = await apiClient.getDailyData({ year, month, limit });
        if (result.data?.data) {
          return result.data.data.map((d) => ({
            id: d.id,
            date: d.date,
            year: d.year,
            month: d.month,
            day: d.day,
            xe_ha: d.xe_ha,
            xe_giao: d.xe_giao,
            xe_cfs: d.xe_cfs,
            xe_total: d.xe_total,
            xalan_ha: d.xalan_ha,
            xalan_giao: d.xalan_giao,
            xalan_cfs: d.xalan_cfs,
            xalan_total: d.xalan_total,
            total_in: d.total_in,
            total_out: d.total_out,
            total_cfs: d.total_cfs,
            total: d.total,
          }));
        }
        setError(result.error || "Failed to fetch daily data");
        return [];
      } catch (e) {
        setError(e instanceof Error ? e.message : "API error");
        // Fallback to IndexedDB
        return fetchDailyFromIndexedDB(year, month, limit);
      }
    }

    // Fetch from IndexedDB
    return fetchDailyFromIndexedDB(year, month, limit);
  };

  const fetchDailyFromIndexedDB = async (
    year: number,
    month?: number,
    limit?: number
  ): Promise<DailyDataRecord[]> => {
    try {
      let query = db.daily_data.where("year").equals(year);
      if (month) {
        query = db.daily_data.where({ year, month });
      }

      // Apply limit for IndexedDB queries (client-side pagination)
      const data = limit
        ? await query.limit(limit).toArray()
        : await query.toArray();
      return data.map((d: DbDailyData) => ({
        id: d.id?.toString() || `${d.year}-${d.month}-${d.day}`,
        date: d.date,
        year: d.year,
        month: d.month,
        day: d.day,
        xe_ha: d.xe_ha,
        xe_giao: d.xe_giao,
        xe_cfs: d.xe_cfs,
        xe_total: d.xe_total,
        xalan_ha: d.xalan_ha,
        xalan_giao: d.xalan_giao,
        xalan_cfs: d.xalan_cfs,
        xalan_total: d.xalan_total,
        total_in: d.total_in,
        total_out: d.total_out,
        total_cfs: d.total_cfs,
        total: d.total,
      }));
    } catch (e) {
      console.error("IndexedDB error:", e);
      return [];
    }
  };

  const getMonthlyData = async (
    year?: number
  ): Promise<MonthlyDataRecord[]> => {
    const targetYear = year || new Date().getFullYear();

    if (source === "api" && apiAvailable) {
      try {
        const result = await apiClient.getMonthlyStats(targetYear);
        if (result.data?.months) {
          return result.data.months.map((m) => ({
            id: `${targetYear}-${m.month}`,
            year: targetYear,
            month: m.month,
            quarter: Math.ceil(m.month / 3),
            xe_ha: m.xe.ha,
            xe_giao: m.xe.giao,
            xe_cfs: m.xe.cfs,
            xe_total: m.xe.ha + m.xe.giao + m.xe.cfs,
            xalan_ha: m.xalan.ha,
            xalan_giao: m.xalan.giao,
            xalan_cfs: m.xalan.cfs,
            xalan_total: m.xalan.ha + m.xalan.giao + m.xalan.cfs,
            total_in: m.xe.ha + m.xalan.ha,
            total_out: m.xe.giao + m.xalan.giao,
            total_cfs: m.xe.cfs + m.xalan.cfs,
            total:
              m.xe.ha +
              m.xe.giao +
              m.xe.cfs +
              m.xalan.ha +
              m.xalan.giao +
              m.xalan.cfs,
          }));
        }
        return [];
      } catch {
        // Fallback
        return fetchMonthlyFromIndexedDB(targetYear);
      }
    }

    return fetchMonthlyFromIndexedDB(targetYear);
  };

  const fetchMonthlyFromIndexedDB = async (
    year: number
  ): Promise<MonthlyDataRecord[]> => {
    try {
      const data = await db.monthly_summary
        .where("year")
        .equals(year)
        .toArray();
      return data.map((d: DbMonthlySummary) => ({
        id: d.id?.toString() || `${d.year}-${d.month}`,
        year: d.year,
        month: d.month,
        quarter: d.quarter,
        xe_ha: d.xe_ha,
        xe_giao: d.xe_giao,
        xe_cfs: d.xe_cfs,
        xe_total: d.xe_total,
        xalan_ha: d.xalan_ha,
        xalan_giao: d.xalan_giao,
        xalan_cfs: d.xalan_cfs,
        xalan_total: d.xalan_total,
        total_in: d.total_in,
        total_out: d.total_out,
        total_cfs: d.total_cfs,
        total: d.total,
      }));
    } catch {
      return [];
    }
  };

  const getDashboardSummary = async (
    year?: number
  ): Promise<ApiDashboardSummary | null> => {
    if (source === "api" && apiAvailable) {
      try {
        const result = await apiClient.getSummary(year);
        if (result.data) {
          return result.data;
        }
      } catch {
        // Return null, UI should use local calculation
      }
    }
    return null;
  };

  const value: DataProviderContext = {
    source,
    apiAvailable,
    loading,
    error,
    getDailyData,
    getMonthlyData,
    getDashboardSummary,
    refresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ============= HOOK =============

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// ============= CONNECTION STATUS COMPONENT =============

export function ConnectionStatus() {
  const { apiAvailable, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="animate-pulse">●</span>
        <span>Đang kết nối...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {apiAvailable ? (
        <>
          <span className="text-green-400">●</span>
          <span className="text-green-400">Đã kết nối</span>
        </>
      ) : (
        <>
          <span className="text-yellow-400">●</span>
          <span className="text-yellow-400">Dữ liệu cục bộ</span>
        </>
      )}
    </div>
  );
}
