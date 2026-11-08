# AGENTS.md — Quy tắc Frontend

Áp dụng cho mọi thay đổi trong `frontend/`. Đọc hết trước khi sửa code; nếu một quy tắc ở đây xung đột với sở thích cá nhân thì **quy tắc thắng**.

- Stack: React 19.3 · TypeScript 6 · Vite 8 · Tailwind CSS v4 (CSS-first) · shadcn/ui (Radix) · react-router 8 · i18next 26 · TanStack Table 8 · sonner · oxlint · vitest · `e2e` (tester-army).
- Alias `@/*` → `./src/*`. Không import tương đối xuyên feature (`../../features/...`).
- Ngôn ngữ trao đổi với người dùng: tiếng Việt. Ngôn ngữ code/comment kỹ thuật: tiếng Việt ngắn gọn, tên biến tiếng Anh.

---

## 1. Bản đồ file — biết chỗ nào để sửa

```text
src/
├── main.tsx                 # BrowserRouter + import '@/lib/i18n' (phải import trước App)
├── App.tsx                  # khung app: auth gate, sidebar, header, <Routes>, RequireModule, RequirePermission
├── lib/
│   ├── session.ts           # access token (memory) + refresh (httpOnly cookie) + guest flag
│   ├── api.ts               # CỔNG DUY NHẤT ra HTTP: requestEnvelope + ApiError + object `api`
│   ├── permissions.ts       # usePermissions() + matchesPermissions() (provider: permissions-provider.tsx)
│   ├── modules.ts           # useModules() + ModuleName: module backend đang bật (provider: modules-provider.tsx, đọc GET /api/v1/modules)
│   ├── i18n.ts              # i18next init, detectLang, setLang, translateErrorCode
│   └── query.ts             # buildQuery / withQuery (page, per_page, sort, order, q, filter[..])
├── locales/{vi,en}.ts       # nguồn chuỗi; `en: Messages` bắt lệch key
├── components/
│   ├── layout/page.tsx      # PageShell/PageHeader/PageCard/PageToolbar/PageFooter (BẮT BUỘC dùng)
│   ├── layout/app-sidebar.tsx  # NAV_GROUPS (route + mã quyền)
│   ├── language-switcher.tsx
│   └── ui/*                 # shadcn primitives (có thể sửa, nhưng ghi comment lý do)
├── features/<feature>/      # mỗi feature: component trang + hook + index.ts
└── types/index.ts           # type dùng chung (User, AuditLog, Notification, ApiResponse…)
```

---

## 2. Mười quy tắc không được phá

### 2.1 Mọi HTTP đi qua `requestEnvelope` (`src/lib/api.ts`)
```ts
// ✅ thêm endpoint vào object `api`
listThings: (params?: QueryParams) =>
  requestEnvelope<Thing[]>(`/api/v1/things${buildQuery(params)}`),

// ❌ KHÔNG viết fetch trần trong component/hook
const res = await fetch('/api/v1/things')
```
`requestEnvelope` đã lo: gắn `Authorization`, `credentials:'include'`, `Accept-Language`, timeout 20s, refresh single-flight khi 401 rồi retry **một** lần, và ném `ApiError`. Oxlint có rule cấm `fetch` ngoài `lib/api.ts` + `lib/session.ts`.

### 2.2 Session: access token chỉ nằm trong bộ nhớ
- Access token: biến module trong `src/lib/session.ts`. **Không** ghi token vào `localStorage`/`sessionStorage`.
- Refresh token: cookie `httpOnly` do backend set (`Path=/api`), trình duyệt tự gửi.
- Cookie `has_session=1` (không httpOnly, không chứa bí mật) đi cùng refresh cookie: `refreshAccessToken()` chỉ gọi mạng khi có nó, nên mở app lúc chưa đăng nhập không sinh request `/auth/refresh` lỗi.
- Đăng xuất phải gọi API thật: `await api.logout()` (revoke jti ở backend) rồi mới `navigate('/')`.
- Khôi phục phiên khi mở app: `api.bootstrap()` (refresh + `GET /auth/me`). Không tự gọi `/auth/refresh` ở nơi khác.
- Cần đọc/ghi phiên: dùng `getToken/getStoredUser/setToken/setStoredUser/clearToken` (alias trong `api.ts`) — `ThemeCustomizerContext` đang phụ thuộc các tên này.

