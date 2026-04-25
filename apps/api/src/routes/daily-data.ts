/**
 * Daily Data Routes - CRUD for container statistics
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import type { DailyDataItem } from "@tanthuan/shared-types";
import { query, queryOne, execute } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../lib/audit.js";

const router = Router();

type DailyData = DailyDataItem;

// Query schema
const querySchema = z.object({
  year: z.coerce.number().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
});

// Upsert schema
const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  xe_ha: z.number().int().min(0).default(0),
  xe_giao: z.number().int().min(0).default(0),
  xe_cfs: z.number().int().min(0).default(0),
  xe_hb: z.number().int().min(0).optional(),
  xe_tr: z.number().int().min(0).optional(),
  xe_ln: z.number().int().min(0).optional(),
  xe_cr: z.number().int().min(0).optional(),
  xe_dh: z.number().int().min(0).optional(),
  xe_rr: z.number().int().min(0).optional(),
  xalan_ha: z.number().int().min(0).default(0),
  xalan_giao: z.number().int().min(0).default(0),
  xalan_cfs: z.number().int().min(0).default(0),
  xalan_hb: z.number().int().min(0).optional(),
  xalan_tr: z.number().int().min(0).optional(),
  xalan_ln: z.number().int().min(0).optional(),
  xalan_cr: z.number().int().min(0).optional(),
  xalan_dh: z.number().int().min(0).optional(),
  xalan_rr: z.number().int().min(0).optional(),
});

/**
 * GET /daily-data - List with filters
 */
