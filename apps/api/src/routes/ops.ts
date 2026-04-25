/**
 * Operations dashboard routes - management-level live overview.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import type {
  ExecutiveKpis,
  ExecutiveReportDailyRow,
  ExecutiveReportPack,
  OperationsAlert,
  OperationsDashboard,
  OperationsShiftCoverage,
  OperationsVesselActivity,
} from "@tanthuan/shared-types";
import { query, queryOne } from "../db/index.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../lib/audit.js";

const router = Router();

const dashboardQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const executiveKpisQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const executiveReportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["csv", "json"]).default("csv"),
});

interface ReportCoverageRow {
  shift: string;
  department: string;
  start_reporter: string | null;
  end_reporter: string | null;
  start_updated_at: string | null;
  end_updated_at: string | null;
}

interface DailyTotalsRow {
  total_in: string | null;
  total_out: string | null;
  total_cfs: string | null;
  total_moves: string | null;
}

interface VesselActivityRow {
  id: string;
  vessel_name: string;
  voyage: string | null;
  berth_name: string | null;
  total_moves: string | null;
  teus: string | null;
  atb: string | null;
  atd: string | null;
}

interface ExecutiveDailyRow {
  total_in: string | null;
  total_out: string | null;
  total_cfs: string | null;
  total_moves: string | null;
  vessel_moves: string | null;
  vessel_teus: string | null;
  leave_requests: string | null;
}

interface ExecutivePeriodRow {
  total_moves: string | null;
  vessel_moves: string | null;
  vessel_teus: string | null;
  report_count?: string | null;
  days_with_data?: string | null;
}

interface WorkforceRow {
  active_employees: string | null;
  departments: string | null;
  shifts: string | null;
}

interface ExecutiveReportRow {
  date: string;
  total_in: string | null;
  total_out: string | null;
  total_cfs: string | null;
  total_moves: string | null;
  vessel_moves: string | null;
  vessel_teus: string | null;
  report_count: string | null;
  leave_requests: string | null;
}

function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, string | number | null>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function reportRowsToCsv(rows: ExecutiveReportDailyRow[]): string {
  return toCsv(
    rows.map((row) => ({
      date: row.date,
      total_in: row.total_in,
      total_out: row.total_out,
      total_cfs: row.total_cfs,
      total_moves: row.total_moves,
      vessel_moves: row.vessel_moves,
      vessel_teus: row.vessel_teus,
      report_count: row.report_count,
      leave_requests: row.leave_requests,
    }))
  );
}

function buildExecutiveReportPack(input: {
  rows: ExecutiveReportRow[];
  generatedBy: string;
  startDate: string;
  endDate: string;
}): ExecutiveReportPack {
  const data: ExecutiveReportDailyRow[] = input.rows.map((row) => ({
    date: row.date,
    total_in: toInt(row.total_in),
    total_out: toInt(row.total_out),
    total_cfs: toInt(row.total_cfs),
    total_moves: toInt(row.total_moves),
    vessel_moves: toInt(row.vessel_moves),
    vessel_teus: toInt(row.vessel_teus),
    report_count: toInt(row.report_count),
    leave_requests: toInt(row.leave_requests),
  }));

  const summary = data.reduce(
    (acc, row) => ({
      total_in: acc.total_in + row.total_in,
      total_out: acc.total_out + row.total_out,
      total_cfs: acc.total_cfs + row.total_cfs,
      total_moves: acc.total_moves + row.total_moves,
      vessel_moves: acc.vessel_moves + row.vessel_moves,
      vessel_teus: acc.vessel_teus + row.vessel_teus,
      report_count: acc.report_count + row.report_count,
      leave_requests: acc.leave_requests + row.leave_requests,
    }),
    {
      total_in: 0,
      total_out: 0,
      total_cfs: 0,
      total_moves: 0,
      vessel_moves: 0,
      vessel_teus: 0,
      report_count: 0,
      leave_requests: 0,
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    period: {
      startDate: input.startDate,
      endDate: input.endDate,
    },
    summary,
    rows: data,
  };
}

function buildAlerts(items: OperationsShiftCoverage[]): OperationsAlert[] {
  if (items.length === 0) {
    return [
      {
        severity: "info",
        code: "NO_ACTIVITY",
        message: "Chưa có báo cáo ca nào trong ngày được chọn.",
      },
    ];
  }

  return items.flatMap((item) => {
    const alerts: OperationsAlert[] = [];
    if (!item.startSubmitted) {
      alerts.push({
        severity: "warning",
        code: "MISSING_START_SHIFT",
        message: `${item.department} - ${item.shift} chưa có báo cáo đầu ca.`,
        shift: item.shift,
        department: item.department,
      });
    }

    if (item.startSubmitted && !item.endSubmitted) {
      alerts.push({
        severity: "warning",
        code: "MISSING_END_SHIFT",
        message: `${item.department} - ${item.shift} đã mở ca nhưng chưa có báo cáo cuối ca.`,
        shift: item.shift,
        department: item.department,
      });
    }

    return alerts;
  });
}

/**
 * GET /ops/dashboard - Management overview for the selected operating date.
 */
