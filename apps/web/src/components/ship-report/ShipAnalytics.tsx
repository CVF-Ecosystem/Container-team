'use client';

import { VesselData } from '@/lib/db';
import ProductivityChart from './ProductivityChart';
import VolumeChart from './VolumeChart';
import LineShareChart from './LineShareChart';
import { useState, useEffect } from 'react';

interface ShipAnalyticsProps {
    data: VesselData[];
}

export default function ShipAnalytics({ data }: ShipAnalyticsProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Reset page when data changes (e.g. filter change)
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    if (!data || data.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                <p>Chưa có dữ liệu phân tích cho bộ lọc này.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

    // Reverse data first to show chronologically if needed, then slice
    // Assuming 'data' is sorted by date desc as usual (Newest first)
    // We want charts to show current page items.
    // If page 1, we show items 0-9 (Newest)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                    <span className="text-sm text-gray-400 pl-2">
                        Hiển thị {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, data.length)} trong tổng số {data.length} chuyến
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                            &larr; Trước
                        </button>
                        <span className="px-3 py-1 text-sm text-white font-medium bg-gray-700/50 rounded">
                            Trang {currentPage}/{totalPages}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                        >
                            Sau &rarr;
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Productivity Chart (Paginated) */}
                <ProductivityChart data={paginatedData} />

                {/* Volume Split (Paginated) */}
                <VolumeChart data={paginatedData} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Line Share - Takes 1/3 (Uses ALL data for accurate share) */}
                <div className="md:col-span-1">
                    <LineShareChart data={data} />
                </div>

                {/* Expanded Stats - Takes 2/3 (Uses ALL data for accurate averages) */}
                <div className="md:col-span-2 bg-gray-800/50 p-6 rounded-xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <h3 className="text-lg font-bold text-white mb-2">💡 Thông Tin Thêm (Toàn Bộ)</h3>
                    <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                        <div className="p-4 bg-gray-900/50 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase mb-1">Tổng Chuyến</p>
                            <p className="text-3xl font-bold text-cyan-400">{data.length}</p>
                        </div>
                        <div className="p-4 bg-gray-900/50 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase mb-1">Sản Lượng TB/Tàu</p>
                            <p className="text-3xl font-bold text-magenta-400">
                                {Math.round(data.reduce((acc, d) => acc + (d.total_moves || ((d.nhap_tau || 0) + (d.xuat_tau || 0) + (d.shift_in || 0) + (d.shift_out || 0)) || 0), 0) / (data.length || 1)).toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-900/50 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase mb-1">Giờ Làm Hàng TB</p>
                            <p className="text-3xl font-bold text-orange-400">
                                {(data.reduce((acc, d) => acc + (d.working_hours || (d.atw && d.atc ? (new Date(d.atc).getTime() - new Date(d.atw).getTime()) / 3600000 : 0) || 0), 0) / (data.length || 1)).toFixed(1)}h
                            </p>
                        </div>
                        <div className="p-4 bg-gray-900/50 rounded-lg">
                            <p className="text-gray-400 text-xs uppercase mb-1">Giờ Nằm Cầu TB</p>
                            <p className="text-3xl font-bold text-purple-400">
                                {(data.reduce((acc, d) => acc + (d.berth_hours || (d.atb && d.atd ? (new Date(d.atd).getTime() - new Date(d.atb).getTime()) / 3600000 : 0) || 0), 0) / (data.length || 1)).toFixed(1)}h
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
