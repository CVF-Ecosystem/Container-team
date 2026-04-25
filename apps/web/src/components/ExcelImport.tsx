'use client';

import { useState, useRef } from 'react';
import * as XLSX from '@e965/xlsx';
import { NhanVien } from '@/types';

interface ExcelImportProps {
    onImport: (data: NhanVien[]) => void;
    currentData: NhanVien[];
}

// Mapping rules: Chức danh → Bộ phận
const mapChucDanhToBoPhan = (chucDanh: string): NhanVien['Bo_Phan'] => {
    const rules: Record<string, NhanVien['Bo_Phan']> = {
        'NV. Vận hành hệ thống VTOS': 'Điều hành',
        'NV. Thủ tục container': 'Thủ tục',
        'NV. Giao nhận container': 'Bãi cont',
        'NV. Tổng hợp': 'Tổng hợp',
        'Đội trưởng': 'Ban Chỉ Huy',
        'Đội phó': 'Ban Chỉ Huy',
        'Trưởng bãi': 'Ban Chỉ Huy',
    };

    // Check if chucDanh contains any key
    for (const [key, value] of Object.entries(rules)) {
        if (chucDanh.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    return 'Ban Chỉ Huy'; // Default
};

export default function ExcelImport({ onImport, currentData }: ExcelImportProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [preview, setPreview] = useState<NhanVien[]>([]);
    const [error, setError] = useState<string>('');
    const [columnMapping, setColumnMapping] = useState({
        Ma_NV: '',
        Ho_Ten: '',
        ChucDanh: '',
        Nhom: '',
    });
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<Record<string, string>[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setPreview([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });

                if (jsonData.length === 0) {
                    setError('File Excel trống hoặc không đúng định dạng');
                    return;
                }

                // Get headers
                const cols = Object.keys(jsonData[0]);
                setHeaders(cols);
                setRawData(jsonData);

                // Try auto-detect columns
                const autoMapping = {
                    Ma_NV: cols.find(c => c.toLowerCase().includes('mscđ') || c.toLowerCase().includes('ma_nv') || c.toLowerCase().includes('mã')) || '',
                    Ho_Ten: cols.find(c => c.toLowerCase().includes('họ') || c.toLowerCase().includes('tên') || c.toLowerCase().includes('name')) || '',
                    ChucDanh: cols.find(c => c.toLowerCase().includes('chức') || c.toLowerCase().includes('danh') || c.toLowerCase().includes('position')) || '',
                    Nhom: cols.find(c => c.toLowerCase().includes('nhóm') || c.toLowerCase().includes('ca') || c.toLowerCase().includes('group')) || '',
                };
                setColumnMapping(autoMapping);

                // Auto process if all columns detected
                if (autoMapping.Ma_NV && autoMapping.Ho_Ten) {
                    processData(jsonData, autoMapping);
                }
            } catch (err) {
                setError('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.');
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const processData = (data: Record<string, string>[], mapping: typeof columnMapping) => {
        const processed: NhanVien[] = data
            .filter(row => row[mapping.Ma_NV] && row[mapping.Ho_Ten]) // Filter empty rows
            .map(row => {
                const chucDanh = mapping.ChucDanh ? row[mapping.ChucDanh] : '';
                return {
                    Ma_NV: String(row[mapping.Ma_NV]).trim(),
                    Ho_Ten: String(row[mapping.Ho_Ten]).trim(),
                    Bo_Phan: mapChucDanhToBoPhan(chucDanh),
                    Nhom: mapping.Nhom ? String(row[mapping.Nhom]).trim() : 'Chưa phân nhóm',
                    Active: true,
                };
            });

        setPreview(processed);
    };

    const handleMappingChange = (field: keyof typeof columnMapping, value: string) => {
        const newMapping = { ...columnMapping, [field]: value };
        setColumnMapping(newMapping);
        if (rawData.length > 0 && newMapping.Ma_NV && newMapping.Ho_Ten) {
            processData(rawData, newMapping);
        }
    };

    const handleConfirmImport = () => {
        if (preview.length === 0) {
            setError('Không có dữ liệu để import');
            return;
        }

        // Merge with current data (update existing, add new)
        const merged = [...currentData];
        preview.forEach(newNV => {
            const existingIndex = merged.findIndex(nv => nv.Ma_NV === newNV.Ma_NV);
            if (existingIndex >= 0) {
                merged[existingIndex] = newNV;
            } else {
                merged.push(newNV);
            }
        });

        onImport(merged);
        setIsOpen(false);
        setPreview([]);
        setRawData([]);
        setHeaders([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            {/* Import Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Excel
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">📥 Import Danh Sách Nhân Viên</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* File Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Chọn file Excel (.xlsx, .xls)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Column Mapping */}
                            {headers.length > 0 && (
                                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                                    <h3 className="text-white font-medium mb-3">🔗 Ánh xạ cột (Column Mapping)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Mã NV (MSCĐ) *</label>
                                            <select
                                                value={columnMapping.Ma_NV}
                                                onChange={(e) => handleMappingChange('Ma_NV', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                                            >
                                                <option value="">-- Chọn cột --</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Họ Tên *</label>
                                            <select
                                                value={columnMapping.Ho_Ten}
                                                onChange={(e) => handleMappingChange('Ho_Ten', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                                            >
                                                <option value="">-- Chọn cột --</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Chức Danh (để xác định Bộ Phận)</label>
                                            <select
                                                value={columnMapping.ChucDanh}
                                                onChange={(e) => handleMappingChange('ChucDanh', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                                            >
                                                <option value="">-- Không chọn --</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Nhóm / Ca</label>
                                            <select
                                                value={columnMapping.Nhom}
                                                onChange={(e) => handleMappingChange('Nhom', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                                            >
                                                <option value="">-- Không chọn --</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        * Bắt buộc. Chức danh sẽ tự động chuyển thành Bộ phận theo quy tắc đã định.
                                    </p>
                                </div>
                            )}

                            {/* Preview */}
                            {preview.length > 0 && (
                                <div>
                                    <h3 className="text-white font-medium mb-3">
                                        👀 Xem trước ({preview.length} nhân viên)
                                    </h3>
                                    <div className="max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-700 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-gray-300">Mã NV</th>
                                                    <th className="px-3 py-2 text-left text-gray-300">Họ Tên</th>
                                                    <th className="px-3 py-2 text-left text-gray-300">Bộ Phận</th>
                                                    <th className="px-3 py-2 text-left text-gray-300">Nhóm</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.slice(0, 20).map((nv, i) => (
                                                    <tr key={i} className="border-t border-gray-700">
                                                        <td className="px-3 py-2 text-gray-400">{nv.Ma_NV}</td>
                                                        <td className="px-3 py-2 text-white">{nv.Ho_Ten}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`px-2 py-1 rounded text-xs ${nv.Bo_Phan === 'Điều hành' ? 'bg-blue-900 text-blue-300' :
                                                                    nv.Bo_Phan === 'Thủ tục' ? 'bg-purple-900 text-purple-300' :
                                                                        nv.Bo_Phan === 'Bãi cont' ? 'bg-green-900 text-green-300' :
                                                                            nv.Bo_Phan === 'Tổng hợp' ? 'bg-yellow-900 text-yellow-300' :
                                                                                'bg-gray-600 text-gray-300'
                                                                }`}>
                                                                {nv.Bo_Phan}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-400">{nv.Nhom}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {preview.length > 20 && (
                                            <p className="text-center text-gray-500 py-2">
                                                ... và {preview.length - 20} nhân viên khác
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={preview.length === 0}
                                className={`px-6 py-2 rounded-lg transition-all ${preview.length > 0
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                ✓ Import {preview.length} nhân viên
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
