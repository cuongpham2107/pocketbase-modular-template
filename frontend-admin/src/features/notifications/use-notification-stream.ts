import * as React from "react"

import { getAccessToken } from "@/lib/session"
import type { Notification } from "@/types"

export type StreamStatus = "idle" | "connecting" | "open" | "reconnecting" | "offline"

interface Options {
  enabled: boolean
  /** Có thông báo mới đẩy từ server. */
  onNotification?: (notification: Notification) => void
  /** Server không gửi kèm payload (hoặc vừa nối lại) → gọi refetch. */
  onSync?: () => void
}

const MAX_BACKOFF_MS = 30_000
const BASE_BACKOFF_MS = 1_000

function streamUrl(): string | null {
  const token = getAccessToken()
  if (!token) return null
  const base = import.meta.env.VITE_WS_URL
  const origin =
    base ||
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
  return `${origin}/api/v1/notifications/stream?access_token=${encodeURIComponent(token)}`
}

function isNotification(value: unknown): value is Notification {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "number" &&
    typeof (value as { title?: unknown }).title === "string"
  )
}

/**
 * WebSocket realtime cho thông báo.
 * - backoff luỹ thừa 1s → 30s, reset khi nối lại thành công;
 * - `visibilitychange` → tab hiện lại thì nối ngay (không chờ backoff);
 * - nối lại xong luôn `onSync()` để đồng bộ unread count bị lỡ khi mất mạng.
 */
export function useNotificationStream({ enabled, onNotification, onSync }: Options): {
  status: StreamStatus
} {
  const [status, setStatus] = React.useState<StreamStatus>("idle")

  // Latest-ref: cập nhật sau mỗi render (trước effect kết nối bên dưới) để socket luôn gọi handler mới nhất.
  const handlers = React.useRef({ onNotification, onSync })
  React.useEffect(() => {
    handlers.current = { onNotification, onSync }
  })

  React.useEffect(() => {
    if (!enabled) return

    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let disposed = false

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
    }

    const scheduleReconnect = () => {
      if (disposed) return
      const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt)
      attempt += 1
      setStatus("reconnecting")
      clearRetry()
      retryTimer = setTimeout(connect, delay)
    }

    function connect() {
      if (disposed) return
      const url = streamUrl()
      if (!url) {
        setStatus("offline")
        return
      }

      setStatus((prev) => (prev === "open" ? "connecting" : prev === "idle" ? "connecting" : "reconnecting"))
      socket = new WebSocket(url)

      socket.onopen = () => {
        const wasReconnect = attempt > 0
        attempt = 0
        setStatus("open")
        if (wasReconnect) handlers.current.onSync?.()
      }

      socket.onmessage = (event) => {
        try {
          const payload: unknown = JSON.parse(event.data as string)
          if (isNotification(payload)) {
            handlers.current.onNotification?.(payload)
            return
          }
          // `{type:"ready"}` và các frame điều khiển khác: coi như tín hiệu đồng bộ.
          handlers.current.onSync?.()
        } catch {
          handlers.current.onSync?.()
        }
      }

      socket.onerror = () => {
        socket?.close()
      }

      socket.onclose = () => {
        socket = null
        if (disposed) return
        scheduleReconnect()
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return
      }
      attempt = 0
      clearRetry()
      connect()
    }

    const onOnline = () => {
      attempt = 0
      clearRetry()
      connect()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)

    connect()

    return () => {
      disposed = true
      // Tắt stream (hoặc unmount) → về "idle", như khi enabled=false.
      setStatus("idle")
      clearRetry()
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
      if (socket) {
        socket.onclose = null
        socket.close()
        socket = null
      }
    }
  }, [enabled])

  return { status }
}
