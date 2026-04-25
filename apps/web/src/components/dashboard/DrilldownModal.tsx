/**
 * DrilldownModal Component
 * Hiển thị chi tiết dữ liệu ngày khi click vào tháng
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: number;
    month: number;
    monthLabel?: string;
}

export default function DrilldownModal({
    isOpen,
    onClose,
    year,
    month,
    monthLabel
}: DrilldownModalProps) {
    // Fetch daily data for the selected month
    const dailyData = useLiveQuery(
        async () => {
            if (!isOpen) return [];
            const data = await db.daily_data
                .where('[year+month]')
                .equals([year, month])
                .toArray();
            return data.sort((a, b) => a.day - b.day);
        },
        [year, month, isOpen],
        []
    );

    // Summary for the month
    const summary = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return null;
        return {
            totalXe: dailyData.reduce((sum, d) => sum + d.xe_total, 0),
            totalXalan: dailyData.reduce((sum, d) => sum + d.xalan_total, 0),
            total: dailyData.reduce((sum, d) => sum + d.total, 0),
            days: dailyData.length,
        };
    }, [dailyData]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">
                        📅 Chi tiết {monthLabel || `Tháng ${month}`}/{year}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-900/50">
                        <div className="text-center">
                            <p className="text-gray-400 text-xs">Số ngày</p>
                            <p className="text-white text-lg font-bold">{summary.days}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-xs">Tổng XE</p>
                            <p className="text-orange-400 text-lg font-bold">{summary.totalXe.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-xs">Tổng XALAN</p>
                            <p className="text-purple-400 text-lg font-bold">{summary.totalXalan.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 text-xs">Tổng Cộng</p>
                            <p className="text-blue-400 text-lg font-bold">{summary.total.toLocaleString()}</p>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="overflow-auto max-h-[50vh] px-6 py-4">
                    {dailyData && dailyData.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800">
                                <tr className="text-gray-400 text-left">
                                    <th className="py-2 px-3">Ngày</th>
                                    <th className="py-2 px-3 text-right">XE Hạ</th>
                                    <th className="py-2 px-3 text-right">XE Giao</th>
                                    <th className="py-2 px-3 text-right">XE CFS</th>
                                    <th className="py-2 px-3 text-right text-orange-400">XE Tổng</th>
                                    <th className="py-2 px-3 text-right">XALAN Hạ</th>
                                    <th className="py-2 px-3 text-right">XALAN Giao</th>
                                    <th className="py-2 px-3 text-right">XALAN CFS</th>
                                    <th className="py-2 px-3 text-right text-purple-400">XALAN Tổng</th>
                                    <th className="py-2 px-3 text-right text-blue-400 font-medium">Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="text-white">
                                {dailyData.map((day) => (
                                    <tr
                                        key={day.id}
                                        className="border-b border-gray-700/50 hover:bg-gray-700/30"
                                    >
                                        <td className="py-2 px-3 font-medium">
                                            {String(day.day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                                        </td>
                                        <td className="py-2 px-3 text-right">{day.xe_ha}</td>
                                        <td className="py-2 px-3 text-right">{day.xe_giao}</td>
                                        <td className="py-2 px-3 text-right">{day.xe_cfs}</td>
                                        <td className="py-2 px-3 text-right text-orange-400 font-medium">{day.xe_total}</td>
                                        <td className="py-2 px-3 text-right">{day.xalan_ha}</td>
                                        <td className="py-2 px-3 text-right">{day.xalan_giao}</td>
                                        <td className="py-2 px-3 text-right">{day.xalan_cfs}</td>
                                        <td className="py-2 px-3 text-right text-purple-400 font-medium">{day.xalan_total}</td>
                                        <td className="py-2 px-3 text-right text-blue-400 font-bold">{day.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Không có dữ liệu cho tháng {month}/{year}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
