import * as React from "react"
import { api } from "@/lib/api"

import {
  DEFAULT_THEME_SETTINGS,
  FONT_DEFINITIONS,
  FONT_SIZE_VALUES,
  PALETTES,
  PRESET_DEFAULTS,
  RADIUS_VALUES,
  type ThemePreset,
  type ThemeSettings,
} from "./theme-config"
import { ThemeContext } from "./theme-context"

const STORAGE_KEY = "filament_theme_customizer_settings"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo: localStorage, rồi đè bằng theme lưu trong hồ sơ user (nếu có) — làm ngay
  // trong initializer thay vì setState trong effect sau mount.
  const [settings, setSettings] = React.useState<ThemeSettings>(() => {
    let base = DEFAULT_THEME_SETTINGS
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        base = { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn("Failed to load theme settings from localStorage:", e)
    }
    const raw = api.getStoredUser()?.theme_settings
    if (raw) {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
        if (parsed && typeof parsed === "object") return { ...base, ...parsed }
      } catch {
        // ignore non-json theme_settings
      }
    }
    return base
  })

  const [isOpen, setIsOpen] = React.useState(false)

  // Persist to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.warn("Failed to save theme settings to localStorage:", e)
    }
  }, [settings])

  React.useEffect(() => {
    const handleUserSync = (e: Event) => {
      const customEvent = e as CustomEvent<any>
      if (customEvent.detail?.theme_settings) {
        try {
          const raw = customEvent.detail.theme_settings
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
          if (parsed && typeof parsed === "object") {
            setSettings((prev) => {
              const hasDiff = Object.keys(parsed).some((k) => prev[k as keyof ThemeSettings] !== parsed[k])
              return hasDiff ? { ...prev, ...parsed } : prev
            })
          }
        } catch {
          // ignore non-json theme_settings
        }
      }
    }
    window.addEventListener("theme:user-sync", handleUserSync)
    return () => window.removeEventListener("theme:user-sync", handleUserSync)
  }, [])

  // Auto-sync theme to backend database for logged-in user (debounced)
  React.useEffect(() => {
    if (!api.getToken()) return
    const timer = setTimeout(() => {
      api.updateThemeSettings(JSON.stringify(settings)).catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [settings])

  // Apply CSS variables & DOM modifications dynamically
  React.useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyThemeToDom = () => {
      const isDark =
        settings.mode === "dark" ||
        (settings.mode === "system" && mediaQuery.matches)

      // 1. Dark class
      if (isDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }

      // 2. Palette primary colors
      const pal = PALETTES[settings.palette] || PALETTES.blue
      const primary = isDark ? pal.darkPrimary : pal.lightPrimary
      const ring = isDark ? pal.darkRing : pal.lightRing

      root.style.setProperty("--primary", primary)
      root.style.setProperty("--ring", ring)
      root.style.setProperty("--sidebar-primary", primary)

      // 3. Border radius
      const rad = RADIUS_VALUES[settings.radius] || RADIUS_VALUES.md
      root.style.setProperty("--radius", rad)

      // 4. Background Surface
      switch (settings.surface) {
        case "linen":
          root.style.setProperty("--background", isDark ? "oklch(0.18 0.02 60)" : "oklch(0.985 0.015 80)")
          root.style.setProperty("--card", isDark ? "oklch(0.22 0.025 60)" : "oklch(1 0 0)")
          root.style.setProperty("--sidebar", isDark ? "oklch(0.16 0.02 60)" : "oklch(0.975 0.015 80)")
          break
        case "slate":
          root.style.setProperty("--background", isDark ? "oklch(0.14 0.03 240)" : "oklch(0.985 0.01 240)")
          root.style.setProperty("--card", isDark ? "oklch(0.18 0.035 240)" : "oklch(1 0 0)")
          root.style.setProperty("--sidebar", isDark ? "oklch(0.12 0.03 240)" : "oklch(0.975 0.01 240)")
          break
        case "stone":
          root.style.setProperty("--background", isDark ? "oklch(0.16 0.015 80)" : "oklch(0.98 0.01 70)")
          root.style.setProperty("--card", isDark ? "oklch(0.20 0.02 80)" : "oklch(1 0 0)")
          root.style.setProperty("--sidebar", isDark ? "oklch(0.14 0.015 80)" : "oklch(0.97 0.01 70)")
          break
        case "pure":
          root.style.setProperty("--background", isDark ? "oklch(0.08 0 0)" : "oklch(1 0 0)")
          root.style.setProperty("--card", isDark ? "oklch(0.13 0 0)" : "oklch(0.985 0 0)")
          root.style.setProperty("--sidebar", isDark ? "oklch(0.05 0 0)" : "oklch(0.99 0 0)")
          break
        case "default":
        default:
          root.style.removeProperty("--background")
          root.style.removeProperty("--card")
          root.style.removeProperty("--sidebar")
          break
      }

      // 5. Font family & Font size
      const font = FONT_DEFINITIONS[settings.fontFamily]
      if (font) {
        document.body.style.fontFamily = font.cssFamily
      }
      const fontSizeDef = FONT_SIZE_VALUES[settings.fontSize] || FONT_SIZE_VALUES.md
      root.style.fontSize = fontSizeDef.px
      root.style.setProperty("--font-scale", String(fontSizeDef.scale))

      // 6. Sidebar width CSS variable
      root.style.setProperty("--sidebar-width", settings.sidebarWidth)

      // 7. Table & UI Attributes
      root.dataset.stickyHeader = settings.stickyTableHeader ? "true" : "false"
      root.dataset.tableDensity = settings.tableDensity || "normal"
      root.dataset.tableStriped = settings.tableStriped ? "true" : "false"
      root.dataset.tableBorders = settings.tableBorders ? "true" : "false"
      root.dataset.cardStyle = settings.cardStyle || "bordered"
      root.dataset.reducedMotion = settings.reducedMotion ? "true" : "false"
    }

    applyThemeToDom()

    if (settings.mode === "system") {
      mediaQuery.addEventListener("change", applyThemeToDom)
      return () => mediaQuery.removeEventListener("change", applyThemeToDom)
    }
  }, [settings])

  const updateSetting = React.useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const applyPreset = React.useCallback((preset: ThemePreset) => {
    const presetOverrides = PRESET_DEFAULTS[preset]
    setSettings((prev) => ({
      ...prev,
      ...presetOverrides,
      preset,
    }))
  }, [])

  const resetToDefault = React.useCallback(() => {
    setSettings(DEFAULT_THEME_SETTINGS)
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
    const font = FONT_DEFINITIONS[settings.fontFamily]
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
