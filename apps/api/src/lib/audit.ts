import type { Request } from "express";
import { query } from "../db/index.js";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "CHANGE_PASSWORD"
  | "CREATE_REPORT"
  | "UPDATE_REPORT"
  | "DELETE_REPORT"
  | "UPSERT_DAILY_DATA"
  | "BULK_UPSERT_DAILY_DATA"
  | "DELETE_DAILY_DATA"
  | "REGISTER_PUSH_SUBSCRIPTION"
  | "DISABLE_PUSH_SUBSCRIPTION"
  | "EXPORT_EXECUTIVE_REPORT";

interface AuditInput {
  req: Request;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

function getRequestIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || null;
}

export async function recordAuditLog({
  req,
  action,
  resourceType,
  resourceId = null,
  metadata = {},
}: AuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (
        user_id,
        username,
        action,
        resource_type,
        resource_id,
        metadata,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user?.userId ?? null,
        req.user?.username ?? null,
        action,
        resourceType,
        resourceId,
        JSON.stringify(metadata),
        getRequestIp(req),
        req.get("user-agent") ?? null,
      ]
    );
  } catch {
    // Best-effort in this phase: audit storage problems must not block operations.
    // A later compliance hardening pass can mark selected actions as fail-closed.
  }
}
