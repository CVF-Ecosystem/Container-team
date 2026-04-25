/**
 * JWT Authentication Middleware
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/** Name of the HTTP-only auth cookie */
export const AUTH_COOKIE_NAME = "tt_auth";

/** Shared cookie options — used by login and logout routes */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.server.isProd,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
}

/**
 * Auth middleware - requires valid JWT
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.substring(7)
    : null;

  const cookieToken: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

  const token = bearerToken ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization" });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Admin middleware - requires admin role
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/**
 * Optional auth - attaches user if token present, continues otherwise
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.substring(7)
    : null;

  const cookieToken: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];
  const token = bearerToken ?? cookieToken;

  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Invalid token, but continue without user
    }
  }

  next();
}
