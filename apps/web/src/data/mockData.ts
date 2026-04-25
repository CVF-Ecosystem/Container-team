// Mock data for development - will be replaced by SharePoint data

import { NhanVien, HangMucCongViec, ViTriCongViec } from '@/types';

export const mockNhanVien: NhanVien[] = [
    // Ban Chỉ Huy
    { Ma_NV: '1345', Ho_Ten: 'Nguyễn Minh Tiền', Bo_Phan: 'Ban Chỉ Huy', Nhom: 'Lãnh đạo', Active: true },

    // Điều hành - Nhóm 1
    { Ma_NV: '0968', Ho_Ten: 'Lê Thành Hiếu', Bo_Phan: 'Điều hành', Nhom: 'Nhóm 1', Active: true },
    { Ma_NV: '3214', Ho_Ten: 'Nguyễn Văn Phúc', Bo_Phan: 'Điều hành', Nhom: 'Nhóm 1', Active: true },
    { Ma_NV: '1358', Ho_Ten: 'Nguyễn Hoàng Anh Tuấn', Bo_Phan: 'Điều hành', Nhom: 'Nhóm 1', Active: true },

    // Điều hành - Nhóm 2
    { Ma_NV: '2001', Ho_Ten: 'Trần Văn Hùng', Bo_Phan: 'Điều hành', Nhom: 'Nhóm 2', Active: true },
    { Ma_NV: '2002', Ho_Ten: 'Phạm Thị Mai', Bo_Phan: 'Điều hành', Nhom: 'Nhóm 2', Active: true },

    // Thủ tục - Nhóm A (đi ca như Điều hành)
    { Ma_NV: '1728', Ho_Ten: 'Vũ Thị Thanh Thúy', Bo_Phan: 'Thủ tục', Nhom: 'Nhóm A', Active: true },
    { Ma_NV: '1729', Ho_Ten: 'Đặng Văn Nam', Bo_Phan: 'Thủ tục', Nhom: 'Nhóm A', Active: true },
    { Ma_NV: '1731', Ho_Ten: 'Trần Thị Hà', Bo_Phan: 'Thủ tục', Nhom: 'Nhóm A', Active: true },

    // Thủ tục - Nhóm B
    { Ma_NV: '1730', Ho_Ten: 'Lý Thị Hoa', Bo_Phan: 'Thủ tục', Nhom: 'Nhóm B', Active: true },
    { Ma_NV: '1732', Ho_Ten: 'Nguyễn Văn Linh', Bo_Phan: 'Thủ tục', Nhom: 'Nhóm B', Active: true },

    // Bãi cont - Ca A
    { Ma_NV: '1575', Ho_Ten: 'Giáp Hoàng Duy', Bo_Phan: 'Bãi cont', Nhom: 'Ca A', Active: true },
    { Ma_NV: '1576', Ho_Ten: 'Nguyễn Văn Toàn', Bo_Phan: 'Bãi cont', Nhom: 'Ca A', Active: true },

    // Bãi cont - Ca B
    { Ma_NV: '1577', Ho_Ten: 'Trần Minh Đức', Bo_Phan: 'Bãi cont', Nhom: 'Ca B', Active: true },

    // Tổng hợp - Giờ hành chánh
    { Ma_NV: '3001', Ho_Ten: 'Lê Thị Lan', Bo_Phan: 'Tổng hợp', Nhom: 'Hành chính', Active: true },
    { Ma_NV: '3002', Ho_Ten: 'Phạm Văn Minh', Bo_Phan: 'Tổng hợp', Nhom: 'Hành chính', Active: true },
];