router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "Invalid operations dashboard query");
    }

    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

    const coverageRows = await query<ReportCoverageRow>(
      `SELECT
         COALESCE(start_reports.shift, end_reports.shift) AS shift,
         COALESCE(start_reports.department, end_reports.department) AS department,
         start_reports.reporter_name AS start_reporter,
         end_reports.reporter_name AS end_reporter,
         start_reports.updated_at AS start_updated_at,
         end_reports.updated_at AS end_updated_at
       FROM (
         SELECT shift, department, reporter_name, updated_at
         FROM reports
         WHERE date = $1 AND report_type = 'start_shift' AND status IN ('submitted', 'approved')
       ) start_reports
       FULL OUTER JOIN (
         SELECT shift, department, reporter_name, updated_at
         FROM reports
         WHERE date = $1 AND report_type = 'end_shift' AND status IN ('submitted', 'approved')
       ) end_reports
       ON start_reports.shift = end_reports.shift
         AND start_reports.department = end_reports.department
       ORDER BY department, shift`,
      [date]
    );

    const dailyTotals = await queryOne<DailyTotalsRow>(
      `SELECT
         COALESCE(xe_ha + xalan_ha, 0) AS total_in,
         COALESCE(xe_giao + xalan_giao, 0) AS total_out,
         COALESCE(xe_cfs + xalan_cfs, 0) AS total_cfs,
         COALESCE(xe_ha + xe_giao + xe_cfs + xalan_ha + xalan_giao + xalan_cfs, 0) AS total_moves
       FROM daily_data
       WHERE date = $1`,
      [date]
    );

    const vesselRows = await query<VesselActivityRow>(
      `SELECT
         id,
         vessel_name,
         voyage,
         berth_name,
         (nhap_tau + xuat_tau + shift_in + shift_out) AS total_moves,
         teus,
         atb,
         atd
       FROM vessel_data
       WHERE date = $1
       ORDER BY COALESCE(atd, atb, created_at) DESC
       LIMIT 12`,
      [date]
    );

    const coverageItems: OperationsShiftCoverage[] = coverageRows.map((row) => ({
      shift: row.shift,
      department: row.department,
      startSubmitted: row.start_reporter !== null,
      endSubmitted: row.end_reporter !== null,
      startReporter: row.start_reporter,
      endReporter: row.end_reporter,
      lastUpdatedAt: row.end_updated_at ?? row.start_updated_at,
    }));

    const vesselItems: OperationsVesselActivity[] = vesselRows.map((row) => ({
      id: row.id,
      vesselName: row.vessel_name,
      voyage: row.voyage,
      berthName: row.berth_name,
      totalMoves: toInt(row.total_moves),
      teus: toInt(row.teus),
      atb: row.atb,
      atd: row.atd,
    }));

    const response: OperationsDashboard = {
      date,
      generatedAt: new Date().toISOString(),
      reportCoverage: {
        totalStartShift: coverageItems.filter((item) => item.startSubmitted).length,
        totalEndShift: coverageItems.filter((item) => item.endSubmitted).length,
        openShifts: coverageItems.filter((item) => item.startSubmitted && !item.endSubmitted).length,
        completedShifts: coverageItems.filter((item) => item.startSubmitted && item.endSubmitted).length,
        items: coverageItems,
      },
      todayTotals: {
        totalIn: toInt(dailyTotals?.total_in),
        totalOut: toInt(dailyTotals?.total_out),
        totalCfs: toInt(dailyTotals?.total_cfs),
        totalMoves: toInt(dailyTotals?.total_moves),
        hasDailyData: !!dailyTotals,
      },
      vesselActivity: {
        activeCount: vesselItems.filter((item) => !item.atd).length,
        totalMoves: vesselItems.reduce((sum, item) => sum + item.totalMoves, 0),
        items: vesselItems,
      },
      alerts: buildAlerts(coverageItems),
    };

    res.json(response);
  }
);

/**
 * GET /ops/executive-kpis - Compact KPI layer for leadership dashboard.
 */
