import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  RefreshCw,
  ScrollText,
  Search,
  XCircle,
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
import { PageCard, PageFooter, PageHeader, PageShell, PageToolbar } from "@/components/layout/page"
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
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
      <p className={cn("break-all text-xs", mono && "font-mono text-[11px]")}>{value || "—"}</p>
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
  const [status, setStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [action, setAction] = React.useState("")
  const [resource, setResource] = React.useState("")
  const [filters, setFilters] = React.useState({ q: "", status: "all", action: "", resource: "" })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<AuditLog | null>(null)
  const [options, setOptions] = React.useState<AuditFilterOptions>({ actions: [], resources: [] })

  // Nạp danh sách giá trị cho dropdown lọc
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

  // Debounce bộ lọc
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters({ q: search.trim(), status, action: action.trim(), resource: resource.trim() })
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, status, action, resource])

  // Gọi API lấy danh sách
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
  }, [page, perPage, filters, t])

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
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer gap-1.5 text-xs"
              onClick={() => setPage((p) => p)}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </Button>
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
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("audit.searchPlaceholder")}
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium">Kết quả:</span>
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setStatus("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  status === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatus("success")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  status === "success" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Thành công
              </button>
              <button
                type="button"
                onClick={() => setStatus("failure")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  status === "failure" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Thất bại
              </button>
            </div>

            <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
              <SelectTrigger
                size="sm"
                title={action || t("audit.allAction")}
                className="h-8 w-fit min-w-[9rem] max-w-[14rem] text-xs cursor-pointer font-mono"
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

            <Select value={resource || "all"} onValueChange={(v) => setResource(v === "all" ? "" : v)}>
              <SelectTrigger
                size="sm"
                title={resource || t("audit.allResource")}
                className="h-8 w-fit min-w-[9rem] max-w-[14rem] text-xs cursor-pointer font-mono"
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

        {error && (
          <div className="p-3 m-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-16 text-center text-xs font-bold text-muted-foreground">ID</TableHead>
              <TableHead className="w-40 text-xs font-bold text-foreground">{t("audit.time")}</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("audit.actor")}</TableHead>
              <TableHead className="w-28 text-xs font-bold text-foreground">{t("audit.action")}</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("audit.resource")}</TableHead>
              <TableHead className="w-32 text-xs font-bold text-foreground">{t("audit.status")}</TableHead>
              <TableHead className="w-32 text-xs font-bold text-foreground">{t("audit.ip")}</TableHead>
              <TableHead className="text-right text-xs font-bold text-muted-foreground pr-4">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Đang tải nhật ký thao tác...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ScrollText className="size-8 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">{t("audit.empty")}</p>
                    <p className="text-[11px] text-muted-foreground">Không tìm thấy bản ghi nhật ký phù hợp với bộ lọc.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const initial = (log.actor_email || "A").charAt(0).toUpperCase()
                const isSuccess = log.status === "success"

                return (
                  <TableRow
                    key={log.id}
                    onClick={() => setDetail(log)}
                    className="hover:bg-muted/30 transition-colors border-border/50 cursor-pointer"
                  >
                    <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                      #{String(log.id).slice(0, 6)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {formatTime(log.created_at, i18n.language)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full flex items-center justify-center font-bold text-xs bg-muted text-muted-foreground">
                          {initial}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-44">
                            {log.actor_email || "—"}
                          </span>
                          {log.trace_id && (
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-36">
                              Trace: {log.trace_id.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] font-semibold bg-muted/40"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {log.resource ? (
                        <span className="font-mono text-xs text-foreground/90">
                          {log.resource}
                          {log.resource_id ? <span className="text-muted-foreground font-normal"> #{log.resource_id}</span> : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {isSuccess ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15 font-semibold text-[10px]">
                          <CheckCircle2 className="size-3 mr-1" />
                          Thành công
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-semibold text-[10px]">
                          <XCircle className="size-3 mr-1" />
                          Thất bại
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip || "127.0.0.1"}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <Button size="icon" variant="ghost" className="size-7 rounded-lg">
                        <Eye className="size-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        <PageFooter>
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="bg-background border border-border/60 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>trên tổng số <strong className="text-foreground">{total}</strong> bản ghi</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 cursor-pointer px-2 text-xs"
            >
              <ChevronLeft className="size-3 mr-1" />
              Trước
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 cursor-pointer px-2 text-xs"
            >
              Sau
              <ChevronRight className="size-3 ml-1" />
            </Button>
          </div>
        </PageFooter>
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
                value={detail.resource ? `${detail.resource}${detail.resource_id ? `#${detail.resource_id}` : ""}` : null}
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
