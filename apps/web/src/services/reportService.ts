// Service để lưu và đọc báo cáo từ localStorage
import { BaoCao } from '@/types';

const BAO_CAO_KEY = 'daily_report_bao_cao';

export interface SavedReport extends BaoCao {
  id: string;
}

// Lấy tất cả báo cáo
export function getAllReports(): SavedReport[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(BAO_CAO_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Lưu báo cáo mới
export function saveReport(report: BaoCao): SavedReport {
  const reports = getAllReports();
  const newReport: SavedReport = {
    ...report,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  reports.push(newReport);
  localStorage.setItem(BAO_CAO_KEY, JSON.stringify(reports));
  return newReport;
}

// Xóa báo cáo
export function deleteReport(id: string): void {
  const reports = getAllReports().filter(r => r.id !== id);
  localStorage.setItem(BAO_CAO_KEY, JSON.stringify(reports));
}

// Lấy báo cáo theo ngày
export function getReportsByDate(date: string): SavedReport[] {
  return getAllReports().filter(r => r.Ngay === date);
}

// Lấy báo cáo theo bộ phận
export function getReportsByBoPhan(boPhan: string): SavedReport[] {
  return getAllReports().filter(r => r.BoPhan === boPhan);
}

// Cập nhật báo cáo (patch một phần)
export function updateReport(id: string, patch: Partial<BaoCao>): void {
  const reports = getAllReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx === -1) return;
  reports[idx] = { ...reports[idx], ...patch };
  localStorage.setItem(BAO_CAO_KEY, JSON.stringify(reports));
}

// Thống kê nghỉ phép
export function getLeaveStats() {
  const reports = getAllReports().filter((r) => r.LoaiBaoCao === 'NghiPhep');
  const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  return {
    thisMonth: reports.filter((r) => r.Created.startsWith(thisMonth)).length,
    pending: reports.filter((r) => r.TrangThai === 'Draft').length,
    approved: reports.filter((r) => (r.TrangThai as string) === 'Approved').length,
    rejected: reports.filter((r) => (r.TrangThai as string) === 'Rejected').length,
  };
}

// Throughput theo giờ trong ngày (dùng cho biểu đồ giờ)
export function getThroughputByHour(date: string): { hour: number; teus: number }[] {
  const reports = getReportsByDate(date).filter(r => r.LoaiBaoCao === 'SoLieu');
  const byHour = new Map<number, number>();
  for (const r of reports) {
    const hour = new Date(r.Created).getHours();
    const total = (r.ChiTiet ?? []).reduce((sum, item) => {
      const val = typeof item.GiaTri === 'number' ? item.GiaTri : 0;
      return sum + (item.checked ? val : 0);
    }, 0);
    byHour.set(hour, (byHour.get(hour) ?? 0) + total);
  }
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, teus: byHour.get(h) ?? 0 }));
}

// Thống kê tổng hợp
export function getReportStats() {
  const reports = getAllReports();
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7); // YYYY-MM
  
  return {
    total: reports.length,
    today: reports.filter(r => r.Ngay === today).length,
    thisMonth: reports.filter(r => r.Ngay.startsWith(thisMonth)).length,
    byBoPhan: {
      'Bãi cont': reports.filter(r => r.BoPhan === 'Bãi cont').length,
      'Điều hành': reports.filter(r => r.BoPhan === 'Điều hành').length,
      'Thủ tục': reports.filter(r => r.BoPhan === 'Thủ tục').length,
      'Tổng hợp': reports.filter(r => r.BoPhan === 'Tổng hợp').length,
    },
    byLoai: {
      'NhanSu': reports.filter(r => r.LoaiBaoCao === 'NhanSu').length,
      'SoLieu': reports.filter(r => r.LoaiBaoCao === 'SoLieu').length,
    }
  };
}
