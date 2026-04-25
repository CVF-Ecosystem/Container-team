# PWA Báo Cáo Cuối Ca - Cảng Tân Thuận

Ứng dụng báo cáo công việc và quản lý biến động Container hàng ngày cho Đội Container - Cảng Tân Thuận.

## 🌟 Tính Năng Nổi Bật

### 1. Báo Cáo & Điều Hành (Daily Operations)
- **📋 Báo cáo Đầu Ca (`/start-shift`)**:
  - Phân công nhân sự theo từng vị trí (Điều hành, Bãi cont, Thủ tục...).
  - **Smart Filtering**: Chỉ hiển thị nhân viên thuộc ca làm việc đã chọn.
  - Tự động nhận diện Tàu đang làm hàng để phân công Tally.
- **📝 Báo cáo Cuối Ca (`/end-shift`)**:
  - Báo cáo số liệu thực tế (Sản lượng, Container nhập/xuất/tồn).
  - **Form Động**: Giao diện nhập liệu tự động thay đổi theo từng bộ phận (Tổng hợp, Thủ tục...).
  - Ưu tiên hiển thị Trưởng ca/Phó ca để chọn nhanh người báo cáo.
- **📦 Theo dõi Tồn Bãi (`/inventory`)**:
  - Quản lý dữ liệu tàu (Nhập/Xuất/Shift).
  - Tính toán tồn bãi theo thời gian thực (Tồn = Tồn đầu + Nhập - Xuất).
  - Cảnh báo sức chứa bãi (Alert >80%, >90%).

### 2. Dashboard Thông Minh (`/dashboard`)
- **Truy cập nhanh (Shortcuts)**: Nút thao tác nhanh cho Đầu ca, Cuối ca, Tồn bãi ngay trên màn hình chính.
- **Biểu đồ trực quan**:
  - Biến động Container theo Ngày/Tháng.
  - Cơ cấu Container (Xe/Salan).
  - Biểu đồ Lũy tiến.
- **Báo cáo in ấn**: Chế độ in báo cáo dạng A4 chuyên nghiệp.

### 3. Báo Cáo Tàu & Analytics (`/ship-report`)
- **Quản lý dữ liệu tàu**: Nhập liệu hoặc Import Excel danh sách tàu, sản lượng, thời gian làm hàng.
- **Phân tích hiệu quả**:
  - Tự động tính năng suất (Moves/h, TEUs/h).
  - Tự động tính thời gian làm hàng, nằm cầu.
- **Analytics View**:
  - **Productivity Chart**: So sánh năng suất khai thác giữa các tàu (Moves/h).
  - **Volume Chart**: Biểu đồ sản lượng Nhập/Xuất/Shift.
  - **Line Share**: Thị phần các hãng tàu (% TEUs).

### 4. Mô Hình 3D (Digital Twin)
- **Truy cập**: Nút bấm **🧊 Mô Hình 3D** trên Dashboard.
- **Tính năng**: Xem mô hình 3D thời gian thực của Cảng Tân Thuận, trực quan hóa vị trí bãi và hoạt động.

### 5. Quản Trị Hệ Thống (`/admin`)
- **👥 Quản lý Nhân sự**:
  - Danh sách nhân viên toàn đội.
  - **Import Excel**: Nhập danh sách nhân viên hàng loạt từ file Excel.
  - Phân loại theo Bộ phận, Ca làm việc, Chức vụ.
- **🚢 Quản lý Tàu**:
  - Danh sách tàu hoạt động.
  - Import/Export dữ liệu tàu từ Excel.
- **💾 Dữ liệu & Backup**:
  - Sao lưu (Backup) toàn bộ dữ liệu ra file JSON/Excel.
  - Phục hồi (Restore) dữ liệu khi cần thiết.
  - Quản lý dữ liệu biến động ngày/tháng.

---

## 🛠️ Yêu Cầu Hệ Thống

