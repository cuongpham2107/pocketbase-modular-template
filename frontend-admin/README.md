# Frontend Dashboard — React 19 + Tailwind v4 + shadcn/ui

Giao diện quản trị Admin Panel hiện đại được xây dựng trên nền tảng **React 19**, **Vite**, **Tailwind CSS v4** và **shadcn/ui**, kết nối trực tiếp với backend Go qua chuẩn RESTful API và Model Resource Architecture.

---

## 🎨 Điểm Nổi Bật Về Giao Diện & Tính Năng

### 1. Màn hình Đăng Nhập Chia Đôi (shadcn `login-02`)
- **Split Screen Layout**: Cột trái hiển thị biểu mẫu đăng nhập kèm logo thương hiệu, nút chuyển Theme Studio nhanh và các nút chọn tài khoản mẫu tiện lợi (`Admin` / `User`).
- **Cover Column**: Cột phải hiển thị đồ họa kiến trúc Hexagonal, các khối thẻ giới thiệu tính năng (Phân Quyền Động, Media Library, AI MCP Protocol, Theme Studio) và đo lường độ trễ mạng cực thấp.

### 2. Quản Trị Phân Quyền Theo Model (Dynamic RBAC)
- **Model Resource CRUD Architecture**: Tự động hiển thị và quản lý quyền hạn theo từng Model (`users`, `media_folders`, `roles`, `files`...).
- **Multi-User Assignment**: Gán nhiều người dùng vào vai trò cùng lúc bằng popup chọn lọc và tìm kiếm theo thời gian thực.
- **Fail-Fast Sync**: Mọi thay đổi quyền được xác thực với Go Code Catalog tại thời điểm khởi động.

### 3. Quản Trị Đa Phương Tiện & Thư Mục Cây (Media Library)
- Cây thư mục lồng nhau không giới hạn độ sâu.
- Tạo, đổi tên, di chuyển tệp tin giữa các thư mục bằng thao tác trực quan.
- Hỗ trợ tải lên đa tệp, bộ lọc nhanh theo loại tệp (ảnh, tài liệu, media...).

### 4. Theme Studio — Bộ Tùy Biến Giao Diện Trực Quan
- **4 Presets Thiết Kế**: Modern, Precision, Velvet, Obsidian.
- **8 Bảng Màu Chủ Đạo**: Amber, Blue, Forest, Citrus, Violet, Rose, Teal, Zinc.
- **Tùy biến chi tiết**: 6 cấp độ bo góc (Border Radius), 6 họ phông chữ (Inter, Outfit, Plus Jakarta Sans, Figtree, Geist, JetBrains Mono), độ rộng nội dung, độ rộng thanh bên và mật độ hiển thị (Density).
- **Lưu trữ vĩnh viễn theo User**: Tự động đồng bộ cài đặt giao diện về cơ sở dữ liệu qua `PUT /api/v1/auth/settings/theme`.


### 5. Quản Lý Người Dùng (User Management DataTable)
- **shadcn DataTable**: Hiển thị danh sách tài khoản dạng bảng chuẩn, tìm kiếm theo thời gian thực (họ tên, email), bộ lọc theo vai trò (Admin / User).
- **Phân trang linh hoạt**: Tùy chọn số lượng bản ghi hiển thị (5, 10, 20, 50), điều hướng trước/sau và tổng số tài khoản.
- **Quản trị toàn diện**: Modal thêm tài khoản mới, sửa thông tin / đổi mật khẩu và hộp thoại xác nhận xóa tài khoản an toàn.

### 6. Thao Tác Chuột Phải Đa Năng (Context Menu)
- **Thư mục & Tệp tin**: Chuột phải vào bất kỳ thư mục hay tệp tin nào để xem chi tiết, sao chép link, đổi tên, sao chép (Copy ⌘C), cắt (Cut / Move ⌘X), di chuyển thư mục hoặc xóa.
- **Vùng trống Canvas**: Chuột phải vào vùng trống để tạo thư mục mới, tải tệp lên, dán tệp từ bộ nhớ đệm, chuyển đổi chế độ xem (Lưới thẻ / Bảng danh sách) hoặc làm mới dữ liệu.
---

## 🚀 Lệnh Phát Triển & Kiểm Thử

```bash
# Cài đặt dependencies
npm install

# Chạy máy chủ phát triển cục bộ (Local Dev)
npm run dev

# Kiểm thử E2E tự động (tester-army / Playwright)
npm run test:e2e

# Biên dịch gói sản phẩm (Production Bundle)
npm run build
```