router.get(
  "/executive-kpis",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const parsed = executiveKpisQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "Invalid executive KPI query");
    }

    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    const selected = new Date(`${date}T00:00:00.000Z`);
    const year = selected.getUTCFullYear();
    const month = selected.getUTCMonth() + 1;

    const daily = await queryOne<ExecutiveDailyRow>(
      `SELECT
         COALESCE(MAX(daily_data.xe_ha + daily_data.xalan_ha), 0) AS total_in,
         COALESCE(MAX(daily_data.xe_giao + daily_data.xalan_giao), 0) AS total_out,
         COALESCE(MAX(daily_data.xe_cfs + daily_data.xalan_cfs), 0) AS total_cfs,
         COALESCE(MAX(
           daily_data.xe_ha + daily_data.xe_giao + daily_data.xe_cfs +
           daily_data.xalan_ha + daily_data.xalan_giao + daily_data.xalan_cfs
         ), 0) AS total_moves,
         COALESCE(SUM(vessel_data.nhap_tau + vessel_data.xuat_tau + vessel_data.shift_in + vessel_data.shift_out), 0) AS vessel_moves,
         COALESCE(SUM(vessel_data.teus), 0) AS vessel_teus,
         (
           SELECT COUNT(*)
           FROM reports
           WHERE date = $1 AND report_type = 'leave' AND status IN ('submitted', 'approved')
         ) AS leave_requests
       FROM daily_data
       LEFT JOIN vessel_data ON vessel_data.date = daily_data.date
       WHERE daily_data.date = $1`,
      [date]
    );

    const reportCoverage = await queryOne<{
      submitted: string;
      expected: string;
    }>(
      `WITH report_pairs AS (
         SELECT shift, department
         FROM reports
         WHERE date = $1 AND report_type IN ('start_shift', 'end_shift')
         GROUP BY shift, department
       )
       SELECT
         COUNT(reports.id) FILTER (
           WHERE reports.report_type IN ('start_shift', 'end_shift')
             AND reports.status IN ('submitted', 'approved')
         ) AS submitted,
         COUNT(report_pairs.*) * 2 AS expected
       FROM report_pairs
       LEFT JOIN reports
         ON reports.date = $1
        AND reports.shift = report_pairs.shift
        AND reports.department = report_pairs.department
        AND reports.report_type IN ('start_shift', 'end_shift')`,
      [date]
    );

    const monthToDate = await queryOne<ExecutivePeriodRow>(
      `SELECT
         COALESCE(SUM(daily_data.xe_ha + daily_data.xe_giao + daily_data.xe_cfs +
           daily_data.xalan_ha + daily_data.xalan_giao + daily_data.xalan_cfs), 0) AS total_moves,
         COALESCE((
           SELECT SUM(nhap_tau + xuat_tau + shift_in + shift_out)
           FROM vessel_data
           WHERE year = $1 AND month = $2 AND date <= $3
         ), 0) AS vessel_moves,
         COALESCE((
           SELECT SUM(teus)
           FROM vessel_data
           WHERE year = $1 AND month = $2 AND date <= $3
         ), 0) AS vessel_teus,
         COALESCE((
           SELECT COUNT(*)
           FROM reports
           WHERE EXTRACT(YEAR FROM date) = $1
             AND EXTRACT(MONTH FROM date) = $2
             AND date <= $3
             AND status IN ('submitted', 'approved')
         ), 0) AS report_count
       FROM daily_data
       WHERE year = $1 AND month = $2 AND date <= $3`,
      [year, month, date]
    );

    const yearToDate = await queryOne<ExecutivePeriodRow>(
      `SELECT
         COALESCE(SUM(daily_data.xe_ha + daily_data.xe_giao + daily_data.xe_cfs +
           daily_data.xalan_ha + daily_data.xalan_giao + daily_data.xalan_cfs), 0) AS total_moves,
         COALESCE((
           SELECT SUM(nhap_tau + xuat_tau + shift_in + shift_out)
           FROM vessel_data
           WHERE year = $1 AND date <= $2
         ), 0) AS vessel_moves,
         COALESCE((
           SELECT SUM(teus)
           FROM vessel_data
           WHERE year = $1 AND date <= $2
         ), 0) AS vessel_teus,
         COUNT(daily_data.*) AS days_with_data
       FROM daily_data
       WHERE year = $1 AND date <= $2`,
      [year, date]
    );

    const workforce = await queryOne<WorkforceRow>(
      `SELECT
         COUNT(*) FILTER (WHERE active = true) AS active_employees,
         COUNT(DISTINCT department) FILTER (WHERE active = true) AS departments,
         COUNT(DISTINCT shift) FILTER (WHERE active = true) AS shifts
       FROM employees`
    );

    const submittedReports = toInt(reportCoverage?.submitted);
    const expectedReports = toInt(reportCoverage?.expected);

    const response: ExecutiveKpis = {
      date,
      year,
      month,
      generatedAt: new Date().toISOString(),
      daily: {
        totalMoves: toInt(daily?.total_moves),
        totalIn: toInt(daily?.total_in),
        totalOut: toInt(daily?.total_out),
        totalCfs: toInt(daily?.total_cfs),
        vesselMoves: toInt(daily?.vessel_moves),
        vesselTeus: toInt(daily?.vessel_teus),
        leaveRequests: toInt(daily?.leave_requests),
        reportCompletionRate:
          expectedReports > 0
            ? Math.round((submittedReports / expectedReports) * 100)
            : 0,
      },
      monthToDate: {
        totalMoves: toInt(monthToDate?.total_moves),
        vesselMoves: toInt(monthToDate?.vessel_moves),
        vesselTeus: toInt(monthToDate?.vessel_teus),
        reportCount: toInt(monthToDate?.report_count),
      },
      yearToDate: {
        totalMoves: toInt(yearToDate?.total_moves),
        vesselMoves: toInt(yearToDate?.vessel_moves),
        vesselTeus: toInt(yearToDate?.vessel_teus),
        daysWithData: toInt(yearToDate?.days_with_data),
      },
      workforce: {
        activeEmployees: toInt(workforce?.active_employees),
        departments: toInt(workforce?.departments),
        shifts: toInt(workforce?.shifts),
      },
    };

    res.json(response);
  }
);

