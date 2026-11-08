import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Bộ khung trang dùng chung cho mọi trang admin.
 *
 * Trước đây mỗi trang tự dựng `div`/`Card`/`h1` theo một kiểu riêng nên tiêu đề,
 * mô tả, nút hành động và thanh lọc lệch nhau về vị trí, cỡ chữ và khoảng cách.
 * Ba thành phần dưới đây cố định lại cấu trúc đó:
 *
 *   <PageShell>
 *     <PageHeader icon={Icon} title description badge actions={...} />
 *     <PageCard>
 *       <PageToolbar>{bộ lọc / tìm kiếm}</PageToolbar>
 *       ...nội dung: bảng, danh sách, form...
 *       <PageFooter>{phân trang}</PageFooter>
 *     </PageCard>
 *   </PageShell>
 */

export interface PageShellProps extends React.ComponentProps<"div"> {}

/** Khung dọc duy nhất của một trang, đặt dưới header của App. */
export function PageShell({ className, ...props }: PageShellProps) {
  return <div className={cn("flex w-full flex-col gap-4 pb-16", className)} {...props} />
}

export interface PageHeaderProps {
  /** Tiêu đề trang (chữ thường, không tự viết hoa). */
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

export function PageHeader({ title, description, icon: Icon, badge, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
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
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface PageCardProps extends React.ComponentProps<typeof Card> {}

/** Khung nội dung chính (bảng/danh sách) — bo góc và viền thống nhất. */
export function PageCard({ className, ...props }: PageCardProps) {
  return <Card className={cn("overflow-hidden rounded-2xl border-border/60 shadow-xs", className)} {...props} />
}

export interface PageToolbarProps extends React.ComponentProps<"div"> {}

/** Thanh lọc/tìm kiếm đặt trên cùng của PageCard. */
export function PageToolbar({ className, ...props }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-3",
        className
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
        "flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-4 py-3 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
