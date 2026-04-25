/**
 * Vessels Routes - CRUD for vessel and vessel data
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, queryOne, execute } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

interface Vessel {
  id: string;
  name: string;
  shipping_line: string | null;
  imo_number: string | null;
  active: boolean;
}

interface VesselData {
  id: string;
  vessel_id: string | null;
  vessel_name: string;
  voyage: string | null;
  shipping_line: string | null;
  date: string;
  year: number;
  month: number;
  stt: number | null;
  atb: string | null;
  atw: string | null;
  atc: string | null;
  atd: string | null;
  nhap_tau: number;
  xuat_tau: number;
  shift_in: number;
  shift_out: number;
  total_moves: number;
  teus: number;
  working_hours: number | null;
  berth_hours: number | null;
  berth_name: string | null;
  note: string | null;
}

const vesselDataSchema = z.object({
  id: z.string().uuid().optional(),
  vesselName: z.string().min(1),
  voyage: z.string().optional(),
  shippingLine: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stt: z.number().int().optional(),
  atb: z.string().optional(),
  atw: z.string().optional(),
  atc: z.string().optional(),
  atd: z.string().optional(),
  nhapTau: z.number().int().min(0).default(0),
  xuatTau: z.number().int().min(0).default(0),
  shiftIn: z.number().int().min(0).default(0),
  shiftOut: z.number().int().min(0).default(0),
  teus: z.number().int().min(0).default(0),
  workingHours: z.number().min(0).optional(),
  berthHours: z.number().min(0).optional(),
  berthName: z.string().optional(),
  note: z.string().optional(),
});

type VesselDataPayload = z.infer<typeof vesselDataSchema>;

async function findExistingVesselData(
  data: VesselDataPayload
): Promise<{ id: string } | null> {
  if (data.id) {
    const existingById = await queryOne<{ id: string }>(
      "SELECT id FROM vessel_data WHERE id = $1",
      [data.id]
    );
    if (existingById) {
      return existingById;
    }
  }

  return queryOne<{ id: string }>(
    `SELECT id
     FROM vessel_data
     WHERE date = $1
       AND LOWER(vessel_name) = LOWER($2)
       AND COALESCE(voyage, '') = COALESCE($3, '')
       AND COALESCE(stt, -1) = COALESCE($4, -1)
       AND COALESCE(atb::text, '') = COALESCE($5, '')
     ORDER BY updated_at DESC
     LIMIT 1`,
    [
      data.date,
      data.vesselName,
      data.voyage || null,
      data.stt ?? null,
      data.atb || null,
    ]
  );
}

async function upsertVesselData(
  data: VesselDataPayload
): Promise<"inserted" | "updated"> {
  const dateObj = new Date(data.date);
  const existing = await findExistingVesselData(data);

  if (existing) {
    await query<VesselData>(
      `UPDATE vessel_data SET
        vessel_name = $1,
        voyage = $2,
        shipping_line = $3,
        date = $4,
        year = $5,
        month = $6,
        stt = $7,
        atb = $8,
        atw = $9,
        atc = $10,
        atd = $11,
        nhap_tau = $12,
        xuat_tau = $13,
        shift_in = $14,
        shift_out = $15,
        teus = $16,
        working_hours = $17,
        berth_hours = $18,
        berth_name = $19,
        note = $20,
        updated_at = NOW()
      WHERE id = $21
      RETURNING *`,
      [
        data.vesselName,
        data.voyage || null,
        data.shippingLine || null,
        data.date,
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        data.stt ?? null,
        data.atb || null,
        data.atw || null,
        data.atc || null,
        data.atd || null,
        data.nhapTau,
        data.xuatTau,
        data.shiftIn,
        data.shiftOut,
        data.teus,
        data.workingHours ?? null,
        data.berthHours ?? null,
        data.berthName || null,
        data.note || null,
        existing.id,
      ]
    );

    return "updated";
  }

  await query<VesselData>(
    `INSERT INTO vessel_data (
      vessel_name, voyage, shipping_line, date, year, month, stt,
      atb, atw, atc, atd, nhap_tau, xuat_tau, shift_in, shift_out,
      teus, working_hours, berth_hours, berth_name, note
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *`,
    [
      data.vesselName,
      data.voyage || null,
      data.shippingLine || null,
      data.date,
      dateObj.getFullYear(),
      dateObj.getMonth() + 1,
      data.stt ?? null,
      data.atb || null,
      data.atw || null,
      data.atc || null,
      data.atd || null,
      data.nhapTau,
      data.xuatTau,
      data.shiftIn,
      data.shiftOut,
      data.teus,
      data.workingHours ?? null,
      data.berthHours ?? null,
      data.berthName || null,
      data.note || null,
    ]
  );

  return "inserted";
}

// ========== VESSELS ==========

/**
 * GET /vessels - List all vessels
 */