/**
 * GET /ops/executive-report - CSV report pack for leadership.
 */
router.get(
  "/executive-report",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const parsed = executiveReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "Invalid executive report query");
    }

    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    const { format } = parsed.data;
    const selected = new Date(`${date}T00:00:00.000Z`);
    const year = selected.getUTCFullYear();
    const month = selected.getUTCMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

    const rows = await query<ExecutiveReportRow>(
      `SELECT
         daily_data.date::text AS date,
         COALESCE(daily_data.xe_ha + daily_data.xalan_ha, 0) AS total_in,
         COALESCE(daily_data.xe_giao + daily_data.xalan_giao, 0) AS total_out,
         COALESCE(daily_data.xe_cfs + daily_data.xalan_cfs, 0) AS total_cfs,
         COALESCE(
           daily_data.xe_ha + daily_data.xe_giao + daily_data.xe_cfs +
           daily_data.xalan_ha + daily_data.xalan_giao + daily_data.xalan_cfs,
           0
         ) AS total_moves,
         COALESCE(vessel_totals.vessel_moves, 0) AS vessel_moves,
         COALESCE(vessel_totals.vessel_teus, 0) AS vessel_teus,
         COALESCE(report_totals.report_count, 0) AS report_count,
         COALESCE(report_totals.leave_requests, 0) AS leave_requests
       FROM daily_data
       LEFT JOIN (
         SELECT
           date,
           SUM(nhap_tau + xuat_tau + shift_in + shift_out) AS vessel_moves,
           SUM(teus) AS vessel_teus
         FROM vessel_data
         GROUP BY date
       ) vessel_totals ON vessel_totals.date = daily_data.date
       LEFT JOIN (
         SELECT
           date,
           COUNT(*) FILTER (WHERE status IN ('submitted', 'approved')) AS report_count,
           COUNT(*) FILTER (WHERE report_type = 'leave' AND status IN ('submitted', 'approved')) AS leave_requests
         FROM reports
         GROUP BY date
       ) report_totals ON report_totals.date = daily_data.date
       WHERE daily_data.date >= $1 AND daily_data.date <= $2
       ORDER BY daily_data.date ASC`,
      [startDate, date]
    );

    const reportPack = buildExecutiveReportPack({
      rows,
      generatedBy: req.user!.username,
      startDate,
      endDate: date,
    });

    await recordAuditLog({
      req,
      action: "EXPORT_EXECUTIVE_REPORT",
      resourceType: "executive_report",
      resourceId: `${startDate}_${date}`,
      metadata: {
        startDate,
        endDate: date,
        format,
        rows: reportPack.rows.length,
      },
    });

    if (format === "json") {
      res.json(reportPack);
      return;
    }

    const csv = [
      "Tan Thuan Port Executive KPI Report",
      `Generated At,${reportPack.generatedAt}`,
      `Generated By,${reportPack.generatedBy}`,
      `Period,${startDate} to ${date}`,
      "",
      toCsv([{ label: "Month To Date", ...reportPack.summary }]),
      "",
      reportRowsToCsv(reportPack.rows),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ttport-executive-kpi-${date}.csv"`
    );
    res.send(csv);
  }
);

export default router;
