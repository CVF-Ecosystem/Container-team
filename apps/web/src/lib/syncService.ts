/**
 * Sync Service - API-first online/offline synchronization
 *
 * Source of truth:
 * - API + PostgreSQL is authoritative
 * - IndexedDB is local cache and offline replay queue only
 *
 * Sync policy:
 * 1. Writes land in IndexedDB first for resilience
 * 2. Queue replays to API when online
 * 3. After successful replay, remote data is pulled back to refresh local cache
 */

import {
  db,
  DailyData,
  VesselData as LocalVesselData,
  Employee as LocalEmployee,
  SyncQueueItem,
} from "./db";
import apiClient, {
  DailyDataItem,
  DailyDataInput,
  Employee,
  EmployeeInput,
  VesselData,
  VesselDataInput,
} from "./apiClient";
import { logger } from "./logger";

export type { SyncQueueItem } from "./db";

type SyncTable = "daily_data" | "vessel_data" | "employees";

export interface SyncStatus {
  lastSyncAt: Date | null;
  pendingChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}

type SyncStatusListener = (status: SyncStatus) => void;
const listeners = new Set<SyncStatusListener>();

function notifyListeners(): void {
  const snapshot = getSyncStatus();
  listeners.forEach((cb) => cb(snapshot));
}

