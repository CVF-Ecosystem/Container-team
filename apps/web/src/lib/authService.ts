"use client";

/**
 * Canonical client auth service.
 *
 * Target state:
 * - API-first authentication
 * - HTTP-only cookie issued by backend
 * - Client stores only session metadata required for UX
 *
 * Legacy local auth keys are cleaned up on initialization to prevent
 * accidental fallback to the removed client-side credential model.
 */

import apiClient from "./apiClient";
import {
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  validatePassword,
  validateUsername,
} from "./security";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // Match backend default 7d
const STORAGE_KEYS = {
  SESSION: "tanthuan_auth_session",
  MIGRATED: "tanthuan_auth_migrated_api_first",
} as const;

const LOCAL_DEV_USERS = {
  admin: {
    password: "admin123",
    user: {
      id: "local-admin",
      username: "admin",
      name: "Local Admin",
      role: "admin",
      department: "Container",
    },
  },
  user: {
    password: "user123",
    user: {
      id: "local-user",
      username: "user",
      name: "Local User",
      role: "user",
      department: "Container",
    },
  },
} as const;

const LEGACY_STORAGE_KEYS = [
  "tanthuan_auth_admin_hash",
  "tanthuan_auth_admin_salt",
  "tanthuan_auth_user_hash",
  "tanthuan_auth_user_salt",
  "tanthuan_auth_initialized",
  "tanthuan_auth_mode",
  "tanthuan_api_user",
];

export type UserRole = "admin" | "user";

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string | null;
  loginTime: number;
  expiresAt: number;
  mode?: "api" | "local-dev";
}

export interface LoginResult {
  success: boolean;
  error?: string;
  role?: UserRole;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

export interface PasswordChangeResult {
  success: boolean;
  error?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeRole(role: string): UserRole {
  return role === "admin" ? "admin" : "user";
}

function isLocalDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH === "true"
  );
}

function isApiUnavailableForLocalAuth(error?: string): boolean {
  if (!error) return false;

  const normalized = error.toLowerCase();
  return (
    error === "Network error" ||
    normalized.includes("database") ||
    normalized.includes("postgres") ||
    normalized.includes("connection") ||
    normalized.includes("password authentication failed")
  );
}

function canFallbackToLocalAuth(error?: string): boolean {
  return isLocalDevAuthEnabled() && isApiUnavailableForLocalAuth(error);
}

function buildSession(user: {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string | null;
}): AuthSession {
  const now = Date.now();

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: normalizeRole(user.role),
    department: user.department,
    loginTime: now,
    expiresAt: now + SESSION_DURATION_MS,
    mode: "api",
  };
}

function buildLocalDevSession(username: keyof typeof LOCAL_DEV_USERS): AuthSession {
  const now = Date.now();
  const user = LOCAL_DEV_USERS[username].user;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: normalizeRole(user.role),
    department: user.department,
    loginTime: now,
    expiresAt: now + SESSION_DURATION_MS,
    mode: "local-dev",
  };
}

function persistSession(session: AuthSession): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

function clearLegacyStorage(): void {
  if (!isBrowser()) return;

  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

function loginWithLocalDevAccount(
  username: string,
  password: string
): LoginResult {
  const localUser = LOCAL_DEV_USERS[username as keyof typeof LOCAL_DEV_USERS];
  if (!localUser || localUser.password !== password) {
    return { success: false, error: "Sai tên đăng nhập hoặc mật khẩu" };
  }

  const session = buildLocalDevSession(username as keyof typeof LOCAL_DEV_USERS);
  persistSession(session);

  return { success: true, role: session.role };
}

export async function initializeAuth(): Promise<void> {
  if (!isBrowser()) return;

  if (!localStorage.getItem(STORAGE_KEYS.MIGRATED)) {
    clearLegacyStorage();
    localStorage.setItem(STORAGE_KEYS.MIGRATED, "true");
  }
}

export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  if (!isBrowser()) {
    return { success: false, error: "Not available on server" };
  }

  const sanitizedUsername = sanitizeInput(username).toLowerCase().trim();
  const usernameValidation = validateUsername(sanitizedUsername);
  if (!usernameValidation.valid) {
    return { success: false, error: usernameValidation.error };
  }

  const rateLimit = checkRateLimit(sanitizedUsername);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Quá nhiều lần thử. Vui lòng đợi ${Math.ceil(
        (rateLimit.lockedUntil!.getTime() - Date.now()) / 60000
      )} phút.`,
      remainingAttempts: 0,
      lockedUntil: rateLimit.lockedUntil,
    };
  }

  const result = await apiClient.login(sanitizedUsername, password);
  if (result.error || !result.data?.user) {
    if (canFallbackToLocalAuth(result.error)) {
      const localResult = loginWithLocalDevAccount(sanitizedUsername, password);
      if (localResult.success) {
        resetRateLimit(sanitizedUsername);
      }
      return localResult;
    }

    return {
      success: false,
      error: result.error || "Đăng nhập thất bại",
      remainingAttempts: rateLimit.remainingAttempts,
    };
  }

  resetRateLimit(sanitizedUsername);
  const session = buildSession(result.data.user);
  persistSession(session);

  return { success: true, role: session.role };
}

export function getSession(): AuthSession | null {
  if (!isBrowser()) return null;

  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionStr) return null;

    const session: AuthSession = JSON.parse(sessionStr);
    const isLocalDevSession = session.mode === "local-dev";
    if (isLocalDevSession && !isLocalDevAuthEnabled()) {
      logout();
      return null;
    }

    if (Date.now() > session.expiresAt) {
      logout();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function verifySession(): Promise<AuthSession | null> {
  const session = getSession();
  if (!session) return null;
  if (session.mode === "local-dev") return session;

  const result = await Promise.resolve(apiClient.getMe()).catch(() => ({
    error: "Network error",
  }));
  const verifiedUser = "data" in result ? result.data?.user : undefined;
  if (!verifiedUser) {
    logout();
    return null;
  }

  const refreshed: AuthSession = {
    ...session,
    id: verifiedUser.id,
    username: verifiedUser.username,
    name: verifiedUser.name,
    role: normalizeRole(verifiedUser.role),
    department: verifiedUser.department,
    expiresAt: session.expiresAt,
  };

  persistSession(refreshed);
  return refreshed;
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}

export function getCurrentRole(): UserRole | null {
  return getSession()?.role || null;
}

export function logout(): void {
  if (!isBrowser()) return;

  void apiClient.logout();
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<PasswordChangeResult> {
  const session = getSession();
  if (!session) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }

  const result = await apiClient.changePassword(oldPassword, newPassword);
  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

export async function resetAdminPassword(): Promise<PasswordChangeResult> {
  return {
    success: false,
    error: "Chức năng reset mật khẩu cục bộ đã bị vô hiệu hóa. Liên hệ quản trị hệ thống.",
  };
}

export function getRoleDisplayName(): string {
  const session = getSession();
  if (!session) return "Chưa đăng nhập";
  return session.role === "admin" ? "Quản trị viên" : "Người dùng";
}

export async function forceResetAllPasswords(): Promise<void> {
  if (!isBrowser()) return;

  logout();
  clearLegacyStorage();
}

export function getAuthDebugInfo(): Record<string, unknown> | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const session = getSession();
  return {
    hasSession: !!session,
    userId: session?.id,
    username: session?.username,
    role: session?.role,
    expiresAt: session?.expiresAt,
  };
}

export function extendSession(): void {
  const session = getSession();
  if (!session) return;

  const updated: AuthSession = {
    ...session,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  persistSession(updated);
}
