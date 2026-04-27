"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Anchor, AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, User } from "lucide-react";
import { login } from "@/lib/authService";
import { useAuth } from "@/components/AuthProvider";
import { ConnectionStatus } from "@/lib/dataProvider";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refreshSession } = useAuth();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        await refreshSession();
        router.push(result.role === "admin" ? "/admin/data" : "/dashboard");
      } else {
        setError(result.error || "Đăng nhập thất bại");
      }
    } catch {
      setError("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-10">
      {/* Grid pattern background */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
      >
        <defs>
          <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-grid)" />
      </svg>

      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="cvf-login-glow pointer-events-none absolute left-1/2 top-[30%] h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2"
      />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="cvf-login-brand mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border-strong)]">
            <Anchor className="h-7 w-7 text-[var(--color-accent)]" aria-hidden="true" />
          </div>
          <h1 className="mb-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Cảng Tân Thuận
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Hệ thống Điều hành Cảng
          </p>
        </div>

        {/* Glass card */}
        <div className="cvf-login-card rounded-2xl border border-[var(--color-border)] p-8 backdrop-blur-2xl">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
            Đăng nhập
          </h2>
          <p className="mb-7 text-xs text-[var(--color-text-muted)]">
            Dành cho nhân viên vận hành và quản trị cảng
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Tên đăng nhập
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="cvf-input w-full rounded-lg py-2.5 pl-10 pr-3 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="cvf-input w-full rounded-lg py-2.5 pl-10 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.10)] px-3 py-2.5 text-xs text-rose-300">
                <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="cvf-login-submit flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang xác thực…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Footer hooks: connection status + reset link */}
          <div className="mt-6 space-y-3 border-t border-[var(--color-border)] pt-5">
            <div className="flex justify-center">
              <ConnectionStatus />
            </div>
            <p className="text-center text-[11px] text-[var(--color-text-muted)]">
              Cần hỗ trợ tài khoản?{" "}
              <Link
                href="/admin-reset"
                className="text-[var(--color-accent-hover)] hover:underline"
              >
                Xem hướng dẫn
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
          © 2026 Đội Container — Cảng Tân Thuận · v1.0
        </p>
      </div>
    </div>
  );
}
