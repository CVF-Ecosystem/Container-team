import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db/index.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

interface AuditLogRecord {
  id: string;
  user_id: string | null;
  username: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const querySchema = z.object({
  action: z.string().optional(),
  resourceType: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
});

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "Invalid audit query parameters");
    }

    const { action, resourceType, userId, startDate, endDate, limit } =
      parsed.data;

    let sql = "SELECT * FROM audit_logs WHERE 1=1";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (action) {
      sql += ` AND action = $${paramIndex++}`;
      params.push(action);
    }
    if (resourceType) {
      sql += ` AND resource_type = $${paramIndex++}`;
      params.push(resourceType);
    }
    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const data = await query<AuditLogRecord>(sql, params);
    res.json({ data });
  }
);

export default router;
