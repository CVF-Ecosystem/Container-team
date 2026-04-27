"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { changePassword } from "@/lib/authService";
import {
  Badge,
  Button,
  Card,
  SectionLabel,
  TextInput,
  Toggle,
} from "@/components/cosmic";

type TabKey = "profile" | "display" | "notifications" | "security";

const TABS: { id: TabKey; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: User },
  { id: "display", label: "Hiển thị", icon: Sun },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Lock },
];

export default function SettingsPage() {
  const { session, logout, role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Security tab state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error">("idle");
  const [pwMessage, setPwMessage] = useState("");

  // Display tab state (UI-only, persistence to be wired later)
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">(
    "comfortable",
  );

  // Notifications tab state (UI-only)
  const [notifShift, setNotifShift] = useState(true);
  const [notifAlert, setNotifAlert] = useState(true);
  const [notifLeave, setNotifLeave] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);

  const handleChangePassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPwStatus("idle");
    setPwMessage("");

    if (newPassword !== confirmPassword) {
      setPwStatus("error");
      setPwMessage("Mật khẩu mới không khớp");
      return;
    }
    if (newPassword.length < 6) {
      setPwStatus("error");
      setPwMessage("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.success) {
        setPwStatus("success");
        setPwMessage("Đã đổi mật khẩu thành công");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
      }
      setPwStatus("error");
      setPwMessage(result.error || "Có lỗi xảy ra");
    } catch {
      setPwStatus("error");
      setPwMessage("Không thể đổi mật khẩu lúc này");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials =
    (session?.name || session?.username || "U").trim().split(/\s+/).pop()?.[0] || "U";

  return (
    <div className="flex gap-6">
      {/* Vertical tab list */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 md:flex" aria-label="Cài đặt">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-hover)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile horizontal tabs */}
      <div className="md:hidden">
        <select
          aria-label="Chọn tab cài đặt"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          className="cvf-input mb-4 w-full rounded-lg px-3 py-2 text-sm"
        >
          {TABS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {activeTab === "profile" && (
          <Card>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border-strong)] bg-[var(--color-elevated)] text-2xl font-bold text-[var(--color-accent)]">
                {initials.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-[var(--color-text-primary)]">
                  {session?.name || session?.username || "Người dùng"}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge tone={role === "admin" ? "warning" : "accent"}>
                    {role === "admin" ? "Quản trị viên" : "Người dùng"}
                  </Badge>
                </div>
              </div>
            </div>

            <SectionLabel>Thông tin tài khoản</SectionLabel>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Tên đăng nhập</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
                  {session?.username || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Vai trò</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
                  {role === "admin" ? "Quản trị viên" : "Người dùng"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Đăng nhập lúc</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
                  {session ? new Date(session.loginTime).toLocaleString("vi-VN") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">Hết hạn lúc</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
                  {session ? new Date(session.expiresAt).toLocaleString("vi-VN") : "—"}
                </dd>
              </div>
            </dl>
          </Card>
        )}

        {activeTab === "display" && (
          <Card>
            <SectionLabel>Tuỳ chỉnh giao diện</SectionLabel>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Ngôn ngữ hiển thị
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { v: "vi", l: "Tiếng Việt" },
                      { v: "en", l: "English" },
                    ] as const
                  ).map((o) => {
                    const active = language === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setLanguage(o.v)}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                          active
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] font-semibold text-[var(--color-accent-hover)]"
                            : "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Mật độ hiển thị
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { v: "compact", l: "Thu gọn" },
                      { v: "comfortable", l: "Vừa phải" },
                      { v: "spacious", l: "Thoáng" },
                    ] as const
                  ).map((o) => {
                    const active = density === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setDensity(o.v)}
                        className={`flex-1 rounded-lg border py-2.5 text-sm transition-colors ${
                          active
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] font-semibold text-[var(--color-accent-hover)]"
                            : "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3.5">
                <Monitor className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  Ứng dụng hiện đang chạy chế độ tối. Chế độ sáng sẽ ra mắt trong phiên bản sau.
                </span>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card>
            <SectionLabel>Tuỳ chỉnh thông báo</SectionLabel>
            <div className="divide-y divide-[var(--color-border)]">
              {[
                {
                  label: "Nhắc nhở ca làm việc",
                  sub: "Thông báo 30 phút trước khi ca bắt đầu",
                  val: notifShift,
                  set: setNotifShift,
                },
                {
                  label: "Cảnh báo hệ thống",
                  sub: "Sự cố thiết bị, tàu trễ, thông tin khẩn",
                  val: notifAlert,
                  set: setNotifAlert,
                },
                {
                  label: "Phê duyệt nghỉ phép",
                  sub: "Khi có yêu cầu mới hoặc thay đổi trạng thái",
                  val: notifLeave,
                  set: setNotifLeave,
                },
                {
                  label: "Nhận thông báo qua Email",
                  sub: "Gửi bản tóm tắt ca hàng ngày về email nội bộ",
                  val: notifEmail,
                  set: setNotifEmail,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {item.sub}
                    </div>
                  </div>
                  <Toggle checked={item.val} onChange={item.set} ariaLabel={item.label} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3 text-xs text-[var(--color-text-muted)]">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Lưu ý: cấu hình thông báo trên trình duyệt được điều khiển ở header (chuông).
            </div>
          </Card>
        )}

        {activeTab === "security" && (
          <>
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                <SectionLabel className="!mb-0">Đổi mật khẩu</SectionLabel>
              </div>
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <TextInput
                  label="Mật khẩu hiện tại"
                  type="password"
                  autoComplete="current-password"
                  required
                  icon={Lock}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <TextInput
                  label="Mật khẩu mới"
                  type="password"
                  autoComplete="new-password"
                  required
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  note="Tối thiểu 6 ký tự."
                />
                <TextInput
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  autoComplete="new-password"
                  required
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={
                    newPassword && confirmPassword && newPassword !== confirmPassword
                      ? "Mật khẩu xác nhận không khớp"
                      : undefined
                  }
                />

                {pwStatus !== "idle" && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      pwStatus === "success"
                        ? "border-[rgba(16,185,129,0.30)] bg-[rgba(16,185,129,0.10)] text-[var(--color-success)]"
                        : "border-[rgba(244,63,94,0.30)] bg-[rgba(244,63,94,0.10)] text-rose-300"
                    }`}
                  >
                    {pwMessage}
                  </div>
                )}

                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang cập nhật…" : "Đổi mật khẩu"}
                </Button>
              </form>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                <SectionLabel className="!mb-0">Phiên đăng nhập hiện tại</SectionLabel>
              </div>
              <div className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-elevated)] p-3.5">
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-4 w-4 text-[var(--color-success)]"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {session?.username || "—"}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Hết hạn:{" "}
                      {session ? new Date(session.expiresAt).toLocaleString("vi-VN") : "—"}
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    Hoạt động
                  </Badge>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-2 flex items-center gap-2">
                <LogOut className="h-4 w-4 text-[var(--color-danger)]" aria-hidden="true" />
                <SectionLabel className="!mb-0">Đăng xuất</SectionLabel>
              </div>
              <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                Kết thúc phiên đăng nhập trên thiết bị này.
              </p>
              <Button variant="danger" icon={LogOut} onClick={logout}>
                Đăng xuất
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
