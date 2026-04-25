import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    login: vi.fn(),
    getToken: vi.fn(),
    setToken: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock("@/lib/apiClient", () => ({
  default: apiClientMock,
}));

describe("authService", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();

    apiClientMock.login.mockReset();
    apiClientMock.getToken.mockReset();
    apiClientMock.setToken.mockReset();
    apiClientMock.getMe.mockReset();
    apiClientMock.logout.mockReset();
    apiClientMock.changePassword.mockReset();
    vi.unstubAllEnvs();
  });

  it("clears legacy storage during API-first initialization", async () => {
    localStorage.setItem("tanthuan_auth_admin_hash", "legacy-hash");
    localStorage.setItem("tanthuan_auth_user_hash", "legacy-user");
    localStorage.setItem("tanthuan_api_user", "legacy-session");

    const { initializeAuth } = await import("@/lib/authService");

    await initializeAuth();

    expect(localStorage.getItem("tanthuan_auth_admin_hash")).toBeNull();
    expect(localStorage.getItem("tanthuan_auth_user_hash")).toBeNull();
    expect(localStorage.getItem("tanthuan_api_user")).toBeNull();
    expect(localStorage.getItem("tanthuan_auth_migrated_api_first")).toBe(
      "true"
    );
  });

  it("logs in through the API and persists the canonical session", async () => {
    apiClientMock.login.mockResolvedValue({
      data: {
        token: "server-token",
        user: {
          id: "user-1",
          username: "admin",
          name: "System Admin",
          role: "admin",
          department: "IT",
        },
      },
    });

    const { login, getSession } = await import("@/lib/authService");
    const result = await login(" Admin ", "secure-password");

    expect(apiClientMock.login).toHaveBeenCalledWith("admin", "secure-password");
    expect(result).toEqual({ success: true, role: "admin" });
    expect(getSession()).toMatchObject({
      id: "user-1",
      username: "admin",
      name: "System Admin",
      role: "admin",
      department: "IT",
    });
    expect(getSession()!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("falls back to local dev auth when the API is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_AUTH", "true");
    apiClientMock.login.mockResolvedValue({
      error: "Network error",
    });
    apiClientMock.getMe.mockResolvedValue({
      error: "Network error",
    });

    const { login, getSession, verifySession } = await import("@/lib/authService");
    const result = await login("admin", "admin123");

    expect(result).toEqual({ success: true, role: "admin" });
    expect(apiClientMock.setToken).not.toHaveBeenCalled();
    expect(getSession()).toMatchObject({
      id: "local-admin",
      username: "admin",
      role: "admin",
      mode: "local-dev",
    });
    expect(await verifySession()).toMatchObject({
      username: "admin",
      mode: "local-dev",
    });
    expect(apiClientMock.getMe).not.toHaveBeenCalled();
  });

  it("falls back to local dev auth when the API database is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_LOCAL_AUTH", "true");
    apiClientMock.login.mockResolvedValue({
      error: "Database unavailable. Please check API database configuration.",
    });

    const { login, getSession } = await import("@/lib/authService");
    const result = await login("admin", "admin123");

    expect(result).toEqual({ success: true, role: "admin" });
    expect(getSession()).toMatchObject({
      username: "admin",
      mode: "local-dev",
    });
  });

  it("refreshes the local session from /auth/me", async () => {
    apiClientMock.getMe.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          username: "admin",
          name: "Updated Admin",
          role: "admin",
          department: "Operations",
        },
      },
    });

    localStorage.setItem(
      "tanthuan_auth_session",
      JSON.stringify({
        id: "user-1",
        username: "admin",
        name: "Old Admin",
        role: "admin",
        department: "IT",
        loginTime: Date.now(),
        expiresAt: 1_900_100_000_000,
      })
    );

    const { verifySession } = await import("@/lib/authService");
    const refreshed = await verifySession();

    expect(refreshed).toMatchObject({
      name: "Updated Admin",
      department: "Operations",
      expiresAt: 1_900_100_000_000,
    });
  });

  it("logs out when session verification fails", async () => {
    apiClientMock.getMe.mockResolvedValue({
      error: "Unauthorized",
    });

    localStorage.setItem(
      "tanthuan_auth_session",
      JSON.stringify({
        id: "user-1",
        username: "admin",
        name: "Old Admin",
        role: "admin",
        department: "IT",
        loginTime: Date.now(),
        expiresAt: 1_900_100_000_000,
      })
    );

    const { verifySession, getSession } = await import("@/lib/authService");
    const refreshed = await verifySession();

    expect(refreshed).toBeNull();
    expect(apiClientMock.logout).toHaveBeenCalledTimes(1);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem("tanthuan_auth_session")).toBeNull();
  });
});
