# AGENTS.md — PocketBase Modular Template: AI & Developer Playbook

Tài liệu này là **cẩm nang phát triển nhanh (Fast-Track Playbook)** dành cho cả **AI Coding Assistants** (Claude Code, Cursor, Antigravity, Copilot...) và **Lập trình viên** khi xây dựng tính năng mới trên dự án này.

---

## 1. Triết lý Thiết kế & Kiến trúc Dự án (Architecture Overview)

Dự án sử dụng mô hình **BaaS + Dedicated Business Portal** thay vì can thiệp vào giao diện PocketBase gốc:

```text
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
│  - PocketBase Core: Embedded SQLite, File Storage, Auth, Hooks, Cron, SSE.  │
│  - Go Extension (internal/):                                                │
│      ├── modules/  : Mỗi tính năng 1 thư mục (routes, service, hooks, jobs) │
│      │               mount tại /api/v1/<module>, bảo vệ bằng rbac.Require  │
│      ├── platform/ : Hạ tầng dùng chung (module contract, httpx envelope)   │
│      └── app/      : Wiring — danh sách module, RBAC sync, CLI, dev seed    │
│  - migrations/: Toàn bộ schema + API rules của collection                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API & WebSocket (/api/v1/*)
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│       3A. BUSINESS ADMIN PORTAL      │  │        3B. CLIENT APP / WEB       │
│  - Đường dẫn: http://127.0.0.1:8090/admin │  - Đường dẫn: http://127.0.0.1:8090/    │
│  - Đối tượng: Nhân viên, Quản trị SP │  │  - Đối tượng: Khách hàng mua hàng │
│  - Đa ngôn ngữ (i18n), Theme Studio, │  │  - Xem sản phẩm, đặt hàng, giỏ    │
│    RBAC Matrix, Responsive Table     │  │    hàng, hồ sơ cá nhân...         │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

- **Go Module Name:** `cuongpham2107/pocketbase-custom`
- **Framework:** PocketBase (`ganigeorgiev.com/pocketbase/pocketbase v0.41.1`)
- **Database:** SQLite (embedded via `modernc.org/sqlite`), lưu trữ tại `./pb_data/`.
- **Frontend Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Radix UI + `react-i18next`.

---

## 2. Cấu trúc Thư mục (Directory Structure)

```text
pocket-base/
├── main.go                     # Entrypoint: pocketbase.New + migratecmd + app.Register
├── Makefile                    # Điều khiển toàn bộ dự án (dev, build, run, docker-*)
├── .docker/                    # Multi-stage Dockerfile, docker-compose.yml, entrypoint.sh
├── migrations/                 # Go migrations: schema + API rules (Studio tự sinh khi chạy --dev)
├── internal/
│   ├── app/app.go              # Danh sách module, RBAC sync, CLI (rbac:sync, user:grant-admin), /ready, /admin SPA
│   ├── dev/seed.go             # Tài khoản demo (admin@example.com / user@example.com), chỉ chạy khi --dev
│   ├── platform/
│   │   ├── module/             # Contract Module{Name, Label, Permissions, Init, Routes}
│   │   └── httpx/              # Envelope chuẩn: OK, Fail, Paged, ParsePage
│   └── modules/
│       ├── rbac/               # Roles, permissions, rbac.Require/Can, UserDTO, Sync catalog
│       ├── auth/               # login, register, refresh, logout(-all), me, theme, password
│       ├── users/              # Quản trị người dùng
│       ├── notifications/      # Thông báo theo user + broadcast + WebSocket hub (/ws) + Cron job
│       ├── audit/              # Audit trail đọc từ request logs của PocketBase
│       ├── media/              # Lưu trữ file qua PocketBase Storage + quản lý cây thư mục đệ quy
│       └── orders/             # MODULE MẪU — copy thư mục này khi tạo tính năng mới
└── frontend-admin/
    └── src/
        ├── components/layout/
        │   ├── page.tsx        # BỘ COMPONENT DÙNG CHUNG (PageShell, ResponsiveDataTable, PageSearchInput...)
        │   ├── AppSidebar.tsx  # Sidebar điều hướng (tự ẩn mục menu theo quyền RBAC & module)
        │   └── CommandMenu.tsx # Command Palette (⌘K / Ctrl+K)
        ├── features/           # Mỗi tính năng 1 thư mục (auth, rbac, users, theme, dashboard, audit, notifications, media)
        ├── locales/            # Đa ngôn ngữ: vi.json, en.json
        └── lib/                # api.ts (HTTP client tự refresh token), permissions.ts, modules.ts
```

---

## 3. Lệnh Phát Triển & Vận Hành (Key Commands)

```bash
# 1. Cài đặt & Chạy môi trường Dev (Go Air hot-reload :8090 + Vite HMR :5173)
make install
make dev

# 2. Build & Chạy bản Production nguyên khối (:8090)
make build
make run

# 3. Chạy Unit / Integration Tests cho toàn bộ Backend
go test -v ./...

