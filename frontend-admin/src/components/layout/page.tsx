import * as React from "react"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Bộ khung trang & các thành phần quản trị dùng chung cho mọi trang Admin:
 *
 *   <PageShell>
 *     <PageHeader icon={Icon} title description badge actions={<RefreshButton ... />} />
 *     <PageCard>
 *       <PageToolbar>
 *         <PageSearchInput ... />
 *         <PageSegmentedFilter ... />
 *       </PageToolbar>
 *       <PageErrorBanner message={error} />
 *       <ResponsiveDataTable columns={...} renderMobileCard={...} />
 *       <PagePagination ... />
 *     </PageCard>
 *   </PageShell>
 */

export interface PageShellProps extends React.ComponentProps<"div"> {}

/** Khung dọc duy nhất của một trang, đặt dưới header của App. */
export function PageShell({ className, ...props }: PageShellProps) {
  return <div className={cn("flex w-full flex-col gap-4 pb-16", className)} {...props} />
}

export interface PageHeaderProps {
  /** Tiêu đề trang. */
  title: React.ReactNode
  /** Một câu mô tả ngắn; bỏ trống thì không chiếm chỗ. */
  description?: React.ReactNode
  /** Icon hiển thị trong ô vuông nhấn màu primary. */
  icon?: LucideIcon
  /** Nhãn nhỏ cạnh tiêu đề (số lượng, trạng thái...). */
  badge?: React.ReactNode
  /** Nút hành động bên phải: làm mới, thêm mới, xuất dữ liệu... */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </div>
  )
}

export interface PageCardProps extends React.ComponentProps<typeof Card> {}

/** Khung nội dung chính (bảng/danh sách) — bo góc và viền thống nhất. */
export function PageCard({ className, ...props }: PageCardProps) {
  return (
    <Card
      className={cn("overflow-hidden rounded-2xl border-border/60 shadow-xs", className)}
      {...props}
    />
  )
}

export interface PageToolbarProps extends React.ComponentProps<"div"> {}

/** Thanh lọc/tìm kiếm đặt trên cùng của PageCard. */
export function PageToolbar({ className, ...props }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 border-b border-border/40 px-3.5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4",
        className,
      )}
      {...props}
    />
  )
}

export interface PageFooterProps extends React.ComponentProps<"div"> {}

/** Chân trang: phân trang, tổng số bản ghi. */
export function PageFooter({ className, ...props }: PageFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 border-t border-border/40 px-3.5 py-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4",
        className,
      )}
      {...props}
    />
  )
}

// ============================================================================
// Shared Action & Filter Controls
// ============================================================================

export interface RefreshButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "children"> {
  loading?: boolean
  label?: React.ReactNode
}

/** Nút Làm mới chuẩn hóa với hiệu ứng xoay icon khi đang tải. */
export function RefreshButton({
  loading = false,
  label = "Làm mới",
  className,
  disabled,
  ...props
}: RefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled ?? loading}
      className={cn("h-8 cursor-pointer gap-1.5 text-xs", className)}
      {...props}
    >
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      <span>{label}</span>
    </Button>
  )
}

export interface PageSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  clearable?: boolean
  "data-testid"?: string
}

/** Ô tìm kiếm dùng chung trên PageToolbar. */
export function PageSearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className,
  clearable = true,
  "data-testid": testId,
}: PageSearchInputProps) {
  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className={cn("h-8 bg-muted/20 pl-8 text-xs", clearable && value && "pr-7")}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Xóa tìm kiếm"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
}