- **Node.js**: v18 trở lên ([Download](https://nodejs.org/))
- **Trình duyệt**: Chrome, Edge, Safari (Khuyên dùng Chrome để có trải nghiệm PWA tốt nhất).

---

## 🚀 Cài Đặt & Chạy

### Bước 1: Cài đặt dependencies
```bash
cd daily-report-pwa
npm install
```

### Bước 2: Chạy ứng dụng
```bash
npm run dev
```

### Bước 3: Truy cập
Mở trình duyệt và truy cập: **http://localhost:3000**

> 💡 **Tip**: Trên Chrome/Edge, bạn có thể cài đặt ứng dụng như một App trên máy tính bằng cách nhấn vào biểu tượng **Customize and control** (3 chấm) -> **App** -> **Install Daily Report PWA**.

---

## 📖 Hướng Dẫn Sử Dụng (Workflow)

### 1. Quy Trình Đầu Ca
1. Truy cập **Dashboard** -> Nhấn **📋 Đầu Ca**.
2. Chọn **Ngày** và **Ca làm việc** (Ví dụ: Ca 01).
3. Tab **Tổng hợp / Thủ tục / Bãi cont / Điều hành**: Chọn nhân viên cho từng vị trí.
   - *Lưu ý*: Hệ thống chỉ hiện nhân viên thuộc Ca 01 để chọn nhanh.
4. Tab **Tally Tàu**: Chọn tàu và nhân viên Tally (nếu có tàu làm hàng).
5. Nhấn **Lưu Báo Cáo**.

### 5. Báo Cáo Tàu & Analytics
1. Truy cập **Ship Report** (Nút màu xanh Cyan).
2. **Thêm mới**: Nhập thủ công hoặc **Import Excel** (theo template mẫu).
3. **Xem báo cáo**:
   - Dạng bảng: Xem chi tiết số liệu, lọc theo tháng/hãng.
   - Dạng biểu đồ (Analytics): Xem năng suất, sản lượng, thị phần.
4. **Bulk Delete**: Chọn nhiều dòng -> Xóa hàng loạt.

### 2. Cập Nhật Tồn Bãi (Giữa/Cuối Ca)
1. Truy cập **Dashboard** -> Nhấn **📦 Tồn Bãi**.
2. Kiểm tra thông tin "Tồn đầu kỳ".
3. Nhập số liệu **Nhập Tàu / Xuất Tàu** trong ca.
4. Hệ thống tự động tính toán **Tồn Cuối Kỳ** và % Công suất sử dụng.

### 3. Quy Trình Cuối Ca
1. Truy cập **Dashboard** -> Nhấn **📝 Cuối Ca**.
2. Chọn **Bộ phận** của bạn (VD: Điều hành).
3. Chọn **Người lập báo cáo** (Ưu tiên chọn Trưởng ca/Phó ca).
4. Nhập các hạng mục công việc (Số xe, Sự cố, Ghi chú...).
5. Nhấn **Lưu Báo Cáo**.

### 6. Quản Lý Admin (Dành cho Lãnh đạo/Thư ký)
- **Import Nhân sự**:
  - Vào **Admin** -> **Nhân sự**.
  - Tải file mẫu -> Điền danh sách -> Upload lên hệ thống.
  - Kiểm tra cảnh báo (trùng mã NV, thiếu dữ liệu).
- **Import Dữ liệu Tàu**:
  - Vào **Inventory** hoặc **Admin**.
  - Upload file Excel danh sách tàu (theo mẫu STT, Tên tàu, ATB, ATD...).

---

## 📁 Cấu Trúc File Excel Import

### 1. Nhân viên (`Template_NhanVien.xlsx`)
| Cột | Tên cột | Mô tả |
|-----|---------|-------|
| A | STT | Số thứ tự |
| B | Ma_NV | Mã nhân viên (Bắt buộc, Duy nhất) |
| C | Ho_Ten | Họ và tên đầy đủ |
| D | Bo_Phan | Tổng hợp / Thủ tục / Bãi cont / Điều hành |
| E | Chuc_Vu | Chức danh (nếu có) |
| F | Ca | Ca 01 / Ca 02 / Ca 03 / Hành chánh |

### 2. Tàu (`Template_Data_Tau.xlsx`)
| Cột | Ý nghĩa |
|-----|---------|
| STT | Số thứ tự |
| Vessel Name | Tên tàu |
| Inbound | Số lượng nhập |
| Outbound | Số lượng xuất |

---

## 🔐 Tài Khoản Mặc Định
| Username | Password | Quyền |
|----------|----------|-------|
| **admin** | admin123 | Full quyền (Admin) |
| **user** | user123 | Xem và Báo cáo (User) |

---

## 🔄 Sao Lưu & Phục Hồi
Dữ liệu được lưu trực tiếp trên trình duyệt (IndexedDB). Để tránh mất dữ liệu khi xóa cache hoặc cài lại Win:
1. Vào **Admin** -> **Dữ liệu Dashboard** -> **Quản lý Backup**.
2. Nhấn **Export JSON** (Sao lưu toàn bộ) hoặc **Export Excel** (Báo cáo).
3. Copy file backup ra nơi an toàn (Cloud/USB).
