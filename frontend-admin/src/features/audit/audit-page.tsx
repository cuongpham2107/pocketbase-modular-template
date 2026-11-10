import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  ScrollText,
  XCircle,
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
import { api, ApiError } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { AuditFilterOptions, AuditLog } from "@/types"

const CSV_COLUMNS: Array<keyof AuditLog> = [
  "id",
  "created_at",
  "actor_email",
  "action",
  "resource",
  "resource_id",
  "status",
  "ip",
  "request_id",
  "trace_id",
  "detail",
]

function formatTime(iso: string, locale: string): string {
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

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCSV(rows: AuditLog[]): string {
  const header = CSV_COLUMNS.join(",")
  const body = rows.map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(","))
  return [header, ...body].join("\n")
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
        <CheckCircle2 className="mr-1 size-3" />
        Thành công
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="text-[10px] font-semibold">
      <XCircle className="mr-1 size-3" />
      Thất bại
    </Badge>
  )
}

function DetailRow({
  label,
  value,
  mono = true,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  const onCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      toast.success(label, { description: value })
    } catch {
      /* clipboard bị chặn — bỏ qua */
    }
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onCopy()}
            className="h-5 cursor-pointer gap-1 px-1.5 text-[10px] text-muted-foreground"
          >
            <Copy className="size-2.5" />
          </Button>
        )}
      </div>
      <p className={cn("break-all text-xs", mono && "font-mono text-[11px]")}>
        {value || "—"}
      </p>
    </div>
  )
}

