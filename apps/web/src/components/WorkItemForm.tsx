'use client';

import { useState, useEffect } from 'react';
import { HangMucCongViec, BaoCaoChiTiet } from '@/types';

interface WorkItemFormProps {
    hangMucList: HangMucCongViec[];
    boPhan: string;
    onChange: (chiTiet: BaoCaoChiTiet[]) => void;
    initialData?: BaoCaoChiTiet[];
}

export default function WorkItemForm({
    hangMucList,
    boPhan,
    onChange,
    initialData
}: WorkItemFormProps) {
    const [items, setItems] = useState<BaoCaoChiTiet[]>([]);

    // Filter hang mục theo bộ phận
    useEffect(() => {
        if (!boPhan) {
            setItems([]);
            return;
        }

        const filtered = hangMucList
            .filter(hm => hm.BoPhan === boPhan && hm.Active)
            .sort((a, b) => a.ThuTu - b.ThuTu)
            .map(hm => {
                // Check if there's existing data
                const existing = initialData?.find(d => d.HangMucId === hm.id);
                return {
                    HangMucId: hm.id,
                    TenHangMuc: hm.TenHangMuc,
                    GiaTri: existing?.GiaTri ?? (hm.LoaiNhapLieu === 'Number' ? 0 : ''),
                    checked: existing?.checked ?? false
                };
            });

        setItems(filtered);
    }, [boPhan, hangMucList, initialData]);

    // Notify parent of changes
    useEffect(() => {
        onChange(items.filter(item => item.checked));
    }, [items, onChange]);

    const handleCheckChange = (id: string, checked: boolean) => {
        setItems(prev => prev.map(item =>
            item.HangMucId === id ? { ...item, checked } : item
        ));
    };

    const handleValueChange = (id: string, value: string | number) => {
        setItems(prev => prev.map(item =>
            item.HangMucId === id ? { ...item, GiaTri: value, checked: true } : item
        ));
    };

    const getHangMuc = (id: string) => hangMucList.find(hm => hm.id === id);

    if (!boPhan) {
        return (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                <p className="text-gray-400">Vui lòng chọn bộ phận trước</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">
                📋 Công việc trong ca - {boPhan}
            </h3>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-700/50">
                            <th className="w-12 px-4 py-3 text-left"></th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Hạng mục</th>
                            <th className="w-32 px-4 py-3 text-left text-sm font-medium text-gray-300">Giá trị</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const hangMuc = getHangMuc(item.HangMucId);
                            const isNumber = hangMuc?.LoaiNhapLieu === 'Number';

                            return (
                                <tr
                                    key={item.HangMucId}
                                    className={`border-t border-gray-700 transition-colors ${item.checked ? 'bg-blue-900/20' : 'hover:bg-gray-700/30'
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={(e) => handleCheckChange(item.HangMucId, e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`${item.checked ? 'text-white font-medium' : 'text-gray-400'}`}>
                                            {item.TenHangMuc}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {isNumber ? (
                                            <input
                                                type="number"
                                                value={item.GiaTri as number}
                                                onChange={(e) => handleValueChange(item.HangMucId, parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min="0"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={item.GiaTri as string}
                                                onChange={(e) => handleValueChange(item.HangMucId, e.target.value)}
                                                placeholder="Nhập nội dung..."
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-center text-sm text-gray-400 px-2">
                <span>Đã chọn: {items.filter(i => i.checked).length}/{items.length} hạng mục</span>
            </div>
        </div>
    );
}
