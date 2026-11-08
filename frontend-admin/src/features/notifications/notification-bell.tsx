import * as React from "react"
import { useTranslation } from "react-i18next"
import { Bell, BellRing, Check, CheckCheck, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types"

import { useNotificationStream, type StreamStatus } from "./use-notification-stream"
import { useNotifications } from "./use-notifications"

function relativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Math.max(0, Date.now() - then)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return rtf.format(0, "minute")
  if (minutes < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, "hour")
  return rtf.format(-Math.round(hours / 24), "day")
}

function StatusDot({ status }: { status: StreamStatus }) {
  const color =
    status === "open"
      ? "bg-emerald-500"
      : status === "reconnecting" || status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : "bg-muted-foreground/40"
  return <span className={cn("size-2 rounded-full", color)} />
}

export interface NotificationListProps {
  items: Notification[]
  loading: boolean
  onMarkRead: (id: string | number) => void
  onRemove: (id: string | number) => void
  emptyLabel: string
  locale: string
}

export function NotificationList({
  items,
  loading,
  onMarkRead,
  onRemove,
  emptyLabel,
  locale,
}: NotificationListProps) {
  const { t } = useTranslation()

  // Skeleton giữ đúng chiều cao của danh sách: nếu chỉ hiện một spinner ở giữa
  // thì panel sẽ "giật" một nhịp khi dữ liệu về (cảm giác nháy 2 lần khi mở).
  if (loading && items.length === 0) {
    return (
      <div className="space-y-3 py-3" aria-busy="true" data-testid="notification-skeleton">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-1">
            <Skeleton className="mt-1.5 size-1.5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Bell className="size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "group flex items-start gap-3 px-1 py-3 transition-colors",
            !item.read_at && "bg-primary/5",
          )}
        >
          <span
            className={cn(
              "mt-1.5 size-1.5 shrink-0 rounded-full",
              item.read_at ? "bg-transparent" : "bg-primary",
            )}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-xs leading-snug", item.read_at ? "font-medium" : "font-bold")}>
                {item.title}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {relativeTime(item.created_at, locale)}
              </span>
            </div>
            {item.body && (
              <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
            )}
            <div className="flex items-center gap-1 pt-1">
              {!item.read_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead(item.id)}
                  className="h-6 gap-1 px-2 text-[10px] cursor-pointer"
                >
                  <Check className="size-3" />
                  {t("notifications.markRead")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-3" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export interface NotificationBellProps {
  enabled: boolean
  onNewNotification?: (notification: Notification) => void
}

export function NotificationBell({ enabled, onNewNotification }: NotificationBellProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const store = useNotifications(enabled)

  const { status } = useNotificationStream({
    enabled,
    onNotification: (item) => {
      store.prepend(item)
      onNewNotification?.(item)
    },
    onSync: () => {
      void store.refreshUnread()
    },
  })

  const unreadLabel = store.unread > 99 ? "99+" : String(store.unread)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 cursor-pointer"
          title={t("notifications.title")}
          data-testid="notification-bell"
        >
          {store.unread > 0 ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {store.unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadLabel}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 pb-3">
          <SheetTitle className="flex items-center justify-between gap-2 text-sm font-bold">
            <span className="flex items-center gap-2">
              {t("notifications.title")}
              {store.unread > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                  {t("notifications.unread", { count: store.unread })}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground">
              <StatusDot status={status} />
              {status === "open" ? t("notifications.connected") : t("notifications.reconnecting")}
            </span>
          </SheetTitle>
          <SheetDescription className="flex items-center justify-between gap-2 text-[11px]">
            <span>{store.error ?? ""}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={store.unread === 0}
              onClick={() => void store.markAllRead()}
              className="h-7 gap-1 text-[10px] cursor-pointer"
            >
              <CheckCheck className="size-3" />
              {t("notifications.markAllRead")}
            </Button>
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-[320px] flex-1 overflow-y-auto px-4">
          <NotificationList
            items={store.items}
            loading={store.loading}
            onMarkRead={(id) => void store.markRead(id)}
            onRemove={(id) => void store.remove(id)}
            emptyLabel={t("notifications.empty")}
            locale={i18n.language}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
