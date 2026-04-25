'use client';

import { useState } from 'react';
import { KeyRound, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { changePassword } from '@/lib/authService';

export default function SettingsPage() {
    const { session, logout, role } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleChangePassword = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setStatus('idle');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('Mật khẩu mới không khớp');
            return;
        }

        if (newPassword.length < 6) {
            setStatus('error');
            setMessage('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await changePassword(oldPassword, newPassword);
            if (result.success) {
                setStatus('success');
                setMessage('Đã đổi mật khẩu thành công');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                return;
            }
            setStatus('error');
            setMessage(result.error || 'Có lỗi xảy ra');
        } catch {
            setStatus('error');
            setMessage('Không thể đổi mật khẩu lúc này');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-5">

            {/* Account info */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                    Thông tin tài khoản
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                        <dt className="text-[var(--color-text-secondary)]">Tên đăng nhập</dt>
                        <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                            {session?.username || '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[var(--color-text-secondary)]">Vai trò</dt>
                        <dd className="mt-0.5">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                role === 'admin'
                                    ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                                    : 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
                            }`}>
                                {role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[var(--color-text-secondary)]">Đăng nhập lúc</dt>
                        <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                            {session ? new Date(session.loginTime).toLocaleString('vi-VN') : '—'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[var(--color-text-secondary)]">Hết hạn lúc</dt>
                        <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                            {session ? new Date(session.expiresAt).toLocaleString('vi-VN') : '—'}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Change password */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                    Đổi mật khẩu
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label htmlFor="old-password" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                            Mật khẩu hiện tại
                        </label>
                        <input
                            id="old-password"
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="new-password" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                            Mật khẩu mới
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                            Xác nhận mật khẩu mới
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="cvf-input w-full rounded-lg px-4 py-2 text-sm"
                        />
                    </div>

                    {status !== 'idle' && (
                        <div className={`rounded-lg px-4 py-3 text-sm border ${
                            status === 'success'
                                ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
                                : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                        }`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                    </button>
                </form>
            </div>

            {/* Logout */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-[var(--color-danger)]" aria-hidden="true" />
                    Đăng xuất
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    Đăng xuất khỏi hệ thống. Bạn sẽ cần đăng nhập lại để tiếp tục.
                </p>
                <button
                    type="button"
                    onClick={logout}
                    className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors bg-[var(--color-danger)] hover:opacity-85"
                >
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}
