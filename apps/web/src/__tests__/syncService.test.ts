import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiClientMock, loggerMock } = vi.hoisted(() => ({
  apiClientMock: {
    bulkUpsertDailyData: vi.fn(),
    bulkUpsertEmployees: vi.fn(),
    bulkUpsertVesselData: vi.fn(),
    getDailyData: vi.fn(),
    getEmployees: vi.fn(),
    getVesselData: vi.fn(),
  },
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/apiClient", () => ({
  default: apiClientMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

function buildLocalDailyData(date: string) {
  return {
    date,
    year: 2026,
    month: 4,
    day: 23,
    xe_ha: 10,
    xe_giao: 8,
    xe_cfs: 2,
    xe_total: 20,
    xalan_ha: 5,
    xalan_giao: 3,
    xalan_cfs: 1,
    xalan_total: 9,
    total_in: 15,
    total_out: 11,
    total_cfs: 3,
    total: 29,
    created_at: new Date("2026-04-23T00:00:00.000Z"),
    updated_at: new Date("2026-04-23T00:00:00.000Z"),
  };
}

function buildRemoteDailyData(date: string) {
  return {
    ...buildLocalDailyData(date),
    xe_hb: 1,
    xe_tr: 0,
    xe_ln: 0,
    xe_cr: 0,
    xe_dh: 0,
    xe_rr: 0,
    xalan_hb: 0,
    xalan_tr: 0,
    xalan_ln: 0,
    xalan_cr: 0,
    xalan_dh: 0,
    xalan_rr: 0,
    created_at: "2026-04-23T00:00:00.000Z",
    updated_at: "2026-04-23T00:10:00.000Z",
  };
}

describe("syncService", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    setNavigatorOnline(true);

    Object.values(apiClientMock).forEach((mockFn) => mockFn.mockReset());
    Object.values(loggerMock).forEach((mockFn) => mockFn.mockReset());

    const { db } = await import("@/lib/db");
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("subscribeSyncStatus fires listener with current snapshot on status change", async () => {
    setNavigatorOnline(false);

    const { saveDailyData, subscribeSyncStatus } = await import("@/lib/syncService");

    const received: { isOnline: boolean; pendingChanges: number }[] = [];
    const unsub = subscribeSyncStatus((s) => received.push({ isOnline: s.isOnline, pendingChanges: s.pendingChanges }));

    await saveDailyData([
      {
        date: "2026-04-25",
        year: 2026,
        month: 4,
        day: 25,
        xe_ha: 1,
        xe_giao: 1,
        xe_cfs: 0,
        xe_total: 2,
        xalan_ha: 0,
        xalan_giao: 0,
        xalan_cfs: 0,
        xalan_total: 0,
        total_in: 1,
        total_out: 1,
        total_cfs: 0,
        total: 2,
      },
    ]);

    await vi.waitFor(() => {
      expect(received.some((s) => s.pendingChanges === 1)).toBe(true);
    });

    unsub();
    const countBefore = received.length;

    await saveDailyData([
      {
        date: "2026-04-26",
        year: 2026,
        month: 4,
        day: 26,
        xe_ha: 1,
        xe_giao: 1,
        xe_cfs: 0,
        xe_total: 2,
        xalan_ha: 0,
        xalan_giao: 0,
        xalan_cfs: 0,
        xalan_total: 0,
        total_in: 1,
        total_out: 1,
        total_cfs: 0,
        total: 2,
      },
    ]);

    await new Promise((r) => setTimeout(r, 50));
    expect(received.length).toBe(countBefore);
  });

  it("queues offline daily-data writes in IndexedDB without server replay", async () => {
    setNavigatorOnline(false);

    const { saveDailyData, getSyncStatus } = await import("@/lib/syncService");
    const { db } = await import("@/lib/db");

    await saveDailyData([
      {
        date: "2026-04-23",
        year: 2026,
        month: 4,
        day: 23,
        xe_ha: 10,
        xe_giao: 8,
        xe_cfs: 2,
        xe_total: 20,
        xalan_ha: 5,
        xalan_giao: 3,
        xalan_cfs: 1,
        xalan_total: 9,
        total_in: 15,
        total_out: 11,
        total_cfs: 3,
        total: 29,
      },
    ]);

    expect(await db.daily_data.count()).toBe(1);
    expect(await db.sync_queue.count()).toBe(1);
    expect(apiClientMock.bulkUpsertDailyData).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(getSyncStatus()).toMatchObject({
        isOnline: false,
        pendingChanges: 1,
        isSyncing: false,
      });
    });
  });

  it("replays queued daily-data writes to the API and refreshes the local cache", async () => {
    setNavigatorOnline(true);

    apiClientMock.bulkUpsertDailyData.mockResolvedValue({
      data: { inserted: 1 },
    });
    apiClientMock.getDailyData.mockResolvedValue({
      data: { data: [buildRemoteDailyData("2026-04-23")] },
    });
    apiClientMock.getEmployees.mockResolvedValue({
      data: { data: [] },
    });
    apiClientMock.getVesselData.mockResolvedValue({
      data: { data: [] },
    });

    const { syncAll, getSyncStatus } = await import("@/lib/syncService");
    const { db } = await import("@/lib/db");

    await db.sync_queue.add({
      table_name: "daily_data",
      operation: "insert",
      data: JSON.stringify([buildLocalDailyData("2026-04-23")]),
      timestamp: new Date("2026-04-23T00:00:00.000Z"),
      synced: false,
      retry_count: 0,
    });

    await syncAll();

    expect(apiClientMock.bulkUpsertDailyData).toHaveBeenCalledWith([
      {
        date: "2026-04-23",
        xe_ha: 10,
        xe_giao: 8,
        xe_cfs: 2,
        xe_hb: undefined,
        xe_tr: undefined,
        xe_ln: undefined,
        xe_cr: undefined,
        xe_dh: undefined,
        xe_rr: undefined,
        xalan_ha: 5,
        xalan_giao: 3,
        xalan_cfs: 1,
        xalan_hb: undefined,
        xalan_tr: undefined,
        xalan_ln: undefined,
        xalan_cr: undefined,
        xalan_dh: undefined,
        xalan_rr: undefined,
      },
    ]);

    expect(await db.sync_queue.count()).toBe(0);
    expect(await db.daily_data.count()).toBe(1);
    expect((await db.daily_data.toArray())[0]).toMatchObject({
      date: "2026-04-23",
      xe_hb: 1,
    });
    expect(getSyncStatus().pendingChanges).toBe(0);
    expect(getSyncStatus().lastSyncAt).not.toBeNull();
  });

  it("pulls authoritative API data into IndexedDB during full sync", async () => {
    apiClientMock.getDailyData.mockResolvedValue({
      data: { data: [buildRemoteDailyData("2026-04-24")] },
    });
    apiClientMock.getEmployees.mockResolvedValue({
      data: {
        data: [
          {
            mscd: "E001",
            name: "Nguyen Van A",
            department: "Ops",
            shift: "Ca 1",
            role: null,
            active: true,
            updated_at: "2026-04-24T00:00:00.000Z",
          },
        ],
      },
    });
    apiClientMock.getVesselData.mockResolvedValue({
      data: {
        data: [
          {
            id: "v1",
            vessel_name: "MSC TEST",
            voyage: "VOY-01",
            shipping_line: "MSC",
            date: "2026-04-24",
            year: 2026,
            month: 4,
            stt: 1,
            atb: "2026-04-24T01:00:00.000Z",
            atw: null,
            atc: null,
            atd: null,
            nhap_tau: 10,
            xuat_tau: 12,
            shift_in: 1,
            shift_out: 2,
            total_moves: 25,
            teus: 40,
            working_hours: 5,
            berth_hours: 7,
            berth_name: "B1",
            note: "synced",
            created_at: "2026-04-24T00:00:00.000Z",
            updated_at: "2026-04-24T00:05:00.000Z",
          },
        ],
      },
    });

    const { fullSync, getSyncStatus } = await import("@/lib/syncService");
    const { db } = await import("@/lib/db");

    await fullSync();

    expect(await db.daily_data.count()).toBe(1);
    expect(await db.employees.count()).toBe(1);
    expect(await db.vessel_data.count()).toBe(1);
    expect(getSyncStatus().lastSyncAt).not.toBeNull();
  });
});