router.get("/", async (req: Request, res: Response) => {
  const active = req.query.active;
  let sql = "SELECT * FROM vessels";
  const params: unknown[] = [];

  if (active !== undefined) {
    sql += " WHERE active = $1";
    params.push(active === "true");
  }

  sql += " ORDER BY name";

  const data = await query<Vessel>(sql, params);
  res.json({ data });
});

/**
 * GET /vessels/:id - Get vessel by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const data = await queryOne<Vessel>("SELECT * FROM vessels WHERE id = $1", [
    req.params.id,
  ]);

  if (!data) {
    throw new AppError(404, "Vessel not found");
  }

  res.json({ data });
});

/**
 * POST /vessels - Create vessel
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    shippingLine: z.string().max(100).optional(),
    imoNumber: z.string().max(20).optional(),
    active: z.boolean().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { name, shippingLine, imoNumber, active } = parsed.data;

  const result = await query<Vessel>(
    `INSERT INTO vessels (name, shipping_line, imo_number, active)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, shippingLine || null, imoNumber || null, active]
  );

  res.status(201).json({ data: result[0] });
});

/**
 * PUT /vessels/:id - Update vessel
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    shippingLine: z.string().max(100).optional(),
    imoNumber: z.string().max(20).optional(),
    active: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const data = parsed.data;
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.shippingLine !== undefined) {
    updates.push(`shipping_line = $${paramIndex++}`);
    params.push(data.shippingLine);
  }
  if (data.imoNumber !== undefined) {
    updates.push(`imo_number = $${paramIndex++}`);
    params.push(data.imoNumber);
  }
  if (data.active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    params.push(data.active);
  }

  if (updates.length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updates.push("updated_at = NOW()");
  params.push(req.params.id);

  const result = await query<Vessel>(
    `UPDATE vessels SET ${updates.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  if (result.length === 0) {
    throw new AppError(404, "Vessel not found");
  }

  res.json({ data: result[0] });
});

// ========== VESSEL DATA ==========

/**
 * GET /vessels/data - Get vessel operation data
 */
router.get("/data/list", async (req: Request, res: Response) => {
  const schema = z.object({
    year: z.coerce.number().optional(),
    month: z.coerce.number().min(1).max(12).optional(),
    vesselName: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().min(1).max(1000).optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters");
  }

  const { year, month, vesselName, startDate, endDate, limit } = parsed.data;

  let sql = `
    SELECT 
      vd.*,
      (vd.nhap_tau + vd.xuat_tau + vd.shift_in + vd.shift_out) as total_moves
    FROM vessel_data vd
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (year) {
    sql += ` AND vd.year = $${paramIndex++}`;
    params.push(year);
  }
  if (month) {
    sql += ` AND vd.month = $${paramIndex++}`;
    params.push(month);
  }
  if (vesselName) {
    sql += ` AND vd.vessel_name ILIKE $${paramIndex++}`;
    params.push(`%${vesselName}%`);
  }
  if (startDate) {
    sql += ` AND vd.date >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND vd.date <= $${paramIndex++}`;
    params.push(endDate);
  }

  sql += " ORDER BY vd.date DESC, vd.stt";

  if (limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(limit);
  }

  const data = await query<VesselData>(sql, params);
  res.json({ data });
});

/**
 * POST /vessels/data - Create vessel data entry
 */
router.post("/data", authMiddleware, async (req: Request, res: Response) => {
  const parsed = vesselDataSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const outcome = await upsertVesselData(parsed.data);
  const result = await queryOne<VesselData>(
    `SELECT
      vd.*,
      (vd.nhap_tau + vd.xuat_tau + vd.shift_in + vd.shift_out) as total_moves
    FROM vessel_data vd
    WHERE date = $1
      AND LOWER(vessel_name) = LOWER($2)
      AND COALESCE(voyage, '') = COALESCE($3, '')
      AND COALESCE(stt, -1) = COALESCE($4, -1)
      AND COALESCE(atb::text, '') = COALESCE($5, '')
    ORDER BY updated_at DESC
    LIMIT 1`,
    [
      parsed.data.date,
      parsed.data.vesselName,
      parsed.data.voyage || null,
      parsed.data.stt ?? null,
      parsed.data.atb || null,
    ]
  );

  res.status(outcome === "inserted" ? 201 : 200).json({ data: result });
});

/**
 * POST /vessels/data/bulk - Bulk upsert vessel data for offline replay
 */
router.post("/data/bulk", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.array(vesselDataSchema).min(1).max(1000);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, "Invalid data format");
  }

  let inserted = 0;
  let updated = 0;

  for (const item of parsed.data) {
    const outcome = await upsertVesselData(item);
    if (outcome === "inserted") {
      inserted++;
    } else {
      updated++;
    }
  }

  res.status(201).json({ inserted, updated });
});

/**
 * DELETE /vessels/data/:id - Delete vessel data
 */
router.delete(
  "/data/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    const count = await execute("DELETE FROM vessel_data WHERE id = $1", [
      req.params.id,
    ]);

    if (count === 0) {
      throw new AppError(404, "Vessel data not found");
    }

    res.json({ deleted: count });
  }
);

export default router;
