<div align="center">

# 🚀 PocketBase Modular Template

**Full-Stack Modular Starter Kit built on PocketBase (Go) + React 19 + Tailwind CSS v4 + shadcn/ui**

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![PocketBase](https://img.shields.io/badge/PocketBase-v0.41+-B8DBE4?style=for-the-badge&logo=pocketbase&logoColor=black)](https://pocketbase.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A production-ready **BaaS + Dedicated Business Admin Portal** architecture that keeps PocketBase's native Developer Studio (`/_/`) 100% untouched for zero-conflict upstream upgrades, while providing a feature-rich, modular Go backend (`/api/v1/*`) and a customizable React Business Admin Portal (`/admin/`).

</div>

---

## ✨ Key Features

- **🧱 Clean Modular Go Architecture (`internal/modules/*`)**
  - Plug-and-play module contract (`Name`, `Label`, `Permissions`, `Init`, `Routes`).
  - Strict separation of HTTP handlers (`handler.go`) and business/transaction logic (`service.go`).
  - Standardized JSON API envelope (`httpx.OK`, `httpx.Fail`, `httpx.Paged`).
- **🔐 Auto-Synced RBAC (Role-Based Access Control)**
  - Permissions declared in Go modules are automatically synced into SQLite on boot and granted to the `admin` role.
  - Route-level protection via `rbac.Require(perm)` middleware and dynamic permission matrix UI.
- **🎨 Advanced Theme Studio (Live Customizer)**
  - **Mode:** Light, Dark, and System sync.
  - **Color Palettes:** 8 Primary palettes (`Neutral`, `Blue`, `Emerald`, `Violet`, `Rose`, `Amber`, `Cyan`, `Indigo`) & 8 Surface palettes (`Default`, `Slate`, `Stone`, `Linen`, `Sand`, `Sage`, `Rosewood`, `Pure`) that dynamically theme cards, sidebars, and data tables.
  - **Layout & Density:** Sidebar variants (`sidebar`, `floating`, `inset`), collapsible modes (`icon`, `offcanvas`, `none`), content width, border radius, font family, and font scale (`xs` → `lg`).
  - **Table & Surface Controls:** Sticky table headers, row density (`compact`, `normal`, `comfortable`), zebra striping, cell borders, card styles (`bordered`, `elevated`, `glass`), and reduced motion.
  - **Persistence:** Saved per user profile in PocketBase + synced across tabs via `localStorage`.
- **📦 Built-in Enterprise Modules**
  - **Auth & Sessions:** JWT access tokens + rotating refresh tokens, device session tracking, logout-all.
  - **Users & RBAC:** User CRUD, role assignment, and interactive permission matrix.
  - **Media Manager:** Native PocketBase File Storage (local or S3), recursive folder tree, multi-file upload, search & preview.
  - **Real-time Notifications:** WebSocket hub (`/api/v1/notifications/ws`), PocketBase record hooks, and scheduled cleanup cron jobs.
  - **Audit Trail:** Query and filter system request logs directly from the Admin Portal.
  - **Orders (Reference Module):** Blueprint demonstrating ACID transactions (`app.RunInTransaction`), RBAC guards, and real-time notifications.
- **📱 Mobile-First Responsive Admin UI**
  - Automatic responsive table-to-card view on mobile screens (`ResponsiveDataTable`), bilingual i18n (`vi` / `en`), and Command Palette (`⌘K` / `Ctrl+K`).
- **🐳 Single-Binary & Docker Ready**
  - Compiles into a single standalone binary serving both the Go backend and the built `/admin/` SPA.
  - Multi-stage Dockerfile (`~40MB` Alpine image) with healthcheck (`/ready`), SQLite WAL persistence, and helper CLI commands.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. DATABASE & DEV STUDIO (Native)                     │
│  - URL: http://127.0.0.1:8090/_/                                            │
│  - Audience: Developers / Superusers                                        │
│  - Role: 100% unmodified PocketBase Studio for collections, S3, mail, logs. │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. BACKEND API & BUSINESS LOGIC (Go)                     │
│  - PocketBase Core: Embedded SQLite, File Storage, Auth, Hooks, Cron, SSE.  │
│  - Go Extension (internal/):                                                │
│      ├── modules/  : Self-contained features mounted at /api/v1/<module>    │
│      ├── platform/ : Shared module contract & httpx JSON response helpers   │
│      └── app/      : Module registry, RBAC catalog sync, CLI, /admin SPA    │
│  - migrations/     : Versioned Go schema migrations & collection rules      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API & WebSocket (/api/v1/*)
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│       3A. BUSINESS ADMIN PORTAL      │  │        3B. CLIENT APP / WEB       │
│  - URL: http://127.0.0.1:8090/admin/ │  │  - URL: http://127.0.0.1:8090/    │
│  - Audience: Staff, Operators, Admins│  │  - Audience: End Users / Customers│
│  - React 19, Tailwind v4, shadcn/ui, │  │  - Public web app or mobile SDK   │
│    RBAC UI, Theme Studio, i18n (VI/EN)│ │    consuming /api/v1 endpoints    │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 📂 Project Structure

```text
.
├── main.go                     # Entrypoint: pocketbase.New + migratecmd + app.Register
├── Makefile                    # Unified developer & Docker workflow commands
├── .docker/                    # Multi-stage Dockerfile, docker-compose.yml, entrypoint
├── migrations/                 # Go schema migrations & collection API rules
├── internal/
│   ├── app/app.go              # Module registration, RBAC sync, custom CLI, /ready & /admin SPA
│   ├── dev/seed.go             # Demo accounts & sample data (runs only with --dev)
│   ├── platform/
│   │   ├── module/             # Module contract: {Name, Label, Permissions, Init, Routes}
│   │   └── httpx/              # JSON response envelope (OK, Fail, Paged, ParsePage)
│   └── modules/
│       ├── rbac/               # Roles, permissions catalog sync, rbac.Require middleware
│       ├── auth/               # Login, register, refresh token rotation, /me, theme, password
│       ├── users/              # User management & role assignment
│       ├── media/              # PocketBase file storage + nested folders
│       ├── notifications/      # User/broadcast notifications + WebSocket hub + cron cleanup
│       ├── audit/              # System audit log reader
│       └── orders/             # Reference business module (copy this to create new features)
└── frontend-admin/             # React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui
    ├── src/
    │   ├── components/layout/  # AppSidebar, PageShell, ResponsiveDataTable, CommandMenu
    │   ├── components/ui/      # Radix UI / shadcn primitives
    │   ├── features/           # Modular UI features (auth, users, rbac, media, theme, audit...)
    │   ├── locales/            # i18n translations (Vietnamese & English)
    │   └── lib/                # API client, session manager, permissions helper
    └── vite.config.ts          # Builds static bundle into ../pb_public/admin/
```

---

## ⚡ Quick Start

### Prerequisites
- **Go** `1.24+`
- **Node.js** `20+` & `npm`
- *(Optional)* `air` for Go live hot-reload (`go install github.com/air-verse/air@latest`)

### 1. Install Dependencies
```bash
make install
```

### 2. Run in Development Mode (Hot-Reload)
Starts both the Go backend (`:8090`) and the Vite HMR dev server (`:5173`) concurrently:
```bash
make dev
```
- **Business Admin Portal (HMR):** http://localhost:5173/admin/
- **Business Admin Portal (Integrated):** http://127.0.0.1:8090/admin/
- **PocketBase Native Studio:** http://127.0.0.1:8090/_/
- **Health / Readiness Check:** http://127.0.0.1:8090/ready

### 3. Demo Credentials (seeded automatically in `--dev` mode)

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@example.com` | `admin123` |
| **Standard User** | `user@example.com` | `user123` |

---

## 🛠️ Makefile & CLI Commands

| Command | Description |
| :--- | :--- |
| `make help` | Show all available Makefile targets |
| `make install` | Install Go modules and `frontend-admin` npm packages |
| `make dev` | Run Go backend (Air hot-reload) + React frontend (Vite HMR) in parallel |
| `make build` | Build React frontend into `pb_public/admin/` and compile Go binary (`tmp/main`) |
| `make run` | Build frontend and start PocketBase server on `:8090` |
| `go test -v ./...` | Run all backend integration & module tests |
| `go run . rbac:sync` | Manually synchronize module permissions into SQLite |
| `go run . user:grant-admin <email>` | Grant the `admin` RBAC role to an existing user |

---

## 🐳 Docker Deployment

All Docker configuration files are neatly organized inside `.docker/`:

```bash
# Build and start in background (http://localhost:8090/admin/)
make docker-up

# Follow container logs
make docker-logs

# Stop containers
make docker-down
```

To customize environment variables (`PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, `PB_PORT`, `TZ`), copy `.docker/.env.example` to `.docker/.env` before starting.

---

## 🧩 Adding a New Feature Module (Fast-Track Guide)

> 📖 **For AI Coding Assistants & Developers:** See **[AGENTS.md](./AGENTS.md)** for the complete **5-Step Full-Stack Playbook** (including copy-pasteable Go migration/module templates and React shared UI components like `ResponsiveDataTable`, `PageShell`, `PageSearchInput`, and `ThemeStudio` integration).

1. **Duplicate the reference module:** Copy `internal/modules/orders` to `internal/modules/<your_module>`.
2. **Define permissions & routes:** Declare your `module.Module` struct with `Permissions`, `Init` (hooks/cron), and `Routes` protected by `rbac.Require(...)`.
3. **Register the module:** Add `<your_module>.Module` to the `features` slice in `internal/app/app.go`.
4. **Create a migration:** Run in `--dev` mode or add a migration in `migrations/` for your new collection. On next startup, all declared permissions will automatically sync to the database and appear in the Admin Portal's Permission Matrix.

---

## 📄 License

MIT License © [Cuong Pham](https://github.com/cuongpham2107)