export const mockHangMucCongViec: HangMucCongViec[] = [
    // Bãi cont - Báo cáo cuối ca
    { id: 'bc1', TenHangMuc: 'Cont vào', BoPhan: 'Bãi cont', LoaiNhapLieu: 'Number', ThuTu: 1, Active: true },
    { id: 'bc2', TenHangMuc: 'Cont ra', BoPhan: 'Bãi cont', LoaiNhapLieu: 'Number', ThuTu: 2, Active: true },
    { id: 'bc3', TenHangMuc: 'Cont tồn', BoPhan: 'Bãi cont', LoaiNhapLieu: 'Number', ThuTu: 3, Active: true },
    { id: 'bc4', TenHangMuc: 'Cont chuyển vị trí', BoPhan: 'Bãi cont', LoaiNhapLieu: 'Number', ThuTu: 4, Active: true },
    { id: 'bc5', TenHangMuc: 'Cont sự cố', BoPhan: 'Bãi cont', LoaiNhapLieu: 'Number', ThuTu: 5, Active: true },

    // Điều hành - Báo cáo cuối ca
    { id: 'dh1', TenHangMuc: 'Số xe vào cổng', BoPhan: 'Điều hành', LoaiNhapLieu: 'Number', ThuTu: 1, Active: true },
    { id: 'dh2', TenHangMuc: 'Số xe ra cổng', BoPhan: 'Điều hành', LoaiNhapLieu: 'Number', ThuTu: 2, Active: true },
    { id: 'dh3', TenHangMuc: 'Tình hình trong ca', BoPhan: 'Điều hành', LoaiNhapLieu: 'Text', ThuTu: 3, Active: true },
    { id: 'dh4', TenHangMuc: 'Sự cố phát sinh', BoPhan: 'Điều hành', LoaiNhapLieu: 'Text', ThuTu: 4, Active: true },

    // Thủ tục - Báo cáo cuối ca (mở rộng)
    { id: 'tt1', TenHangMuc: 'Đóng hàng', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Number', ThuTu: 1, Active: true },
    { id: 'tt2', TenHangMuc: 'Rút hàng', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Number', ThuTu: 2, Active: true },
    { id: 'tt3', TenHangMuc: 'Dịch vụ cont', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Number', ThuTu: 3, Active: true },
    { id: 'tt4', TenHangMuc: 'Chứng từ xử lý', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Number', ThuTu: 4, Active: true },
    { id: 'tt5', TenHangMuc: 'Thủ tục VSL', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Number', ThuTu: 5, Active: true },
    { id: 'tt6', TenHangMuc: 'Ghi chú trong ca', BoPhan: 'Thủ tục', LoaiNhapLieu: 'Text', ThuTu: 6, Active: true },

    // Tổng hợp - Báo cáo hành chánh (số liệu cần thiết)
    { id: 'th1', TenHangMuc: 'Tổng cont trong ngày', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 1, Active: true },
    { id: 'th2', TenHangMuc: 'Cont xuất', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 2, Active: true },
    { id: 'th3', TenHangMuc: 'Cont nhập', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 3, Active: true },
    { id: 'th4', TenHangMuc: 'Cont tồn bãi', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 4, Active: true },
    { id: 'th5', TenHangMuc: 'Số xe trong ngày', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 5, Active: true },
    { id: 'th6', TenHangMuc: 'Đóng/Rút hàng', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 6, Active: true },
    { id: 'th7', TenHangMuc: 'Dịch vụ', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 7, Active: true },
    { id: 'th8', TenHangMuc: 'Lũy tiến tháng', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Number', ThuTu: 8, Active: true },
    { id: 'th9', TenHangMuc: 'Báo cáo tổng hợp', BoPhan: 'Tổng hợp', LoaiNhapLieu: 'Text', ThuTu: 9, Active: true },
];

// Vị trí công việc cho báo cáo nhân sự đầu ca
export const mockViTriCongViec: ViTriCongViec[] = [
    // ======= BÃI CONT - Phân công từng vị trí =======
    { id: 'vt_bc1', TenViTri: 'Phụ trách chung', BoPhan: 'Bãi cont', ThuTu: 1, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc2', TenViTri: 'Hàng rỗng', BoPhan: 'Bãi cont', ThuTu: 2, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc3', TenViTri: 'Hàng nhập', BoPhan: 'Bãi cont', ThuTu: 3, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc4', TenViTri: 'Cổng', BoPhan: 'Bãi cont', ThuTu: 4, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc5', TenViTri: 'Gate', BoPhan: 'Bãi cont', ThuTu: 5, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_bc6', TenViTri: 'Tally BDST', BoPhan: 'Bãi cont', ThuTu: 6, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc7', TenViTri: 'Xuất bãi', BoPhan: 'Bãi cont', ThuTu: 7, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc8', TenViTri: 'Checkpoint/CFS', BoPhan: 'Bãi cont', ThuTu: 8, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_bc9', TenViTri: 'Bù', BoPhan: 'Bãi cont', ThuTu: 9, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_bc10', TenViTri: 'Nghỉ phép', BoPhan: 'Bãi cont', ThuTu: 10, Active: true, ChoPhepNhieuNguoi: true },

    // ======= ĐIỀU HÀNH - Cho phép nhiều người =======
    { id: 'vt_dh1', TenViTri: 'ĐH (Điều hành)', BoPhan: 'Điều hành', ThuTu: 1, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_dh2', TenViTri: 'TT (Thủ tục)', BoPhan: 'Điều hành', ThuTu: 2, Active: true, ChoPhepNhieuNguoi: true },

    // ======= THỦ TỤC - Đi ca như Điều hành =======
    { id: 'vt_tt1', TenViTri: 'Thủ tục xuất', BoPhan: 'Thủ tục', ThuTu: 1, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_tt2', TenViTri: 'Thủ tục nhập', BoPhan: 'Thủ tục', ThuTu: 2, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_tt3', TenViTri: 'VSL (Vessel)', BoPhan: 'Thủ tục', ThuTu: 3, Active: true, ChoPhepNhieuNguoi: true },
    { id: 'vt_tt4', TenViTri: 'Dịch vụ', BoPhan: 'Thủ tục', ThuTu: 4, Active: true, ChoPhepNhieuNguoi: true },

    // ======= TỔNG HỢP - Giờ hành chánh =======
    { id: 'vt_th1', TenViTri: 'Tổng hợp số liệu', BoPhan: 'Tổng hợp', ThuTu: 1, Active: true, ChoPhepNhieuNguoi: false },
    { id: 'vt_th2', TenViTri: 'Báo cáo lãnh đạo', BoPhan: 'Tổng hợp', ThuTu: 2, Active: true, ChoPhepNhieuNguoi: false },
];
