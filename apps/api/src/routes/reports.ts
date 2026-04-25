/**
 * Reports Routes - CRUD for shift reports
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, queryOne, execute } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../lib/audit.js";
import { notifyRole } from "../lib/pushNotifications.js";

const router = Router();

interface Report {
  id: string;
  report_type: string;
  date: string;
  shift: string;
  department: string;
  reporter_id: string | null;
  reporter_name: string | null;
  data: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

// Query schema
const querySchema = z.object({
  reportType: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  shift: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
});

// Create schema
const createSchema = z.object({
  reportType: z.enum(["start_shift", "end_shift", "inventory", "leave"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.string().min(1),
  department: z.string().min(1),
  reporterName: z.string().optional(),
  data: z.record(z.unknown()),
  status: z.enum(["draft", "submitted", "approved"]).default("submitted"),
});

/**
 * GET /reports - List with filters
 */
router.get("/", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters");
  }

  const { reportType, date, startDate, endDate, shift, department, status } =
    parsed.data;

  let sql = "SELECT * FROM reports WHERE 1=1";
  const params: unknown[] = [];
  let paramIndex = 1;

  if (reportType) {
    sql += ` AND report_type = $${paramIndex++}`;
    params.push(reportType);
  }
  if (date) {
    sql += ` AND date = $${paramIndex++}`;
    params.push(date);
  }
  if (startDate) {
    sql += ` AND date >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND date <= $${paramIndex++}`;
    params.push(endDate);
  }
  if (shift) {
    sql += ` AND shift = $${paramIndex++}`;
    params.push(shift);
  }
  if (department) {
    sql += ` AND department = $${paramIndex++}`;
    params.push(department);
  }
  if (status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  sql += " ORDER BY date DESC, created_at DESC";

  const data = await query<Report>(sql, params);
  res.json({ data });
});

/**
 * GET /reports/:id - Get by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const data = await queryOne<Report>("SELECT * FROM reports WHERE id = $1", [
    req.params.id,
  ]);

  if (!data) {
    throw new AppError(404, "Report not found");
  }

  res.json({ data });
});

/**
 * POST /reports - Create report
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { reportType, date, shift, department, reporterName, data, status } =
    parsed.data;

  const result = await query<Report>(
    `INSERT INTO reports (report_type, date, shift, department, reporter_id, reporter_name, data, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (report_type, date, shift, department) DO UPDATE SET
       reporter_id = EXCLUDED.reporter_id,
       reporter_name = EXCLUDED.reporter_name,
       data = EXCLUDED.data,
       status = EXCLUDED.status,
       updated_at = NOW()
     RETURNING *`,
    [
      reportType,
      date,
      shift,
      department,
      req.user!.userId,
      reporterName || req.user!.username,
      JSON.stringify(data),
      status,
    ]
  );

  await recordAuditLog({
    req,
    action: "CREATE_REPORT",
    resourceType: "report",
    resourceId: result[0]?.id,
    metadata: { reportType, date, shift, department, status },
  });

  if (status === "submitted") {
    const notificationCopy: Partial<Record<typeof reportType, string>> = {
      start_shift: "Báo cáo đầu ca đã được nộp",
      end_shift: "Báo cáo cuối ca đã được nộp",
      leave: "Có đăng ký nghỉ phép mới",
    };

    const body = notificationCopy[reportType];
    if (body) {
      void notifyRole("admin", {
        title: "Cảng Tân Thuận",
        body: `${body}: ${department} - ${shift} (${date})`,
        url: reportType === "leave" ? "/leave" : "/admin",
        tag: `report-${reportType}-${date}-${shift}-${department}`,
      });
    }
  }

  res.status(201).json({ data: result[0] });
});

/**
 * PUT /reports/:id - Update report
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  const existing = await queryOne<Report>(
    "SELECT id FROM reports WHERE id = $1",
    [req.params.id]
  );
  if (!existing) {
    throw new AppError(404, "Report not found");
  }

  const schema = z.object({
    data: z.record(z.unknown()).optional(),
    status: z.enum(["draft", "submitted", "approved"]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (parsed.data.data !== undefined) {
    updates.push(`data = $${paramIndex++}`);
    params.push(JSON.stringify(parsed.data.data));
  }
  if (parsed.data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(parsed.data.status);
  }

  if (updates.length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updates.push("updated_at = NOW()");
  params.push(req.params.id);

  const result = await query<Report>(
    `UPDATE reports SET ${updates.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  await recordAuditLog({
    req,
    action: "UPDATE_REPORT",
    resourceType: "report",
    resourceId: result[0]?.id ?? req.params.id,
    metadata: { updatedFields: Object.keys(parsed.data) },
  });

  res.json({ data: result[0] });
});

/**
 * DELETE /reports/:id - Delete report
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  const count = await execute("DELETE FROM reports WHERE id = $1", [
    req.params.id,
  ]);

  if (count === 0) {
    throw new AppError(404, "Report not found");
  }

  await recordAuditLog({
    req,
    action: "DELETE_REPORT",
    resourceType: "report",
    resourceId: String(req.params.id),
  });

  res.json({ deleted: count });
});

export default router;
