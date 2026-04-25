'use client';

import Link from 'next/link';

export default function AdminResetPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        🔑 Hỗ Trợ Tài Khoản Admin
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Cơ chế reset cục bộ đã bị loại bỏ khỏi ứng dụng
                    </p>
                </div>

                <div className="bg-gray-800/80 rounded-xl p-8 border border-gray-700 shadow-xl">
                    <div className="space-y-5 text-sm text-gray-300">
                        <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4">
                            <p className="text-blue-300 font-medium mb-2">
                                Reset mật khẩu hiện phải đi qua backend và quy trình vận hành nội bộ.
                            </p>
                            <p>
                                Ứng dụng không còn hỗ trợ mã bí mật hoặc khôi phục về mật khẩu mặc định trên trình duyệt.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-white font-semibold mb-2">Cách xử lý</h2>
                            <ul className="space-y-2 text-gray-400">
                                <li>1. Liên hệ quản trị hệ thống hoặc đội vận hành để được cấp lại quyền truy cập.</li>
                                <li>2. Yêu cầu reset mật khẩu qua API hoặc công cụ quản trị nội bộ của công ty.</li>
                                <li>3. Sau khi được cấp lại tài khoản, đăng nhập lại và đổi mật khẩu ngay tại trang cài đặt.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="text-blue-400 hover:underline text-sm"
                        >
                            ← Quay lại trang đăng nhập
                        </Link>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                    <p className="text-amber-400 text-xs text-center">
                        ⚠️ Không duy trì bất kỳ mật khẩu mặc định hoặc backdoor reset nào ở phía client.
                    </p>
                </div>
            </div>
        </div>
    );
}
