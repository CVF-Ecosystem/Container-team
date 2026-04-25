/**
 * React Hooks để sử dụng dữ liệu từ IndexedDB
 * Includes auto-refresh polling for real-time updates
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DailyData, MonthlySummary, getCurrentYear } from './db';
import {
    getSyncStatus,
    subscribeSyncStatus,
    type SyncStatus,
    type SyncQueueItem,
} from './syncService';
import {
    getDailyData,
    getMonthlyData,
    getYearlyData,
    getYoYComparisonMonthly,
    getYoYComparisonQuarterly,
    getYoYComparisonYearly,
    getQuarterlyData,
    getYTD
} from './dataService';

/**
 * Hook để lấy dữ liệu ngày của năm hiện tại
 */
export function useDailyData(year?: number, month?: number) {
    return useLiveQuery(
        () => getDailyData(year ?? getCurrentYear(), month),
        [year, month]
    );
}

/**
 * Hook để lấy dữ liệu tháng
 */
export function useMonthlyData(year?: number) {
    return useLiveQuery(
        () => getMonthlyData(year),
        [year]
    );
}

/**
 * Hook để lấy dữ liệu năm
 */
export function useYearlyData() {
    return useLiveQuery(
        () => getYearlyData(),
        []
    );
}

/**
 * Hook để lấy so sánh cùng kỳ theo tháng
 */
export function useYoYComparison(month: number, years: number = 3) {
    return useLiveQuery(
        () => getYoYComparisonMonthly(month, years),
        [month, years]
    );
}

/**
 * Hook để lấy so sánh cùng kỳ theo quý
 */
export function useYoYComparisonQuarter(quarter: number, years: number = 3) {
    return useLiveQuery(
        () => getYoYComparisonQuarterly(quarter, years),
        [quarter, years]
    );
}

/**
 * Hook để lấy so sánh theo năm
 */
export function useYoYComparisonYear(years: number = 3) {
    return useLiveQuery(
        () => getYoYComparisonYearly(years),
        [years]
    );
}

/**
 * Hook để lấy dữ liệu quý
 */
export function useQuarterlyData(year?: number) {
    return useLiveQuery(
        () => getQuarterlyData(year),
        [year]
    );
}

/**
 * Hook để lấy YTD (Year To Date)
 */
export function useYTD(year: number) {
    return useLiveQuery(
        () => getYTD(year),
        [year]
    );
}

/**
 * Hook để kiểm tra trạng thái database
 */
export function useDbStatus() {
    return useLiveQuery(async () => {
        const dailyCount = await db.daily_data.count();
        const monthlyCount = await db.monthly_summary.count();
        const yearlyCount = await db.yearly_summary.count();
        const lastImport = await db.metadata.get('last_daily_import');

        return {
            dailyCount,
            monthlyCount,
            yearlyCount,
            lastImport: lastImport?.value as string | undefined,
            hasData: dailyCount > 0 || monthlyCount > 0 || yearlyCount > 0
        };
    }, []);
}

/**
 * Hook để lấy các năm có dữ liệu
 */
export function useAvailableYears() {
    return useLiveQuery(async () => {
        const yearly = await db.yearly_summary.orderBy('year').toArray();
        return yearly.map(y => y.year);
    }, []);
}

/**
 * Hook để tính KPI summary cho dashboard
 */
export function useKPISummary(year: number, month?: number) {
    return useLiveQuery(async () => {
        let data: (DailyData | MonthlySummary)[] = [];

        if (month !== undefined) {
            // Lấy theo tháng cụ thể
            data = await db.daily_data.where({ year, month }).toArray();
            if (data.length === 0) {
                // Fallback to monthly summary
                const monthly = await db.monthly_summary.where({ year, month }).first();
                if (monthly) data = [monthly];
            }
        } else {
            // Lấy theo năm
            data = await db.monthly_summary.where({ year }).toArray();
        }

        if (data.length === 0) {
            return {
                totalIn: 0,
                totalOut: 0,
                totalCfs: 0,
                xeTotal: 0,
                xalanTotal: 0,
                total: 0,
            };
        }

        return {
            totalIn: data.reduce((sum, d) => sum + (d.total_in ?? (d.xe_ha + d.xalan_ha)), 0),
            totalOut: data.reduce((sum, d) => sum + (d.total_out ?? (d.xe_giao + d.xalan_giao)), 0),
            totalCfs: data.reduce((sum, d) => sum + (d.total_cfs ?? (d.xe_cfs + d.xalan_cfs)), 0),
            xeTotal: data.reduce((sum, d) => sum + d.xe_total, 0),
            xalanTotal: data.reduce((sum, d) => sum + d.xalan_total, 0),
            total: data.reduce((sum, d) => sum + d.total, 0),
        };
    }, [year, month]);
}

// ============= REAL-TIME POLLING HOOKS =============

/**
 * Hook để tự động refresh data theo interval
 * Dừng polling khi tab không active (Page Visibility API)
 *
 * @param intervalMs - Khoảng thời gian refresh (ms), default 30 giây
 * @returns lastRefresh timestamp (dùng làm dependency cho các hooks khác)
 */
export function useAutoRefresh(intervalMs: number = 30_000): number {
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const startPolling = () => {
            intervalRef.current = setInterval(() => {
                // Chỉ refresh khi tab đang active
                if (!document.hidden) {
                    setLastRefresh(Date.now());
                }
            }, intervalMs);
        };

        const stopPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        // Dừng/tiếp tục polling khi tab visibility thay đổi
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // Refresh ngay khi tab active lại
                setLastRefresh(Date.now());
                startPolling();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intervalMs]);

    return lastRefresh;
}

/**
 * Hook để lấy thời gian kể từ lần refresh cuối
 * Dùng để hiển thị "Cập nhật X giây trước"
 */
export function useTimeSinceRefresh(lastRefresh: number): string {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - lastRefresh) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [lastRefresh]);

    if (elapsed < 60) return `${elapsed} giây trước`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)} phút trước`;
    return `${Math.floor(elapsed / 3600)} giờ trước`;
}

/**
 * Hook để subscribe trực tiếp vào SyncStatus reactive
 * Cập nhật tức thì khi có thay đổi (online/offline, pending changes, syncing)
 */
export function useSyncStatus(): SyncStatus {
    const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
    useEffect(() => subscribeSyncStatus(setStatus), []);
    return status;
}

/**
 * Hook để hiển thị danh sách các item đang chờ sync (pending queue)
 * Dùng Dexie useLiveQuery để reactive với IndexedDB
 */
export function useSyncQueue(): SyncQueueItem[] | undefined {
    return useLiveQuery(
        () => db.sync_queue.filter((item) => !item.synced).toArray(),
        []
    );
}
