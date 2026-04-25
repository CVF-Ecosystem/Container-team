import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-chars";
process.env.JWT_EXPIRES_IN = "1h";
process.env.NODE_ENV = "test";
process.env.INTEGRATION_API_KEY = "test-integration-key";

const db = vi.hoisted(() => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  checkConnection: vi.fn(),
  pool: {
    totalCount: 3,
    idleCount: 2,
    waitingCount: 0,
    end: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock("../db/index.js", () => db);

describe("API app", () => {
  let app: Express;

  beforeAll(async () => {
    const { createApp } = await import("../app.js");
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    db.checkConnection.mockResolvedValue(true);
  });

  it("exposes versioned health with database pool stats", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.body.status).toBe("healthy");
    expect(response.body.database).toMatchObject({
      status: "connected",
      pool: { total: 3, idle: 2, waiting: 0 },
    });
  });

  it("logs in through API auth and returns a JWT session", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    db.queryOne.mockResolvedValueOnce({
      id: "user-1",
      username: "admin",
      password_hash: passwordHash,
      name: "Admin",
      role: "admin",
      department: "IT",
      active: true,
    });
    db.query.mockResolvedValueOnce([]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "secret123" })
      .expect(200);

    expect(response.body.user).toMatchObject({
      id: "user-1",
      username: "admin",
      role: "admin",
    });
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.headers["set-cookie"]?.[0]).toContain("tt_auth=");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(db.query).toHaveBeenCalledWith(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      ["user-1"]
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      expect.arrayContaining(["user-1", "admin", "LOGIN_SUCCESS"])
    );
  });

  it("routes async validation errors through the error handler", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin" })
      .expect(400);

    expect(response.body).toEqual({ error: "Invalid credentials" });
  });

  it("protects write endpoints with JWT auth", async () => {
    await request(app)
      .post("/api/v1/daily-data/bulk")
      .send([{ date: "2026-04-23", xe_ha: 1, xe_giao: 0, xe_cfs: 0 }])
      .expect(401);
  });

  it("accepts authenticated API-first daily-data bulk replay", async () => {
    const token = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );
    db.query.mockResolvedValue([]);

    const response = await request(app)
      .post("/api/v1/daily-data/bulk")
      .set("Authorization", `Bearer ${token}`)
      .send([
        {
          date: "2026-04-23",
          xe_ha: 1,
          xe_giao: 2,
          xe_cfs: 3,
          xalan_ha: 4,
          xalan_giao: 5,
          xalan_cfs: 6,
        },
      ])
      .expect(201);

    expect(response.body).toEqual({ inserted: 1 });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      expect.arrayContaining([
        "user-1",
        "admin",
        "BULK_UPSERT_DAILY_DATA",
        "daily_data",
      ])
    );
  });

  it("accepts HTTP-only cookie auth for protected routes", async () => {
    const token = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );
    db.query.mockResolvedValue([]);

    const response = await request(app)
      .post("/api/v1/daily-data/bulk")
      .set("Cookie", [`tt_auth=${token}`])
      .send([
        {
          date: "2026-04-24",
          xe_ha: 1,
          xe_giao: 2,
          xe_cfs: 3,
          xalan_ha: 4,
          xalan_giao: 5,
          xalan_cfs: 6,
        },
      ])
      .expect(201);

    expect(response.body).toEqual({ inserted: 1 });
  });

  it("clears the HTTP-only auth cookie on logout", async () => {
    const response = await request(app).post("/api/v1/auth/logout").expect(200);

    expect(response.body).toEqual({ message: "Logged out" });
    expect(response.headers["set-cookie"]?.[0]).toContain("tt_auth=");
    expect(response.headers["set-cookie"]?.[0]).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("returns the admin operations dashboard overview", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );

    db.query
      .mockResolvedValueOnce([
        {
          shift: "Ca 1",
          department: "Bãi",
          start_reporter: "Tran A",
          end_reporter: null,
          start_updated_at: "2026-04-25T01:00:00.000Z",
          end_updated_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "vessel-1",
          vessel_name: "TT TEST",
          voyage: "V001",
          berth_name: "B1",
          total_moves: "42",
          teus: "50",
          atb: "2026-04-25T00:00:00.000Z",
          atd: null,
        },
      ]);

    db.queryOne.mockResolvedValueOnce({
      total_in: "10",
      total_out: "20",
      total_cfs: "3",
      total_moves: "33",
    });

    const response = await request(app)
      .get("/api/v1/ops/dashboard?date=2026-04-25")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      date: "2026-04-25",
      reportCoverage: {
        totalStartShift: 1,
        totalEndShift: 0,
        openShifts: 1,
        completedShifts: 0,
      },
      todayTotals: {
        totalIn: 10,
        totalOut: 20,
        totalCfs: 3,
        totalMoves: 33,
        hasDailyData: true,
      },
      vesselActivity: {
        activeCount: 1,
        totalMoves: 42,
      },
    });
    expect(response.body.alerts[0]).toMatchObject({
      code: "MISSING_END_SHIFT",
      department: "Bãi",
      shift: "Ca 1",
    });
  });

  it("returns executive KPI rollups for leadership dashboard", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );

    db.queryOne
      .mockResolvedValueOnce({
        total_in: "10",
        total_out: "20",
        total_cfs: "3",
        total_moves: "33",
        vessel_moves: "42",
        vessel_teus: "50",
        leave_requests: "1",
      })
      .mockResolvedValueOnce({
        submitted: "3",
        expected: "4",
      })
      .mockResolvedValueOnce({
        total_moves: "300",
        vessel_moves: "200",
        vessel_teus: "250",
        report_count: "12",
      })
      .mockResolvedValueOnce({
        total_moves: "3000",
        vessel_moves: "2200",
        vessel_teus: "2500",
        days_with_data: "20",
      })
      .mockResolvedValueOnce({
        active_employees: "80",
        departments: "5",
        shifts: "3",
      });

    const response = await request(app)
      .get("/api/v1/ops/executive-kpis?date=2026-04-25")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      date: "2026-04-25",
      year: 2026,
      month: 4,
      daily: {
        totalMoves: 33,
        totalIn: 10,
        totalOut: 20,
        totalCfs: 3,
        vesselMoves: 42,
        vesselTeus: 50,
        leaveRequests: 1,
        reportCompletionRate: 75,
      },
      monthToDate: {
        totalMoves: 300,
        vesselMoves: 200,
        vesselTeus: 250,
        reportCount: 12,
      },
      yearToDate: {
        totalMoves: 3000,
        vesselMoves: 2200,
        vesselTeus: 2500,
        daysWithData: 20,
      },
      workforce: {
        activeEmployees: 80,
        departments: 5,
        shifts: 3,
      },
    });
  });

  it("exports an executive KPI CSV report for admin users", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );

    db.query
      .mockResolvedValueOnce([
        {
          date: "2026-04-25",
          total_in: "10",
          total_out: "20",
          total_cfs: "3",
          total_moves: "33",
          vessel_moves: "42",
          vessel_teus: "50",
          report_count: "2",
          leave_requests: "1",
        },
      ])
      .mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/api/v1/ops/executive-report?date=2026-04-25")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain(
      "ttport-executive-kpi-2026-04-25.csv"
    );
    expect(response.text).toContain("Tan Thuan Port Executive KPI Report");
    expect(response.text).toContain("2026-04-25,10,20,3,33,42,50,2,1");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      expect.arrayContaining([
        "user-1",
        "admin",
        "EXPORT_EXECUTIVE_REPORT",
        "executive_report",
      ])
    );
  });

  it("returns executive KPI report data as JSON for Excel workbook export", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );

    db.query
      .mockResolvedValueOnce([
        {
          date: "2026-04-25",
          total_in: "10",
          total_out: "20",
          total_cfs: "3",
          total_moves: "33",
          vessel_moves: "42",
          vessel_teus: "50",
          report_count: "2",
          leave_requests: "1",
        },
      ])
      .mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/api/v1/ops/executive-report?date=2026-04-25&format=json")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      generatedBy: "admin",
      period: {
        startDate: "2026-04-01",
        endDate: "2026-04-25",
      },
      summary: {
        total_in: 10,
        total_out: 20,
        total_cfs: 3,
        total_moves: 33,
        vessel_moves: 42,
        vessel_teus: 50,
        report_count: 2,
        leave_requests: 1,
      },
      rows: [
        {
          date: "2026-04-25",
          total_moves: 33,
        },
      ],
    });
  });

  it("restricts audit log access to admin users", async () => {
    const userToken = jwt.sign(
      { userId: "user-2", username: "user", role: "user" },
      process.env.JWT_SECRET!
    );

    await request(app)
      .get("/api/v1/audit")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  it("restricts production readiness to admin users", async () => {
    const userToken = jwt.sign(
      { userId: "user-2", username: "user", role: "user" },
      process.env.JWT_SECRET!
    );

    await request(app)
      .get("/api/v1/readiness/production")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  it("returns production readiness checks for admin users", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );

    const response = await request(app)
      .get("/api/v1/readiness/production")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      targetOrigin: "https://ttport.vn",
      overallStatus: expect.stringMatching(/pass|warn|fail/),
    });
    expect(response.body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "database", status: "pass" }),
        expect.objectContaining({ key: "cors_origin" }),
        expect.objectContaining({ key: "backup_runbook" }),
      ])
    );
  });

  it("returns audit logs for admin users", async () => {
    const adminToken = jwt.sign(
      { userId: "user-1", username: "admin", role: "admin" },
      process.env.JWT_SECRET!
    );
    db.query.mockResolvedValueOnce([
      {
        id: "audit-1",
        user_id: "user-1",
        username: "admin",
        action: "DELETE_REPORT",
        resource_type: "report",
        resource_id: "report-1",
        metadata: {},
        ip_address: "127.0.0.1",
        user_agent: "test",
        created_at: "2026-04-25T00:00:00.000Z",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/audit?action=DELETE_REPORT&limit=10")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      action: "DELETE_REPORT",
      resource_type: "report",
    });
  });

  it("protects BI integration exports with the integration API key", async () => {
    await request(app)
      .get("/api/v1/integrations/bi/daily-summary")
      .expect(401);
  });

  it("returns BI daily summary data as JSON for integration clients", async () => {
    db.query.mockResolvedValueOnce([
      {
        date: "2026-04-25",
        year: 2026,
        month: 4,
        day: 25,
        xe_ha: "10",
        xe_giao: "20",
        xe_cfs: "3",
        xalan_ha: "4",
        xalan_giao: "5",
        xalan_cfs: "6",
        total_in: "14",
        total_out: "25",
        total_cfs: "9",
        total_moves: "48",
        vessel_moves: "42",
        vessel_teus: "50",
        report_count: "2",
        updated_at: "2026-04-25T01:00:00.000Z",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/integrations/bi/daily-summary?startDate=2026-04-01&endDate=2026-04-30")
      .set("x-integration-key", "test-integration-key")
      .expect(200);

    expect(response.body).toMatchObject({
      filters: { startDate: "2026-04-01", endDate: "2026-04-30" },
      count: 1,
      data: [
        {
          date: "2026-04-25",
          total_in: 14,
          total_out: 25,
          total_cfs: 9,
          total_moves: 48,
          vessel_moves: 42,
          vessel_teus: 50,
          report_count: 2,
        },
      ],
    });
  });

  it("returns BI daily summary data as CSV for spreadsheet connectors", async () => {
    db.query.mockResolvedValueOnce([
      {
        date: "2026-04-25",
        year: 2026,
        month: 4,
        day: 25,
        xe_ha: "10",
        xe_giao: "20",
        xe_cfs: "3",
        xalan_ha: "4",
        xalan_giao: "5",
        xalan_cfs: "6",
        total_in: "14",
        total_out: "25",
        total_cfs: "9",
        total_moves: "48",
        vessel_moves: "42",
        vessel_teus: "50",
        report_count: "2",
        updated_at: "2026-04-25T01:00:00.000Z",
      },
    ]);

    const response = await request(app)
      .get("/api/v1/integrations/bi/daily-summary?format=csv")
      .set("Authorization", "Bearer test-integration-key")
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("date,year,month,day");
    expect(response.text).toContain("2026-04-25,2026,4,25");
  });
});
