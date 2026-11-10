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
│      ├── modules/  : Mỗi tính năng 1 thư mục (routes, service, hooks, jobs) │
│      │               mount tại /api/v1/<module>, bảo vệ bằng rbac.Require  │
│      ├── platform/ : Hạ tầng dùng chung (module contract, httpx envelope)   │
│      └── app/      : Wiring — danh sách module, RBAC sync, dev seed         │
│  - migrations/: Toàn bộ schema + API rules của collection                  │
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

- **Module Name:** `cuongpham2107/pocketbase-custom` (Go 1.27+)
- **Framework:** PocketBase (`ganigeorgiev.com/pocketbase/pocketbase v0.41.1`)
- **Database:** SQLite (embedded via modernc.org/sqlite), lưu trữ tại `./pb_data/`.

---

## 2. Cấu trúc Thư mục (Directory Structure)

```
pocket-base/
├── main.go                     # Entrypoint: pocketbase.New + migratecmd + app.Register
├── internal/
│   ├── app/app.go              # Danh sách module (thêm module = thêm 1 dòng), RBAC sync, dev seed, SPA /admin
│   ├── platform/
│   │   ├── module/             # Contract Module{Name, Label, Permissions, Init, Routes}
│   │   └── httpx/              # Envelope OK/Fail/Paged, ParsePage
│   ├── modules/
│   │   ├── rbac/               # Roles, permissions, rbac.Require/Can, UserDTO dùng chung, Sync catalog
│   │   ├── auth/               # login, register, refresh, logout(-all), me, theme, password
│   │   ├── users/              # Quản trị người dùng
│   │   ├── notifications/      # Thông báo theo user + broadcast
│   │   ├── audit/              # Audit trail đọc từ request logs của PocketBase
│   │   ├── media/              # Quyền media + stub endpoints
│   │   └── orders/             # MODULE MẪU — copy thư mục này khi tạo tính năng mới
│   └── dev/seed.go             # Tài khoản demo, chỉ chạy khi --dev
├── frontend-admin/             # React 19 + Tailwind v4 + shadcn UI + Radix UI + i18n
│   ├── src/
│   │   ├── features/           # auth, rbac, users, theme, dashboard, audit, notifications, media
│   │   ├── components/layout/  # AppSidebar, PageShell, PageHeader, PageCard
│   │   ├── components/ui/      # shadcn UI components (Radix primitives)
│   │   ├── locales/            # Đa ngôn ngữ (vi, en)
│   │   └── lib/                # api.ts (cổng gọi API), session.ts, permissions.ts, modules.ts
│   ├── vite.config.ts          # Build ra pb_public/admin/ với base "/admin/"
│   └── package.json
├── pb_public/                  # Static frontend files served bởi PocketBase
│   └── admin/                  # Business Admin Portal đã build (truy cập tại http://127.0.0.1:8090/admin/)
├── pb_data/                    # SQLite database files (ignored in git and air)
├── migrations/                 # Go migrations: schema + API rules (Studio tự sinh file mới khi chạy --dev)
├── .codegraph/                 # CodeGraph knowledge graph index
├── .air.toml                   # Live hot-reload config cho Go backend
├── Makefile                    # Điều khiển toàn bộ dự án (make dev, make run, make build...)
└── go.mod / go.sum             # Go module dependencies
```

---

## 3. Lệnh Phát Triển Chính (Key Commands)


Dự án sử dụng **`Makefile`** để điều khiển toàn bộ quy trình phát triển và build:

### Điều khiển qua Makefile (Khuyên Dùng)

```bash
# Xem danh sách tất cả các lệnh hỗ trợ
make help

# Chạy song song cả Go Backend (hot-reload) và Frontend React (Vite HMR)
make dev

# Build frontend rồi chạy PocketBase nguyên khối tích hợp tại cổng 8090
make run    # hoặc make serve

# Build toàn bộ project (React Frontend + Go Backend binary)
make build

# Cài đặt dependencies cho cả Go và Frontend
make install

# Dọn dẹp thư mục tạm tmp/
make clean

# Đồng bộ CodeGraph index
make sync
```

### Chạy Thủ Công Từng Phần (Nếu Cần)

#### Backend (Go)

```bash
# Khởi động server hot-reload với Air
air

# Chạy server thủ công
go run . serve --dev --dir=./pb_data

# Biên dịch binary
go build -o tmp/main .
```


#### Frontend Admin (React + Vite + Tailwind)

```bash
cd frontend-admin

# Dev server cổng 5173
npm run dev

# Build ra pb_public/admin/
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

_(Không còn phải lo lắng về việc merge code hay xung đột giao diện, vì trang `/_/` dùng 100% bản gốc của PocketBase!)_

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
5. **Thêm tính năng = thêm module:** copy `internal/modules/orders/`, đổi tên, khai báo `Permissions` và `Routes`, rồi thêm `<pkg>.Module` vào `features` trong [internal/app/app.go](internal/app/app.go). Quyền khai báo trong module được tự đồng bộ vào DB khi khởi động (role `admin` luôn có đủ quyền).
6. **Mọi route phải có quyền:** group bind `apis.RequireAuth()`, từng route bind `rbac.Require(PermXxx)`. Route thiếu `rbac.Require` là lỗi review.
   ```go
   g := api.Group("/orders").Bind(apis.RequireAuth())
   g.POST("/{id}/confirm", h.confirm).Bind(rbac.Require(PermConfirm))
   ```
7. **Phân lớp trong module:** `handler.go` chỉ lo HTTP (bind → service → `httpx`), `service.go` chứa nghiệp vụ và transaction, không import gì về HTTP. Test service bằng `tests.NewTestApp()` + blank import `migrations`.
8. **Phụ thuộc:** `modules → platform`. Module không import lẫn nhau, ngoại lệ duy nhất là `rbac`.
9. **Schema chỉ nằm trong `migrations/`:** collection, field, index, API rules. Không tạo collection trong hook lúc boot. Rule ghi mặc định `nil` (chỉ superuser) — nghiệp vụ ghi qua `/api/v1`.
10. **Dữ liệu demo** chỉ ở `internal/dev/seed.go` (chạy khi `--dev`), không bao giờ ghi đè record đã có.

### Frontend Rules

1. **PocketBase Studio (`/_/`):** Để nguyên bản gốc bằng tiếng Anh cho lập trình viên quản trị schema, collection, file storage.
2. **Business Admin Portal (`/admin/`):** Tự do thiết kế giao diện theo yêu cầu doanh nghiệp, tích hợp nút Custom Action và hệ thống đa ngôn ngữ (i18n).

### File Watchers & Git Exclusions

Tuyệt đối **KHÔNG** theo dõi hay commit lên git:

- `tmp/`
- `pb_data/`
- `.codegraph/`
- `node_modules/`