export function AuditPage() {
  const { t, i18n } = useTranslation()
  const { can } = usePermissions()
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(20)
  const [status, setStatus] = React.useState<"all" | "success" | "failure">("all")
  const [search, setSearch] = React.useState("")
  const [action, setAction] = React.useState("")
  const [resource, setResource] = React.useState("")
  const [filters, setFilters] = React.useState({
    q: "",
    status: "all",
    action: "",
    resource: "",
  })
  const [reloadTick, setReloadTick] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<AuditLog | null>(null)
  const [options, setOptions] = React.useState<AuditFilterOptions>({
    actions: [],
    resources: [],
  })

  React.useEffect(() => {
    let cancelled = false
    api
      .getAuditFilters()
      .then((next) => {
        if (!cancelled) setOptions(next)
      })
      .catch(() => {
        /* lọc vẫn dùng được với "tất cả" */
      })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters({
        q: search.trim(),
        status,
        action: action.trim(),
        resource: resource.trim(),
      })
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, status, action, resource])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const paramsFilter: Record<string, string> = {}
    if (filters.status !== "all") paramsFilter.status = filters.status
    if (filters.action) paramsFilter.action = filters.action
    if (filters.resource) paramsFilter.resource = filters.resource

    api
      .listAuditLogs({
        page,
        perPage,
        q: filters.q || undefined,
        filters: Object.keys(paramsFilter).length ? paramsFilter : undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setLogs(res.data)
          setTotal(res.pagination.total_items)
          setTotalPages(Math.max(1, res.pagination.total_pages))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t("common.unknownError"))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, perPage, filters, reloadTick, t])

  const exportCSV = () => {
    if (logs.length === 0) {
      toast.info(t("audit.exportEmpty"))
      return
    }
    const blob = new Blob([`\uFEFF${toCSV(logs)}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(t("audit.exported", { count: logs.length }))
  }

  const columns: ResponsiveColumn<AuditLog>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "w-16 text-center text-muted-foreground",
      cellClassName: "text-center font-mono text-[11px] text-muted-foreground",
      hideOnMobile: true,
      render: (log) => `#${String(log.id).slice(0, 6)}`,
    },
    {
      key: "time",
      header: t("audit.time"),
      headerClassName: "w-40",
      cellClassName: "text-xs text-muted-foreground font-mono whitespace-nowrap",
      render: (log) => formatTime(log.created_at, i18n.language),
    },
    {
      key: "actor",
      header: t("audit.actor"),
      render: (log) => {
        const initial = (log.actor_email || "A").charAt(0).toUpperCase()
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {initial}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="max-w-44 truncate text-xs font-semibold text-foreground">
                {log.actor_email || "—"}
              </span>
              {log.trace_id && (
                <span className="max-w-36 truncate font-mono text-[10px] text-muted-foreground">
                  Trace: {log.trace_id.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: "action",
      header: t("audit.action"),
      headerClassName: "w-28",
      render: (log) => (
        <Badge
          variant="outline"
          className="bg-muted/40 font-mono text-[10px] font-semibold"
        >
          {log.action}
        </Badge>
      ),
    },
    {
      key: "resource",
      header: t("audit.resource"),
      render: (log) =>
        log.resource ? (
          <span className="font-mono text-xs text-foreground/90">
            {log.resource}
            {log.resource_id ? (
              <span className="font-normal text-muted-foreground"> #{log.resource_id}</span>
            ) : (
              ""
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: t("audit.status"),
      headerClassName: "w-32",
      render: (log) => <StatusBadge status={log.status} />,
    },
    {
      key: "ip",
      header: t("audit.ip"),
      headerClassName: "w-32",
      cellClassName: "font-mono text-xs text-muted-foreground",
      hideOnMobile: true,
      render: (log) => log.ip || "127.0.0.1",
    },
    {
      key: "detail",
      header: "Chi tiết",
      headerClassName: "text-right text-muted-foreground pr-4",
      cellClassName: "text-right pr-4",
      render: () => (
        <Button size="icon" variant="ghost" className="size-7 rounded-lg">
          <Eye className="size-3.5 text-muted-foreground" />
        </Button>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        icon={ScrollText}
        title={t("audit.title")}
        description={t("audit.pageDescription", { total })}
        badge={
          <Badge variant="outline" className="px-2 py-0.5 font-mono text-[11px]">
            {total} bản ghi
          </Badge>
        }
        actions={
          <>
            <RefreshButton
              loading={loading}
              label={t("common.refresh")}
              onClick={() => setReloadTick((v) => v + 1)}
            />
            {can("audit:export") && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer gap-1.5 text-xs"
                onClick={exportCSV}
                disabled={loading}
              >
                <Download className="size-3.5" />
                {t("common.export")}
              </Button>
            )}
          </>
        }
      />

      <PageCard>
        <PageToolbar>
          <PageSearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("audit.searchPlaceholder")}
          />

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <PageSegmentedFilter
              label="Kết quả:"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "success", label: "Thành công" },
                { value: "failure", label: "Thất bại" },
              ]}
            />

            <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
              <SelectTrigger
                size="sm"
                title={action || t("audit.allAction")}
                className="h-8 w-fit min-w-[8.5rem] max-w-[13rem] cursor-pointer font-mono text-xs"
              >
                <SelectValue placeholder={t("audit.filterAction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("audit.allAction")}</SelectItem>
                {options.actions.map((value) => (
                  <SelectItem key={value} value={value} className="font-mono text-xs">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={resource || "all"}
              onValueChange={(v) => setResource(v === "all" ? "" : v)}
            >
              <SelectTrigger
                size="sm"
                title={resource || t("audit.allResource")}
                className="h-8 w-fit min-w-[8.5rem] max-w-[13rem] cursor-pointer font-mono text-xs"
              >
                <SelectValue placeholder={t("audit.filterResource")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("audit.allResource")}</SelectItem>
                {options.resources.map((value) => (
                  <SelectItem key={value} value={value} className="font-mono text-xs">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        <PageErrorBanner message={error} />

        <ResponsiveDataTable
          data={logs}
          keyExtractor={(log) => log.id}
          columns={columns}
          onRowClick={(log) => setDetail(log)}
          loading={loading}
          loadingText="Đang tải nhật ký thao tác..."
          emptyIcon={ScrollText}
          emptyTitle={t("audit.empty")}
          emptyDescription="Không tìm thấy bản ghi nhật ký phù hợp với bộ lọc."
          renderMobileCard={(log) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-muted/40 font-mono text-[10px] font-semibold"
                  >
                    {log.action}
                  </Badge>
                  <span className="truncate font-mono text-xs font-semibold text-foreground">
                    {log.resource || "—"}
                    {log.resource_id ? ` #${log.resource_id}` : ""}
                  </span>
                </div>
                <StatusBadge status={log.status} />
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{log.actor_email || "—"}</span>
                <span className="shrink-0 font-mono">
                  {formatTime(log.created_at, i18n.language)}
                </span>
              </div>
            </div>
          )}
        />

        <PagePagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          perPage={perPage}
          perPageOptions={[10, 20, 50, 100]}
          itemLabel="bản ghi"
          loading={loading}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </PageCard>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border/60 pb-3">
            <SheetTitle className="text-sm font-bold">{t("audit.detail")}</SheetTitle>
            <SheetDescription className="font-mono text-[11px]">
              #{detail?.id} · {detail ? formatTime(detail.created_at, i18n.language) : ""}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="space-y-4 px-4 py-4 text-xs">
              <DetailRow label={t("audit.actor")} value={detail.actor_email} mono={false} />
              <DetailRow label={t("audit.action")} value={detail.action} />
              <DetailRow
                label={t("audit.resource")}
                value={
                  detail.resource
                    ? `${detail.resource}${detail.resource_id ? `#${detail.resource_id}` : ""}`
                    : null
                }
              />
              <DetailRow label={t("audit.status")} value={detail.status} mono={false} />
              <DetailRow label={t("audit.ip")} value={detail.ip} />
              <DetailRow label="request_id" value={detail.request_id} />
              <DetailRow label="trace_id" value={detail.trace_id} />
              <DetailRow label="user_agent" value={detail.user_agent} mono={false} />
              <DetailRow label={t("audit.detail")} value={detail.detail} mono={false} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
