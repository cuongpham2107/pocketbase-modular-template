import * as React from "react"

import { api, ApiError } from "@/lib/api"
import { translateErrorCode } from "@/lib/i18n"
import type { Notification } from "@/types"

export interface UseNotificationsResult {
  items: Notification[]
  unread: number
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  markRead: (id: string | number) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string | number) => Promise<void>
  /** Được gọi từ stream realtime khi backend đẩy bản ghi mới. */
  prepend: (item: Notification) => void
  refreshUnread: () => Promise<void>
}

const PER_PAGE = 20

/**
 * Nguồn dữ liệu thông báo phía client. Không tự mở WebSocket — hook
 * `useNotificationStream` đẩy sự kiện vào qua `prepend`/`refreshUnread`.
 */
export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [items, setItems] = React.useState<Notification[]>([])
  const [unread, setUnread] = React.useState(0)
  // Có `enabled` thì effect nạp ngay → khởi tạo loading=true thay vì set trong effect.
  const [loading, setLoading] = React.useState(enabled)
  const [error, setError] = React.useState<string | null>(null)

  // `enabled` chuyển sang true → bật loading ngay trong render (mẫu "lưu prop trước đó").
  const [prevEnabled, setPrevEnabled] = React.useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    if (enabled) {
      setLoading(true)
      setError(null)
    }
  }

  // Phần bất đồng bộ: mọi setState nằm trong callback của promise.
  const fetchPage = React.useCallback(
    () =>
      Promise.all([api.listNotifications({ page: 1, perPage: PER_PAGE }), api.unreadNotifications()])
        .then(([page, count]) => {
          setItems(page.data)
          setUnread(count)
        })
        .catch((err: unknown) => {
          const fallback = err instanceof Error ? err.message : undefined
          setError(err instanceof ApiError ? translateErrorCode(err.code, fallback) : fallback || null)
        })
        .finally(() => setLoading(false)),
    [],
  )

  const reload = React.useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    await fetchPage()
  }, [enabled, fetchPage])

  const refreshUnread = React.useCallback(async () => {
    if (!enabled) return
    try {
      setUnread(await api.unreadNotifications())
    } catch {
      /* badge không quan trọng bằng nội dung — bỏ qua lỗi mạng */
    }
  }, [enabled])

  React.useEffect(() => {
    if (enabled) void fetchPage()
  }, [enabled, fetchPage])

  const markRead = React.useCallback(async (id: string | number) => {
    await api.markNotificationRead(id)
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && !item.read_at ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    )
    setUnread((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = React.useCallback(async () => {
    await api.markAllNotificationsRead()
    const now = new Date().toISOString()
    setItems((prev) => prev.map((item) => (item.read_at ? item : { ...item, read_at: now })))
    setUnread(0)
  }, [])

  const remove = React.useCallback(async (id: string | number) => {
    await api.deleteNotification(id)
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target && !target.read_at) setUnread((count) => Math.max(0, count - 1))
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  const prepend = React.useCallback((item: Notification) => {
    setItems((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)].slice(0, PER_PAGE))
    if (!item.read_at) setUnread((prev) => prev + 1)
  }, [])

  return { items, unread, loading, error, reload, markRead, markAllRead, remove, prepend, refreshUnread }
}
