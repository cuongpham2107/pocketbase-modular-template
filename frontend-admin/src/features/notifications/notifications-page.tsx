import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Eye,
  Info,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PageCard,
  PageErrorBanner,
  PageHeader,
  PagePagination,
  PageSearchInput,
  PageSegmentedFilter,
  PageShell,
  PageToolbar,
  RefreshButton,
  ResponsiveDataTable,
  type ResponsiveColumn,
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
          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-medium text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="size-2.5" />
          {type}
        </Badge>
      )
    case "error":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-destructive/30 bg-destructive/10 text-[10px] font-medium text-destructive"
        >
          <ShieldAlert className="size-2.5" />
          {type}
        </Badge>
      )
    case "system":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-purple-500/30 bg-purple-500/10 text-[10px] font-medium text-purple-600 dark:text-purple-400"
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
          className="gap-1 border-sky-500/30 bg-sky-500/10 text-[10px] font-medium text-sky-600 dark:text-sky-400"
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
  const [statusFilter, setStatusFilter] = React.useState<"all" | "unread" | "read">("all")
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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit))
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * limit
    return filteredItems.slice(start, start + limit)
  }, [filteredItems, page, limit])

  const uniqueTypes = React.useMemo(() => {
    const set = new Set<string>()
    store.items.forEach((item) => {
      if (item.type) set.add(item.type)
    })
    return Array.from(set)
  }, [store.items])

  const renderItemActions = (item: Notification) => (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {!item.read_at && (
        <Button
          size="icon"
          variant="ghost"
          title={t("notifications.markRead")}
          onClick={() => {
            void store.markRead(item.id)
            toast.success(t("notifications.markRead"))
          }}
          className="size-7 cursor-pointer rounded-lg text-muted-foreground hover:text-primary"
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
        className="size-7 cursor-pointer rounded-lg text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Xem chi tiết"
        onClick={() => setDetail(item)}
        className="size-7 cursor-pointer rounded-lg text-muted-foreground"
      >
        <Eye className="size-3.5" />
      </Button>
    </div>
  )

  const columns: ResponsiveColumn<Notification>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "w-16 text-center text-muted-foreground",
      cellClassName: "text-center font-mono text-[11px] text-muted-foreground",
      hideOnMobile: true,
      render: (item) => `#${String(item.id).slice(0, 6)}`,
    },
    {
      key: "status",
      header: "Trạng thái",
      headerClassName: "w-28",
      render: (item) =>
        item.read_at ? (
          <span className="text-xs text-muted-foreground">Đã đọc</span>
        ) : (
          <Badge className="border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary hover:bg-primary/15">
            Chưa đọc
          </Badge>
        ),
    },
    {
      key: "type",
      header: "Phân loại",
      headerClassName: "w-28",
      render: (item) => getTypeBadge(item.type),
    },
    {
      key: "title",
      header: "Tiêu đề",
      render: (item) => (
        <span
          className={cn(
            "text-xs",
            item.read_at ? "font-medium text-foreground/90" : "font-bold text-foreground",
          )}
        >
          {item.title}
        </span>
      ),
    },
    {
      key: "body",
      header: "Nội dung",
      cellClassName: "max-w-xs truncate text-xs text-muted-foreground",
      hideOnMobile: true,
      render: (item) => item.body || "—",
    },
    {
      key: "created",
      header: "Thời gian",
      headerClassName: "w-40",
      cellClassName: "text-xs text-muted-foreground font-mono whitespace-nowrap",
      render: (item) => formatTime(item.created_at, i18n.language),
    },
    {
      key: "actions",
      header: "Thao tác",
      headerClassName: "text-right text-muted-foreground pr-4",
      cellClassName: "text-right pr-4",
      render: (item) => renderItemActions(item),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={Bell}
        title={t("notifications.title")}
        description={t("notifications.pageDescription")}
        badge={
          store.unread > 0 ? (
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary"
            >
              {t("notifications.unread", { count: store.unread })}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <RefreshButton
              loading={busy || store.loading}
              label={t("common.refresh")}
              onClick={() => void run(() => store.reload())}
            />
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
          <PageSearchInput
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Tìm theo tiêu đề, nội dung..."
          />

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <PageSegmentedFilter
              label="Trạng thái:"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "unread", label: "Chưa đọc" },
                { value: "read", label: "Đã đọc" },
              ]}
            />

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-fit min-w-[8.5rem] cursor-pointer font-mono text-xs"
              >
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

        <PageErrorBanner message={store.error} />

        <ResponsiveDataTable
          data={paginatedItems}
          keyExtractor={(item) => item.id}
          columns={columns}
          onRowClick={(item) => setDetail(item)}
          rowClassName={(item) => (!item.read_at ? "bg-primary/[0.04]" : undefined)}
          loading={store.loading && filteredItems.length === 0}
          loadingText="Đang tải danh sách thông báo..."
          emptyIcon={Bell}
          emptyTitle={t("notifications.empty")}
          emptyDescription="Chưa có thông báo nào phù hợp với bộ lọc."
          renderMobileCard={(item) => (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {!item.read_at && (
                    <Badge className="border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary">
                      Chưa đọc
                    </Badge>
                  )}
                  {getTypeBadge(item.type)}
                </div>
                {renderItemActions(item)}
              </div>

              <p
                className={cn(
                  "text-xs",
                  item.read_at
                    ? "font-medium text-foreground/90"
                    : "font-bold text-foreground",
                )}
              >
                {item.title}
              </p>

              {item.body && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
              )}

              <p className="font-mono text-[10px] text-muted-foreground">
                {formatTime(item.created_at, i18n.language)}
              </p>
            </div>
          )}
        />

        <PagePagination
          page={page}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          perPage={limit}
          itemLabel="thông báo"
          loading={store.loading}
          onPageChange={setPage}
          onPerPageChange={setLimit}
        />
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
                    <Badge className="border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary">
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
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {detail.title}
                </p>
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
