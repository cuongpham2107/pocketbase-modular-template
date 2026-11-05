# AGENTS.md — PocketBase Custom Project Guide

This file provides architectural context, commands, and development guidelines for AI coding assistants working in this repository.

---

## 1. Project Overview

* **Module Name:** `cuongpham2107/pocketbase-custom` (Go 1.27+)
* **Framework:** PocketBase (`ganigeorgiev.com/pocketbase/pocketbase v0.41.1`)
* **Admin UI:** Fully customized Superuser Admin Dashboard with built-in multi-language (i18n: Vietnamese 🇻🇳 & English 🇬🇧) built with Vite & Shablon.
* **Database:** SQLite (embedded via modernc.org/sqlite), stored in `./pb_data/`.

---

## 2. Directory Structure

```
pocket-base/
├── main.go                     # Entrypoint: inits app, hooks, jobs, routes, and custom UI
├── internal/
│   ├── routes/                 # Custom HTTP REST endpoints (internal/routes/routes.go)
│   ├── services/               # Business logic services (internal/services/order.go)
│   ├── hooks/                  # Record/Model lifecycle hooks (internal/hooks/hooks.go)
│   ├── jobs/                   # Background Cron jobs (internal/jobs/jobs.go)
│   └── middleware/             # Custom HTTP middlewares
├── custom-admin-ui/            # Frontend source of PocketBase Admin Dashboard
│   ├── src/
│   │   ├── i18n.js             # Central i18n dictionary (Vietnamese & English)
│   │   ├── store.js            # Reactive global store (Shablon)
│   │   ├── base/appHeader.js   # Custom header with logo, CuongPham badge & lang picker
│   │   ├── css/vars.css        # CSS design tokens & colors (Indigo theme: #3730a3)
│   │   └── ...                 # Collections, records, settings views
│   ├── dist/                   # Production build served by PocketBase at /_/
│   ├── package.json            # Vite + dependencies
│   └── vite.config.js          # Vite config (base: "./")
├── pb_data/                    # SQLite database files (ignored in git and air)
├── pb_public/                  # Public web app static files (served at /)
├── migrations/                 # File-based Go migrations
├── .codegraph/                 # CodeGraph knowledge graph index
├── .air.toml                   # Live hot-reload config for Go backend
└── go.mod / go.sum             # Go module dependencies
```

---

## 3. Key Commands

### Backend (Go)
```bash
# Start live development server with hot-reload (recommended)
air

# Run server manually
go run . serve --dev --dir=./pb_data

# Compile Go binary
go build -o tmp/main .

# Sync & clean module dependencies
go mod tidy
```

### Frontend (Custom Admin UI)
```bash
cd custom-admin-ui

# Start Vite dev server with hot-reload at http://localhost:5173
npm run dev

# Build production assets into custom-admin-ui/dist/
npm run build
```

### Code Intelligence (CodeGraph)
```bash
# Sync CodeGraph index after code changes
codegraph sync

# Explore code structure and call paths
codegraph explore "<symbol or query>"
```

### Upstream PocketBase Upgrade & UI Sync
```bash
# Update PocketBase Go library to a new version
go get ganigeorgiev.com/pocketbase/pocketbase@latest
go mod tidy

# Check differences between custom-admin-ui and the newly installed upstream UI
./scripts/check-ui-updates.sh

# Rebuild custom UI assets after adjusting
cd custom-admin-ui && npm run build
```

---

## 4. Development & Architecture Rules

### Backend Guidelines
1. **Module Import Paths:** Always use `cuongpham2107/pocketbase-custom/...` (never use `myapp/...` or relative parent paths).
2. **PocketBase Import:** Use `ganigeorgiev.com/pocketbase/pocketbase` and `ganigeorgiev.com/pocketbase/pocketbase/core`.
3. **Admin Dashboard Binding:** [main.go](file:///Users/cuongpham/go/pocket-base/main.go) points `ui.DistDirFS` to `os.DirFS("./custom-admin-ui/dist")`.
4. **Data Safety:** Always pass `--dir=./pb_data` so data persists in `./pb_data/` instead of `tmp/`.
5. **Transactions:** When performing multiple database operations, wrap them in `app.RunInTransaction(func(txApp core.App) error { ... })`.

### Frontend & i18n Guidelines
1. **Localization:** All new UI text should be registered in [custom-admin-ui/src/i18n.js](file:///Users/cuongpham/go/pocket-base/custom-admin-ui/src/i18n.js) with both `vi` and `en` translations. Use `i18nT(key, fallback)` in templates.
2. **Shablon Reactivity:** Pass functions `() => value` for dynamic text or classes so Shablon updates them reactively.
3. **Build Before Deploy:** Always run `npm run build` inside `custom-admin-ui` after modifying frontend files so `./custom-admin-ui/dist/` is refreshed.

### File Watchers & Git Exclusions
Do NOT watch or commit:
* `tmp/`
* `pb_data/`
* `custom-admin-ui/node_modules/`
* `.codegraph/`