### 2.3 Lỗi: dùng `ApiError`, không đoán chuỗi
```ts
try { await api.markNotificationRead(id) }
catch (err) {
  const code = err instanceof ApiError ? err.code : 'HTTP_0'   // 'NOT_FOUND', 'TOO_MANY_REQUESTS', 'TIMEOUT'…
  setError(err instanceof ApiError ? err.message : t('common.unknownError'))
}
```
- Envelope backend: `{ success, data, error: { code, message, details }, pagination? }` → **chỉ** đọc `error.message`, không đọc `json.message`.
- Thông báo cho người dùng qua `toast` (sonner) hoặc inline `text-destructive`; không `alert()`.

### 2.4 Trang mới phải dùng bộ khung chung
```tsx
<PageShell>
  <PageHeader icon={Boxes} title={t('things.title')} description={t('things.description')}
    badge={<Badge variant="outline">{total}</Badge>}
    actions={<Button size="sm" onClick={reload}><RefreshCw className="size-3" />{t('common.refresh')}</Button>} />
  <PageCard>
    <PageToolbar>{/* Input tìm kiếm + Select lọc */}</PageToolbar>
    <Table>…</Table>
    <PageFooter>{/* phân trang */}</PageFooter>
  </PageCard>
</PageShell>
```
- Đúng **một** `<h1>` mỗi trang (do `PageHeader` render). Không tự dựng `div.rounded-xl.border` làm card.
- Không đặt `max-w-*` trong `PageShell` — bề rộng do Theme Studio (`<main>` trong `App.tsx`) quyết định.
- Bố cục chuẩn hoá qua `PageShell`, `PageHeader`, `PageCard`, `PageToolbar`, `PageFooter` trong `components/layout/page.tsx`.

### 2.5 Route, sidebar và quyền phải khai báo cùng lúc
Thêm trang = 3 chỗ, thiếu một chỗ là trang "mồ côi":
1. `src/App.tsx` → `VIEW_TITLES` (breadcrumb + icon) và `<Routes>` (lazy + `RequirePermission`).
2. `src/components/layout/app-sidebar.tsx` → `NAV_GROUPS` với `href` + mã quyền.
3. `src/features/<feature>/index.ts` → export component.

```tsx
const ThingsPage = React.lazy(() => import('@/features/things/things-page').then(m => ({ default: m.ThingsPage })))
// …
<Route path="/things" element={<RequirePermission code="things:view"><ThingsPage /></RequirePermission>} />
```
Không thêm trang vào barrel `index.ts` của feature nếu barrel đó được import tĩnh ở `App.tsx` — sẽ phá code-splitting (đã từng xảy ra với `notifications-page`).

### 2.6 Phân quyền ở UI bằng `can()`
```tsx
const { can, loading } = usePermissions()
{can('audit:export') && <Button onClick={exportCSV}>…</Button>}
```
- Mã quyền lấy từ backend (`GET /auth/me` → permissions, admin nhận full catalog). **Không** hard-code danh sách role.
- `can()` không thay cho bảo mật backend — chỉ để ẩn/hiện UI. Route vẫn phải bọc `RequirePermission`.

### 2.6b Trang của module tuỳ chọn: bọc `RequireModule`
Backend bật/tắt module trong `internal/app/modules.go` (audit, notifications, media, mobile, mcp); frontend đọc danh sách từ `GET /api/v1/modules` qua `ModulesProvider`. Trang hoặc UI thuộc một module phải ẩn khi module tắt:
```tsx
<Route path="/audit" element={<RequireModule name="audit"><RequirePermission code="audit:view"><AuditPage /></RequirePermission></RequireModule>} />
// sidebar: { to: "/audit", …, permission: "audit:view", module: "audit" }
// UI lẻ trong trang: const { has } = useModules(); {has('media') && <MediaCard />}
```
- Thêm module mới ở backend → thêm tên vào `ModuleName` trong `src/lib/modules.ts` (test Go `internal/app/modules_test.go` fail nếu quên).
- Không đọc được danh sách (lỗi mạng, backend cũ) thì `has()` trả `true` cho mọi module; backend vẫn trả 404 cho module đang tắt.

### 2.7 i18n: mọi chuỗi qua `t()`, vi và en luôn đủ cặp
- Thêm key vào **cả** `src/locales/vi.ts` và `src/locales/en.ts`; type `Messages` sẽ báo lỗi `tsc` nếu lệch.
- Key theo namespace: `common.*`, `auth.*`, `notifications.*`, `audit.*`, `nav.*`, `permission.*`, `errors.<CODE>`.
- Tham số nội suy: `t('audit.pageDescription', { total })` (i18next dùng `{{total}}`).
- Không hard-code tiếng Việt trong JSX (ngoại lệ: placeholder ví dụ "Nguyễn Văn A").

