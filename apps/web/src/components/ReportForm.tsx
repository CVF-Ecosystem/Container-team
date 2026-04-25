'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CascadingSelect from '@/components/CascadingSelect';
import WorkItemForm from '@/components/WorkItemForm';
import { mockNhanVien, mockHangMucCongViec } from '@/data/mockData';
import { logger } from '@/lib/logger';
import { NhanVien, BaoCao, BaoCaoChiTiet, CA_LAM_VIEC, CaLamViec } from '@/types';
import { saveReport } from '@/services/reportService';

// LocalStorage key
const NHAN_VIEN_KEY = 'daily_report_nhan_vien';

export default function ReportForm() {
    const [nhanVienList, setNhanVienList] = useState<NhanVien[]>([]);
    const [selectedNhanVien, setSelectedNhanVien] = useState<NhanVien | null>(null);
    const [selectedCa, setSelectedCa] = useState<CaLamViec | ''>('');
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [chiTiet, setChiTiet] = useState<BaoCaoChiTiet[]>([]);
    const [ghiChu, setGhiChu] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Load nhân viên từ localStorage
    useEffect(() => {
        const saved = localStorage.getItem(NHAN_VIEN_KEY);
        if (saved) {
            setNhanVienList(JSON.parse(saved));
        } else {
            setNhanVienList(mockNhanVien);
        }
    }, []);

    const handleChiTietChange = useCallback((data: BaoCaoChiTiet[]) => {
        setChiTiet(data);
    }, []);

    const handleSubmit = async () => {
        if (!selectedNhanVien || !selectedCa) {
            alert('Vui lòng chọn đầy đủ thông tin người lập và ca làm việc');
            return;
        }

        if (chiTiet.length === 0) {
            alert('Vui lòng chọn ít nhất một hạng mục công việc');
            return;
        }

        setIsSubmitting(true);

        const baoCao: BaoCao = {
            Ngay: selectedDate,
            Ca: selectedCa,
            LoaiBaoCao: 'SoLieu',
            NguoiLap_MaNV: selectedNhanVien.Ma_NV,
            NguoiLap_HoTen: selectedNhanVien.Ho_Ten,
            BoPhan: selectedNhanVien.Bo_Phan,
            Nhom: selectedNhanVien.Nhom,
            ChiTiet: chiTiet,
            GhiChu: ghiChu,
            TrangThai: 'Draft',
            Created: new Date().toISOString(),
            Modified: new Date().toISOString(),
            SyncStatus: 'pending'
        };

        // Lưu vào localStorage
        saveReport(baoCao);
        logger.info('Saved report', baoCao);

        setIsSubmitting(false);
        setSubmitStatus('success');

        // Reset form after 2 seconds
        setTimeout(() => {
            setSubmitStatus('idle');
        }, 3000);
    };

    const isFormValid = selectedNhanVien && selectedCa && chiTiet.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div className="text-center flex-1">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            📋 Báo Cáo Cuối Ca
                        </h1>
                        <p className="text-gray-400">Cảng Tân Thuận - Đội Container</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/dashboard"
                            title="Dashboard - Biểu đồ biến động container"
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm"
                        >
                            📊
                        </Link>
                        <Link
                            href="/start-shift"
                            title="Báo cáo Đầu Ca - Phân công nhân sự"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all text-sm"
                        >
                            👥 Đầu Ca
                        </Link>
                        <Link
                            href="/leave"
                            title="Báo cáo Nghỉ Phép - Đăng ký nghỉ, bù ca"
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all text-sm"
                        >
                            🏖️
                        </Link>
                        <Link
                            href="/history"
                            title="Lịch sử - Xem và quản lý báo cáo đã tạo"
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-sm"
                        >
                            📋
                        </Link>
                        <Link
                            href="/admin"
                            title="Quản trị - Quản lý nhân viên, Import Excel"
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all text-sm"
                        >
                            ⚙️
                        </Link>
                    </div>
                </div>

                {/* No employees warning */}
                {nhanVienList.length === 0 && (
                    <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg">
                        <p className="text-yellow-400 text-center">
                            ⚠️ Chưa có danh sách nhân viên.{' '}
                            <Link href="/admin" className="underline hover:text-yellow-300">
                                Import từ Excel
                            </Link>
                        </p>
                    </div>
                )}

                {/* Success Message */}
                {submitStatus === 'success' && (
                    <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg animate-pulse">
                        <p className="text-green-400 text-center font-medium">
                            ✅ Báo cáo đã được lưu thành công!
                        </p>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

                    {/* Date & Shift Section */}
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-4">📅 Thời gian</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Ngày báo cáo
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Ca làm việc
                                </label>
                                <select
                                    value={selectedCa}
                                    onChange={(e) => setSelectedCa(e.target.value as CaLamViec)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">-- Chọn ca --</option>
                                    {CA_LAM_VIEC.map(ca => (
                                        <option key={ca} value={ca}>{ca}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Person Selection Section */}
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-4">👤 Người lập báo cáo</h2>
                        <CascadingSelect
                            nhanVienList={nhanVienList}
                            onSelect={setSelectedNhanVien}
                            selectedNhanVien={selectedNhanVien}
                        />
                    </div>

                    {/* Work Items Section */}
                    <div className="p-6 border-b border-gray-700">
                        <WorkItemForm
                            hangMucList={mockHangMucCongViec}
                            boPhan={selectedNhanVien?.Bo_Phan || ''}
                            onChange={handleChiTietChange}
                        />
                    </div>

                    {/* Notes Section */}
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-4">📝 Ghi chú</h2>
                        <textarea
                            value={ghiChu}
                            onChange={(e) => setGhiChu(e.target.value)}
                            placeholder="Nhập ghi chú nếu có..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="p-6 bg-gray-700/30">
                        <button
                            onClick={handleSubmit}
                            disabled={!isFormValid || isSubmitting}
                            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform ${isFormValid && !isSubmitting
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang lưu...
                                </span>
                            ) : (
                                'Lưu'
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-between items-center">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full text-sm text-gray-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Trực tuyến
                    </span>
                    <span className="text-sm text-gray-500">
                        {nhanVienList.length} nhân viên
                    </span>
                </div>
            </div>
        </div>
    );
}