export function subscribeSyncStatus(cb: SyncStatusListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const syncStatus: SyncStatus = {
  lastSyncAt: null,
  pendingChanges: 0,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
};

if (typeof window !== "undefined") {
  void refreshPendingChanges();

  window.addEventListener("online", () => {
    syncStatus.isOnline = true;
    notifyListeners();
    logger.info("Online - starting API sync");
    void syncAll();
  });

  window.addEventListener("offline", () => {
    syncStatus.isOnline = false;
    notifyListeners();
    logger.warn("Offline - changes will remain in local queue");
  });
}

function toDate(value?: string | Date | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDayFromDate(date: string): number {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? Number(date.slice(-2)) || 1 : parsed.getDate();
}

function buildVesselNaturalKey(item: {
  date: string;
  vessel_name?: string | null;
  voyage?: string | null;
  stt?: number | null;
  atb?: string | null;
}): string {
  return [
    item.date,
    item.vessel_name?.trim().toLowerCase() || "",
    item.voyage?.trim().toLowerCase() || "",
    item.stt ?? "",
    item.atb || "",
  ].join("|");
}

function normalizeDailyData(item: DailyDataItem): DailyData {
  return {
    date: item.date,
    year: item.year,
    month: item.month,
    day: item.day,
    xe_ha: item.xe_ha,
    xe_giao: item.xe_giao,
    xe_cfs: item.xe_cfs,
    xe_total: item.xe_total,
    xe_hb: item.xe_hb,
    xe_tr: item.xe_tr,
    xe_ln: item.xe_ln,
    xe_cr: item.xe_cr,
    xe_dh: item.xe_dh,
    xe_rr: item.xe_rr,
    xalan_ha: item.xalan_ha,
    xalan_giao: item.xalan_giao,
    xalan_cfs: item.xalan_cfs,
    xalan_total: item.xalan_total,
    xalan_hb: item.xalan_hb,
    xalan_tr: item.xalan_tr,
    xalan_ln: item.xalan_ln,
    xalan_cr: item.xalan_cr,
    xalan_dh: item.xalan_dh,
    xalan_rr: item.xalan_rr,
    total_in: item.total_in,
    total_out: item.total_out,
    total_cfs: item.total_cfs,
    total: item.total,
    created_at: toDate(item.created_at),
    updated_at: toDate(item.updated_at),
  };
}

function normalizeVesselData(item: VesselData): LocalVesselData {
  return {
    stt: item.stt ?? undefined,
    vessel_name: item.vessel_name,
    voyage: item.voyage ?? undefined,
    shipping_line: item.shipping_line ?? undefined,
    atb: item.atb ?? undefined,
    atw: item.atw ?? undefined,
    atc: item.atc ?? undefined,
    atd: item.atd ?? undefined,
    date: item.date,
    year: item.year,
    month: item.month,
    day: getDayFromDate(item.date),
    nhap_tau: item.nhap_tau,
    xuat_tau: item.xuat_tau,
    shift_in: item.shift_in,
    shift_out: item.shift_out,
    total_moves: item.total_moves,
    teus: item.teus,
    working_hours:
      item.working_hours === null || item.working_hours === undefined
        ? undefined
        : Number(item.working_hours),
    berth_hours:
      item.berth_hours === null || item.berth_hours === undefined
        ? undefined
        : Number(item.berth_hours),
    remark: item.note ?? undefined,
    created_at: toDate(item.created_at),
    updated_at: toDate(item.updated_at),
  };
}

function normalizeEmployee(item: Employee): LocalEmployee {
  return {
    mscd: item.mscd,
    name: item.name,
    department: item.department,
    shift: item.shift,
    active: item.active,
    updated_at: toDate(item.updated_at),
  };
}

function toDailyDataInput(item: DailyData): DailyDataInput {
  return {
    date: item.date,
    xe_ha: item.xe_ha,
    xe_giao: item.xe_giao,
    xe_cfs: item.xe_cfs,
    xe_hb: item.xe_hb,
    xe_tr: item.xe_tr,
    xe_ln: item.xe_ln,
    xe_cr: item.xe_cr,
    xe_dh: item.xe_dh,
    xe_rr: item.xe_rr,
    xalan_ha: item.xalan_ha,
    xalan_giao: item.xalan_giao,
    xalan_cfs: item.xalan_cfs,
    xalan_hb: item.xalan_hb,
    xalan_tr: item.xalan_tr,
    xalan_ln: item.xalan_ln,
    xalan_cr: item.xalan_cr,
    xalan_dh: item.xalan_dh,
    xalan_rr: item.xalan_rr,
  };
}

function toEmployeeInput(item: LocalEmployee): EmployeeInput {
  return {
    mscd: item.mscd,
    name: item.name,
    department: item.department,
    shift: item.shift,
    active: item.active,
  };
}

function toVesselDataInput(item: LocalVesselData): VesselDataInput {
  return {
    vesselName: item.vessel_name || "Unknown",
    voyage: item.voyage || undefined,
    shippingLine: item.shipping_line || undefined,
    date: item.date,
    stt: item.stt,
    atb: item.atb,
    atw: item.atw,
    atc: item.atc,
    atd: item.atd,
    nhapTau: item.nhap_tau,
    xuatTau: item.xuat_tau,
    shiftIn: item.shift_in,
    shiftOut: item.shift_out,
    teus: item.teus,
    workingHours: item.working_hours,
    berthHours: item.berth_hours,
    note: item.remark,
  };
}

async function refreshPendingChanges(): Promise<void> {
  const queueItems = await db.sync_queue.toArray();
  syncStatus.pendingChanges = queueItems.filter((item) => !item.synced).length;
  notifyListeners();
}

async function hasPendingChangesForTable(table: SyncTable): Promise<boolean> {
  const items = await db.sync_queue.toArray();
  return items.some((item) => !item.synced && item.table_name === table);
}

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "timestamp" | "synced" | "retry_count">
): Promise<void> {
  await db.sync_queue.add({
    table_name: item.table_name,
    operation: item.operation,
    data: typeof item.data === "string" ? item.data : JSON.stringify(item.data),
    timestamp: new Date(),
    synced: false,
    retry_count: 0,
  });

  await refreshPendingChanges();

  if (syncStatus.isOnline && !syncStatus.isSyncing) {
    void syncAll();
  }
}

async function mergeRemoteToLocal(
  table: SyncTable,
  remoteData: DailyDataItem[] | VesselData[] | Employee[]
): Promise<void> {
  if (!remoteData.length) {
    return;
  }

  switch (table) {
    case "daily_data": {
      const items = remoteData as DailyDataItem[];
      const dates = items.map((item) => item.date);
      const existing = await db.daily_data.where("date").anyOf(dates).toArray();
      const existingMap = new Map(existing.map((item) => [item.date, item]));
      const merged = items.map((item) => {
        const local = existingMap.get(item.date);
        return local
          ? { ...normalizeDailyData(item), id: local.id }
          : normalizeDailyData(item);
      });
      await db.daily_data.bulkPut(merged);
      break;
    }

    case "employees": {
      const items = remoteData as Employee[];
      const mscds = items.map((item) => item.mscd);
      const existing = await db.employees.where("mscd").anyOf(mscds).toArray();
      const existingMap = new Map(existing.map((item) => [item.mscd, item]));
      const merged = items.map((item) => {
        const local = existingMap.get(item.mscd);
        return local
          ? { ...normalizeEmployee(item), id: local.id }
          : normalizeEmployee(item);
      });
      await db.employees.bulkPut(merged);
      break;
    }

    case "vessel_data": {
      const items = remoteData as VesselData[];
      const existing = await db.vessel_data.toArray();
      const existingMap = new Map(
        existing.map((item) => [buildVesselNaturalKey(item), item])
      );
      const merged = items.map((item) => {
        const normalized = normalizeVesselData(item);
        const local = existingMap.get(buildVesselNaturalKey(normalized));
        return local ? { ...normalized, id: local.id } : normalized;
      });
      await db.vessel_data.bulkPut(merged);
      break;
    }
  }
}

async function fetchAndCacheDailyData(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const result = await apiClient.getDailyData(params);
  if (result.error || !result.data?.data) {
    throw new Error(result.error || "Failed to fetch daily data from API");
  }
  await mergeRemoteToLocal("daily_data", result.data.data);
}

async function fetchAndCacheVesselData(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const result = await apiClient.getVesselData(params);
  if (result.error || !result.data?.data) {
    throw new Error(result.error || "Failed to fetch vessel data from API");
  }
  await mergeRemoteToLocal("vessel_data", result.data.data);
}

async function fetchAndCacheEmployees(params?: {
  department?: string;
  active?: boolean;
}): Promise<void> {
  const result = await apiClient.getEmployees(params);
  if (result.error || !result.data?.data) {
    throw new Error(result.error || "Failed to fetch employees from API");
  }
  await mergeRemoteToLocal("employees", result.data.data);
}

async function loadLocalDailyData(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<DailyData[]> {
  let data = params.year
    ? await db.daily_data.where("year").equals(params.year).toArray()
    : await db.daily_data.toArray();

  if (params.month !== undefined) {
    data = data.filter((item) => item.month === params.month);
  }
  if (params.startDate) {
    const startDate = params.startDate;
    data = data.filter((item) => item.date >= startDate);
  }
  if (params.endDate) {
    const endDate = params.endDate;
    data = data.filter((item) => item.date <= endDate);
  }

  return data.sort((a, b) => b.date.localeCompare(a.date));
}

async function loadLocalVesselData(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<LocalVesselData[]> {
  let data = params.year
    ? await db.vessel_data.where("year").equals(params.year).toArray()
    : await db.vessel_data.toArray();

  if (params.month !== undefined) {
    data = data.filter((item) => item.month === params.month);
  }
  if (params.startDate) {
    const startDate = params.startDate;
    data = data.filter((item) => item.date >= startDate);
  }
  if (params.endDate) {
    const endDate = params.endDate;
    data = data.filter((item) => item.date <= endDate);
  }

  return data.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDailyDataUnified(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<DailyData[]> {
  const localData = await loadLocalDailyData(params);

  if (!syncStatus.isOnline) {
    return localData;
  }

  try {
    await syncAll();
    if (await hasPendingChangesForTable("daily_data")) {
      return localData;
    }

    await fetchAndCacheDailyData(params);
    return loadLocalDailyData(params);
  } catch (error) {
    logger.warn("Failed to refresh daily data from API", error);
    return localData;
  }
}

export async function getVesselDataUnified(params: {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}): Promise<LocalVesselData[]> {
  const localData = await loadLocalVesselData(params);

  if (!syncStatus.isOnline) {
    return localData;
  }

  try {
    await syncAll();
    if (await hasPendingChangesForTable("vessel_data")) {
      return localData;
    }

    await fetchAndCacheVesselData(params);
    return loadLocalVesselData(params);
  } catch (error) {
    logger.warn("Failed to refresh vessel data from API", error);
    return localData;
  }
}

export async function getEmployeesUnified(params?: {
  department?: string;
  active?: boolean;
}): Promise<LocalEmployee[]> {
  let localData = await db.employees.toArray();

  if (params?.department) {
    localData = localData.filter((item) => item.department === params.department);
  }
  if (params?.active !== undefined) {
    localData = localData.filter((item) => item.active === params.active);
  }

  if (!syncStatus.isOnline) {
    return localData;
  }

  try {
    await syncAll();
    if (await hasPendingChangesForTable("employees")) {
      return localData;
    }

    await fetchAndCacheEmployees(params);
    let refreshed = await db.employees.toArray();
    if (params?.department) {
      refreshed = refreshed.filter((item) => item.department === params.department);
    }
    if (params?.active !== undefined) {
      refreshed = refreshed.filter((item) => item.active === params.active);
    }
    return refreshed;
  } catch (error) {
    logger.warn("Failed to refresh employees from API", error);
    return localData;
  }
}

export async function saveDailyData(
  data: Omit<DailyData, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  const now = new Date();
  const enrichedData: DailyData[] = data.map((item) => ({
    ...item,
    created_at: now,
    updated_at: now,
  }));

  const dates = Array.from(new Set(enrichedData.map((item) => item.date)));
  await db.daily_data.where("date").anyOf(dates).delete();
  await db.daily_data.bulkPut(enrichedData);

  await addToSyncQueue({
    table_name: "daily_data",
    operation: "insert",
    data: JSON.stringify(enrichedData),
  });
}

export async function saveVesselData(
  data: Omit<LocalVesselData, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  const now = new Date();
  const existing = await db.vessel_data.toArray();
  const existingMap = new Map(
    existing.map((item) => [buildVesselNaturalKey(item), item])
  );

  const enrichedData: LocalVesselData[] = data.map((item) => {
    const local = existingMap.get(buildVesselNaturalKey(item));
    return {
      ...item,
      id: local?.id,
      created_at: local?.created_at || now,
      updated_at: now,
    };
  });

  await db.vessel_data.bulkPut(enrichedData);

  await addToSyncQueue({
    table_name: "vessel_data",
    operation: "insert",
    data: JSON.stringify(enrichedData),
  });
}

export async function saveEmployees(
  data: Omit<LocalEmployee, "id" | "updated_at">[]
): Promise<void> {
  const now = new Date();
  const existing = await db.employees.toArray();
  const existingMap = new Map(existing.map((item) => [item.mscd, item]));

  const enrichedData: LocalEmployee[] = data.map((item) => {
    const local = existingMap.get(item.mscd);
    return {
      ...item,
      id: local?.id,
      updated_at: now,
    };
  });

  await db.employees.bulkPut(enrichedData);

  await addToSyncQueue({
    table_name: "employees",
    operation: "insert",
    data: JSON.stringify(enrichedData),
  });
}

function parseQueueData<T>(item: SyncQueueItem): T[] {
  const parsed = JSON.parse(item.data) as T | T[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function pushQueueItemToApi(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.table_name as SyncTable) {
      case "daily_data": {
        const payload = parseQueueData<DailyData>(item).map((entry) =>
          toDailyDataInput({
            ...entry,
            created_at: toDate(entry.created_at),
            updated_at: toDate(entry.updated_at),
          })
        );
        const result = await apiClient.bulkUpsertDailyData(payload);
        return !result.error;
      }

      case "employees": {
        const payload = parseQueueData<LocalEmployee>(item).map((entry) =>
          toEmployeeInput({
            ...entry,
            updated_at: toDate(entry.updated_at),
          })
        );
        const result = await apiClient.bulkUpsertEmployees(payload);
        return !result.error;
      }

      case "vessel_data": {
        const payload = parseQueueData<LocalVesselData>(item).map((entry) =>
          toVesselDataInput({
            ...entry,
            created_at: toDate(entry.created_at),
            updated_at: toDate(entry.updated_at),
          })
        );
        const result = await apiClient.bulkUpsertVesselData(payload);
        return !result.error;
      }

      default:
        logger.warn(`Unsupported sync table: ${item.table_name}`);
        return false;
    }
  } catch (error) {
    logger.error(`Failed to sync ${item.table_name}`, error);
    return false;
  }
}

async function refreshAuthoritativeCache(): Promise<void> {
  const currentYear = new Date().getFullYear();

  if (!(await hasPendingChangesForTable("daily_data"))) {
    try {
      await fetchAndCacheDailyData({ year: currentYear });
    } catch (error) {
      logger.warn("Failed to refresh authoritative daily data", error);
    }
  }

  if (!(await hasPendingChangesForTable("employees"))) {
    try {
      await fetchAndCacheEmployees();
    } catch (error) {
      logger.warn("Failed to refresh authoritative employees", error);
    }
  }

  if (!(await hasPendingChangesForTable("vessel_data"))) {
    try {
      await fetchAndCacheVesselData({ year: currentYear });
    } catch (error) {
      logger.warn("Failed to refresh authoritative vessel data", error);
    }
  }
}

export async function syncAll(): Promise<void> {
  if (!syncStatus.isOnline || syncStatus.isSyncing) {
    return;
  }

  syncStatus.isSyncing = true;
  notifyListeners();
  logger.info("Starting API sync");

  try {
    const pendingItems = (await db.sync_queue.toArray()).filter((item) => !item.synced);

    let syncedAny = false;
    for (const item of pendingItems) {
      const success = await pushQueueItemToApi(item);
      if (success) {
        syncedAny = true;
        await db.sync_queue.update(item.id!, { synced: true });
      } else {
        await db.sync_queue.update(item.id!, {
          retry_count: (item.retry_count || 0) + 1,
        });
      }
    }

    const syncedIds = (await db.sync_queue.toArray())
      .filter((item) => item.synced && item.id !== undefined)
      .map((item) => item.id!) as number[];

    if (syncedIds.length > 0) {
      await db.sync_queue.bulkDelete(syncedIds);
    }
    await refreshPendingChanges();

    if (syncedAny) {
      await refreshAuthoritativeCache();
    }

    syncStatus.lastSyncAt = new Date();
    notifyListeners();
    logger.info("API sync complete", {
      pending: syncStatus.pendingChanges,
    });
  } catch (error) {
    logger.error("Sync failed", error);
  } finally {
    syncStatus.isSyncing = false;
    notifyListeners();
  }
}

export async function fullSync(): Promise<void> {
  if (!syncStatus.isOnline) {
    logger.warn("Cannot perform full sync while offline");
    return;
  }

  if (syncStatus.isSyncing) {
    return;
  }

  syncStatus.isSyncing = true;
  notifyListeners();
  logger.info("Starting full API sync");

  try {
    await refreshAuthoritativeCache();
    syncStatus.lastSyncAt = new Date();
    notifyListeners();
    logger.info("Full API sync complete");
  } catch (error) {
    logger.error("Full API sync failed", error);
  } finally {
    syncStatus.isSyncing = false;
    notifyListeners();
  }
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

export async function clearSyncQueue(): Promise<void> {
  await db.sync_queue.clear();
  syncStatus.pendingChanges = 0;
  notifyListeners();
}

export async function clearLocalData(): Promise<void> {
  await db.daily_data.clear();
  await db.monthly_summary.clear();
  await db.yearly_summary.clear();
  await db.vessel_data.clear();
  await db.employees.clear();
  await db.vessels.clear();
  await db.sync_queue.clear();
  syncStatus.pendingChanges = 0;
  notifyListeners();
  logger.info("Local cache and sync queue cleared");
}

export const SyncService = {
  getDailyDataUnified,
  getVesselDataUnified,
  getEmployeesUnified,
  saveDailyData,
  saveVesselData,
  saveEmployees,
  syncAll,
  fullSync,
  getSyncStatus,
  clearSyncQueue,
  clearLocalData,
  addToSyncQueue,
};
