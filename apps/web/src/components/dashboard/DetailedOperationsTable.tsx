'use client';

import { useMemo } from 'react';

interface DetailedData {
    label: string;
    // XE chi tiết
    xe_hb?: number;
    xe_tr?: number;
    xe_ha: number;
    xe_ln?: number;
    xe_cr?: number;
    xe_giao: number;
    xe_dh?: number;
    xe_rr?: number;
    xe_cfs: number;
    xe_dh_empty?: number;
    xe_rr_empty?: number;
    xe_total: number;
    // XALAN chi tiết
    xalan_hb?: number;
    xalan_tr?: number;
    xalan_ha: number;
    xalan_ln?: number;
    xalan_cr?: number;
    xalan_giao: number;
    xalan_dh?: number;
    xalan_rr?: number;
    xalan_cfs: number;
    xalan_dh_empty?: number;
    xalan_rr_empty?: number;
    xalan_total: number;
}

interface DetailedOperationsTableProps {
    data: DetailedData[];
    title?: string;
    showXE?: boolean;
    showXALAN?: boolean;
}

export default function DetailedOperationsTable({
    data,
    title = "Chi Tiết Phương Án",
    showXE = true,
    showXALAN = true
}: DetailedOperationsTableProps) {

    // Summary totals
    const totals = useMemo(() => {
        return data.reduce((acc, row) => ({
            // XE
            xe_hb: acc.xe_hb + (row.xe_hb || 0),
            xe_tr: acc.xe_tr + (row.xe_tr || 0),
            xe_ha: acc.xe_ha + row.xe_ha,
            xe_ln: acc.xe_ln + (row.xe_ln || 0),
            xe_cr: acc.xe_cr + (row.xe_cr || 0),
            xe_giao: acc.xe_giao + row.xe_giao,
            xe_dh: acc.xe_dh + (row.xe_dh || 0),
            xe_rr: acc.xe_rr + (row.xe_rr || 0),
            xe_cfs: acc.xe_cfs + row.xe_cfs,
            xe_dh_empty: acc.xe_dh_empty + (row.xe_dh_empty || 0),
            xe_rr_empty: acc.xe_rr_empty + (row.xe_rr_empty || 0),
            xe_total: acc.xe_total + row.xe_total,
            // XALAN
            xalan_hb: acc.xalan_hb + (row.xalan_hb || 0),
            xalan_tr: acc.xalan_tr + (row.xalan_tr || 0),
            xalan_ha: acc.xalan_ha + row.xalan_ha,
            xalan_ln: acc.xalan_ln + (row.xalan_ln || 0),
            xalan_cr: acc.xalan_cr + (row.xalan_cr || 0),
            xalan_giao: acc.xalan_giao + row.xalan_giao,
            xalan_dh: acc.xalan_dh + (row.xalan_dh || 0),
            xalan_rr: acc.xalan_rr + (row.xalan_rr || 0),
            xalan_cfs: acc.xalan_cfs + row.xalan_cfs,
            xalan_dh_empty: acc.xalan_dh_empty + (row.xalan_dh_empty || 0),
            xalan_rr_empty: acc.xalan_rr_empty + (row.xalan_rr_empty || 0),
            xalan_total: acc.xalan_total + row.xalan_total,
        }), {
            xe_hb: 0, xe_tr: 0, xe_ha: 0, xe_ln: 0, xe_cr: 0, xe_giao: 0,
            xe_dh: 0, xe_rr: 0, xe_cfs: 0, xe_dh_empty: 0, xe_rr_empty: 0, xe_total: 0,
            xalan_hb: 0, xalan_tr: 0, xalan_ha: 0, xalan_ln: 0, xalan_cr: 0, xalan_giao: 0,
            xalan_dh: 0, xalan_rr: 0, xalan_cfs: 0, xalan_dh_empty: 0, xalan_rr_empty: 0, xalan_total: 0,
        });
    }, [data]);

    // Check if we have detailed data
    const hasDetailedData = data.some(d =>
        d.xe_hb !== undefined || d.xe_ln !== undefined || d.xe_dh !== undefined
    );

    if (!hasDetailedData) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📊 {title}</h3>
                <p className="text-gray-500 text-center py-4">
                    Chưa có dữ liệu chi tiết phương án.<br />
                    <span className="text-sm">Cần import file Excel có đầy đủ columns HB, TR, LN, CR, ĐH, RR</span>
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">📊 {title}</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-900/50">
                        {/* Header Row 1: Group headers */}
                        <tr className="text-gray-400">
                            <th rowSpan={2} className="px-3 py-2 text-left border-r border-gray-700">Kỳ</th>
                            {showXE && (
                                <>
                                    <th colSpan={3} className="px-3 py-2 text-center text-green-400 border-b border-gray-700">Hạ (Vào)</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-red-400 border-b border-gray-700">Giao (Ra)</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-blue-400 border-b border-gray-700">Full CFS</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-purple-400 border-b border-gray-700">Empty CFS</th>
                                    <th rowSpan={2} className="px-3 py-2 text-center text-orange-400 border-r border-gray-700">XE<br />Tổng</th>
                                </>
                            )}
                            {showXALAN && (
                                <>
                                    <th colSpan={3} className="px-3 py-2 text-center text-green-400 border-b border-gray-700">Hạ (Vào)</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-red-400 border-b border-gray-700">Giao (Ra)</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-blue-400 border-b border-gray-700">Full CFS</th>
                                    <th colSpan={3} className="px-3 py-2 text-center text-purple-400 border-b border-gray-700">Empty CFS</th>
                                    <th rowSpan={2} className="px-3 py-2 text-center text-cyan-400">XALAN<br />Tổng</th>
                                </>
                            )}
                        </tr>
                        {/* Header Row 2: Detail columns */}
                        <tr className="text-gray-500 text-xs">
                            {showXE && (
                                <>
                                    <th className="px-2 py-1">HB</th>
                                    <th className="px-2 py-1">TR</th>
                                    <th className="px-2 py-1 text-green-400">Σ</th>
                                    <th className="px-2 py-1">LN</th>
                                    <th className="px-2 py-1">CR</th>
                                    <th className="px-2 py-1 text-red-400">Σ</th>
                                    <th className="px-2 py-1">ĐH</th>
                                    <th className="px-2 py-1">RR</th>
                                    <th className="px-2 py-1 text-blue-400">Σ</th>
                                    <th className="px-2 py-1">ĐH</th>
                                    <th className="px-2 py-1">RR</th>
                                    <th className="px-2 py-1 text-purple-400 border-r border-gray-700">Σ</th>
                                </>
                            )}
                            {showXALAN && (
                                <>
                                    <th className="px-2 py-1">HB</th>
                                    <th className="px-2 py-1">TR</th>
                                    <th className="px-2 py-1 text-green-400">Σ</th>
                                    <th className="px-2 py-1">LN</th>
                                    <th className="px-2 py-1">CR</th>
                                    <th className="px-2 py-1 text-red-400">Σ</th>
                                    <th className="px-2 py-1">ĐH</th>
                                    <th className="px-2 py-1">RR</th>
                                    <th className="px-2 py-1 text-blue-400">Σ</th>
                                    <th className="px-2 py-1">ĐH</th>
                                    <th className="px-2 py-1">RR</th>
                                    <th className="px-2 py-1 text-purple-400">Σ</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="text-white">
                        {data.map((row, idx) => (
                            <tr key={idx} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                                <td className="px-3 py-2 font-medium border-r border-gray-700">{row.label}</td>
                                {showXE && (
                                    <>
                                        <td className="px-2 py-2 text-right">{row.xe_hb || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_tr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-green-400 font-medium">{row.xe_ha}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_ln || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_cr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-red-400 font-medium">{row.xe_giao}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_dh || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_rr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-blue-400 font-medium">{row.xe_cfs}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_dh_empty || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xe_rr_empty || '-'}</td>
                                        <td className="px-2 py-2 text-right text-purple-400 font-medium border-r border-gray-700">
                                            {(row.xe_dh_empty || 0) + (row.xe_rr_empty || 0) || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-orange-400 font-bold border-r border-gray-700">
                                            {row.xe_total}
                                        </td>
                                    </>
                                )}
                                {showXALAN && (
                                    <>
                                        <td className="px-2 py-2 text-right">{row.xalan_hb || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_tr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-green-400 font-medium">{row.xalan_ha}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_ln || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_cr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-red-400 font-medium">{row.xalan_giao}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_dh || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_rr || '-'}</td>
                                        <td className="px-2 py-2 text-right text-blue-400 font-medium">{row.xalan_cfs}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_dh_empty || '-'}</td>
                                        <td className="px-2 py-2 text-right">{row.xalan_rr_empty || '-'}</td>
                                        <td className="px-2 py-2 text-right text-purple-400 font-medium">
                                            {(row.xalan_dh_empty || 0) + (row.xalan_rr_empty || 0) || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-cyan-400 font-bold">
                                            {row.xalan_total}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    {/* Footer totals */}
                    <tfoot className="bg-gray-900/70 font-medium">
                        <tr className="border-t-2 border-gray-600">
                            <td className="px-3 py-3 text-white font-bold border-r border-gray-700">TỔNG</td>
                            {showXE && (
                                <>
                                    <td className="px-2 py-3 text-right">{totals.xe_hb}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_tr}</td>
                                    <td className="px-2 py-3 text-right text-green-400">{totals.xe_ha}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_ln}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_cr}</td>
                                    <td className="px-2 py-3 text-right text-red-400">{totals.xe_giao}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_dh}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_rr}</td>
                                    <td className="px-2 py-3 text-right text-blue-400">{totals.xe_cfs}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_dh_empty}</td>
                                    <td className="px-2 py-3 text-right">{totals.xe_rr_empty}</td>
                                    <td className="px-2 py-3 text-right text-purple-400 border-r border-gray-700">
                                        {totals.xe_dh_empty + totals.xe_rr_empty}
                                    </td>
                                    <td className="px-3 py-3 text-right text-orange-400 font-bold border-r border-gray-700">
                                        {totals.xe_total}
                                    </td>
                                </>
                            )}
                            {showXALAN && (
                                <>
                                    <td className="px-2 py-3 text-right">{totals.xalan_hb}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_tr}</td>
                                    <td className="px-2 py-3 text-right text-green-400">{totals.xalan_ha}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_ln}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_cr}</td>
                                    <td className="px-2 py-3 text-right text-red-400">{totals.xalan_giao}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_dh}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_rr}</td>
                                    <td className="px-2 py-3 text-right text-blue-400">{totals.xalan_cfs}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_dh_empty}</td>
                                    <td className="px-2 py-3 text-right">{totals.xalan_rr_empty}</td>
                                    <td className="px-2 py-3 text-right text-purple-400">
                                        {totals.xalan_dh_empty + totals.xalan_rr_empty}
                                    </td>
                                    <td className="px-3 py-3 text-right text-cyan-400 font-bold">
                                        {totals.xalan_total}
                                    </td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 bg-gray-900/30 text-xs text-gray-500 flex flex-wrap gap-4">
                <span><strong>HB</strong> = Hạ bãi</span>
                <span><strong>TR</strong> = Trả rỗng</span>
                <span><strong>LN</strong> = Lấy nguyên</span>
                <span><strong>CR</strong> = Cấp rỗng</span>
                <span><strong>ĐH</strong> = Đóng hàng</span>
                <span><strong>RR</strong> = Rút ruột</span>
            </div>
        </div>
    );
}