export interface PageSegmentedFilterProps<T extends string = string> {
  label?: React.ReactNode
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

/** Bộ lọc chuyển tab nhanh (Segmented Pills) thân thiện với cả Desktop và Mobile. */
export function PageSegmentedFilter<T extends string = string>({
  label,
  value,
  onChange,
  options,
  className,
}: PageSegmentedFilterProps<T>) {
  return (
    <div className={cn("flex items-center gap-2 max-w-full", className)}>
      {label && (
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex items-center overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Hộp hiển thị lỗi đồng bộ. */
export function PageErrorBanner({
  message,
  className,
}: {
  message?: string | null
  className?: string
}) {
  if (!message) return null
  return (
    <div
      className={cn(
        "m-3.5 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive sm:m-4",
        className,
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ============================================================================
// Responsive Data Table (Desktop Table + Mobile Card View)
// ============================================================================

export interface ResponsiveColumn<T> {
  key: string
  header: React.ReactNode
  headerClassName?: string
  cellClassName?: string
  /** Ẩn cột phụ trên màn hình nhỏ (< lg) khi vẫn ở chế độ bảng. */
  hideOnMobile?: boolean
  render: (item: T) => React.ReactNode
}

export interface ResponsiveDataTableProps<T> {
  data: T[]
  keyExtractor: (item: T) => string | number
  columns: ResponsiveColumn<T>[]
  /** Nếu truyền vào, trên màn hình nhỏ (< md) sẽ hiển thị danh sách Card thay vì bảng tràn ngang. */
  renderMobileCard?: (item: T) => React.ReactNode
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string | undefined
  loading?: boolean
  loadingText?: string
  emptyIcon?: LucideIcon
  emptyTitle: React.ReactNode
  emptyDescription?: React.ReactNode
}

export function ResponsiveDataTable<T>({
  data,
  keyExtractor,
  columns,
  renderMobileCard,
  onRowClick,
  rowClassName,
  loading = false,
  loadingText = "Đang tải dữ liệu...",
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: ResponsiveDataTableProps<T>) {
  if (loading && data.length === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>{loadingText}</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
        {EmptyIcon && <EmptyIcon className="size-8 text-muted-foreground/60" />}
        <p className="font-semibold text-foreground">{emptyTitle}</p>
        {emptyDescription && (
          <p className="max-w-sm text-[11px] text-muted-foreground">{emptyDescription}</p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card List (< md) */}
      {renderMobileCard && (
        <div className="divide-y divide-border/50 md:hidden">
          {data.map((item) => {
            const key = keyExtractor(item)
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "p-3.5 transition-colors",
                  onRowClick && "cursor-pointer active:bg-muted/40",
                  rowClassName?.(item),
                )}
              >
                {renderMobileCard(item)}
              </div>
            )
          })}
        </div>
      )}

      {/* Desktop Table (>= md when renderMobileCard is provided) */}
      <div className={cn(renderMobileCard && "hidden md:block")}>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-bold text-foreground",
                    col.hideOnMobile && "hidden lg:table-cell",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const key = keyExtractor(item)
              return (
                <TableRow
                  key={key}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={cn(
                    "border-border/50 transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(item),
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.hideOnMobile && "hidden lg:table-cell",
                        col.cellClassName,
                      )}
                    >
                      {col.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

// ============================================================================
// Shared Pagination Footer
// ============================================================================

export interface PagePaginationProps {
  page: number
  totalPages: number
  totalItems: number
  perPage: number
  perPageOptions?: number[]
  itemLabel?: string
  loading?: boolean
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

/** Chân trang phân trang dùng chung cho mọi bảng dữ liệu. */
export function PagePagination({
  page,
  totalPages,
  totalItems,
  perPage,
  perPageOptions = [5, 10, 20, 50],
  itemLabel = "bản ghi",
  loading = false,
  onPageChange,
  onPerPageChange,
}: PagePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)

  return (
    <PageFooter>
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            value={perPage}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>
            trên tổng số <strong className="text-foreground">{totalItems}</strong>{" "}
            {itemLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="font-mono text-[11px]">
          Trang {page} / {safeTotalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="h-7 cursor-pointer px-2 text-xs"
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Trước
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
            disabled={page >= safeTotalPages || loading}
            className="h-7 cursor-pointer px-2 text-xs"
          >
            Sau
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </div>
    </PageFooter>
  )
}

// ============================================================================
// Shared Form Field & Confirm Delete Dialog
// ============================================================================

export interface FormFieldProps {
  label: React.ReactNode
  icon?: LucideIcon
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/** Khung nhãn + ô nhập liệu chuẩn hóa cho các Modal / Form. */
export function FormField({
  label,
  icon: Icon,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {Icon && <Icon className="size-3.5 text-muted-foreground" />}
          <span>
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </span>
        </label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  error?: string | null
  loading?: boolean
  confirmLabel?: string
  onConfirm: () => void
}

/** Hộp thoại xác nhận xóa dùng chung (thay thế cả Dialog lặp lẫn window.confirm). */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  loading = false,
  confirmLabel = "Xóa vĩnh viễn",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="size-4" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-8 cursor-pointer text-xs"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="h-8 cursor-pointer text-xs font-semibold"
          >
            {loading ? "Đang xóa..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
