"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Loader2, LogIn } from "lucide-react";
import { login } from "@/lib/authService";
import { useAuth } from "@/components/AuthProvider";
import { ConnectionStatus } from "@/lib/dataProvider";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refreshSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        await refreshSession();

        if (result.role === "admin") {
          router.push("/admin/data");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(result.error || "Đăng nhập thất bại");
      }
    } catch (_err) {
      setError("Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-10">
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-accent-dim)] text-[var(--color-accent-hover)] ring-1 ring-[var(--color-border-strong)]">
            <Building2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-wide text-[var(--color-text-primary)]">
            CẢNG TÂN THUẬN
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Hệ thống Báo cáo Đội Container
          </p>
        </div>

        <div className="cvf-card rounded-xl p-8">
          <h2 className="mb-6 flex items-center justify-center gap-2 text-xl font-semibold text-[var(--color-text-primary)]">
            <LogIn className="h-5 w-5 text-[var(--color-accent-hover)]" aria-hidden="true" />
            Đăng Nhập
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin hoặc user"
                required
                className="cvf-input w-full rounded-lg px-4 py-3 transition-all"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="cvf-input w-full rounded-lg px-4 py-3 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 p-3">
                <p className="text-center text-sm text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-3 font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  Đăng Nhập
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3 border-t border-[var(--color-border)] pt-6">
            <div className="flex justify-center">
              <ConnectionStatus />
            </div>

            <p className="text-center text-xs text-[var(--color-text-muted)]">
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

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          © 2026 Đội Container - Cảng Tân Thuận · v1.0
        </p>
      </div>
    </div>
  );
}
