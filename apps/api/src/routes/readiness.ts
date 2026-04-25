/**
 * Production readiness routes for ttport.vn deployment checks.
 */

import { Router, Request, Response } from "express";
import type {
  ProductionReadiness,
  ProductionReadinessCheck,
  ReadinessCheckStatus,
} from "@tanthuan/shared-types";
import { env } from "../config/env.js";
import { checkConnection } from "../db/index.js";
import { authMiddleware, adminMiddleware, AUTH_COOKIE_OPTIONS } from "../middleware/auth.js";
import { isSentryConfigured } from "../lib/sentry.js";

const router = Router();
const TARGET_ORIGIN = "https://ttport.vn";

function statusRank(status: ReadinessCheckStatus): number {
  return status === "fail" ? 3 : status === "warn" ? 2 : 1;
}

function overallStatus(checks: ProductionReadinessCheck[]): ReadinessCheckStatus {
  const requiredStatuses = checks
    .filter((check) => check.required)
    .map((check) => check.status);

  if (requiredStatuses.includes("fail")) return "fail";
  if (checks.some((check) => check.status === "warn" || check.status === "fail")) {
    return "warn";
  }
  return "pass";
}

function check(
  key: string,
  label: string,
  status: ReadinessCheckStatus,
  detail: string,
  required = true
): ProductionReadinessCheck {
  return { key, label, status, detail, required };
}

/**
 * GET /readiness/production - admin-only checklist before publishing ttport.vn.
 */
router.get(
  "/production",
  authMiddleware,
  adminMiddleware,
  async (_req: Request, res: Response) => {
    const dbHealthy = await checkConnection();

    const checks: ProductionReadinessCheck[] = [
      check(
        "node_env",
        "NODE_ENV production",
        env.server.isProd ? "pass" : "warn",
        env.server.isProd
          ? "API is running in production mode."
          : `Current mode is ${env.server.nodeEnv}; use production for ttport.vn.`
      ),
      check(
        "database",
        "PostgreSQL connection",
        dbHealthy ? "pass" : "fail",
        dbHealthy ? "Database connection is healthy." : "Database connection failed."
      ),
      check(
        "jwt_secret",
        "JWT secret",
        env.jwt.secret.length >= 48 ? "pass" : "warn",
        env.jwt.secret.length >= 48
          ? "JWT secret length is production-ready."
          : "JWT secret is valid but should be at least 48 characters for production."
      ),
      check(
        "cors_origin",
        "CORS origin",
        env.cors.origin === TARGET_ORIGIN ? "pass" : "warn",
        env.cors.origin === TARGET_ORIGIN
          ? "CORS is locked to https://ttport.vn."
          : `Current CORS origin is ${env.cors.origin}; set ${TARGET_ORIGIN} before final publish.`
      ),
      check(
        "secure_cookie",
        "Secure HTTP-only cookie",
        AUTH_COOKIE_OPTIONS.httpOnly && AUTH_COOKIE_OPTIONS.secure ? "pass" : "warn",
        AUTH_COOKIE_OPTIONS.secure
          ? "Auth cookie is HTTP-only and secure."
          : "Auth cookie is HTTP-only, but secure=true only activates when NODE_ENV=production."
      ),
      check(
        "sentry_api",
        "API Sentry DSN",
        isSentryConfigured() ? "pass" : "warn",
        isSentryConfigured()
          ? "SENTRY_DSN is configured for API error tracking."
          : "SENTRY_DSN is not configured; production errors will rely on logs only.",
        false
      ),
      check(
        "web_push",
        "Web Push VAPID keys",
        env.push.configured ? "pass" : "warn",
        env.push.configured
          ? "VAPID public/private keys are configured."
          : "Push notifications will stay disabled until VAPID keys are configured.",
        false
      ),
      check(
        "integration_key",
        "Integration API key",
        env.integrations.configured ? "pass" : "warn",
        env.integrations.configured
          ? "INTEGRATION_API_KEY is configured for BI/export connectors."
          : "BI/export connector endpoints are disabled until INTEGRATION_API_KEY is set.",
        false
      ),
      check(
        "backup_runbook",
        "Database backup runbook",
        "warn",
        "Manual verification required: schedule PostgreSQL backup and test restore before launch."
      ),
      check(
        "uptime_monitoring",
        "Uptime monitoring",
        "warn",
        "Manual verification required: monitor /api/v1/health from outside company network.",
        false
      ),
    ].sort((a, b) => statusRank(b.status) - statusRank(a.status));

    const response: ProductionReadiness = {
      generatedAt: new Date().toISOString(),
      targetOrigin: TARGET_ORIGIN,
      overallStatus: overallStatus(checks),
      checks,
    };

    res.json(response);
  }
);

export default router;
