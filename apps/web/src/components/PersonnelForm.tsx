'use client';

import { useState, useEffect, useMemo } from 'react';
import { NhanVien, ViTriCongViec, PhanCongNhanSu } from '@/types';

interface PersonnelFormProps {
    viTriList: ViTriCongViec[];
    nhanVienList: NhanVien[];
    boPhan: string;
    onChange: (phanCong: PhanCongNhanSu[]) => void;
}

export default function PersonnelForm({
    viTriList,
    nhanVienList,
    boPhan,
    onChange
}: PersonnelFormProps) {
    const [phanCong, setPhanCong] = useState<Record<string, string[]>>({});

    // Filter vị trí theo bộ phận
    const filteredViTri = useMemo(() => {
        return viTriList
            .filter(vt => vt.BoPhan === boPhan && vt.Active)
            .sort((a, b) => a.ThuTu - b.ThuTu);
    }, [viTriList, boPhan]);

    // Filter nhân viên (tất cả nhân viên active)
    const availableNhanVien = useMemo(() => {
        return nhanVienList.filter(nv => nv.Active);
    }, [nhanVienList]);

    // Notify parent of changes
    useEffect(() => {
        const result: PhanCongNhanSu[] = Object.entries(phanCong)
            .filter(([_, nvIds]) => nvIds.length > 0)
            .map(([viTriId, nvIds]) => {
                const viTri = viTriList.find(vt => vt.id === viTriId);
                const tenNV = nvIds.map(id => {
                    const nv = nhanVienList.find(n => n.Ma_NV === id);
                    return nv?.Ho_Ten || id;
                });
                return {
                    ViTriId: viTriId,
                    TenViTri: viTri?.TenViTri || '',
                    NhanVienIds: nvIds,
                    NhanVienTen: tenNV
                };
            });
        onChange(result);
    }, [phanCong, viTriList, nhanVienList, onChange]);

    // Reset when boPhan changes
    useEffect(() => {
        setPhanCong({});
    }, [boPhan]);

    const handleSelectSingle = (viTriId: string, nvId: string) => {
        setPhanCong(prev => ({
            ...prev,
            [viTriId]: nvId ? [nvId] : []
        }));
    };

    const handleToggleMulti = (viTriId: string, nvId: string) => {
        setPhanCong(prev => {
            const current = prev[viTriId] || [];
            if (current.includes(nvId)) {
                return { ...prev, [viTriId]: current.filter(id => id !== nvId) };
            } else {
                return { ...prev, [viTriId]: [...current, nvId] };
            }
        });
    };

    if (!boPhan) {
        return (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                <p className="text-gray-400">Vui lòng chọn bộ phận trước</p>
            </div>
        );
    }

    if (filteredViTri.length === 0) {
        return (
            <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                <p className="text-gray-400">Không có vị trí nào cho bộ phận {boPhan}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">
                👥 Phân công nhân sự - {boPhan}
            </h3>

            <div className="space-y-3">
                {filteredViTri.map(viTri => {
                    const selected = phanCong[viTri.id] || [];

                    return (
                        <div
                            key={viTri.id}
                            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white font-medium">
                                    {viTri.TenViTri}
                                </label>
                                {viTri.ChoPhepNhieuNguoi && (
                                    <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                                        Nhiều người
                                    </span>
                                )}
                            </div>

                            {viTri.ChoPhepNhieuNguoi ? (
                                // Multi-select với checkboxes
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {availableNhanVien.map(nv => (
                                        <button
                                            key={nv.Ma_NV}
                                            onClick={() => handleToggleMulti(viTri.id, nv.Ma_NV)}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selected.includes(nv.Ma_NV)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {nv.Ho_Ten}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // Single select dropdown
                                <select
                                    value={selected[0] || ''}
                                    onChange={(e) => handleSelectSingle(viTri.id, e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {availableNhanVien.map(nv => (
                                        <option key={nv.Ma_NV} value={nv.Ma_NV}>
                                            {nv.Ho_Ten}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Selected summary */}
                            {selected.length > 0 && (
                                <div className="mt-2 text-sm text-green-400">
                                    ✓ {selected.map(id => nhanVienList.find(nv => nv.Ma_NV === id)?.Ho_Ten).join(', ')}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                    Đã phân công: {Object.values(phanCong).filter(arr => arr.length > 0).length}/{filteredViTri.length} vị trí
                </p>
            </div>
        </div>
    );
}
