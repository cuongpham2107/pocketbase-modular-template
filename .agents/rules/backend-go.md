# Backend Go & PocketBase Module Rules

These rules apply whenever creating or modifying Go code in `internal/`, `migrations/`, or `main.go`.

## 1. Module Architecture (`internal/modules/<name>/`)
- Every business domain lives in its own folder under `internal/modules/<name>/` and exposes `var Module = module.Module{...}`.
- Register new modules by adding `<name>.Module` to the `features` slice in `internal/app/app.go`.
- **Strict Layering:**
  - `module.go`: Declares `Name`, `Label`, `Permissions`, `Init` (hooks/cron), and `Routes`.
  - `handler.go`: Only parses HTTP requests (`e.BindBody`, `httpx.ParsePage`), calls `Service`, and returns standardized envelopes via `httpx.OK(e, data)`, `httpx.Paged(e, items, page, perPage, total)`, or `httpx.Fail(e, status, msg)`.
  - `service.go`: Contains 100% of business logic and database queries. **Never** import `apis` or `httpx` inside `service.go`.
  - `service_test.go`: Unit/integration tests using `tests.NewTestApp(t.TempDir())` and `_ "cuongpham2107/pocketbase-custom/migrations"`.

## 2. Module Isolation & Imports
- Always use the Go module path `cuongpham2107/pocketbase-custom/...`.
- Always use `ganigeorgiev.com/pocketbase/pocketbase` and `ganigeorgiev.com/pocketbase/pocketbase/core`.
- Feature modules under `internal/modules/*` must **NOT** import each other. The only allowed cross-module imports are `internal/modules/rbac` (for permission checks/DTOs) and `internal/modules/notifications` (to dispatch real-time notifications via `notifications.Send`).

## 3. Security & RBAC Enforcement
- Every module route group under `/api/v1/<module>` **must** bind `apis.RequireAuth()`.
- Every individual endpoint **must** bind `rbac.Require(PermXxx)`. Never leave a business endpoint without an explicit permission guard.
- Permissions declared in `module.Module.Permissions` are automatically synced to the `permissions` collection on startup and granted to the `admin` role.

## 4. Database Schema & Transactions
- Define all collections, fields, indexes, and collection rules inside `migrations/`. Never create collections dynamically at runtime in application code.
- Keep PocketBase collection write rules (`CreateRule`, `UpdateRule`, `DeleteRule`) as `nil` (superuser-only) so all business writes go through `/api/v1/*` with RBAC enforcement.
- Wrap all multi-step database writes (e.g., stock deduction + order creation + audit/notification) inside `app.RunInTransaction(func(txApp core.App) error { ... })`.
