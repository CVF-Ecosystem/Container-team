// Types for Daily Report PWA

export interface NhanVien {
  Ma_NV: string;
  Ho_Ten: string;
  Bo_Phan: 'Bãi cont' | 'Điều hành' | 'Thủ tục' | 'Tổng hợp' | 'Ban Chỉ Huy';
  Nhom: string;
  Active: boolean;
  Email?: string;
}

export interface HangMucCongViec {
  id: string;
  TenHangMuc: string;
  BoPhan: 'Bãi cont' | 'Điều hành' | 'Thủ tục' | 'Tổng hợp';
  LoaiNhapLieu: 'Number' | 'Text' | 'YesNo';
  ThuTu: number;
  Active: boolean;
}

// Vị trí công việc trong ca (cho báo cáo nhân sự đầu ca)
export interface ViTriCongViec {
  id: string;
  TenViTri: string;
  BoPhan: 'Bãi cont' | 'Điều hành' | 'Thủ tục' | 'Tổng hợp';
  ThuTu: number;
  Active: boolean;
  ChoPhepNhieuNguoi: boolean; // Cho phép chọn nhiều người (như Điều hành, Thủ tục)
}

export interface BaoCaoChiTiet {
  HangMucId: string;
  TenHangMuc: string;
  GiaTri: string | number | boolean;
  checked: boolean;
}

// Phân công nhân sự
export interface PhanCongNhanSu {
  ViTriId: string;
  TenViTri: string;
  NhanVienIds: string[]; // Danh sách mã NV được phân công
  NhanVienTen: string[]; // Danh sách tên NV
}

export interface BaoCao {
  id?: string;
  Ngay: string;
  Ca: 'Ca ngày (6:00-18:00)' | 'Ca đêm (18:00-6:00)' | 'Hành chánh (7:30-16:30)';
  LoaiBaoCao: 'NhanSu' | 'SoLieu' | 'NghiPhep'; // Đầu ca, cuối ca, hoặc nghỉ phép
  NguoiLap_MaNV: string;
  NguoiLap_HoTen: string;
  BoPhan: string;
  Nhom: string;
  // Cho báo cáo số liệu (cuối ca)
  ChiTiet?: BaoCaoChiTiet[];
  // Cho báo cáo nhân sự (đầu ca)
  PhanCong?: PhanCongNhanSu[];
  // Cho báo cáo nghỉ phép
  LyDoNghi?: string;
  GhiChu: string;
  TrangThai: 'Draft' | 'Locked';
  Created: string;
  Modified: string;
  SyncStatus: 'pending' | 'synced' | 'error';
}

export type CaLamViec = BaoCao['Ca'];

export const CA_LAM_VIEC: CaLamViec[] = [
  'Ca ngày (6:00-18:00)',
  'Ca đêm (18:00-6:00)',
  'Hành chánh (7:30-16:30)'
];

export const BO_PHAN_LIST = ['Bãi cont', 'Điều hành', 'Thủ tục', 'Tổng hợp', 'Ban Chỉ Huy'] as const;

// Dashboard Types - Biến động Container
export type PeriodType = 'day' | 'week' | 'month' | 'year' | 'cumulative';

export interface ContainerMovement {
  ha: number;        // Hạ
  giao: number;      // Giao
  fullCfs: number;   // Full CFS
  emptyCfs: number;  // Empty CFS
  total: number;     // Tổng
}

export interface DashboardData {
  id: string;
  period: string;           // "2025-09-01", "T09/2025", "2025"
  periodType: PeriodType;
  label: string;            // Display label

  // Tổng biến động
  tongBienDong: number;
  tongCont: number;

  // XE data
  xe: ContainerMovement;

  // XALAN data  
  xalan: ContainerMovement;

  // CFS data
  cfs: {
    full: number;
    empty: number;
  };

  // So sánh với kỳ trước (YoY hoặc MoM)
  comparison?: {
    previousValue: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface DashboardSummary {
  totalIn: number;
  totalOut: number;
  xeTotal: number;
  xalanTotal: number;
  xePercent: number;
  xalanPercent: number;
}
