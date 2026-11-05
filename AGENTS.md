# AGENTS.md — PocketBase Custom Project Guide

Tài liệu này cung cấp toàn bộ bối cảnh kiến trúc, cấu trúc thư mục, quy tắc code và các lệnh phát triển cho AI coding assistants làm việc trong repository này.

---

## 1. Triết lý Thiết kế & Kiến trúc Dự án (Architecture Overview)

Dự án này sử dụng mô hình **BaaS + Dedicated Business Portal** thay vì can thiệp vào giao diện PocketBase gốc:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. DATABASE & DEV STUDIO (Gốc)                        │
│  - Đường dẫn: http://127.0.0.1:8090/_/                                      │
│  - Đối tượng: LẬP TRÌNH VIÊN (Developer / Superuser)                        │
│  - Vai trò: Giữ nguyên 100% gốc của PocketBase.                             │
│             Dùng để tạo bảng, sửa schema, cấu hình S3/Mail, xem log hệ thống.│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. BACKEND API & BUSINESS LOGIC (Go)                     │
│  - PocketBase Core: Tự động sinh CRUD REST APIs, File Storage, Auth, SSE.   │
│  - Go Extension (internal/):                                                │
│      ├── routes/   : Custom Endpoints cho các luồng nghiệp vụ phức tạp      │
│      │               (VD: POST /api/custom/orders/create)                   │
│      ├── services/ : Nghiệp vụ kiểm tra tồn kho, tính giá, transactions... │
│      ├── hooks/    : Can thiệp vòng đời dữ liệu (OnRecordCreate, etc.)      │
│      └── jobs/     : Tác vụ chạy ngầm định kỳ (Cron jobs)                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API / SDK (JSON)
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│       3A. BUSINESS ADMIN PORTAL      │  │        3B. CLIENT APP / WEB       │
│  - Đường dẫn: http://127.0.0.1:8090/admin │  - Đường dẫn: http://127.0.0.1:8090/    │
│  - Đối tượng: Nhân viên, Quản trị SP │  │  - Đối tượng: Khách hàng mua hàng │
│  - Đa ngôn ngữ (i18n), Custom Actions│  │  - Xem sản phẩm, đặt hàng, giỏ    │
│    (Duyệt đơn, in hóa đơn, thống kê) │  │    hàng, hồ sơ cá nhân...         │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

* **Module Name:** `cuongpham2107/pocketbase-custom` (Go 1.27+)
* **Framework:** PocketBase (`ganigeorgiev.com/pocketbase/pocketbase v0.41.1`)
* **Database:** SQLite (embedded via modernc.org/sqlite), lưu trữ tại `./pb_data/`.

---

## 2. Cấu trúc Thư mục (Directory Structure)

```
pocket-base/
├── main.go                     # Entrypoint: Khởi tạo PocketBase, hooks, jobs, và routes
├── internal/
│   ├── routes/                 # Custom HTTP REST endpoints (internal/routes/routes.go)
│   ├── services/               # Nghiệp vụ xử lý (internal/services/order.go)
│   ├── hooks/                  # Record/Model lifecycle hooks (internal/hooks/hooks.go)
│   ├── jobs/                   # Background Cron jobs (internal/jobs/jobs.go)
│   └── middleware/             # Custom HTTP middlewares
├── frontend-admin/             # React + Vite + Tailwind + shadcn UI source code
│   ├── src/
│   │   ├── pages/              # Login (/login), Register (/register), Dashboard (/ & /dashboard)
│   │   ├── components/ui/      # shadcn UI components (Button, Input, Card, Badge, Label)
│   │   └── lib/                # pocketbase client singleton & helpers
│   ├── vite.config.ts          # Build ra pb_public/admin/ với base "/admin/"
│   └── package.json
├── pb_public/                  # Static frontend files served bởi PocketBase
│   └── admin/                  # Business Admin Portal đã build (truy cập tại http://127.0.0.1:8090/admin/)
├── pb_data/                    # SQLite database files (ignored in git and air)
├── migrations/                 # File-based Go migrations
├── .codegraph/                 # CodeGraph knowledge graph index
├── .air.toml                   # Live hot-reload config cho Go backend
└── go.mod / go.sum             # Go module dependencies
```

---

## 3. Lệnh Phát Triển Chính (Key Commands)

### Backend (Go)
```bash
# Khởi động server hot-reload (khuyên dùng khi phát triển)
air

# Chạy server thủ công
go run . serve --dev --dir=./pb_data

# Biên dịch binary sản phẩm
go build -o tmp/main .

# Đồng bộ & dọn dẹp Go dependencies
go mod tidy
```

### Frontend Admin (React + Vite + Tailwind)
```bash
# Di chuyển vào thư mục frontend
cd frontend-admin

# Chạy dev server với hot-reload (cổng 5173, proxy API sang 8090)
npm run dev

# Build production trực tiếp vào pb_public/admin/
npm run build
```

### Code Intelligence (CodeGraph)
```bash
# Đồng bộ CodeGraph index sau khi sửa code
codegraph sync

# Tra cứu cấu trúc code và luồng gọi hàm
codegraph explore "<symbol or query>"
```

### Nâng cấp PocketBase Upstream
```bash
# Cập nhật thư viện Go lên bản mới nhất
go get ganigeorgiev.com/pocketbase/pocketbase@latest
go mod tidy
```
*(Không còn phải lo lắng về việc merge code hay xung đột giao diện, vì trang `/_/` dùng 100% bản gốc của PocketBase!)*

---

## 4. Quy tắc Thiết kế & Lập trình (Coding Guidelines)

### Backend Rules
1. **Module Import Paths:** Luôn dùng `cuongpham2107/pocketbase-custom/...` (không dùng relative parent paths hoặc tên cũ).
2. **PocketBase Import:** Dùng `ganigeorgiev.com/pocketbase/pocketbase` và `ganigeorgiev.com/pocketbase/pocketbase/core`.
3. **Data Safety & Persistence:** Luôn chạy với cờ `--dir=./pb_data` để dữ liệu SQLite nằm cố định ở `./pb_data/` (không để trong `tmp/`).
4. **Transactions:** Khi thực hiện nhiều thao tác ghi dữ liệu liên quan (như kiểm tra tồn kho, trừ kho và tạo đơn hàng), **bắt buộc** phải bọc trong transaction:
   ```go
   err := app.RunInTransaction(func(txApp core.App) error {
       // Thao tác với txApp thay vì app
       return txApp.Save(record)
   })
   ```
5. **Custom Actions / Endpoints:** Đăng ký các endpoints nghiệp vụ bên dưới group `/api/custom` trong [internal/routes/routes.go](file:///Users/cuongpham/go/pocket-base/internal/routes/routes.go), và bọc middleware xác thực:
   ```go
   g := se.Router.Group("/api/custom")
   g.Bind(apis.RequireAuth())
   ```

### Frontend Rules
1. **PocketBase Studio (`/_/`):** Để nguyên bản gốc bằng tiếng Anh cho lập trình viên quản trị schema, collection, file storage.
2. **Business Admin Portal (`/admin/`):** Tự do thiết kế giao diện theo yêu cầu doanh nghiệp, tích hợp nút Custom Action và hệ thống đa ngôn ngữ (i18n).

### File Watchers & Git Exclusions
Tuyệt đối **KHÔNG** theo dõi hay commit lên git:
* `tmp/`
* `pb_data/`
* `.codegraph/`
* `node_modules/`