# 4. Lệnh CLI quản trị tiện ích
go run . rbac:sync                           # Đồng bộ quyền từ code Go vào SQLite
go run . user:grant-admin admin@example.com  # Cấp quyền admin cho user bất kỳ

# 5. Docker (.docker/)
make docker-up                               # Build & chạy container ngầm tại cổng 8090
make docker-logs                             # Xem log container
make docker-down                             # Tắt container

# 6. Code Intelligence (CodeGraph)
make sync                                    # Đồng bộ CodeGraph index sau khi sửa code
codegraph explore "<symbol or query>"        # Tra cứu luồng gọi hàm trước khi grep/đọc file
```

---

## 4. Playbook 5 Bước: Thêm Tính Năng Mới (Full-Stack trong 5 phút)

Khi được yêu cầu xây dựng một module nghiệp vụ mới (ví dụ: `products`, `invoices`, `customers`...), **LUÔN thực hiện đúng 5 bước tuần tự sau**:

### Bước 1: Tạo Schema Migration (`migrations/`)
Tạo file mới trong `migrations/` (ví dụ `migrations/1776000010_products_schema.go`).
- **Quy tắc vàng:** Các rule ghi (`CreateRule`, `UpdateRule`, `DeleteRule`) để mặc định là `nil` (chỉ superuser) vì mọi thao tác nghiệp vụ đều đi qua `/api/v1/<module>` có kiểm tra `rbac.Require(...)`.

```go
package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		col := core.NewBaseCollection("products")
		col.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 200},
			&core.NumberField{Name: "price", Min: ptr(0.0)},
			&core.NumberField{Name: "stock", OnlyInt: true, Min: ptr(0.0)},
			&core.SelectField{Name: "status", Values: []string{"active", "draft", "archived"}, MaxSelect: 1},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		return app.Save(col)
	}, func(app core.App) error {
		col, err := app.FindCollectionByNameOrId("products")
		if err != nil {
			return nil
		}
		return app.Delete(col)
	})
}
```

### Bước 2: Tạo Backend Module (`internal/modules/<name>/`)
Copy từ thư mục mẫu `internal/modules/orders/` sang `internal/modules/<name>/`, gồm 3 file rõ trách nhiệm:

1. **`module.go`** — Khai báo quyền (`Permissions`), hooks/cron (`Init`) và đường dẫn HTTP (`Routes`):
   ```go
   package products

   import (
       "ganigeorgiev.com/pocketbase/pocketbase/apis"
       "ganigeorgiev.com/pocketbase/pocketbase/core"
       "ganigeorgiev.com/pocketbase/pocketbase/tools/router"

       "cuongpham2107/pocketbase-custom/internal/modules/rbac"
       "cuongpham2107/pocketbase-custom/internal/platform/module"
   )

   const (
       PermView   = "products.view"
       PermManage = "products.manage"
   )

   var Module = module.Module{
       Name:  "products",
       Label: "Products",
       Permissions: []module.Permission{
           {Slug: PermView, Name: "View products"},
           {Slug: PermManage, Name: "Create, update, and delete products"},
       },
       Routes: func(app core.App, api *router.RouterGroup[*core.RequestEvent]) {
           h := &handler{svc: &Service{app: app}}
           g := api.Group("/products").Bind(apis.RequireAuth())
           g.GET("", h.list).Bind(rbac.Require(PermView))
           g.POST("", h.create).Bind(rbac.Require(PermManage))
           g.PATCH("/{id}", h.update).Bind(rbac.Require(PermManage))
           g.DELETE("/{id}", h.remove).Bind(rbac.Require(PermManage))
       },
   }
   ```
2. **`service.go`** — Chứa 100% logic nghiệp vụ & `app.RunInTransaction(...)`. **Không import `apis` hay `httpx` tại đây** để dễ viết unit test.
3. **`handler.go`** — Chỉ đọc input (`e.BindBody`, `httpx.ParsePage`), gọi `Service`, và trả kết quả qua `httpx.OK(e, data)`, `httpx.Paged(e, items, page, perPage, total)`, hoặc `httpx.Fail(e, status, msg)`.

### Bước 3: Đăng ký Module vào `internal/app/app.go`
Thêm 1 dòng duy nhất vào biến `features` trong [internal/app/app.go](file:///Users/cuongpham/go/pocket-base/internal/app/app.go):
```go
var features = []module.Module{
    rbac.Module,
    auth.Module,
    users.Module,
    notifications.Module,
    audit.Module,
    media.Module,
    orders.Module,
    products.Module, // <-- Thêm tại đây
}
```
> Khi server khởi động, toàn bộ quyền `products.*` sẽ tự động được đồng bộ vào bảng `permissions` và gán sẵn cho role `admin`!

### Bước 4: Tạo Giao diện Quản trị (`frontend-admin/src/features/<name>/`)
**BẮT BUỘC** tái sử dụng bộ khung giao diện chuẩn trong [page.tsx](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/components/layout/page.tsx) để tự động tương thích với **Theme Studio** (màu Surface, mật độ bảng, sticky header, zebra stripe, bo góc, cỡ chữ) và **Responsive Mobile Card**:

| Component trong `@/components/layout` | Công dụng |
| :--- | :--- |
| `PageShell` + `PageHeader` | Khung trang chuẩn (tự theo `contentWidth` của Theme Studio) + tiêu đề, mô tả, khu vực nút `actions`. |
| `PageErrorBanner` | Hiển thị lỗi API kèm nút đóng (`onDismiss`). |
| `PageStatGrid` + `PageStatCard` | Lưới thẻ thống kê KPI đầu trang (`tone`: `primary`, `emerald`, `amber`, `rose`, `sky`, `violet`). |
| `PageCard` + `PageToolbar` | Khung chứa bảng dữ liệu (tự động nhận `cardStyle`: `bordered`, `elevated`, `glass`) + thanh công cụ lọc. |
| `PageSearchInput` | Ô tìm kiếm có sẵn icon kính lúp và nút `X` xoá nhanh. |
| `PageSegmentedFilter` | Bộ lọc dạng tab pill chuyển đổi trạng thái nhanh. |
| `RefreshButton` | Nút làm mới dữ liệu (tự quay icon `RefreshCw` khi `loading=true`). |
| `ResponsiveDataTable` | **Bảng dữ liệu thông minh:** hiển thị `<Table>` trên Desktop (hỗ trợ sticky header, mật độ dòng, màu Surface) và tự động chuyển thành danh sách Card (`mobileCard`) trên màn hình điện thoại! |
| `PagePagination` | Thanh phân trang chuẩn (First / Prev / Next / Last). |
| `FormField` | Bọc các ô nhập liệu trong Dialog kèm nhãn, dấu `*` bắt buộc, gợi ý và thông báo lỗi. |
| `ConfirmDeleteDialog` | Hộp thoại xác nhận xoá chuẩn (có trạng thái `loading`). |

**Mẫu cấu trúc trang Frontend chuẩn:**
```tsx
import {
  PageShell, PageHeader, PageCard, PageToolbar,
  PageSearchInput, PageSegmentedFilter, RefreshButton,
  ResponsiveDataTable, PagePagination, PageErrorBanner,
  ConfirmDeleteDialog, type ResponsiveColumn,
} from "@/components/layout"
```

### Bước 5: Gắn Route, Sidebar & Đa ngôn ngữ (i18n)
1. **Thêm từ khóa ngôn ngữ:** Bổ sung vào cả [vi.json](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/locales/vi.json) và [en.json](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/locales/en.json).
2. **Khai báo Module (nếu là module bật/tắt):** Thêm tên module vào `ModuleName` trong [modules.ts](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/lib/modules.ts).
3. **Thêm vào Sidebar & Command Menu:** Khai báo link, icon và quyền `permission: "products.view"` trong [AppSidebar.tsx](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/components/layout/AppSidebar.tsx) và [CommandMenu.tsx](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/components/layout/CommandMenu.tsx).
4. **Thêm Route lazy-load:** Đăng ký `React.lazy(...)`, `VIEW_TITLES`, và `<Route path="/products" ... />` bọc trong `<ProtectedRoute permission="products.view">` tại [App.tsx](file:///Users/cuongpham/go/pocket-base/frontend-admin/src/App.tsx).

---

## 5. Quy tắc Bắt buộc (Strict Rules cho AI & Developer)

1. **Module Import Paths:** Luôn dùng `cuongpham2107/pocketbase-custom/...` (Go) và `@/...` (Frontend TypeScript).
2. **PocketBase Import:** Dùng `ganigeorgiev.com/pocketbase/pocketbase` và `ganigeorgiev.com/pocketbase/pocketbase/core`.
3. **Transactions:** Khi thực hiện nhiều thao tác ghi dữ liệu liên quan, **bắt buộc** bọc trong `app.RunInTransaction(func(txApp core.App) error { ... })`.
4. **Mọi route phải có quyền:** Group bind `apis.RequireAuth()`, từng route bind `rbac.Require(PermXxx)`.
5. **Cô lập giữa các Module:** Các module trong `internal/modules/*` không import lẫn nhau, ngoại lệ duy nhất là import `rbac` (và gọi `notifications.Send` khi cần bắn thông báo realtime).
6. **Không hardcode màu sắc ở Frontend:** Luôn sử dụng các class ngữ nghĩa của Tailwind/shadcn (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`) và `ResponsiveDataTable` để giao diện tự động đổi màu theo **Primary Palette** và **Surface Palette** trong Theme Studio.
7. **Viết Test cho Service:** Mỗi module mới nên có file `service_test.go` sử dụng `tests.NewTestApp(t.TempDir())` và `_ "cuongpham2107/pocketbase-custom/migrations"` (tham khảo `internal/modules/orders/service_test.go`).
8. **Không bao giờ commit file rác lên Git:** Tuyệt đối không commit `tmp/`, `pb_data/`, `.codegraph/`, `node_modules/`, `.docker/.env`.
