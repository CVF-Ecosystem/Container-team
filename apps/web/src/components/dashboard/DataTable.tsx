"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardData } from "@/types";
import * as XLSX from "@e965/xlsx";

interface DataTableProps {
  data: DashboardData[];
  onExport?: () => void;
  pageSize?: number; // Items per page, default 10
  onRowClick?: (item: DashboardData) => void; // Drill-down callback
}

export default function DataTable({
  data,
  onExport,
  pageSize = 10,
  onRowClick,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(data.length / pageSize);

  // Get data for current page
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  // Reset to page 1 when data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    // Default export with full details (all data, not paginated)
    const exportData = data.map((d) => ({
      "Thời gian": d.label,
      "Tổng Biến Động": d.xe.total + d.xalan.total,
      "Tổng Vào (Hạ)": d.xe.ha + d.xalan.ha,
      "Tổng Ra (Giao)": d.xe.giao + d.xalan.giao,
      "Full CFS": d.cfs?.full || d.xe.fullCfs + d.xalan.fullCfs,
      "XE - Hạ": d.xe.ha,
      "XE - Giao": d.xe.giao,
      "XE - CFS": d.xe.fullCfs,
      "XE - Tổng": d.xe.total,
      "XALAN - Hạ": d.xalan.ha,
      "XALAN - Giao": d.xalan.giao,
      "XALAN - CFS": d.xalan.fullCfs,
      "XALAN - Tổng": d.xalan.total,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    XLSX.writeFile(
      wb,
      `BaoCao_BienDong_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--color-elevated)] flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">📋 Bảng Chi Tiết</h3>
        <button
          onClick={handleExport}
          title="Xuất báo cáo ra file Excel"
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-elevated)]">
              <th className="px-3 py-3 text-left text-[var(--color-text-secondary)] font-medium">
                Thời gian
              </th>
              <th
                className="px-3 py-3 text-right text-[var(--color-success)] font-medium"
                title="Hạ XE + Hạ XALAN (không CFS)"
              >
                Vào
              </th>
              <th
                className="px-3 py-3 text-right text-[var(--color-danger)] font-medium"
                title="Giao XE + Giao XALAN (không CFS)"
              >
                Ra
              </th>
              <th
                className="px-3 py-3 text-right text-cyan-400 font-medium"
                title="Full CFS (Đóng hàng + Rút ruột)"
              >
                CFS
              </th>
              <th
                className="px-3 py-3 text-right text-amber-400 font-medium"
                title="XE = Hạ + Giao + CFS"
              >
                XE
              </th>
              <th
                className="px-3 py-3 text-right text-purple-400 font-medium"
                title="XALAN = Hạ + Giao + CFS"
              >
                XALAN
              </th>
              <th
                className="px-3 py-3 text-right text-white font-medium"
                title="XE + XALAN"
              >
                Tổng
              </th>
              <th className="px-3 py-3 text-right text-[var(--color-text-secondary)] font-medium">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  Chưa có dữ liệu. Vui lòng upload file Excel.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const tongVao = item.xe.ha + item.xalan.ha;
                const tongRa = item.xe.giao + item.xalan.giao;
                const tongCfs =
                  item.cfs?.full || item.xe.fullCfs + item.xalan.fullCfs;
                const tongBienDong = item.xe.total + item.xalan.total;

                return (
                  <tr
                    key={item.id || index}
                    className={`border-t border-[var(--color-border)] hover:bg-[var(--color-elevated)]/20 transition-colors ${
                      onRowClick ? "cursor-pointer hover:bg-[var(--color-elevated)]/40" : ""
                    }`}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                  >
                    <td className="px-3 py-3 text-white font-medium">
                      {item.label}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--color-success)]">
                      {tongVao.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--color-danger)]">
                      {tongRa.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right text-cyan-400">
                      {tongCfs.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right text-amber-400">
                      {item.xe.total.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right text-purple-400">
                      {item.xalan.total.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right text-white font-medium">
                      {tongBienDong.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.comparison ? (
                        <span
                          className={`${
                            item.comparison.trend === "up"
                              ? "text-[var(--color-success)]"
                              : item.comparison.trend === "down"
                              ? "text-[var(--color-danger)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {item.comparison.trend === "up"
                            ? "▲"
                            : item.comparison.trend === "down"
                            ? "▼"
                            : "→"}{" "}
                          {Math.abs(item.comparison.changePercent).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Summary row - shows total of ALL data, not just current page */}
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--color-elevated)] border-t-2 border-[var(--color-border)] font-bold">
                <td className="px-3 py-3 text-white">TỔNG CỘNG</td>
                <td className="px-3 py-3 text-right text-[var(--color-success)]">
                  {data
                    .reduce((acc, d) => acc + d.xe.ha + d.xalan.ha, 0)
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-[var(--color-danger)]">
                  {data
                    .reduce((acc, d) => acc + d.xe.giao + d.xalan.giao, 0)
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-cyan-400">
                  {data
                    .reduce(
                      (acc, d) =>
                        acc + (d.cfs?.full || d.xe.fullCfs + d.xalan.fullCfs),
                      0
                    )
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-amber-400">
                  {data
                    .reduce((acc, d) => acc + d.xe.total, 0)
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-purple-400">
                  {data
                    .reduce((acc, d) => acc + d.xalan.total, 0)
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-white">
                  {data
                    .reduce((acc, d) => acc + d.xe.total + d.xalan.total, 0)
                    .toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-3 text-right text-[var(--color-text-muted)]">-</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer with Pagination */}
      {data.length > 0 && (
        <div className="px-4 py-3 bg-[var(--color-elevated)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Trang {currentPage}/{totalPages} | Tổng {data.length} dòng
          </span>

          {/* Pagination buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded bg-[var(--color-elevated)] text-white text-sm
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         hover:bg-[var(--color-elevated)] transition-colors"
              >
                ‹
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
                                              ${
                                                currentPage === page
                                                  ? "bg-[var(--color-accent)] text-white"
                                                  : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
                                              }`}
                  >
                    {page}
                  </button>
                )
              )}

              {/* Next button */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded bg-[var(--color-elevated)] text-white text-sm
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         hover:bg-[var(--color-elevated)] transition-colors"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
