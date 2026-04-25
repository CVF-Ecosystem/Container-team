import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, execute } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { getVapidPublicKey, isPushConfigured, notifyRole } from "../lib/pushNotifications.js";
import { recordAuditLog } from "../lib/audit.js";

const router = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * GET /notifications/vapid-public-key - public browser bootstrap config.
 */
router.get("/vapid-public-key", (_req: Request, res: Response) => {
  res.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  });
});

/**
 * POST /notifications/subscriptions - register or refresh current browser.
 */
router.post("/subscriptions", authMiddleware, async (req: Request, res: Response) => {
  if (!isPushConfigured()) {
    throw new AppError(503, "Push notifications are not configured");
  }

  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { endpoint, keys } = parsed.data;
  const result = await query<{ id: string }>(
    `INSERT INTO push_subscriptions (
      user_id, username, role, endpoint, p256dh, auth, user_agent, enabled
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      enabled = true,
      updated_at = NOW()
    RETURNING id`,
    [
      req.user!.userId,
      req.user!.username,
      req.user!.role,
      endpoint,
      keys.p256dh,
      keys.auth,
      req.get("user-agent") ?? null,
    ]
  );

  await recordAuditLog({
    req,
    action: "REGISTER_PUSH_SUBSCRIPTION",
    resourceType: "push_subscription",
    resourceId: String(result[0]?.id ?? endpoint),
  });

  res.status(201).json({ subscribed: true });
});

/**
 * DELETE /notifications/subscriptions - disable current browser subscription.
 */
router.delete("/subscriptions", authMiddleware, async (req: Request, res: Response) => {
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const disabled = await execute(
    "UPDATE push_subscriptions SET enabled = false WHERE endpoint = $1 AND user_id = $2",
    [parsed.data.endpoint, req.user!.userId]
  );

  await recordAuditLog({
    req,
    action: "DISABLE_PUSH_SUBSCRIPTION",
    resourceType: "push_subscription",
    resourceId: parsed.data.endpoint,
  });

  res.json({ disabled });
});

/**
 * POST /notifications/test - send a self-check notification to admins.
 */
router.post("/test", authMiddleware, async (req: Request, res: Response) => {
  if (req.user!.role !== "admin") {
    throw new AppError(403, "Admin access required");
  }

  const result = await notifyRole("admin", {
    title: "Cảng Tân Thuận",
    body: "Thông báo thử nghiệm đã sẵn sàng.",
    url: "/admin",
    tag: "push-test",
  });

  res.json(result);
});

export default router;
