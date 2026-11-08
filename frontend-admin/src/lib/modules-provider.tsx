import * as React from "react"

import { api } from "@/lib/api"
import { isModuleEnabled, ModulesContext, type EnabledModules, type ModulesValue, type ModuleName } from "@/lib/modules"

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState<EnabledModules>(null)

  React.useEffect(() => {
    let cancelled = false
    api
      .getEnabledModules()
      .then((names) => {
        if (!cancelled) setEnabled(new Set(names))
      })
      .catch(() => {
        if (!cancelled) setEnabled("all")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = React.useMemo<ModulesValue>(
    () => ({
      loading: enabled === null,
      has: (name: ModuleName) => isModuleEnabled(enabled, name),
    }),
    [enabled],
  )

  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
}
