import * as React from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import {
  LogIn,
  Layers,
  ShieldCheck,
  FolderArchive,
  FileUp,
  Server,
  Palette,
  Users,
  Sparkles,
  KeyRound,
  LayoutDashboard,
  Bell,
  ScrollText,
  ShieldAlert,
  Loader2,
} from "lucide-react"

import { AppSidebar } from "@/components/layout"
import { AuthScreen, ChangePasswordDialog } from "@/features/auth"
import { NotificationBell } from "@/features/notifications"

// Các trang nặng được tách bundle riêng — chỉ tải khi người dùng mở route tương ứng.
const PermissionManager = React.lazy(() =>
  import("@/features/rbac").then((m) => ({ default: m.PermissionManager })),
)
const MediaManager = React.lazy(() =>
  import("@/features/media").then((m) => ({ default: m.MediaManager })),
)
const GatewayStatus = React.lazy(() =>
  import("@/features/gateway").then((m) => ({ default: m.GatewayStatus })),
)
const UserManager = React.lazy(() =>
  import("@/features/users").then((m) => ({ default: m.UserManager })),
)
const DashboardOverview = React.lazy(() =>
  import("@/features/dashboard").then((m) => ({ default: m.DashboardOverview })),
)
const NotificationsPage = React.lazy(() =>
  // Import thẳng file trang: barrel `@/features/notifications` còn được import
  // tĩnh cho NotificationBell nên dynamic import qua barrel sẽ không tách chunk.
  import("@/features/notifications/notifications-page").then((m) => ({
    default: m.NotificationsPage,
  })),
)
const AuditPage = React.lazy(() =>
  import("@/features/audit").then((m) => ({ default: m.AuditPage })),
)
import { ThemeStudio } from "@/features/theme"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AnimateUIProvider } from "@animate-ui/react/provider"
import { ThemeProvider } from "@/features/theme/ThemeCustomizerContext"
import { useThemeCustomizer } from "@/features/theme/theme-context"
import { api } from "@/lib/api"
import { isGuest, setGuest } from "@/lib/session"
import { usePermissions } from "@/lib/permissions"
import { PermissionsProvider } from "@/lib/permissions-provider"
import { useModules, type ModuleName } from "@/lib/modules"
import { ModulesProvider } from "@/lib/modules-provider"
import type { User } from "@/types"

// Năm hiện tại cho footer — tính một lần lúc nạp module để render giữ tính thuần.
const CURRENT_YEAR = new Date().getFullYear()

const VIEW_TITLES: Record<string, { titleKey: string; icon: React.ComponentType<{ className?: string }> }> = {
  "/": { titleKey: "nav.dashboard", icon: LayoutDashboard },
  "/rbac": { titleKey: "nav.rbac", icon: ShieldCheck },
  "/media": { titleKey: "nav.media", icon: FolderArchive },
  "/users": { titleKey: "nav.users", icon: Users },
  "/gateway": { titleKey: "nav.gateway", icon: Server },
  "/notifications": { titleKey: "nav.notifications", icon: Bell },
  "/audit": { titleKey: "nav.audit", icon: ScrollText },
}

function currentView(pathname: string) {
  const match = Object.keys(VIEW_TITLES)
    .filter((path) => path !== "/")
    .find((path) => pathname.startsWith(path))
  return VIEW_TITLES[match ?? "/"]
}

