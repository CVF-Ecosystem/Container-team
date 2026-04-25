/**
 * DateRangePicker Component
 * Cho phép chọn từ ngày - đến ngày
 */

'use client';

import { useState, useMemo } from 'react';

export interface DateRange {
    startDate: string | null;  // YYYY-MM-DD
    endDate: string | null;    // YYYY-MM-DD
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    minYear?: number;
    maxYear?: number;
}

export default function DateRangePicker({
    value,
    onChange,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState(value.startDate || '');
    const [tempEnd, setTempEnd] = useState(value.endDate || '');

    // Format date for display
    const formatDisplay = (date: string | null) => {
        if (!date) return '--';
        const d = new Date(date);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Get display text
    const displayText = useMemo(() => {
        if (!value.startDate && !value.endDate) return 'Chọn khoảng thời gian';
        return `${formatDisplay(value.startDate)} → ${formatDisplay(value.endDate)}`;
    }, [value]);

    // Quick presets
    const presets = [
        {
            label: 'Tháng này', getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                };
            }
        },
        {
            label: 'Tháng trước', getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                return {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                };
            }
        },
        {
            label: 'Quý này', getValue: () => {
                const now = new Date();
                const quarter = Math.floor(now.getMonth() / 3);
                const start = new Date(now.getFullYear(), quarter * 3, 1);
                const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                return {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                };
            }
        },
        {
            label: 'Năm nay', getValue: () => {
                const year = new Date().getFullYear();
                return {
                    startDate: `${year}-01-01`,
                    endDate: `${year}-12-31`
                };
            }
        },
        {
            label: '30 ngày qua', getValue: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                return {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                };
            }
        },
    ];

    // Apply temp values
    const handleApply = () => {
        if (tempStart && tempEnd) {
            onChange({ startDate: tempStart, endDate: tempEnd });
            setIsOpen(false);
        }
    };

    // Clear selection
    const handleClear = () => {
        onChange({ startDate: null, endDate: null });
        setTempStart('');
        setTempEnd('');
        setIsOpen(false);
    };

    // Apply preset
    const handlePreset = (preset: typeof presets[0]) => {
        const range = preset.getValue();
        setTempStart(range.startDate);
        setTempEnd(range.endDate);
        onChange(range);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 
                         text-white rounded-lg transition-all text-sm border border-gray-600"
            >
                <span>📅</span>
                <span className="truncate max-w-[200px]">{displayText}</span>
                <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 mt-2 p-4 bg-gray-800 border border-gray-700 rounded-xl shadow-xl min-w-[320px]">
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {presets.map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => handlePreset(preset)}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 
                                         text-xs rounded-lg transition-all"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Date Inputs */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-gray-400 text-xs mb-1">Từ ngày</label>
                            <input
                                type="date"
                                value={tempStart}
                                onChange={(e) => setTempStart(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 
                                         rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs mb-1">Đến ngày</label>
                            <input
                                type="date"
                                value={tempEnd}
                                onChange={(e) => setTempEnd(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 
                                         rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleClear}
                            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 
                                     text-gray-300 rounded-lg text-sm transition-all"
                        >
                            Xóa
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!tempStart || !tempEnd}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 
                                     disabled:bg-gray-600 disabled:cursor-not-allowed
                                     text-white rounded-lg text-sm transition-all"
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
