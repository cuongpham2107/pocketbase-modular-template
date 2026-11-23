import * as React from "react"
import { api } from "@/lib/api"
import type { User } from "@/types"

import {
  DEFAULT_THEME_SETTINGS,
  FONT_DEFINITIONS,
  FONT_SIZE_VALUES,
  normalizeFontFamily,
  PALETTES,
  PRESET_DEFAULTS,
  RADIUS_VALUES,
  SURFACES,
  type ThemePreset,
  type ThemeSettings,
} from "./theme-config"
import { ThemeContext, type ThemeSyncStatus } from "./theme-context"

const STORAGE_PREFIX = "filament_theme_customizer_settings"
const SYSTEM_STORAGE_KEY = "filament_theme_system_default"
const ACTIVE_USER_KEY = "filament_theme_active_user"

function toUserId(id: string | number | null | undefined): string | null {
  if (id === null || id === undefined || id === "") return null
  return String(id)
}

function userStorageKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}:user:${userId}` : `${STORAGE_PREFIX}:guest`
}

function readActiveUserId(): string | null {
  if (!api.getToken()) return null
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || null
  } catch {
    return null
  }
}

function writeActiveUserId(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(ACTIVE_USER_KEY, userId)
    else localStorage.removeItem(ACTIVE_USER_KEY)
  } catch {
    // ignore storage errors
  }
}

function parseThemeObject(raw: unknown): Partial<ThemeSettings> | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = { ...(parsed as Record<string, unknown>) }
      if ("fontFamily" in obj) {
        obj.fontFamily = normalizeFontFamily(obj.fontFamily, DEFAULT_THEME_SETTINGS.fontFamily)
      }
      return obj as Partial<ThemeSettings>
    }
  } catch {
    // ignore malformed theme_settings
  }
  return null
}

function resolveTheme(raw: unknown, fallback: ThemeSettings = DEFAULT_THEME_SETTINGS): ThemeSettings {
  const parsed = parseThemeObject(raw)
  return parsed ? { ...fallback, ...parsed } : fallback
}

function readCachedSystemTheme(): ThemeSettings {
  try {
    const stored = localStorage.getItem(SYSTEM_STORAGE_KEY)
    if (stored) {
      return resolveTheme(stored, DEFAULT_THEME_SETTINGS)
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_THEME_SETTINGS
}

function writeCachedSystemTheme(settings: ThemeSettings): void {
  try {
    localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

function readCachedUserTheme(userId: string | null, systemFallback: ThemeSettings): ThemeSettings {
  if (!userId) return systemFallback
  try {
    const stored = localStorage.getItem(userStorageKey(userId))
    if (stored) {
      return resolveTheme(stored, systemFallback)
    }
  } catch (e) {
    console.warn("Failed to load theme settings from localStorage:", e)
  }
  return systemFallback
}

function writeCachedUserTheme(userId: string | null, settings: ThemeSettings | null): void {
  try {
    const key = userStorageKey(userId)
    if (settings === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(settings))
    }
  } catch (e) {
    console.warn("Failed to save theme settings to localStorage:", e)
  }
}

function settingsEqual(a: ThemeSettings, b: ThemeSettings): boolean {
  const keys = Object.keys(DEFAULT_THEME_SETTINGS) as (keyof ThemeSettings)[]
  return keys.every((k) => a[k] === b[k])
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initialUser = api.getStoredUser()
  const initialUserId = toUserId(initialUser?.id) ?? readActiveUserId()
  const initialSystemTheme = readCachedSystemTheme()

  const [activeUserId, setActiveUserId] = React.useState<string | null>(initialUserId)
  const [settings, setSettings] = React.useState<ThemeSettings>(() => {
    if (initialUser) {
      return resolveTheme(initialUser.theme_settings, initialSystemTheme)
    }
    return readCachedUserTheme(initialUserId, initialSystemTheme)
  })
  const [isOpen, setIsOpen] = React.useState(false)
  const [syncStatus, setSyncStatus] = React.useState<ThemeSyncStatus>("idle")
  const [hasUserOverride, setHasUserOverride] = React.useState<boolean>(() =>
    Boolean(parseThemeObject(initialUser?.theme_settings)),
  )

  const systemThemeRef = React.useRef<ThemeSettings>(initialSystemTheme)
  const hasUserOverrideRef = React.useRef<boolean>(hasUserOverride)
  const resetPendingRef = React.useRef<boolean>(false)

  const activeUserIdRef = React.useRef<string | null>(activeUserId)
  const settingsRef = React.useRef<ThemeSettings>(settings)

  React.useEffect(() => {
    activeUserIdRef.current = activeUserId
  }, [activeUserId])

  React.useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Only persist to the server when the user explicitly modifies theme settings.
  const dirtyRef = React.useRef(false)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingSave = React.useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  const saveToAccount = React.useCallback(async () => {
    if (!activeUserIdRef.current || !api.getToken()) return
    const targetUserId = activeUserIdRef.current
    const snapshot = settingsRef.current
    const shouldClear = resetPendingRef.current || !hasUserOverrideRef.current
    const payload = shouldClear ? "" : JSON.stringify(snapshot)

    setSyncStatus("saving")
    try {
      const updatedUser = await api.updateThemeSettings(payload)
      if (activeUserIdRef.current !== targetUserId) return
      if (updatedUser) {
        writeCachedUserTheme(toUserId(updatedUser.id), shouldClear ? null : snapshot)
      }
      if (settingsEqual(settingsRef.current, snapshot)) {
        dirtyRef.current = false
        resetPendingRef.current = false
      }
      setSyncStatus("saved")
    } catch {
      if (activeUserIdRef.current === targetUserId) {
        setSyncStatus("error")
      }
    }
  }, [])

  // Persist locally under the active account's own cache key when customized.
  React.useEffect(() => {
    if (!activeUserId) return
    if (hasUserOverrideRef.current) {
      writeCachedUserTheme(activeUserId, settings)
    } else {
      writeCachedUserTheme(activeUserId, null)
    }
  }, [activeUserId, settings])

  // Listen to system default theme updates, user login/bootstrap sync, and logout resets.
  React.useEffect(() => {
    const handleSystemSync = (e: Event) => {
      const raw = (e as CustomEvent<unknown>).detail
      const nextSystem = resolveTheme(raw, DEFAULT_THEME_SETTINGS)
      systemThemeRef.current = nextSystem
      writeCachedSystemTheme(nextSystem)

      // Users without a personal override (and guests) inherit the system theme automatically.
      if (!hasUserOverrideRef.current) {
        clearPendingSave()
        dirtyRef.current = false
        setSettings((prev) => (settingsEqual(prev, nextSystem) ? prev : nextSystem))
      }
    }

    const handleUserSync = (e: Event) => {
      const user = (e as CustomEvent<User | null | undefined>).detail
      clearPendingSave()
      dirtyRef.current = false
      resetPendingRef.current = false

      const nextUserId = toUserId(user?.id)
      if (!user || !nextUserId) {
        hasUserOverrideRef.current = false
        setHasUserOverride(false)
        writeActiveUserId(null)
        activeUserIdRef.current = null
        setActiveUserId(null)
        setSettings(systemThemeRef.current)
        setSyncStatus("idle")
        return
      }

      const parsedUser = parseThemeObject(user.theme_settings)
      const hasOverride = Boolean(parsedUser)
      hasUserOverrideRef.current = hasOverride
      setHasUserOverride(hasOverride)
      const next = hasOverride
        ? { ...systemThemeRef.current, ...parsedUser }
        : systemThemeRef.current

      writeActiveUserId(nextUserId)
      writeCachedUserTheme(nextUserId, hasOverride ? next : null)
      activeUserIdRef.current = nextUserId
      setActiveUserId(nextUserId)
      setSettings((prev) => (settingsEqual(prev, next) ? prev : next))
      setSyncStatus(hasOverride ? "saved" : "idle")
    }

    const handleUserLogout = () => {
      clearPendingSave()
      dirtyRef.current = false
      resetPendingRef.current = false
      hasUserOverrideRef.current = false
      setHasUserOverride(false)
      writeActiveUserId(null)
      activeUserIdRef.current = null
      setActiveUserId(null)
      setSettings(systemThemeRef.current)
      setSyncStatus("idle")
    }

    window.addEventListener("theme:system-sync", handleSystemSync)
    window.addEventListener("theme:user-sync", handleUserSync)
    window.addEventListener("theme:user-logout", handleUserLogout)
    return () => {
      window.removeEventListener("theme:system-sync", handleSystemSync)
      window.removeEventListener("theme:user-sync", handleUserSync)
      window.removeEventListener("theme:user-logout", handleUserLogout)
    }
  }, [clearPendingSave])

  // Auto-sync user edits to the user's own account (never mutating system settings).
  React.useEffect(() => {
    if (!dirtyRef.current || !activeUserId || !api.getToken()) return
    clearPendingSave()
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void saveToAccount()
    }, 450)
    return clearPendingSave
  }, [settings, activeUserId, clearPendingSave, saveToAccount])

  // Apply CSS variables & DOM modifications dynamically
  React.useEffect(() => {
    const root = document.documentElement
    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null

    const applyThemeToDom = () => {
      const isDark =
        settings.mode === "dark" ||
        (settings.mode === "system" && Boolean(mediaQuery?.matches))

      if (isDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }

      const pal = PALETTES[settings.palette] || PALETTES.blue
      const primary = isDark ? pal.darkPrimary : pal.lightPrimary
      const ring = isDark ? pal.darkRing : pal.lightRing

      root.style.setProperty("--primary", primary)
      root.style.setProperty("--ring", ring)
      root.style.setProperty("--sidebar-primary", primary)

      const rad = RADIUS_VALUES[settings.radius] || RADIUS_VALUES.md
      root.style.setProperty("--radius", rad)

      const surfaceDef = SURFACES[settings.surface] || SURFACES.default
      const surfaceTokens = isDark ? surfaceDef.dark : surfaceDef.light
      root.style.setProperty("--background", surfaceTokens.bg)
      root.style.setProperty("--card", surfaceTokens.card)
      root.style.setProperty("--popover", surfaceTokens.card)
      root.style.setProperty("--muted", surfaceTokens.muted)
      root.style.setProperty("--secondary", surfaceTokens.muted)
      root.style.setProperty("--border", surfaceTokens.border)
      root.style.setProperty("--input", surfaceTokens.border)
      root.style.setProperty("--sidebar", surfaceTokens.sidebar)
      root.style.setProperty("--sidebar-accent", surfaceTokens.muted)
      root.style.setProperty("--sidebar-border", surfaceTokens.border)

      const font =
        FONT_DEFINITIONS[settings.fontFamily] ||
        FONT_DEFINITIONS[DEFAULT_THEME_SETTINGS.fontFamily]
      if (font) {
        root.style.setProperty("--font-sans", font.cssFamily)
        document.body.style.fontFamily = font.cssFamily
      }
      const fontSizeDef = FONT_SIZE_VALUES[settings.fontSize] || FONT_SIZE_VALUES.md
      root.style.fontSize = fontSizeDef.px
      root.style.setProperty("--font-scale", String(fontSizeDef.scale))

      root.style.setProperty("--sidebar-width", settings.sidebarWidth)

      root.dataset.stickyHeader = settings.stickyTableHeader ? "true" : "false"
      root.dataset.tableDensity = settings.tableDensity || "normal"
      root.dataset.tableStriped = settings.tableStriped ? "true" : "false"
      root.dataset.tableBorders = settings.tableBorders ? "true" : "false"
      root.dataset.cardStyle = settings.cardStyle || "bordered"
      root.dataset.reducedMotion = settings.reducedMotion ? "true" : "false"
    }

    applyThemeToDom()

    if (settings.mode === "system" && mediaQuery) {
      mediaQuery.addEventListener("change", applyThemeToDom)
      return () => mediaQuery.removeEventListener("change", applyThemeToDom)
    }
  }, [settings])

  const updateSetting = React.useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    hasUserOverrideRef.current = true
    setHasUserOverride(true)
    resetPendingRef.current = false
    dirtyRef.current = true
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const applyPreset = React.useCallback((preset: ThemePreset) => {
    const presetOverrides = PRESET_DEFAULTS[preset]
    hasUserOverrideRef.current = true
    setHasUserOverride(true)
    resetPendingRef.current = false
    dirtyRef.current = true
    setSettings((prev) => ({
      ...prev,
      ...presetOverrides,
      preset,
    }))
  }, [])

  const resetToDefault = React.useCallback(() => {
    hasUserOverrideRef.current = false
    setHasUserOverride(false)
    resetPendingRef.current = true
    dirtyRef.current = true
    setSettings({ ...systemThemeRef.current })
  }, [])

  const toggleOpen = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const exportJson = React.useCallback(() => {
    return JSON.stringify(settings, null, 2)
  }, [settings])

  const exportCss = React.useCallback(() => {
    const pal = PALETTES[settings.palette]
    const rad = RADIUS_VALUES[settings.radius]
    const font =
      FONT_DEFINITIONS[settings.fontFamily] ||
      FONT_DEFINITIONS[DEFAULT_THEME_SETTINGS.fontFamily]
    return `:root {
  --primary: ${pal.lightPrimary};
  --ring: ${pal.lightRing};
  --radius: ${rad};
  --font-sans: ${font.cssFamily};
  --sidebar-width: ${settings.sidebarWidth};
}
.dark {
  --primary: ${pal.darkPrimary};
  --ring: ${pal.darkRing};
}`
  }, [settings])

  return (
    <ThemeContext.Provider
      value={{
        settings,
        updateSetting,
        applyPreset,
        resetToDefault,
        isOpen,
        setIsOpen,
        toggleOpen,
        exportJson,
        exportCss,
        isAuthenticated: activeUserId !== null,
        hasUserOverride,
        syncStatus,
        saveToAccount,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
