import * as React from "react"

import { api } from "@/lib/api"
import { matchesPermissions, PermissionsContext, type PermissionsValue } from "@/lib/permissions"

export interface PermissionsProviderProps {
  enabled: boolean
  children: React.ReactNode
}

export function PermissionsProvider({ enabled, children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = React.useState<Set<string>>(() => new Set())
  const [loading, setLoading] = React.useState(enabled)
  const [error, setError] = React.useState<string | null>(null)

  // Bật/tắt `enabled` → chỉnh state ngay trong render (mẫu "lưu prop trước đó")
  // thay vì setState đồng bộ trong effect.
  const [prevEnabled, setPrevEnabled] = React.useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    if (enabled) {
      setLoading(true)
      setError(null)
    } else {
      setPermissions(new Set())
      setLoading(false)
    }
  }

  // Chỉ phần bất đồng bộ: setState trong callback của promise, không đồng bộ trong effect.
  const fetchPermissions = React.useCallback(
    () =>
      api
        .getMyPermissions()
        .then((codes) => setPermissions(new Set(codes)))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
          setPermissions(new Set())
        })
        .finally(() => setLoading(false)),
    [],
  )

  const load = React.useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    await fetchPermissions()
  }, [enabled, fetchPermissions])

  React.useEffect(() => {
    if (enabled) void fetchPermissions()
  }, [enabled, fetchPermissions])

  const value = React.useMemo<PermissionsValue>(
    () => ({
      permissions,
      loading,
      error,
      can: (...codes: string[]) => matchesPermissions(permissions, codes),
      reload: load,
    }),
    [permissions, loading, error, load],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}
