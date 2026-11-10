# Frontend Admin Portal (React 19 + Tailwind v4 + Theme Studio) Rules

These rules apply whenever creating or modifying frontend code inside `frontend-admin/`.

## 1. Mandatory Shared Layout & Table Components (`@/components/layout`)
Never build raw HTML tables or ad-hoc page wrappers from scratch. Always compose pages using the shared primitives in `frontend-admin/src/components/layout/page.tsx`:
- **`PageShell`** + **`PageHeader`**: Standard page container (automatically respects Theme Studio's `contentWidth`) and header with icon, title, description, and `actions`.
- **`PageErrorBanner`**: Standardized dismissible error alert for API failures.
- **`PageStatGrid`** + **`PageStatCard`**: Top KPI metric cards (`tone`: `primary`, `emerald`, `amber`, `rose`, `sky`, `violet`).
- **`PageCard`** + **`PageToolbar`**: Card wrapper (automatically adapts to Theme Studio's `cardStyle`: `bordered`, `elevated`, `glass`) and filter bar.
- **`PageSearchInput`**: Debounced/instant search input with built-in magnifier icon and clear (`X`) button.
- **`PageSegmentedFilter`**: Pill-style segmented status/tab filter with optional badge counts.
- **`RefreshButton`**: Standardized refresh button that spins its icon when `loading={true}`.
- **`ResponsiveDataTable`**: **Mandatory for all tabular data.** Renders a full `<Table>` on desktop (supporting sticky headers, compact/normal/comfortable density, zebra striping, cell borders, and Surface palette colors) and automatically switches to `mobileCard` view on mobile viewports (`< 768px`).
- **`PagePagination`**: Standardized pagination footer (First / Prev / Next / Last).
- **`FormField`**: Standardized form field wrapper with label, required asterisk, hint, and error message.
- **`ConfirmDeleteDialog`**: Standardized destructive confirmation modal with loading state.

## 2. Theme Studio & Styling Compatibility
- **Never hardcode colors** (such as `bg-white`, `bg-slate-900`, `text-gray-800`, `border-gray-200`).
- Always use semantic design tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`) so the UI dynamically responds to all **8 Primary Palettes** and **8 Surface Palettes** (`default`, `slate`, `stone`, `linen`, `sand`, `sage`, `rosewood`, `pure`) in both Light and Dark modes.
- Data tables automatically inherit `--table-bg`, `--table-header-bg`, `--table-row-hover`, `--table-stripe-bg`, and `--table-border` from the active Surface palette.

## 3. Internationalization (i18n) & Routing
- Never hardcode user-facing strings in JSX. Add every new translation key to both `frontend-admin/src/locales/vi.json` and `frontend-admin/src/locales/en.json` and access via `useTranslation()`.
- Lazy-load feature pages in `frontend-admin/src/App.tsx` using `React.lazy(...)` and wrap routes with `<ProtectedRoute permission="<module>.view">`.
- Register navigation items in both `frontend-admin/src/components/layout/AppSidebar.tsx` and `frontend-admin/src/components/layout/CommandMenu.tsx` with the appropriate `permission` guard.
