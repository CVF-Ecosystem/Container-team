'use client';

import { useDbStatus, useAvailableYears } from '@/lib/hooks';
import { clearAllData } from '@/lib/dataService';
import { useState } from 'react';

interface DbStatusCardProps {
    onDataCleared?: () => void;
}

export default function DbStatusCard({ onDataCleared }: DbStatusCardProps) {
    const status = useDbStatus();
    const years = useAvailableYears();
    const [isClearing, setIsClearing] = useState(false);

    const handleClearAll = async () => {
        if (!confirm('Xóa tất cả dữ liệu trong database?')) return;

        setIsClearing(true);
        try {
            await clearAllData();
            // Also clear localStorage
            localStorage.removeItem('dashboard_daily_data');
            localStorage.removeItem('dashboard_monthly_data');
            onDataCleared?.();
            window.location.reload();
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Lỗi xóa dữ liệu');
        } finally {
            setIsClearing(false);
        }
    };

    if (!status) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <span className="text-lg">🗄️</span>
                    IndexedDB Status
                </h4>
                <div className={`w-2 h-2 rounded-full ${status.hasData ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div className="bg-gray-900/50 rounded p-2">
                    <div className="text-xl font-bold text-blue-400">{status.dailyCount}</div>
                    <div className="text-xs text-gray-400">Ngày</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                    <div className="text-xl font-bold text-purple-400">{status.monthlyCount}</div>
                    <div className="text-xs text-gray-400">Tháng</div>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                    <div className="text-xl font-bold text-orange-400">{status.yearlyCount}</div>
                    <div className="text-xs text-gray-400">Năm</div>
                </div>
            </div>

            {years && years.length > 0 && (
                <div className="text-xs text-gray-400 mb-3">
                    Dữ liệu: {years.join(', ')}
                </div>
            )}

            {status.lastImport && (
                <div className="text-xs text-gray-500 mb-3">
                    Import: {new Date(status.lastImport).toLocaleString('vi-VN')}
                </div>
            )}

            <button
                onClick={handleClearAll}
                disabled={isClearing || !status.hasData}
                className="w-full py-2 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isClearing ? '⏳ Đang xóa...' : '🗑️ Xóa tất cả dữ liệu'}
            </button>
        </div>
    );
}
