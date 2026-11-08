import * as React from "react"

/** Tên module tuỳ chọn của backend (xem internal/app/modules.go). */
export type ModuleName = "audit" | "notifications" | "media" | "mobile" | "mcp"

/**
 * - `null`: đang tải
 * - `"all"`: không đọc được danh sách (backend cũ hoặc lỗi mạng) → hiện tất cả,
 *   backend vẫn trả 404 cho module đang tắt
 * - `Set`: các module backend đang bật
 */
export type EnabledModules = Set<string> | "all" | null

export function isModuleEnabled(enabled: EnabledModules, name: ModuleName): boolean {
  if (enabled === null) return false
  if (enabled === "all") return true
  return enabled.has(name)
}

export interface ModulesValue {
  loading: boolean
  has: (name: ModuleName) => boolean
}

export const ModulesContext = React.createContext<ModulesValue | null>(null)

export function useModules(): ModulesValue {
  const ctx = React.useContext(ModulesContext)
  // Ngoài provider (ví dụ test component): coi như mọi module đều bật.
  return ctx ?? { loading: false, has: () => true }
}
