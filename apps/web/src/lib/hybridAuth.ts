"use client";

/**
 * Compatibility wrapper during auth consolidation.
 *
 * New code should prefer `authService.ts`.
 */

import {
  getSession,
  login,
  logout,
  type AuthSession,
  type LoginResult,
} from "./authService";

export type AuthMode = "api";

export interface ApiUser {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
  department: string | null;
}

interface HybridAuthState {
  mode: AuthMode;
  user: ApiUser | null;
  token: string | null;
}

function mapSessionToUser(session: AuthSession | null): ApiUser | null {
  if (!session) return null;

  return {
    id: session.id,
    username: session.username,
    name: session.name,
    role: session.role,
    department: session.department,
  };
}

export function getHybridAuthState(): HybridAuthState {
  const session = getSession();
  return {
    mode: "api",
    user: mapSessionToUser(session),
    token: null,
  };
}

export async function apiLogin(
  username: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  user?: ApiUser;
}> {
  const result: LoginResult = await login(username, password);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    user: mapSessionToUser(getSession()) ?? undefined,
  };
}

export function hybridLogout(): void {
  logout();
}

export function isApiAuthenticated(): boolean {
  return !!getSession();
}

export function getApiUser(): ApiUser | null {
  return mapSessionToUser(getSession());
}

export function isApiAdmin(): boolean {
  return getSession()?.role === "admin";
}

export async function verifyApiToken(): Promise<boolean> {
  return !!getSession();
}
