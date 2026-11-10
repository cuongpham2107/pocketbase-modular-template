import type { ApiResponse, AuditFilterOptions, AuditLog, AuthResponse, CoverageReport, MediaFolder, Notification, Permission, PermissionGroup, Role, UploadedFile, User } from '@/types'
import {
  API_BASE,
  clearSession,
  getAccessToken,
  getCurrentUser,
  notifyUnauthorized,
  refreshAccessToken,
  setAccessToken,
  setCurrentUser,
} from '@/lib/session'
import { buildQuery, type QueryParams } from '@/lib/query'

export { API_BASE }

/**
 * Lỗi API có mã lỗi của backend (`error.code`) để UI phân nhánh theo mã
 * thay vì so khớp chuỗi tiếng Việt.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

// Access token chỉ nằm trong memory (xem lib/session.ts). Các hàm dưới giữ lại
// tên cũ để component đang dùng không phải sửa.
export const getToken = getAccessToken
export const getStoredUser = getCurrentUser
export const setToken = (token: string): void => setAccessToken(token)
export const setStoredUser = (user: User): void => setCurrentUser(user)
export const clearToken = (): void => clearSession()

/** Endpoint tự xử lý phiên; 401 ở đây không được kích hoạt refresh. */
const AUTH_FREE_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
]

interface RequestOptions extends RequestInit {
  /** Tắt cơ chế tự refresh (dùng khi chính endpoint auth gọi). */
  skipRefresh?: boolean
}

export interface Pagination {
  page: number
  limit: number
  total_items: number
  total_pages: number
}

/** Toàn bộ envelope backend (dùng khi cần cả `pagination`, không chỉ `data`). */
export type Envelope<T> = ApiResponse<T> & { pagination?: Pagination }

const DEFAULT_TIMEOUT_MS = 20_000
const LANGUAGE_KEY = 'i18n.lang'

/** Huỷ request khi quá hạn (mặc định 20s, khớp `REQUEST_TIMEOUT` của backend). */
function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ms)

  const relay = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) relay()
    else signal.addEventListener('abort', relay, { once: true })
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', relay)
    },
  }
}

async function requestEnvelope<T>(
  endpoint: string,
  options: RequestOptions = {},
  retried = false,
): Promise<Envelope<T>> {
  const { skipRefresh, ...init } = options
  const headers = new Headers(init.headers || {})
  const token = getAccessToken()

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const lang = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_KEY) : null
  if (lang && !headers.has('Accept-Language')) {
    headers.set('Accept-Language', lang)
  }

  const timeout = withTimeout(init.signal ?? undefined, DEFAULT_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...init,
      signal: timeout.signal,
      headers,
      // Bắt buộc để trình duyệt gửi/nhận refresh cookie httpOnly.
      credentials: 'include',
    })
  } catch (err) {
    if (timeout.didTimeout()) {
      throw new ApiError(
        `Máy chủ không phản hồi trong ${DEFAULT_TIMEOUT_MS / 1000} giây. Vui lòng thử lại.`,
        'TIMEOUT',
        0,
      )
    }
    throw err
  } finally {
    timeout.cleanup()
  }

  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>

  const canRefresh =
    !skipRefresh && !retried && !AUTH_FREE_ENDPOINTS.some((path) => endpoint.startsWith(path))

  if (response.status === 401 && canRefresh) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      return requestEnvelope<T>(endpoint, options, true)
    }
    notifyUnauthorized()
  }

  if (!response.ok || json.success === false) {
    const message = json.error?.message || json.message || `Yêu cầu thất bại (HTTP ${response.status})`
    throw new ApiError(message, json.error?.code || `HTTP_${response.status}`, response.status, json.error?.details)
  }

  return json
}

async function request<T>(endpoint: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const json = await requestEnvelope<T>(endpoint, options, retried)
  return json.data as T
}

// -----------------------------------------------------------------------------
// API Services
// -----------------------------------------------------------------------------