function RequirePermission({ code, children }: { code: string; children: React.ReactNode }) {
  const { t } = useTranslation()
  const { can, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!can(code)) {
    return (
      <Card className="mx-auto max-w-md border-dashed">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <CardTitle className="text-sm font-bold">{t("permission.deniedTitle")}</CardTitle>
          <CardDescription className="text-xs">
            {t("permission.deniedHint", { permission: code })}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <>{children}</>
}

/** Chặn route của module backend đang tắt (xem internal/app/modules.go). */
function RequireModule({ name, children }: { name: ModuleName; children: React.ReactNode }) {
  const { has, loading } = useModules()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!has(name)) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Chỉ render children khi module backend đang bật; không chuyển trang. */
function ModuleOnly({ name, children }: { name: ModuleName; children: React.ReactNode }) {
  const { has } = useModules()
  return has(name) ? <>{children}</> : null
}

function AppContent() {
  const { t } = useTranslation()
  const { settings } = useThemeCustomizer()
  const location = useLocation()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = React.useState<User | null>(() => api.getStoredUser())
  // Luôn kiểm tra phiên qua refresh cookie khi tải trang (access token chỉ ở memory).
  const [isAuthChecking, setIsAuthChecking] = React.useState<boolean>(true)
  const [guestMode, setGuestMode] = React.useState<boolean>(() => isGuest())
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [backendStatus, setBackendStatus] = React.useState<
    "online" | "offline" | "checking"
  >("checking")

  // Check backend health & khôi phục phiên từ refresh cookie
  React.useEffect(() => {
    api
      .health()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"))

    // Lắng nghe sự kiện 401 Unauthorized từ bất kỳ API call nào để tự động đẩy ra đăng nhập
    const handleUnauthorized = () => {
      api.clearToken()
      setCurrentUser(null)
      setGuestMode(false)
      setGuest(false)
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized)

    api
      .bootstrap()
      .then((user) => {
        if (!user) return
        setCurrentUser(user)
        setGuestMode(false)
        window.dispatchEvent(new CustomEvent("theme:user-sync", { detail: user }))
      })
      .finally(() => setIsAuthChecking(false))

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized)
    }
  }, [])

  const handleLogout = () => {
    // Thu hồi refresh token ở server (xoá cookie httpOnly) rồi mới xoá session trong memory.
    void api.logout().finally(() => {
      setCurrentUser(null)
      setGuestMode(false)
      setGuest(false)
      navigate("/", { replace: true })
    })
  }

  // 0. IF AUTH IS CHECKING
  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">
            {t("auth.checkingSession")}
          </span>
        </div>
      </div>
    )
  }

  // 1. IF NOT LOGGED IN AND NOT GUEST: RENDER SHADCN LOGIN-02 BLOCK (SPLIT SCREEN)
  if (!currentUser && !guestMode) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground">
        {/* Left Column: Form & Brand */}
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12">
          {/* Header Bar */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
                <Layers className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground">{t("common.appName")}</span>
                <span className="text-[11px] text-muted-foreground font-medium">Enterprise Admin Panel</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeStudio />
            </div>
          </div>

          {/* Centered Form */}
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-sm">
              <AuthScreen
                onSuccess={(user) => {
                  setCurrentUser(user)
                  setGuestMode(false)
                  setGuest(false)
                  window.dispatchEvent(new CustomEvent("theme:user-sync", { detail: user }))
                  navigate("/", { replace: true })
                }}
                onGuestContinue={() => {
                  setGuest(true)
                  setGuestMode(true)
                }}
              />
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center sm:text-left text-[11px] text-muted-foreground/80 flex items-center justify-between">
            <span>&copy; {CURRENT_YEAR} {t("common.appName")}. All rights reserved.</span>
            <span className="hidden sm:inline font-mono text-[10px]">Go 1.24+ &middot; Gin &middot; React 19</span>
          </div>
        </div>

        {/* Right Column: Visual Cover & Platform Architecture (login-02) */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-muted/40 p-12 border-l border-border/50">
          {/* Background Decorative Mesh & Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background/40 to-primary/5 pointer-events-none" />
          <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Top Tag */}
          <div className="relative z-10 flex items-center gap-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-md px-3 py-1 text-xs font-semibold text-primary border-primary/25 shadow-2xs">
              <Sparkles className="size-3.5 mr-1.5 text-primary" />
              Hexagonal Architecture &amp; Clean Core
            </Badge>
          </div>

          {/* Center Graphic Showcase Cards */}
          <div className="relative z-10 my-auto space-y-4 max-w-md">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t("auth.coverTitle")}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("auth.coverSubtitle")}
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-card/80 border border-border/60 shadow-2xs backdrop-blur-md space-y-1.5">
                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="font-semibold text-xs text-foreground">{t("auth.featureRbacTitle")}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {t("auth.featureRbacDesc")}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card/80 border border-border/60 shadow-2xs backdrop-blur-md space-y-1.5">
                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileUp className="size-4" />
                </div>
                <div className="font-semibold text-xs text-foreground">Media Library</div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {t("auth.featureMediaDesc")}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card/80 border border-border/60 shadow-2xs backdrop-blur-md space-y-1.5">
                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Server className="size-4" />
                </div>
                <div className="font-semibold text-xs text-foreground">AI MCP Protocol</div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {t("auth.featureMcpDesc")}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-card/80 border border-border/60 shadow-2xs backdrop-blur-md p-3.5 space-y-1.5">
                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Palette className="size-4" />
                </div>
                <div className="font-semibold text-xs text-foreground">Theme Studio</div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {t("auth.featureThemeDesc")}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Metric / Tech Pill */}
          <div className="relative z-10 flex items-center justify-between p-3 rounded-xl bg-card/70 border border-border/50 backdrop-blur-md text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">{t("auth.coverFooter")}</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">&lt; 1ms latency</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. ADMIN PANEL LAYOUT
  const active = currentView(location.pathname)
  const ActiveIcon = active.icon

  const widthClass =
    {
      full: "max-w-full",
      // Thang phần trăm: phản hồi theo bề rộng thật của vùng nội dung.
      "90": "max-w-[90%]",
      "80": "max-w-[80%]",
      "70": "max-w-[70%]",
      "60": "max-w-[60%]",
      // Giá trị cũ (theme_settings đã lưu trước khi đổi thang) vẫn dùng được.
      "screen-2xl": "max-w-(--breakpoint-2xl)",
      "7xl": "max-w-7xl",
      "6xl": "max-w-6xl",
      "5xl": "max-w-5xl",
    }[settings.contentWidth] || "max-w-full"

  const densityClass =
    {
      tight: "p-3 sm:p-4 lg:p-5 space-y-4",
      normal: "p-4 sm:p-6 lg:p-8 space-y-6",
      spacious: "p-6 sm:p-8 lg:p-12 space-y-8",
    }[settings.density] || "p-4 sm:p-6 lg:p-8 space-y-6"

  return (
    <ModulesProvider>
    <PermissionsProvider enabled={Boolean(currentUser)}>
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": settings.sidebarWidth,
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-screen w-full bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
          {/* Left Navigation */}
          <AppSidebar
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Right Main Inset */}
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            {/* Top Sticky Header */}
            <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/90 px-4 backdrop-blur-md transition-[width,height] duration-200 ease-in-out">
              <SidebarTrigger
                className="-ml-1 cursor-pointer hover:bg-muted"
                title={t("nav.toggleSidebar")}
              />
              <Separator orientation="vertical" className="mr-2 h-4" />

              {/* Breadcrumb Navigation */}
              <Breadcrumb className="hidden sm:block">
                <BreadcrumbList className="text-xs">
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="/"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>{t("common.appName")}</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground flex items-center gap-1.5">
                      <ActiveIcon className="h-3.5 w-3.5 text-primary" />
                      <span>{t(active.titleKey)}</span>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {/* Right Header Status & Actions */}
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* Backend Status Pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-muted/40 border-border/50">
                  <span
                    className={`size-2 rounded-full ${
                      backendStatus === "online"
                        ? "bg-emerald-500 animate-pulse"
                        : backendStatus === "offline"
                        ? "bg-destructive"
                        : "bg-amber-400"
                    }`}
                  />
                  <span className="hidden md:inline text-muted-foreground">API :8080</span>
                  <span className="font-bold text-foreground capitalize">
                    {backendStatus}
                  </span>
                </div>

                {/* Guest vs User indicator */}
                {guestMode && !currentUser ? (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-500 border-amber-500/30 font-semibold"
                    >
                      {t("auth.guestBadge")}
                    </Badge>
                    <Button
                      size="xs"
                      onClick={() => setGuestMode(false)}
                      className="h-7 text-xs font-semibold gap-1 shadow-xs"
                    >
                      <LogIn className="size-3.5" />
                      <span>{t("auth.submitLogin")}</span>
                    </Button>
                  </div>
                ) : currentUser ? (
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>{t("common.role")}:</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase font-mono font-bold"
                    >
                      {currentUser.role || "User"}
                    </Badge>
                  </div>
                ) : null}

                {currentUser && (
                  <ModuleOnly name="notifications">
                    <NotificationBell
                      enabled
                      onNewNotification={(notification) =>
                        toast(t("notifications.newToast"), { description: notification.title })
                      }
                    />
                  </ModuleOnly>
                )}

                <LanguageSwitcher />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasswordDialogOpen(true)}
                  title={t("common.changePassword")}
                  disabled={!currentUser}
                  className="hidden sm:inline-flex h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <KeyRound className="size-3.5" />
                  <span className="hidden lg:inline">{t("common.changePassword")}</span>
                </Button>

                <ThemeStudio />
              </div>
            </header>

            {/* Main Workspace Body with Dynamic Max-Width & Density */}
            <div className={`mx-auto w-full transition-all duration-200 ${widthClass} ${densityClass}`}>
              <React.Suspense
                fallback={
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                }
              >
              <Routes>
                <Route
                  path="/"
                  element={<DashboardOverview currentUser={currentUser} onNavigate={navigate} />}
                />
                <Route
                  path="/rbac"
                  element={
                    <RequirePermission code="roles:view">
                      <PermissionManager currentUser={currentUser} />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequirePermission code="users:view">
                      <UserManager />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/media"
                  element={
                    <RequireModule name="media">
                      <RequirePermission code="media:view">
                        <MediaManager currentUser={currentUser} />
                      </RequirePermission>
                    </RequireModule>
                  }
                />
                <Route path="/files" element={<Navigate to="/media" replace />} />
                <Route path="/gateway" element={<GatewayStatus />} />
                <Route
                  path="/notifications"
                  element={
                    <RequireModule name="notifications">
                      <NotificationsPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <RequireModule name="audit">
                      <RequirePermission code="audit:view">
                        <AuditPage />
                      </RequirePermission>
                    </RequireModule>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </React.Suspense>
            </div>
          </SidebarInset>
        </div>

        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          onChanged={handleLogout}
        />

        <Toaster position="top-right" />
      </SidebarProvider>
    </PermissionsProvider>
    </ModulesProvider>
  )
}

export function App() {
  return (
    <AnimateUIProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AnimateUIProvider>
  )
}

export default App
