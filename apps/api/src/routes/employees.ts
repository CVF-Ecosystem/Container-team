/**
 * Employees Routes - CRUD for employee management
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import type { EmployeeRecord } from "@tanthuan/shared-types";
import { query, queryOne, execute } from "../db/index.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

type Employee = EmployeeRecord;

// Query schema with pagination support
const querySchema = z.object({
  department: z.string().optional(),
  shift: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional().transform(Number),
  offset: z.string().regex(/^\d+$/).optional().transform(Number),
});

// Create/Update schema
const employeeSchema = z.object({
  mscd: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  department: z.string().min(1).max(50),
  shift: z.string().min(1).max(20),
  role: z.string().max(50).optional(),
  active: z.boolean().default(true),
});

/**
 * GET /employees - List with filters
 */
router.get("/", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters");
  }

  const { department, shift, active, search, limit = 100, offset = 0 } = parsed.data;

  let sql = "SELECT * FROM employees WHERE 1=1";
  const params: unknown[] = [];
  let paramIndex = 1;

  if (department) {
    sql += ` AND department = $${paramIndex++}`;
    params.push(department);
  }
  if (shift) {
    sql += ` AND shift = $${paramIndex++}`;
    params.push(shift);
  }
  if (active !== undefined) {
    sql += ` AND active = $${paramIndex++}`;
    params.push(active === "true");
  }
  if (search) {
    sql += ` AND (name ILIKE $${paramIndex} OR mscd ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  sql += ` ORDER BY department, name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(Math.min(limit, 500)); // Cap at 500 to prevent abuse
  params.push(offset);

  const data = await query<Employee>(sql, params);
  res.json({ data, pagination: { limit, offset, count: data.length } });
});

/**
 * GET /employees/departments - Get unique departments
 */
router.get("/departments", async (_req: Request, res: Response) => {
  const data = await query<{ department: string }>(
    "SELECT DISTINCT department FROM employees WHERE active = true ORDER BY department"
  );
  res.json({ data: data.map((d) => d.department) });
});

/**
 * GET /employees/shifts - Get unique shifts
 */
router.get("/shifts", async (_req: Request, res: Response) => {
  const data = await query<{ shift: string }>(
    "SELECT DISTINCT shift FROM employees WHERE active = true ORDER BY shift"
  );
  res.json({ data: data.map((d) => d.shift) });
});

/**
 * GET /employees/:id - Get by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const data = await queryOne<Employee>(
    "SELECT * FROM employees WHERE id = $1",
    [req.params.id]
  );

  if (!data) {
    throw new AppError(404, "Employee not found");
  }

  res.json({ data });
});

/**
 * POST /employees - Create employee
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { mscd, name, department, shift, role, active } = parsed.data;

  const result = await query<Employee>(
    `INSERT INTO employees (mscd, name, department, shift, role, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [mscd, name, department, shift, role || null, active]
  );

  res.status(201).json({ data: result[0] });
});

/**
 * PUT /employees/:id - Update employee
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const existing = await queryOne<Employee>(
    "SELECT id FROM employees WHERE id = $1",
    [req.params.id]
  );
  if (!existing) {
    throw new AppError(404, "Employee not found");
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const data = parsed.data;
  if (data.mscd !== undefined) {
    updates.push(`mscd = $${paramIndex++}`);
    params.push(data.mscd);
  }
  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.department !== undefined) {
    updates.push(`department = $${paramIndex++}`);
    params.push(data.department);
  }
  if (data.shift !== undefined) {
    updates.push(`shift = $${paramIndex++}`);
    params.push(data.shift);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    params.push(data.role);
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

  const result = await query<Employee>(
    `UPDATE employees SET ${updates.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  res.json({ data: result[0] });
});

/**
 * DELETE /employees/:id - Delete employee (admin only)
 */
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const count = await execute("DELETE FROM employees WHERE id = $1", [
      req.params.id,
    ]);

    if (count === 0) {
      throw new AppError(404, "Employee not found");
    }

    res.json({ deleted: count });
  }
);

/**
 * POST /employees/bulk - Bulk import employees
 */
router.post("/bulk", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.array(employeeSchema).min(1).max(1000);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, "Invalid data format");
  }

  let inserted = 0;
  for (const emp of parsed.data) {
    await query(
      `INSERT INTO employees (mscd, name, department, shift, role, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mscd) DO UPDATE SET
         name = EXCLUDED.name,
         department = EXCLUDED.department,
         shift = EXCLUDED.shift,
         role = EXCLUDED.role,
         active = EXCLUDED.active,
         updated_at = NOW()`,
      [
        emp.mscd,
        emp.name,
        emp.department,
        emp.shift,
        emp.role || null,
        emp.active,
      ]
    );
    inserted++;
  }

  res.status(201).json({ inserted });
});

export default router;
