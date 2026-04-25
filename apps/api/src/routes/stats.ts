/**
 * Statistics Routes - Aggregated data for dashboard
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, queryOne } from "../db/index.js";
import { AppError } from "../middleware/error.js";

const router = Router();

/**
 * GET /stats/summary - Dashboard summary statistics
 */
router.get("/summary", async (req: Request, res: Response) => {
  const schema = z.object({
    year: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.query);
  const year = parsed.data?.year || new Date().getFullYear();

  // Get yearly totals
  const yearlyStats = await queryOne<{
    xe_ha: string;
    xe_giao: string;
    xe_cfs: string;
    xalan_ha: string;
    xalan_giao: string;
    xalan_cfs: string;
    total_days: string;
  }>(
    `SELECT 
      COALESCE(SUM(xe_ha), 0) as xe_ha,
      COALESCE(SUM(xe_giao), 0) as xe_giao,
      COALESCE(SUM(xe_cfs), 0) as xe_cfs,
      COALESCE(SUM(xalan_ha), 0) as xalan_ha,
      COALESCE(SUM(xalan_giao), 0) as xalan_giao,
      COALESCE(SUM(xalan_cfs), 0) as xalan_cfs,
      COUNT(*) as total_days
    FROM daily_data
    WHERE year = $1`,
    [year]
  );

  // Get employee count
  const empCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM employees WHERE active = true"
  );

  // Get vessel count for year
  const vesselCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM vessel_data WHERE year = $1",
    [year]
  );

  const stats = yearlyStats || {
    xe_ha: "0",
    xe_giao: "0",
    xe_cfs: "0",
    xalan_ha: "0",
    xalan_giao: "0",
    xalan_cfs: "0",
    total_days: "0",
  };

  res.json({
    year,
    xe: {
      ha: parseInt(stats.xe_ha),
      giao: parseInt(stats.xe_giao),
      cfs: parseInt(stats.xe_cfs),
      total:
        parseInt(stats.xe_ha) +
        parseInt(stats.xe_giao) +
        parseInt(stats.xe_cfs),
    },
    xalan: {
      ha: parseInt(stats.xalan_ha),
      giao: parseInt(stats.xalan_giao),
      cfs: parseInt(stats.xalan_cfs),
      total:
        parseInt(stats.xalan_ha) +
        parseInt(stats.xalan_giao) +
        parseInt(stats.xalan_cfs),
    },
    total: {
      in: parseInt(stats.xe_ha) + parseInt(stats.xalan_ha),
      out: parseInt(stats.xe_giao) + parseInt(stats.xalan_giao),
      cfs: parseInt(stats.xe_cfs) + parseInt(stats.xalan_cfs),
      all:
        parseInt(stats.xe_ha) +
        parseInt(stats.xe_giao) +
        parseInt(stats.xe_cfs) +
        parseInt(stats.xalan_ha) +
        parseInt(stats.xalan_giao) +
        parseInt(stats.xalan_cfs),
    },
    daysWithData: parseInt(stats.total_days),
    employeeCount: parseInt(empCount?.count || "0"),
    vesselOperations: parseInt(vesselCount?.count || "0"),
  });
});

/**
 * GET /stats/monthly - Monthly breakdown
 */
router.get("/monthly", async (req: Request, res: Response) => {
  const schema = z.object({
    year: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.query);
  const year = parsed.data?.year || new Date().getFullYear();

  const data = await query<{
    month: number;
    xe_ha: string;
    xe_giao: string;
    xe_cfs: string;
    xalan_ha: string;
    xalan_giao: string;
    xalan_cfs: string;
    days: string;
  }>(
    `SELECT 
      month,
      COALESCE(SUM(xe_ha), 0) as xe_ha,
      COALESCE(SUM(xe_giao), 0) as xe_giao,
      COALESCE(SUM(xe_cfs), 0) as xe_cfs,
      COALESCE(SUM(xalan_ha), 0) as xalan_ha,
      COALESCE(SUM(xalan_giao), 0) as xalan_giao,
      COALESCE(SUM(xalan_cfs), 0) as xalan_cfs,
      COUNT(*) as days
    FROM daily_data
    WHERE year = $1
    GROUP BY month
    ORDER BY month`,
    [year]
  );

  res.json({
    year,
    months: data.map((m) => ({
      month: m.month,
      xe: {
        ha: parseInt(m.xe_ha),
        giao: parseInt(m.xe_giao),
        cfs: parseInt(m.xe_cfs),
      },
      xalan: {
        ha: parseInt(m.xalan_ha),
        giao: parseInt(m.xalan_giao),
        cfs: parseInt(m.xalan_cfs),
      },
      daysWithData: parseInt(m.days),
    })),
  });
});

/**
 * GET /stats/quarterly - Quarterly breakdown
 */
router.get("/quarterly", async (req: Request, res: Response) => {
  const schema = z.object({
    year: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.query);
  const year = parsed.data?.year || new Date().getFullYear();

  const data = await query<{
    quarter: string;
    xe_total: string;
    xalan_total: string;
  }>(
    `SELECT 
      CEIL(month / 3.0) as quarter,
      COALESCE(SUM(xe_ha + xe_giao + xe_cfs), 0) as xe_total,
      COALESCE(SUM(xalan_ha + xalan_giao + xalan_cfs), 0) as xalan_total
    FROM daily_data
    WHERE year = $1
    GROUP BY CEIL(month / 3.0)
    ORDER BY quarter`,
    [year]
  );

  res.json({
    year,
    quarters: data.map((q) => ({
      quarter: parseInt(q.quarter),
      xe_total: parseInt(q.xe_total),
      xalan_total: parseInt(q.xalan_total),
      total: parseInt(q.xe_total) + parseInt(q.xalan_total),
    })),
  });
});

/**
 * GET /stats/compare - Year-over-year comparison
 */
router.get("/compare", async (req: Request, res: Response) => {
  const schema = z.object({
    year1: z.coerce.number(),
    year2: z.coerce.number(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "year1 and year2 are required");
  }

  const { year1, year2 } = parsed.data;

  const getYearStats = async (year: number) => {
    const result = await queryOne<{
      xe_total: string;
      xalan_total: string;
    }>(
      `SELECT 
        COALESCE(SUM(xe_ha + xe_giao + xe_cfs), 0) as xe_total,
        COALESCE(SUM(xalan_ha + xalan_giao + xalan_cfs), 0) as xalan_total
      FROM daily_data
      WHERE year = $1`,
      [year]
    );

    return {
      year,
      xe_total: parseInt(result?.xe_total || "0"),
      xalan_total: parseInt(result?.xalan_total || "0"),
      total:
        parseInt(result?.xe_total || "0") +
        parseInt(result?.xalan_total || "0"),
    };
  };

  const stats1 = await getYearStats(year1);
  const stats2 = await getYearStats(year2);

  const change = stats2.total - stats1.total;
  const changePercent = stats1.total > 0 ? (change / stats1.total) * 100 : 0;

  res.json({
    year1: stats1,
    year2: stats2,
    change: {
      absolute: change,
      percent: Math.round(changePercent * 100) / 100,
    },
  });
});

export default router;
