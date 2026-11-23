<div align="center">

# 🚀 PocketBase Modular Template

**Bộ khung Full-Stack Modular xây dựng trên PocketBase (Go) + React 19 + Tailwind CSS v4 + shadcn/ui**

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![PocketBase](https://img.shields.io/badge/PocketBase-v0.41+-B8DBE4?style=for-the-badge&logo=pocketbase&logoColor=black)](https://pocketbase.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[English](./README.md) · **Tiếng Việt**

Kiến trúc **BaaS + Cổng Quản Trị Nghiệp Vụ (Dedicated Business Admin Portal)** sẵn sàng cho production: giữ nguyên 100% PocketBase Developer Studio (`/_/`) để nâng cấp upstream không xung đột, đồng thời cung cấp backend Go theo module (`/api/v1/*`) và trang quản trị React tuỳ biến linh hoạt (`/admin/`).

</div>

---

## ✨ Tính năng nổi bật

- **🧱 Kiến trúc Go Modular sạch sẽ (`internal/modules/*`)**
  - Mô hình module cắm-là-chạy (`Name`, `Label`, `Permissions`, `Init`, `Routes`).
  - Tách bạch hoàn toàn lớp HTTP (`handler.go`) và lớp nghiệp vụ/transaction (`service.go`).
  - Cấu hình tập trung thuần Go (`internal/platform/config/config.go` qua `config.Get()`).
  - Chuẩn hoá JSON API envelope (`httpx.OK`, `httpx.Fail`, `httpx.Paged`).
- **🔐 RBAC tự động đồng bộ (Phân quyền theo vai trò)**
  - Toàn bộ quyền khai báo trong module Go tự động đồng bộ vào SQLite khi khởi động và gán sẵn cho role `admin`.
  - Bảo vệ ở tầng route bằng middleware `rbac.Require(perm)` cùng ma trận phân quyền trực quan trên giao diện.
- **🎨 Theme Studio nâng cao (2 lớp: Hệ thống + Cá nhân)**
  - **Chế độ & Preset:** Hỗ trợ Sáng (Light), Tối (Dark), Theo hệ thống (System) cùng 4 preset nhanh (`Modern`, `Precision`, `Velvet`, `Obsidian`).
  - **Bảng màu:** 8 màu chủ đạo (`Amber`, `Blue`, `Forest`, `Citrus`, `Violet`, `Rose`, `Teal`, `Zinc`) & 8 màu nền bề mặt (`Default`, `Slate`, `Stone`, `Linen`, `Sand`, `Sage`, `Rosewood`, `Pure`) đồng bộ tự động cho Card, Sidebar và Bảng dữ liệu.
  - **Phông chữ hỗ trợ tiếng Việt 100%:** Đóng gói sẵn `Inter Variable` local (mặc định của Filament v5 qua `@fontsource-variable/inter`) cùng `Geist Sans`, `Be Vietnam Pro`, `Plus Jakarta Sans`, `Manrope` và `JetBrains Mono`.
  - **Bố cục, Bảng dữ liệu & Hiệu ứng:** Tuỳ chỉnh kiểu Sidebar (`sidebar`, `floating`, `inset`), chế độ thu gọn (`icon`, `offcanvas`, `none`), độ rộng nội dung, độ bo góc, cỡ chữ (`xs` → `xl`), ghim tiêu đề bảng, mật độ dòng (`compact`, `normal`, `comfortable`), màu dòng xen kẽ, kẻ dọc ô, kiểu thẻ (`bordered`, `elevated`, `glass`) và bật/tắt hiệu ứng chuyển động (`reducedMotion`).
  - **Lưu trữ 2 lớp:** Cấu hình mặc định & branding toàn hệ thống lưu tại bảng singleton `settings` (`settings.theme_settings`); từng tài khoản kế thừa mặc định này cho đến khi tự tuỳ biến (lưu riêng vào `users.theme_settings` và tách biệt theo tài khoản trên `localStorage`).
- **📦 Các module doanh nghiệp tích hợp sẵn**
  - **Xác thực & Phiên đăng nhập (`auth`):** JWT access token + xoay vòng refresh token, theo dõi phiên theo thiết bị, đăng xuất toàn bộ thiết bị.
  - **Người dùng & RBAC (`users`, `rbac`):** Quản lý tài khoản, gán vai trò và ma trận phân quyền.
  - **Cài đặt hệ thống (`settings` — Singleton):** Quản lý tên website, mô tả, logo, favicon (áp dụng động lên header/trang đăng nhập/tab trình duyệt) và giao diện mặc định toàn hệ thống.
  - **Quản lý Media (`media`):** Dùng trực tiếp PocketBase File Storage (local hoặc S3), cây thư mục lồng nhau đệ quy, upload nhiều file, tìm kiếm & xem trước.
  - **Thông báo Realtime (`notifications`):** WebSocket hub (`/api/v1/notifications/ws`), PocketBase record hooks và cron job tự dọn dẹp.
  - **Nhật ký hệ thống (`audit`):** Tra cứu, lọc và xuất log request trực tiếp trên Admin Portal.
- **📱 Giao diện Admin Responsive Mobile-First**
  - Bảng dữ liệu tự động chuyển sang dạng thẻ trên điện thoại (`ResponsiveDataTable` với cột thao tác căn giữa co gọn) và hỗ trợ song ngữ (`vi` / `en`).
- **🐳 Đóng gói Single-Binary & Docker**
  - Biên dịch thành 1 file thực thi duy nhất phục vụ cả Go backend lẫn giao diện `/admin/`.
  - Multi-stage Dockerfile (`~40MB` Alpine) có sẵn healthcheck (`/ready`), SQLite WAL và các lệnh CLI tiện ích.

---

## 🏗️ Tổng quan kiến trúc

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. DATABASE & DEV STUDIO (Gốc)                        │
│  - Đường dẫn: http://127.0.0.1:8090/_/                                      │
│  - Đối tượng: Lập trình viên / Superuser                                    │
│  - Vai trò: Giữ nguyên 100% PocketBase Studio để quản lý bảng, S3, mail, log│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. BACKEND API & BUSINESS LOGIC (Go)                     │
│  - PocketBase Core: Embedded SQLite, File Storage, Auth, Hooks, Cron, SSE.  │
│  - Go Extension (internal/):                                                │
│      ├── modules/  : Tính năng độc lập gắn tại /api/v1/<module>             │
│      ├── platform/ : Module contract, httpx JSON helper & config tập trung  │
│      └── app/      : Đăng ký module, RBAC sync, CLI, phục vụ /admin SPA     │
│  - migrations/     : Schema migrations & API rules theo phiên bản           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API & WebSocket (/api/v1/*)
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│       3A. BUSINESS ADMIN PORTAL      │  │        3B. CLIENT APP / WEB       │
│  - URL: http://127.0.0.1:8090/admin/ │  │  - URL: http://127.0.0.1:8090/    │
│  - Đối tượng: Nhân viên, Quản trị    │  │  - Đối tượng: Người dùng cuối     │
│  - React 19, Tailwind v4, shadcn/ui, │  │  - Web app / Mobile app gọi API   │
│    RBAC UI, Theme Studio, i18n VI/EN │  │    /api/v1/*                      │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 📂 Cấu trúc thư mục

```text
.
├── main.go                     # Entrypoint: pocketbase.New + migratecmd + app.Register
├── Makefile                    # Điều khiển quy trình dev, test, build & Docker
├── .docker/                    # Multi-stage Dockerfile, docker-compose.yml, entrypoint
├── migrations/                 # Go schema migrations & collection API rules
├── internal/
│   ├── app/app.go              # Đăng ký module, RBAC sync, CLI, /ready & /admin SPA
│   ├── dev/seed.go             # Tài khoản demo (chỉ chạy khi bật --dev)
│   ├── platform/
│   │   ├── config/             # Cấu hình mặc định thuần Go (config.Get(): limits, TTL, seeds)
│   │   ├── module/             # Contract Module{Name, Label, Permissions, Init, Routes}
│   │   └── httpx/              # JSON response envelope chuẩn (OK, Fail, Paged, ParsePage)
│   └── modules/
│       ├── rbac/               # Roles, đồng bộ permissions catalog, middleware rbac.Require
│       ├── auth/               # Đăng nhập, đăng ký, xoay vòng refresh token, /me, theme, đổi mật khẩu
│       ├── users/              # Quản lý người dùng & gán vai trò
│       ├── media/              # Lưu trữ file qua PocketBase Storage + cây thư mục lồng nhau
│       ├── notifications/      # Thông báo cá nhân/broadcast + WebSocket hub + cron dọn dẹp
│       ├── audit/              # Đọc nhật ký request hệ thống
│       └── settings/           # Cài đặt hệ thống singleton (branding, logo/favicon, theme mặc định)
└── frontend-admin/             # React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui
    ├── src/
    │   ├── components/layout/  # app-sidebar, PageShell, ResponsiveDataTable
    │   ├── components/ui/      # Radix UI / shadcn primitives
    │   ├── features/           # Các module giao diện (auth, users, rbac, media, theme, settings, audit...)
    │   ├── locales/            # Bản dịch đa ngôn ngữ (vi.ts & en.ts)
    │   └── lib/                # API client, quản lý phiên, kiểm tra quyền
    └── vite.config.ts          # Build bundle tĩnh xuất ra ../pb_public/admin/
```

---

## ⚡ Bắt đầu nhanh (Quick Start)

### Yêu cầu môi trường
- **Go** `1.24+`
- **Node.js** `20+` & `npm`
- *(Tuỳ chọn)* `air` để hot-reload Go (`go install github.com/air-verse/air@latest`)

### 1. Cài đặt phụ thuộc
```bash
make install
```

### 2. Chạy môi trường Development (Hot-Reload)
Khởi chạy song song Go backend (`:8090`) và Vite HMR dev server (`:5173`):
```bash
make dev
```
- **Admin Portal (Vite HMR):** http://localhost:5173/admin/
- **Admin Portal (Tích hợp Go):** http://127.0.0.1:8090/admin/
- **PocketBase Studio gốc:** http://127.0.0.1:8090/_/
- **Kiểm tra trạng thái (Healthcheck):** http://127.0.0.1:8090/ready

### 3. Tài khoản demo (tự động tạo khi chạy `--dev`)

| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị viên hệ thống** | `admin@example.com` | `admin123` |
| **Người dùng thường** | `user@example.com` | `user123` |

---

## 🛠️ Lệnh Makefile & CLI

| Lệnh | Mô tả |
| :--- | :--- |
| `make help` | Xem danh sách toàn bộ lệnh trong Makefile |
| `make install` | Cài đặt Go modules và npm packages cho `frontend-admin` |
| `make dev` | Chạy song song Go backend (Air) + React frontend (Vite HMR) |
| `make lint` | Kiểm tra tĩnh (`go vet ./...` + `oxlint`) |
| `make test` | Chạy toàn bộ test Go (`go test -race ./...`) và Frontend (`vitest`) |
| `make ci` | Chạy trọn bộ pipeline CI cục bộ (`lint` + `test` + `build`) |
| `make build` | Build React ra `pb_public/admin/` và biên dịch binary Go (`tmp/main`) |
| `make run` | Build frontend và khởi chạy PocketBase server tại cổng `:8090` |
| `go run . rbac:sync` | Đồng bộ thủ công danh sách quyền từ module Go vào SQLite |
| `go run . user:grant-admin <email>` | Cấp quyền `admin` cho tài khoản đã tồn tại |

---

## 🐳 Triển khai với Docker

Toàn bộ cấu hình Docker được đặt gọn trong thư mục `.docker/`:

```bash
# Build và chạy container ở chế độ nền (http://localhost:8090/admin/)
make docker-up

# Xem log của container
make docker-logs

# Dừng container
make docker-down
```

Để tuỳ chỉnh biến môi trường (`PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, `PB_PORT`, `TZ`), hãy sao chép `.docker/.env.example` thành `.docker/.env` trước khi khởi chạy.

---

## 🧩 Thêm module nghiệp vụ mới (Hướng dẫn nhanh)

> 📖 **Dành cho AI Coding Assistants & Lập trình viên:** Xem **[AGENTS.md](./AGENTS.md)** để đọc đầy đủ **Playbook 5 bước Full-Stack** (kèm mẫu migration/module Go và bộ component dùng chung của React như `ResponsiveDataTable`, `PageShell`, `PageSearchInput`, tích hợp `ThemeStudio`).

1. **Tạo thư mục module:** Tham khảo cấu trúc 3 file của `internal/modules/users`, `internal/modules/settings` hoặc `internal/modules/media` (`module.go`, `handler.go`, `service.go`, `service_test.go`) trong `internal/modules/<ten_module>`.
2. **Khai báo quyền & routes:** Định nghĩa `module.Module` với `Permissions`, `Init` (hooks/cron) và `Routes` được bảo vệ bằng `rbac.Require(...)`.
3. **Đăng ký module:** Thêm `<ten_module>.Module` vào slice `features` trong `internal/app/app.go`.
4. **Tạo migration:** Thêm file migration trong `migrations/` cho collection mới. Ở lần khởi động kế tiếp, toàn bộ quyền khai báo sẽ tự động đồng bộ vào SQLite và hiển thị trong Ma trận phân quyền trên Admin Portal.

---

## 📄 Giấy phép (License)

MIT License © [Cuong Pham](https://github.com/cuongpham2107)