export const api = {
  baseUrl: API_BASE,
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,

  // Auth
  // Auth
  /**
   * Khôi phục phiên khi tải trang: đổi refresh cookie → access token → `/auth/me`.
   * Trả `null` khi chưa đăng nhập (không ném lỗi).
   */
  async bootstrap(): Promise<User | null> {
    const token = (await refreshAccessToken()) || getAccessToken()
    if (!token) return null

    try {
      const user = await request<User>('/api/v1/auth/me')
      setCurrentUser(user)
      return user
    } catch {
      clearSession()
      return null
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const json = await requestEnvelope<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipRefresh: true,
    })
    const data = ((json.data ?? json) || {}) as unknown as AuthResponse
    const jwt = data.access_token || data.token || ''
    if (jwt) setAccessToken(jwt)
    if (data.user) setCurrentUser(data.user)
    return data
  },

  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const json = await requestEnvelope<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
      skipRefresh: true,
    })
    const data = ((json.data ?? json) || {}) as unknown as AuthResponse
    const jwt = data.access_token || data.token || ''
    if (jwt) setAccessToken(jwt)
    if (data.user) setCurrentUser(data.user)
    return data
  },

  /** Thu hồi refresh token hiện tại + xoá cookie, rồi xoá phiên ở client. */
  async logout(): Promise<void> {
    try {
      await request('/api/v1/auth/logout', { method: 'POST', skipRefresh: true })
    } finally {
      clearSession()
    }
  },

  /** Thu hồi TẤT CẢ phiên của user (đăng xuất mọi thiết bị). */
  async logoutAll(): Promise<void> {
    try {
      await request('/api/v1/auth/logout-all', { method: 'POST', skipRefresh: true })
    } finally {
      clearSession()
    }
  },

  async getProfile(): Promise<User> {
    const user = await request<User>('/api/v1/auth/me')
    setCurrentUser(user)
    return user
  },

  async getMe(): Promise<User> {
    return this.getProfile()
  },

  async updateThemeSettings(themeSettings: string): Promise<User> {
    const user = await request<User>('/api/v1/auth/settings/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme_settings: themeSettings }),
    })
    setCurrentUser(user)
    return user
  },

  /** Gửi email đặt lại mật khẩu. Backend luôn trả thành công để chống dò email. */
  async forgotPassword(email: string): Promise<void> {
    await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipRefresh: true,
    })
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      skipRefresh: true,
    })
  },

  async verifyEmail(token: string): Promise<void> {
    await request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipRefresh: true,
    })
  },

  async resendVerification(): Promise<void> {
    await request('/api/v1/auth/verify-email/resend', { method: 'POST' })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/api/v1/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    // Đổi mật khẩu thu hồi mọi phiên cũ (kể cả phiên hiện tại).
    clearSession()
    notifyUnauthorized()
  },

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) throw new Error('Health check failed')
    return res.json()
  },

  // RBAC
  async listRoles(): Promise<Role[]> {
    return request<Role[]>('/api/v1/roles')
  },

  async createRole(name: string, description: string, permissions: string[] = []): Promise<Role> {
    return request<Role>('/api/v1/roles', {
      method: 'POST',
      body: JSON.stringify({ name, description, permissions }),
    })
  },

  async assignPermissionsToRole(roleId: string | number, permissionCodes: string[]): Promise<void> {
    await request(`/api/v1/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission_codes: permissionCodes }),
    })
  },

  async listPermissions(): Promise<Permission[]> {
    return request<Permission[]>('/api/v1/permissions')
  },

  async listPermissionsCatalog(): Promise<PermissionGroup[]> {
    return request<PermissionGroup[]>('/api/v1/permissions/catalog')
  },

  async getPermissionsCoverage(): Promise<CoverageReport> {
    return request<CoverageReport>('/api/v1/permissions/coverage')
  },

  async createPermission(code: string, description: string, module: string): Promise<Permission> {
    return request<Permission>('/api/v1/permissions', {
      method: 'POST',
      body: JSON.stringify({ code, description, module }),
    })
  },

  async listUsers(): Promise<User[]> {
    return request<User[]>('/api/v1/users')
  },

  async listUsersPaginated(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{
    data: User[]
    pagination: { page: number; limit: number; total_items: number; total_pages: number }
  }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    if (params?.role && params.role !== 'all') qs.set('role', params.role)
    const url = `/api/v1/users${qs.toString() ? `?${qs.toString()}` : ''}`

    const json = await requestEnvelope<User[]>(url)
    return {
      data: json.data || [],
      pagination: json.pagination || { page: 1, limit: 10, total_items: json.data?.length || 0, total_pages: 1 },
    }
  },

  async createUser(data: { email: string; password: string; full_name: string; role?: string; avatar_url?: string }): Promise<User> {
    return request<User>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateUser(id: string | number, data: { email?: string; password?: string; full_name?: string; role?: string; avatar_url?: string }): Promise<User> {
    return request<User>(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteUser(id: string | number): Promise<void> {
    await request(`/api/v1/users/${id}`, { method: 'DELETE' })
  },

  async getRoleUsers(roleId: string | number): Promise<(string | number)[]> {
    return request<(string | number)[]>(`/api/v1/roles/${roleId}/users`)
  },

  async assignUsersToRole(roleId: string | number, userIds: (string | number)[]): Promise<void> {
    await request(`/api/v1/roles/${roleId}/users`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    })
  },

  async assignRolesToUser(userId: string | number, roleNames: string[]): Promise<void> {
    await request(`/api/v1/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_names: roleNames }),
    })
  },

  /** Module tuỳ chọn đang bật ở backend (public, không cần đăng nhập). */
  async getEnabledModules(): Promise<string[]> {
    try {
      const json = await requestEnvelope<{ modules: string[] }>('/api/v1/modules')
      const data = json.data || (json as unknown as { modules: string[] })
      return data?.modules || []
    } catch {
      return ['rbac', 'users', 'theme', 'audit', 'notifications', 'media']
    }
  },

  async getMyPermissions(): Promise<string[]> {
    try {
      const json = await requestEnvelope<{ permissions: string[] }>('/api/v1/users/me/permissions')
      const data = json.data || (json as unknown as { permissions: string[] })
      if (data?.permissions && Array.isArray(data.permissions)) {
        return data.permissions
      }
    } catch {}
    // Fallback: use stored user permissions if available
    const user = getStoredUser()
    if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions
    }
    return []
  },

  // Notifications (module P7 backend)
  async listNotifications(params?: QueryParams): Promise<{ data: Notification[]; pagination: Pagination }> {
    try {
      const json = await requestEnvelope<Notification[]>(`/api/v1/notifications${buildQuery(params)}`)
      return {
        data: json.data || [],
        pagination: json.pagination || { page: 1, limit: 20, total_items: json.data?.length || 0, total_pages: 1 },
      }
    } catch {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total_items: 0, total_pages: 1 },
      }
    }
  },

  async unreadNotifications(): Promise<number> {
    try {
      const json = await requestEnvelope<{ unread: number }>('/api/v1/notifications/unread-count')
      const data = json.data || (json as unknown as { unread: number })
      return data?.unread ?? 0
    } catch {
      return 0
    }
  },

  async markNotificationRead(id: string | number): Promise<void> {
    await request(`/api/v1/notifications/${id}/read`, { method: 'POST' })
  },

  async markAllNotificationsRead(): Promise<number> {
    const res = await request<{ updated: number }>('/api/v1/notifications/read-all', { method: 'POST' })
    return res.updated || 0
  },

  async deleteNotification(id: string | number): Promise<void> {
    await request(`/api/v1/notifications/${id}`, { method: 'DELETE' })
  },

  // Audit log (module P7 backend)
  /** Danh sách action/resource đã xuất hiện — dùng cho dropdown lọc. */
  async getAuditFilters(): Promise<AuditFilterOptions> {
    try {
      const json = await requestEnvelope<AuditFilterOptions>('/api/v1/audit-logs/filters')
      return { actions: json.data?.actions ?? [], resources: json.data?.resources ?? [] }
    } catch {
      return { actions: [], resources: [] }
    }
  },

  async listAuditLogs(params?: QueryParams): Promise<{ data: AuditLog[]; pagination: Pagination }> {
    try {
      const json = await requestEnvelope<AuditLog[]>(`/api/v1/audit-logs${buildQuery(params)}`)
      return {
        data: json.data || [],
        pagination: json.pagination || { page: 1, limit: 20, total_items: json.data?.length || 0, total_pages: 1 },
      }
    } catch {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total_items: 0, total_pages: 1 },
      }
    }
  },

  // File & Media Library
  async listFiles(query?: { folder_id?: string | number | null; type?: string; search?: string }): Promise<UploadedFile[]> {
    const params = new URLSearchParams()
    if (query?.folder_id !== undefined && query?.folder_id !== null) {
      params.append('folder_id', String(query.folder_id))
    }
    if (query?.type && query.type !== 'all') {
      params.append('type', query.type)
    }
    if (query?.search) {
      params.append('search', query.search)
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<UploadedFile[]>(`/api/v1/files${qs}`)
  },

  async uploadFile(file: File, _folder = 'uploads'): Promise<UploadedFile> {
    return this.uploadFileToFolder(file)
  },

  async uploadFileToFolder(file: File, folderId?: string | number | null): Promise<UploadedFile> {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId !== undefined && folderId !== null) {
      formData.append('folder_id', String(folderId))
    }
    return request<UploadedFile>('/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    })
  },

  async deleteFile(id: string | number): Promise<void> {
    await request(`/api/v1/files/${id}`, { method: 'DELETE' })
  },

  async moveFiles(fileIds: Array<string | number>, folderId: string | number | null): Promise<void> {
    await request('/api/v1/files/move', {
      method: 'POST',
      body: JSON.stringify({ file_ids: fileIds, folder_id: folderId }),
    })
  },

  async moveFile(id: string | number, folderId: string | number | null): Promise<void> {
    return this.moveFiles([id], folderId)
  },

  async renameFile(id: string | number, name: string): Promise<UploadedFile> {
    return request<UploadedFile>(`/api/v1/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  },

  async copyFile(id: string | number, targetFolderId?: string | number | null): Promise<UploadedFile> {
    return request<UploadedFile>(`/api/v1/files/${id}/copy`, {
      method: 'POST',
      body: JSON.stringify({ target_folder_id: targetFolderId }),
    })
  },

  // Media Folders
  async getFolderTree(): Promise<MediaFolder[]> {
    return request<MediaFolder[]>('/api/v1/files/folders/tree')
  },

  async createFolder(name: string, parentId?: string | number | null, color = '#3b82f6'): Promise<MediaFolder> {
    return request<MediaFolder>('/api/v1/files/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id: parentId, color }),
    })
  },

  async updateFolder(id: string | number, name: string, parentId?: string | number | null, color?: string): Promise<MediaFolder> {
    return request<MediaFolder>(`/api/v1/files/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, parent_id: parentId, color }),
    })
  },

  async deleteFolder(id: string | number): Promise<void> {
    await request(`/api/v1/files/folders/${id}`, { method: 'DELETE' })
  },

  // Gateway & Health
  async checkHealth(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/health`)
    return res.json()
  },

  /** Readiness: DB + dependency thật sự sẵn sàng nhận traffic (503 khi chưa). */
  async checkReady(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/ready`)
    return res.json()
  },

  async getGatewayRoot(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/`)
    return res.json()
  },

  // Mobile API Plugin
  async checkMobileVersion(platform: 'android' | 'ios', appVersion: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/api/mobile/v1/app/check-version?platform=${platform}&app_version=${appVersion}`)
    return res.json()
  },

  // MCP Tools
  async getMcpTools(): Promise<{ tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>; count: number }> {
    const res = await request<{ tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>; count: number }>('/api/v1/mcp/tools')
    return res
  },

  async executeMcpTool(name: string, args: Record<string, unknown>): Promise<{ tool: string; result: unknown }> {
    const res = await request<{ tool: string; result: unknown }>('/api/v1/mcp/execute', {
      method: 'POST',
      body: JSON.stringify({ name, arguments: args }),
    })
    return res
  },
}
