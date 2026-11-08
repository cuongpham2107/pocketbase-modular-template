import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  PageCard,
  PageFooter,
  PageHeader,
  PageShell,
  PageToolbar,
} from "@/components/layout/page"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types"

import { useNotifications } from "./use-notifications"

function formatTime(iso: string, locale: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function getTypeBadge(type: string) {
  switch (type?.toLowerCase()) {
    case "warning":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/30 bg-amber-500/10 font-medium text-[10px] text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="size-2.5" />
          {type}
        </Badge>
      )
    case "error":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-destructive/30 bg-destructive/10 font-medium text-[10px] text-destructive"
        >
          <ShieldAlert className="size-2.5" />
          {type}
        </Badge>
      )
    case "system":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-purple-500/30 bg-purple-500/10 font-medium text-[10px] text-purple-600 dark:text-purple-400"
        >
          <Sparkles className="size-2.5" />
          {type}
        </Badge>
      )
    case "info":
    default:
      return (
        <Badge
          variant="outline"
          className="gap-1 border-sky-500/30 bg-sky-500/10 font-medium text-[10px] text-sky-600 dark:text-sky-400"
        >
          <Info className="size-2.5" />
          {type || "info"}
        </Badge>
      )
  }
}

export function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const store = useNotifications(true)
  const [busy, setBusy] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [detail, setDetail] = React.useState<Notification | null>(null)
  const [limit, setLimit] = React.useState(10)
  const [page, setPage] = React.useState(1)

  const run = React.useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }, [])

  // Lọc dữ liệu thông báo theo tìm kiếm, trạng thái và loại
  const filteredItems = React.useMemo(() => {
    return store.items.filter((item) => {
      if (statusFilter === "unread" && item.read_at) return false
      if (statusFilter === "read" && !item.read_at) return false
      if (typeFilter !== "all" && item.type !== typeFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = item.title?.toLowerCase().includes(q)
        const matchBody = item.body?.toLowerCase().includes(q)
        if (!matchTitle && !matchBody) return false
      }

      return true
    })
  }, [store.items, statusFilter, typeFilter, search])

  // Phân trang phía client cho các items đã lọc
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit))
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * limit
    return filteredItems.slice(start, start + limit)
  }, [filteredItems, page, limit])

  // Lấy các type duy nhất từ items
  const uniqueTypes = React.useMemo(() => {
    const set = new Set<string>()
    store.items.forEach((item) => {
      if (item.type) set.add(item.type)
    })
    return Array.from(set)
  }, [store.items])

  return (
    <PageShell>
      <PageHeader
        icon={Bell}
        title={t("notifications.title")}
        description={t("notifications.pageDescription")}
        badge={
          store.unread > 0 ? (
            <Badge variant="outline" className="px-2 py-0.5 font-mono text-[11px] bg-primary/10 text-primary border-primary/20">
              {t("notifications.unread", { count: store.unread })}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer gap-1.5 text-xs"
              disabled={busy || store.loading}
              onClick={() => void run(() => store.reload())}
            >
              {busy || store.loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {t("common.refresh")}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
              disabled={store.unread === 0 || busy}
              onClick={() => {
                void run(async () => {
                  await store.markAllRead()
                  toast.success(t("notifications.markAllRead"))
                })
              }}
            >
              <CheckCheck className="size-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          </>
        }
      />

      <PageCard>
        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tiêu đề, nội dung..."
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium">Trạng thái:</span>
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all")
                  setPage(1)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("unread")
                  setPage(1)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === "unread" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Chưa đọc
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("read")
                  setPage(1)
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === "read" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Đã đọc
              </button>
            </div>

            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger size="sm" className="h-8 w-fit min-w-[8.5rem] cursor-pointer text-xs font-mono">
                <SelectValue placeholder="Loại thông báo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type} className="font-mono text-xs">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        {store.error && (
          <div className="p-3 m-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {store.error}
          </div>
        )}

        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-16 text-center text-xs font-bold text-muted-foreground">ID</TableHead>
              <TableHead className="w-28 text-xs font-bold text-foreground">Trạng thái</TableHead>
              <TableHead className="w-28 text-xs font-bold text-foreground">Phân loại</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Tiêu đề</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Nội dung</TableHead>
              <TableHead className="w-40 text-xs font-bold text-foreground">Thời gian</TableHead>
              <TableHead className="text-right text-xs font-bold text-muted-foreground pr-4">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.loading && filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Đang tải danh sách thông báo...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Bell className="size-8 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">{t("notifications.empty")}</p>
                    <p className="text-[11px] text-muted-foreground">Chưa có thông báo nào phù hợp với bộ lọc.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setDetail(item)}
                  className={cn(
                    "hover:bg-muted/30 transition-colors border-border/50 cursor-pointer",
                    !item.read_at && "bg-primary/[0.04]",
                  )}
                >
                  {/* ID */}
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                    #{String(item.id).slice(0, 6)}
                  </TableCell>

                  {/* Trạng thái */}
                  <TableCell>
                    {item.read_at ? (
                      <span className="text-xs text-muted-foreground">Đã đọc</span>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/25 hover:bg-primary/15 font-semibold text-[10px]">
                        Chưa đọc
                      </Badge>
                    )}
                  </TableCell>

                  {/* Loại */}
                  <TableCell>
                    {getTypeBadge(item.type)}
                  </TableCell>

                  {/* Tiêu đề */}
                  <TableCell>
                    <span className={cn("text-xs", item.read_at ? "text-foreground/90 font-medium" : "text-foreground font-bold")}>
                      {item.title}
                    </span>
                  </TableCell>

                  {/* Nội dung */}
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {item.body || "—"}
                  </TableCell>

                  {/* Thời gian */}
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {formatTime(item.created_at, i18n.language)}
                  </TableCell>

                  {/* Thao tác */}
                  <TableCell
                    className="text-right pr-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {!item.read_at && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t("notifications.markRead")}
                          onClick={() => {
                            void store.markRead(item.id)
                            toast.success(t("notifications.markRead"))
                          }}
                          className="size-7 rounded-lg text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t("common.delete")}
                        onClick={() => {
                          void store.remove(item.id)
                          toast.success(t("notifications.deleted"))
                        }}
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Xem chi tiết"
                        onClick={() => setDetail(item)}
                        className="size-7 rounded-lg text-muted-foreground cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <PageFooter>
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="bg-background border border-border/60 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>trên tổng số <strong className="text-foreground">{filteredItems.length}</strong> thông báo</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              Trang {page} / {totalPages}
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || store.loading}
              className="h-7 cursor-pointer px-2 text-xs"
            >
              <ChevronLeft className="size-3 mr-1" />
              Trước
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || store.loading}
              className="h-7 cursor-pointer px-2 text-xs"
            >
              Sau
              <ChevronRight className="size-3 ml-1" />
            </Button>
          </div>
        </PageFooter>
      </PageCard>

      {/* Drawer xem chi tiết thông báo */}
      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border/60 pb-3">
            <SheetTitle className="text-sm font-bold">Chi tiết thông báo</SheetTitle>
            <SheetDescription className="font-mono text-[11px]">
              #{detail?.id} · {detail ? formatTime(detail.created_at, i18n.language) : ""}
            </SheetDescription>
          </SheetHeader>

          {detail && (
            <div className="space-y-4 px-4 py-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trạng thái
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {detail.read_at ? (
                    <span className="text-muted-foreground">
                      Đã đọc vào {formatTime(detail.read_at, i18n.language)}
                    </span>
                  ) : (
                    <Badge className="bg-primary/10 text-primary border-primary/25 font-semibold text-[10px]">
                      Chưa đọc
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phân loại
                </span>
                <div className="mt-1">{getTypeBadge(detail.type)}</div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tiêu đề
                </span>
                <p className="mt-1 font-semibold text-foreground text-sm">{detail.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nội dung chi tiết
                </span>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {detail.body || "Không có nội dung chi tiết"}
                </p>
              </div>

              {detail.data && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dữ liệu kèm theo
                  </span>
                  <pre className="mt-1 overflow-x-auto rounded border bg-muted/30 p-2 font-mono text-[10px]">
                    {detail.data}
                  </pre>
                </div>
              )}

              <div className="flex items-center gap-2 border-t pt-4">
                {!detail.read_at && (
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1 text-xs"
                    onClick={() => {
                      void store.markRead(detail.id)
                      setDetail((prev) =>
                        prev ? { ...prev, read_at: new Date().toISOString() } : null,
                      )
                      toast.success(t("notifications.markRead"))
                    }}
                  >
                    <Check className="size-3" />
                    {t("notifications.markRead")}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => {
                    void store.remove(detail.id)
                    setDetail(null)
                    toast.success(t("notifications.deleted"))
                  }}
                >
                  <Trash2 className="size-3" />
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
