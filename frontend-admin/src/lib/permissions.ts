import * as React from "react"

export interface PermissionsValue {
  /** Tập mã quyền hiệu lực của user hiện tại (admin nhận đủ catalog từ backend). */
  permissions: Set<string>
  loading: boolean
  error: string | null
  /** `can()` không truyền mã = chỉ cần đăng nhập. Nhiều mã = cần TẤT CẢ. */
  can: (...codes: string[]) => boolean
  reload: () => Promise<void>
}

/**
 * Kiểm tra một tập mã quyền có thoả yêu cầu hay không.
 * - Không truyền mã: chỉ cần đăng nhập (luôn đúng khi đã có phiên).
 * - Nhiều mã: cần TẤT CẢ (AND) — backend cũng kiểm tra theo cùng quy tắc.
 */
export function matchesPermissions(granted: Set<string>, codes: string[]): boolean {
  if (codes.length === 0) return true
  return codes.every((code) => granted.has(code))
}

export const PermissionsContext = React.createContext<PermissionsValue | null>(null)

export function usePermissions(): PermissionsValue {
  const ctx = React.useContext(PermissionsContext)
  if (!ctx) {
    // Cho phép dùng hook ngoài provider (ví dụ test) mà không nổ.
    return {
      permissions: new Set(),
      loading: false,
      error: null,
      can: (...codes: string[]) => matchesPermissions(new Set(), codes),
      reload: async () => {},
    }
  }
  return ctx
}