router.get("/", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters");
  }

  const { year, month, startDate, endDate, limit } = parsed.data;

  let sql = `
    SELECT 
      id, date, year, month, day,
      xe_ha, xe_giao, xe_cfs,
      (xe_ha + xe_giao + xe_cfs) as xe_total,
      xalan_ha, xalan_giao, xalan_cfs,
      (xalan_ha + xalan_giao + xalan_cfs) as xalan_total,
      (xe_ha + xalan_ha) as total_in,
      (xe_giao + xalan_giao) as total_out,
      (xe_cfs + xalan_cfs) as total_cfs,
      (xe_ha + xe_giao + xe_cfs + xalan_ha + xalan_giao + xalan_cfs) as total,
      created_at, updated_at
    FROM daily_data
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (year) {
    sql += ` AND year = $${paramIndex++}`;
    params.push(year);
  }
  if (month) {
    sql += ` AND month = $${paramIndex++}`;
    params.push(month);
  }
  if (startDate) {
    sql += ` AND date >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND date <= $${paramIndex++}`;
    params.push(endDate);
  }

  sql += " ORDER BY date DESC";

  if (limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(limit);
  }

  const data = await query<DailyData>(sql, params);
  res.json({ data });
});

/**
 * GET /daily-data/:date - Get by date
 */
router.get("/:date", async (req: Request, res: Response) => {
  const data = await queryOne<DailyData>(
    `SELECT 
      id, date, year, month, day,
      xe_ha, xe_giao, xe_cfs,
      xe_hb, xe_tr, xe_ln, xe_cr, xe_dh, xe_rr,
      xalan_ha, xalan_giao, xalan_cfs,
      xalan_hb, xalan_tr, xalan_ln, xalan_cr, xalan_dh, xalan_rr,
      created_at, updated_at
    FROM daily_data WHERE date = $1`,
    [req.params.date]
  );

  if (!data) {
    throw new AppError(404, "Data not found for this date");
  }

  res.json({ data });
});

/**
 * POST /daily-data - Create or update (upsert)
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const data = parsed.data;
  const dateObj = new Date(data.date);

  const result = await query<DailyData>(
    `INSERT INTO daily_data (
      date, year, month, day,
      xe_ha, xe_giao, xe_cfs, xe_hb, xe_tr, xe_ln, xe_cr, xe_dh, xe_rr,
      xalan_ha, xalan_giao, xalan_cfs, xalan_hb, xalan_tr, xalan_ln, xalan_cr, xalan_dh, xalan_rr
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    ON CONFLICT (date) DO UPDATE SET
      xe_ha = EXCLUDED.xe_ha,
      xe_giao = EXCLUDED.xe_giao,
      xe_cfs = EXCLUDED.xe_cfs,
      xe_hb = EXCLUDED.xe_hb,
      xe_tr = EXCLUDED.xe_tr,
      xe_ln = EXCLUDED.xe_ln,
      xe_cr = EXCLUDED.xe_cr,
      xe_dh = EXCLUDED.xe_dh,
      xe_rr = EXCLUDED.xe_rr,
      xalan_ha = EXCLUDED.xalan_ha,
      xalan_giao = EXCLUDED.xalan_giao,
      xalan_cfs = EXCLUDED.xalan_cfs,
      xalan_hb = EXCLUDED.xalan_hb,
      xalan_tr = EXCLUDED.xalan_tr,
      xalan_ln = EXCLUDED.xalan_ln,
      xalan_cr = EXCLUDED.xalan_cr,
      xalan_dh = EXCLUDED.xalan_dh,
      xalan_rr = EXCLUDED.xalan_rr,
      updated_at = NOW()
    RETURNING *`,
    [
      data.date,
      dateObj.getFullYear(),
      dateObj.getMonth() + 1,
      dateObj.getDate(),
      data.xe_ha,
      data.xe_giao,
      data.xe_cfs,
      data.xe_hb ?? 0,
      data.xe_tr ?? 0,
      data.xe_ln ?? 0,
      data.xe_cr ?? 0,
      data.xe_dh ?? 0,
      data.xe_rr ?? 0,
      data.xalan_ha,
      data.xalan_giao,
      data.xalan_cfs,
      data.xalan_hb ?? 0,
      data.xalan_tr ?? 0,
      data.xalan_ln ?? 0,
      data.xalan_cr ?? 0,
      data.xalan_dh ?? 0,
      data.xalan_rr ?? 0,
    ]
  );

  await recordAuditLog({
    req,
    action: "UPSERT_DAILY_DATA",
    resourceType: "daily_data",
    resourceId: data.date,
    metadata: {
      date: data.date,
      totalInput:
        data.xe_ha + data.xe_giao + data.xe_cfs + data.xalan_ha + data.xalan_giao + data.xalan_cfs,
    },
  });

  res.status(201).json({ data: result[0] });
});

/**
 * POST /daily-data/bulk - Bulk upsert
 */
router.post("/bulk", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.array(upsertSchema).min(1).max(366);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, "Invalid data format");
  }

  let inserted = 0;
  for (const item of parsed.data) {
    const dateObj = new Date(item.date);
    await query(
      `INSERT INTO daily_data (
        date, year, month, day,
        xe_ha, xe_giao, xe_cfs,
        xalan_ha, xalan_giao, xalan_cfs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (date) DO UPDATE SET
        xe_ha = EXCLUDED.xe_ha,
        xe_giao = EXCLUDED.xe_giao,
        xe_cfs = EXCLUDED.xe_cfs,
        xalan_ha = EXCLUDED.xalan_ha,
        xalan_giao = EXCLUDED.xalan_giao,
        xalan_cfs = EXCLUDED.xalan_cfs,
        updated_at = NOW()`,
      [
        item.date,
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        dateObj.getDate(),
        item.xe_ha,
        item.xe_giao,
        item.xe_cfs,
        item.xalan_ha,
        item.xalan_giao,
        item.xalan_cfs,
      ]
    );
    inserted++;
  }

  await recordAuditLog({
    req,
    action: "BULK_UPSERT_DAILY_DATA",
    resourceType: "daily_data",
    metadata: {
      count: inserted,
      firstDate: parsed.data[0]?.date,
      lastDate: parsed.data[parsed.data.length - 1]?.date,
    },
  });

  res.status(201).json({ inserted });
});

/**
 * DELETE /daily-data/:date - Delete by date
 */
router.delete("/:date", authMiddleware, async (req: Request, res: Response) => {
  const count = await execute("DELETE FROM daily_data WHERE date = $1", [
    req.params.date,
  ]);

  if (count === 0) {
    throw new AppError(404, "Data not found");
  }

  await recordAuditLog({
    req,
    action: "DELETE_DAILY_DATA",
    resourceType: "daily_data",
    resourceId: String(req.params.date),
  });

  res.json({ deleted: count });
});

export default router;
