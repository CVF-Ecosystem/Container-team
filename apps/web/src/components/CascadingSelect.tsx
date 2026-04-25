'use client';

import { useState, useMemo } from 'react';
import { NhanVien } from '@/types';

interface CascadingSelectProps {
    nhanVienList: NhanVien[];
    onSelect: (nhanVien: NhanVien | null) => void;
    selectedNhanVien: NhanVien | null;
}

export default function CascadingSelect({
    nhanVienList,
    onSelect,
    selectedNhanVien
}: CascadingSelectProps) {
    const [boPhan, setBoPhan] = useState<string>(selectedNhanVien?.Bo_Phan || '');
    const [nhom, setNhom] = useState<string>(selectedNhanVien?.Nhom || '');

    // Get unique bộ phận (excluding Ban Chỉ Huy for regular reports)
    const boPhanList = useMemo(() => {
        const unique = [...new Set(
            nhanVienList
                .filter(nv => nv.Active && nv.Bo_Phan !== 'Ban Chỉ Huy')
                .map(nv => nv.Bo_Phan)
        )];
        return unique;
    }, [nhanVienList]);

    // Filter nhóm by selected bộ phận
    const nhomList = useMemo(() => {
        if (!boPhan) return [];
        const unique = [...new Set(
            nhanVienList
                .filter(nv => nv.Bo_Phan === boPhan && nv.Active)
                .map(nv => nv.Nhom)
        )];
        return unique;
    }, [nhanVienList, boPhan]);

    // Filter tên by selected nhóm
    const tenList = useMemo(() => {
        if (!nhom) return [];
        return nhanVienList.filter(
            nv => nv.Nhom === nhom && nv.Bo_Phan === boPhan && nv.Active
        );
    }, [nhanVienList, nhom, boPhan]);

    const handleBoPhanChange = (value: string) => {
        setBoPhan(value);
        setNhom('');
        onSelect(null);
    };

    const handleNhomChange = (value: string) => {
        setNhom(value);
        onSelect(null);
    };

    const handleTenChange = (maNV: string) => {
        const selected = nhanVienList.find(nv => nv.Ma_NV === maNV) || null;
        onSelect(selected);
    };

    return (
        <div className="space-y-4">
            {/* Bộ phận */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bộ phận
                </label>
                <select
                    value={boPhan}
                    onChange={(e) => handleBoPhanChange(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                    <option value="">-- Chọn bộ phận --</option>
                    {boPhanList.map(bp => (
                        <option key={bp} value={bp}>{bp}</option>
                    ))}
                </select>
            </div>

            {/* Nhóm */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nhóm / Ca
                </label>
                <select
                    value={nhom}
                    onChange={(e) => handleNhomChange(e.target.value)}
                    disabled={!boPhan}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">-- Chọn nhóm --</option>
                    {nhomList.map(n => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>

            {/* Họ tên */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Họ và tên
                </label>
                <select
                    value={selectedNhanVien?.Ma_NV || ''}
                    onChange={(e) => handleTenChange(e.target.value)}
                    disabled={!nhom}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">-- Chọn tên --</option>
                    {tenList.map(nv => (
                        <option key={nv.Ma_NV} value={nv.Ma_NV}>
                            {nv.Ho_Ten} ({nv.Ma_NV})
                        </option>
                    ))}
                </select>
            </div>

            {/* Selected info */}
            {selectedNhanVien && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-green-400 text-sm">
                        ✓ Đã chọn: <strong>{selectedNhanVien.Ho_Ten}</strong> - {selectedNhanVien.Bo_Phan} / {selectedNhanVien.Nhom}
                    </p>
                </div>
            )}
        </div>
    );
}
