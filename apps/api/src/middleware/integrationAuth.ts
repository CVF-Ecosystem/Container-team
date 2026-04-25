import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

function getIntegrationKey(req: Request): string | null {
  const headerKey = req.get("x-integration-key");
  if (headerKey) return headerKey;

  const authHeader = req.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring("Bearer ".length);
  }

  return null;
}

export function integrationAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!env.integrations.configured) {
    res.status(503).json({ error: "Integration API is not configured" });
    return;
  }

  if (getIntegrationKey(req) !== env.integrations.apiKey) {
    res.status(401).json({ error: "Invalid integration credentials" });
    return;
  }

  next();
}
