import type { User } from '@/types'

/**
 * Trạng thái phiên đăng nhập phía client.
 *
 * Bất biến quan trọng:
 * - Access token CHỈ nằm trong biến memory của module này. Không localStorage,
 *   không sessionStorage → XSS không đọc được và F5 (reload) sẽ lấy token mới
 *   bằng refresh cookie httpOnly.
 * - Refresh token KHÔNG bao giờ xuất hiện ở đây: nó nằm trong cookie httpOnly,
 *   trình duyệt tự gửi khi request có `credentials: 'include'`.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? ''
export const REFRESH_PATH = '/api/v1/auth/refresh'

const GUEST_KEY = 'auth.guest'
const TOKEN_KEY = 'pb_auth_token'

let accessToken: string | null = null
let currentUser: User | null = null
let refreshPromise: Promise<string | null> | null = null

export const getAccessToken = (): string | null => {
  if (accessToken) return accessToken
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      accessToken = stored
      return stored
    }
  } catch {}
  return null
}

export const setAccessToken = (token: string | null): void => {
  accessToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export const getCurrentUser = (): User | null => currentUser

export const setCurrentUser = (user: User | null): void => {
  currentUser = user
}

export const clearSession = (): void => {
  accessToken = null
  currentUser = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export const isGuest = (): boolean => {
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

export const setGuest = (guest: boolean): void => {
  try {
    if (guest) sessionStorage.setItem(GUEST_KEY, '1')
    else sessionStorage.removeItem(GUEST_KEY)
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư): bỏ qua, chỉ mất trạng thái guest.
  }
}

interface RefreshPayload {
  data?: { access_token?: string }
}

/**
 * Backend đặt cookie `has_session=1` (không chứa bí mật, đọc được bằng JS) cùng
 * refresh cookie httpOnly. Không có nó nghĩa là chưa đăng nhập: bỏ qua refresh
 * thay vì gọi một request chắc chắn lỗi.
 */
function hasSessionHint(): boolean {
  // Cookie đã xoá có thể còn lại dạng rỗng `has_session=`: coi như chưa đăng nhập.
  return document.cookie.split('; ').some((part) => part.startsWith('has_session=') && part.length > 'has_session='.length)
}

async function performRefresh(): Promise<string | null> {
  if (!hasSessionHint()) return null
  try {
    const response = await fetch(`${API_BASE}${REFRESH_PATH}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null

    const json = (await response.json()) as RefreshPayload
    const token = json.data?.access_token
    if (!token) return null

    accessToken = token
    return token
  } catch {
    return null
  }
}

/**
 * Đổi refresh cookie lấy access token mới.
 *
 * Single-flight: nhiều request 401 cùng lúc chỉ tạo MỘT request refresh, tránh
 * rotation làm token của request khác bị thu hồi (refresh token dùng một lần).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/** Thông báo cho toàn app rằng phiên đã hết và cần quay về màn hình đăng nhập. */
export function notifyUnauthorized(): void {
  clearSession()
  window.dispatchEvent(new CustomEvent('auth:unauthorized'))
}
