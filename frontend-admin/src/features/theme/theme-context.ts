import * as React from "react"

import type { ThemePreset, ThemeSettings } from "./theme-config"

export type ThemeSyncStatus = "idle" | "saving" | "saved" | "error"

export interface ThemeContextType {
  settings: ThemeSettings
  updateSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void
  applyPreset: (preset: ThemePreset) => void
  resetToDefault: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void
  exportJson: () => string
  exportCss: () => string
  isAuthenticated: boolean
  hasUserOverride: boolean
  syncStatus: ThemeSyncStatus
  saveToAccount: () => Promise<void>
}

export const ThemeContext = React.createContext<ThemeContextType | null>(null)

export function useThemeCustomizer() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeCustomizer must be used within a ThemeProvider")
  }
  return context
}

export function useReducedMotionPreference(): boolean {
  const context = React.useContext(ThemeContext)
  return Boolean(context?.settings.reducedMotion)
}
