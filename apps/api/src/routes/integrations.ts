/**
 * Integration routes for BI tools and external operational systems.
 *
 * These endpoints are intentionally flat and machine-readable so tools such as
 * Power BI, Metabase, scheduled ETL jobs, or a future API gateway can consume
 * them without depending on the web app's local cache format.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db/index.js";
import { env } from "../config/env.js";
import { integrationAuthMiddleware } from "../middleware/integrationAuth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

const dailySummaryQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

interface DailySummaryRow {
  date: string;
  year: number;
  month: number;
  day: number;
  xe_ha: string;
  xe_giao: string;
  xe_cfs: string;
  xalan_ha: string;
  xalan_giao: string;
  xalan_cfs: string;
  total_in: string;
  total_out: string;
  total_cfs: string;
  total_moves: string;
  vessel_moves: string;
  vessel_teus: string;
  report_count: string;
  updated_at: string | null;
}

function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value: string | number | null): string {
  const text = value === null ? "" : String(value);
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

/**
 * GET /integrations/readiness - M2M integration readiness for deployment checks.
 */
router.get("/readiness", (_req: Request, res: Response) => {
  res.json({
    configured: env.integrations.configured,
    endpoints: ["/integrations/bi/daily-summary"],
    formats: ["json", "csv"],
  });
});

/**
 * GET /integrations/bi/daily-summary
 *
 * Query params:
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 * - format: json | csv
 */
router.get(
  "/bi/daily-summary",
  integrationAuthMiddleware,
  async (req: Request, res: Response) => {
    const parsed = dailySummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "Invalid BI daily summary query");
    }

    const { startDate, endDate, format } = parsed.data;

    if (startDate && endDate && startDate > endDate) {
      throw new AppError(400, "startDate must be before or equal to endDate");
    }

    const params: unknown[] = [];
    let whereClause = "WHERE 1=1";

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND daily_data.date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND daily_data.date <= $${params.length}`;
    }

    const rows = await query<DailySummaryRow>(
      `SELECT
         daily_data.date::text AS date,
         daily_data.year,
         daily_data.month,
         daily_data.day,
         COALESCE(daily_data.xe_ha, 0) AS xe_ha,
         COALESCE(daily_data.xe_giao, 0) AS xe_giao,
         COALESCE(daily_data.xe_cfs, 0) AS xe_cfs,
         COALESCE(daily_data.xalan_ha, 0) AS xalan_ha,
         COALESCE(daily_data.xalan_giao, 0) AS xalan_giao,
         COALESCE(daily_data.xalan_cfs, 0) AS xalan_cfs,
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
         GREATEST(
           daily_data.updated_at,
           COALESCE(vessel_totals.updated_at, daily_data.updated_at),
           COALESCE(report_totals.updated_at, daily_data.updated_at)
         ) AS updated_at
       FROM daily_data
       LEFT JOIN (
         SELECT
           date,
           SUM(nhap_tau + xuat_tau + shift_in + shift_out) AS vessel_moves,
           SUM(teus) AS vessel_teus,
           MAX(updated_at) AS updated_at
         FROM vessel_data
         GROUP BY date
       ) vessel_totals ON vessel_totals.date = daily_data.date
       LEFT JOIN (
         SELECT
           date,
           COUNT(*) AS report_count,
           MAX(updated_at) AS updated_at
         FROM reports
         WHERE status IN ('submitted', 'approved')
         GROUP BY date
       ) report_totals ON report_totals.date = daily_data.date
       ${whereClause}
       ORDER BY daily_data.date ASC`,
      params
    );

    const data = rows.map((row) => ({
      date: row.date,
      year: row.year,
      month: row.month,
      day: row.day,
      xe_ha: toInt(row.xe_ha),
      xe_giao: toInt(row.xe_giao),
      xe_cfs: toInt(row.xe_cfs),
      xalan_ha: toInt(row.xalan_ha),
      xalan_giao: toInt(row.xalan_giao),
      xalan_cfs: toInt(row.xalan_cfs),
      total_in: toInt(row.total_in),
      total_out: toInt(row.total_out),
      total_cfs: toInt(row.total_cfs),
      total_moves: toInt(row.total_moves),
      vessel_moves: toInt(row.vessel_moves),
      vessel_teus: toInt(row.vessel_teus),
      report_count: toInt(row.report_count),
      updated_at: row.updated_at,
    }));

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tan-thuan-daily-summary.csv"`
      );
      res.send(toCsv(data));
      return;
    }

    res.json({
      generatedAt: new Date().toISOString(),
      filters: { startDate: startDate ?? null, endDate: endDate ?? null },
      count: data.length,
      data,
    });
  }
);

export default router;