### 2.8 Style: token semantic, không màu thô
- Dùng `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `text-destructive`. Không `text-red-500`, không hex.
- Dark mode qua class `dark`; kiểm tra cả hai chế độ khi thêm component mới.
- Component shadcn mới: `cd frontend && npx shadcn@latest add <name>`. Được sửa file trong `components/ui/` nhưng phải để comment giải thích (ví dụ `sheet.tsx` bỏ class `animate-in` vì Animate UI đã animate bằng Motion — nếu thêm lại sẽ nhấp nháy).

### 2.9 Kiểu dữ liệu: không `any`
- Dùng type trong `src/types/index.ts` hoặc generic của `requestEnvelope<T>`.
- Dữ liệu từ API luôn coi là **có thể thiếu** (`?`) cho tới khi type nói khác; format ngày qua helper, không `toLocaleString()` rải rác.

### 2.10 Test đi kèm thay đổi
- Logic thuần (lib/, helper, guard) → `src/**/*.test.ts` với vitest (`happy-dom`).
- Luồng UI mới → một spec trong `frontend/tests/*.e2e.ts`.
- Selector e2e: `a[href="/audit"]`, `[data-testid="notification-bell"]`, `role`/`aria-label`, `main button[role="combobox"]`. **Không** dùng text đã dịch (spec sẽ đỏ khi đổi ngôn ngữ); nếu buộc phải dùng text thì spec đó phải ghim `locale` trong `e2e.config.ts`.

---

## 3. Mẫu thêm một feature (copy-paste)

```text
src/features/things/
├── things-page.tsx      # export function ThingsPage() — dùng PageShell…PageFooter
├── use-things.ts        # hook: state + gọi api.*, không fetch trực tiếp
└── index.ts             # export * from './use-things'   (KHÔNG export page nếu App.tsx lazy)
```

Thêm vào `src/types/index.ts`:
```ts
export interface Thing { id: number; name: string; created_at: string }
```
Thêm vào `api` trong `src/lib/api.ts`:
```ts
listThings: (params?: QueryParams) => requestEnvelope<Thing[]>(`/api/v1/things${buildQuery(params)}`),
createThing: (body: { name: string }) =>
  requestEnvelope<Thing>('/api/v1/things', { method: 'POST', body: JSON.stringify(body) }),
```

---

## 4. Lệnh & kiểm chứng (chạy trước khi báo xong)

```bash
cd frontend
npx tsc --noEmit          # bắt buộc sạch
npx vitest run            # unit test
npx vite build            # bundle; xem cảnh báo chunk > 500 kB
npx oxlint src            # 0 error (warning cũ: set-state-in-effect/exhaustive-deps)
npx e2e run               # cần backend + Postgres + Redis + worker
```

E2E cần môi trường thật (xem `AGENTS.md` gốc):
- `docker compose up -d db redis` (hoặc Postgres/Redis local) · `go run ./cmd serve` · `go run ./cmd worker`
- `RATE_LIMIT_AUTH=1000/m` — mặc định 20/m sẽ khiến 9 spec login liên tiếp bị 429.
- `e2e.config.ts` ghim `locale: 'vi-VN'` để `navigator.language` ổn định.

---

## 5. Cấm (anti-pattern đã gặp thật)

| ❌ Không làm | Vì sao |
|---|---|
| `fetch()` trong component/hook | mất auth header, mất refresh, mất `ApiError` |
| Lưu access/refresh token vào `localStorage` | XSS đọc được; refresh đã nằm trong cookie httpOnly |
| Đọc `json.message` thay vì `json.error.message` | envelope backend không có `message` ở cấp gốc cho lỗi |
| Tự dựng header/filter/card riêng cho trang mới | chính là lý do phải chuẩn hoá bố cục |
| `alert()` cho lỗi/luồng phụ | dùng `toast` + inline error |
| Thêm trang vào barrel export rồi import tĩnh | phá code-splitting, bundle phình |
| `useEffect` gọi `setState` đồng bộ để suy ra state khác | derive trong render; effect chỉ để đồng bộ hệ thống ngoài |
| `any`, `@ts-ignore`, `console.log` | giấu lỗi; `tsc`/oxlint là hàng rào |
| Sửa `.env`/URL backend trong code | dùng `VITE_API_URL`, `VITE_WS_URL`, proxy trong `vite.config.ts` |
| Thêm `max-w-*` vào khung trang | Theme Studio quản lý bề rộng nội dung |

---

## 6. Tham chiếu

- `docs/STRUCTURE.md` — kiến trúc backend mà frontend đang gọi.
- `AGENTS.md` (gốc) §4 — quy tắc frontend mức dự án + Rule 7 (module backend tương ứng).
- `docs/STRUCTURE.md` — kiến trúc backend mà frontend đang gọi.
