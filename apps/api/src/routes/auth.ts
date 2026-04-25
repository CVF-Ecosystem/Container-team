/**
 * Auth Routes - Login, Register, Profile
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "../db/index.js";
import { generateToken, authMiddleware, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../lib/audit.js";

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  department: z.string().optional(),
});

interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  department: string | null;
  active: boolean;
}

/**
 * POST /auth/login
 */
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid credentials");
  }

  const { username, password } = parsed.data;

  const user = await queryOne<User>(
    `SELECT id, username, password_hash, name, role, department, active
     FROM users WHERE username = $1`,
    [username]
  );

  if (!user || !user.active) {
    await recordAuditLog({
      req,
      action: "LOGIN_FAILED",
      resourceType: "auth",
      metadata: { username, reason: "user_not_found_or_inactive" },
    });
    throw new AppError(401, "Invalid username or password");
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await recordAuditLog({
      req,
      action: "LOGIN_FAILED",
      resourceType: "auth",
      resourceId: user.id,
      metadata: { username, reason: "invalid_password" },
    });
    throw new AppError(401, "Invalid username or password");
  }

  // Update last login
  await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  req.user = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  await recordAuditLog({
    req,
    action: "LOGIN_SUCCESS",
    resourceType: "auth",
    resourceId: user.id,
    metadata: { role: user.role, department: user.department },
  });

  res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

/**
 * POST /auth/logout - Clear auth cookie (server-side session end)
 */
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
    secure: AUTH_COOKIE_OPTIONS.secure,
    sameSite: AUTH_COOKIE_OPTIONS.sameSite,
    path: AUTH_COOKIE_OPTIONS.path,
  });
  res.json({ message: "Logged out" });
});

/**
 * POST /auth/register
 */
router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0].message);
  }

  const { username, password, name, department } = parsed.data;

  // Check if username exists
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE username = $1",
    [username]
  );
  if (existing) {
    throw new AppError(409, "Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const users = await query<User>(
    `INSERT INTO users (username, password_hash, name, department, role)
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, username, name, role, department`,
    [username, passwordHash, name, department || null]
  );

  const user = users[0];

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  });
});

/**
 * GET /auth/me - Get current user profile
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await queryOne<User>(
    `SELECT id, username, name, role, department
     FROM users WHERE id = $1`,
    [req.user!.userId]
  );

  if (!user) {
    throw new AppError(404, "User not found");
  }

  res.json({ user });
});

/**
 * PUT /auth/password - Change password
 */
router.put("/password", authMiddleware, async (req: Request, res: Response) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input");
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await queryOne<User>(
    "SELECT id, password_hash FROM users WHERE id = $1",
    [req.user!.userId]
  );

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new AppError(401, "Current password is incorrect");
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [newHash, user.id]
  );

  await recordAuditLog({
    req,
    action: "CHANGE_PASSWORD",
    resourceType: "user",
    resourceId: user.id,
  });

  res.json({ message: "Password updated successfully" });
});

export default router;
