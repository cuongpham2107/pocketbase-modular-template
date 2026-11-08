export interface User {
  id: string | number
  email: string
  full_name?: string
  name?: string
  role?: string
  roles?: string[]
  permissions?: string[]
  created_at?: string
  theme_settings?: string
  avatar_url?: string
}

export interface AuthResponse {
  token?: string
  access_token?: string
  token_type?: string
  expires_in?: number
  user: User
}

export interface Permission {
  id: string | number
  code: string
  label?: string
  description: string
  module: string
  deprecated_at?: string | null
  is_active?: boolean
}

export interface CatalogPermission {
  code: string
  label: string
  module: string
  action?: string
  is_default?: boolean
  description?: string
}

export interface PermissionGroup {
  module: string
  label?: string
  default_actions?: string[]
  permissions: CatalogPermission[]
}

export interface CoverageReport {
  total_catalog: number
  total_active_in_db: number
  total_assigned_roles: number
  unassigned_codes: string[]
  deprecated_assigned: string[]
}

export interface Role {
  id: string | number
  name: string
  description: string
  permissions: string[]
}

export interface MediaFolder {
  id: number
  parent_id?: number | null
  user_id: number
  name: string
  color: string
  created_at: string
  updated_at?: string
  children?: MediaFolder[]
  files_count: number
}

export interface UploadedFile {
  id: number
  folder_id?: number | null
  user_id: number
  original_name?: string
  filename?: string
  file_name?: string
  path?: string
  file_path?: string
  url?: string
  file_url?: string
  size?: number
  file_size?: number
  mime_type: string
  storage_driver?: string
  disk?: string
  created_at: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/** Thông báo trong DB (module P7 backend). */
export interface Notification {
  id: string | number
  user_id: string | number
  type: string
  title: string
  body?: string
  data?: string
  read_at?: string | null
  created_at: string
}

/** Bản ghi audit log (module P7 backend). */
export interface AuditFilterOptions {
  actions: string[]
  resources: string[]
}

export interface AuditLog {
  id: string | number
  actor_id?: string | number | null
  actor_email?: string
  action: string
  resource?: string
  resource_id?: string
  status: 'success' | 'failure'
  ip?: string
  user_agent?: string
  request_id?: string
  trace_id?: string
  detail?: string
  created_at: string
}
