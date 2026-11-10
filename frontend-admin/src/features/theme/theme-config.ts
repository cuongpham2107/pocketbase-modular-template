// Cấu hình theme thuần dữ liệu (type, bảng màu, preset) — tách khỏi Provider để Fast Refresh hoạt động.
export type ThemePreset = "modern" | "precision" | "velvet" | "obsidian"
export type PaletteColor = "amber" | "blue" | "forest" | "citrus" | "violet" | "rose" | "teal" | "zinc"
export type SurfaceType =
  | "default"
  | "slate"
  | "stone"
  | "linen"
  | "sand"
  | "sage"
  | "rosewood"
  | "pure"
export type BorderRadius = "none" | "sm" | "md" | "lg" | "xl" | "full"
// Thang phần trăm theo vùng nội dung: luôn thấy thay đổi ở mọi độ phân giải
// (max-w-5xl/7xl không bao giờ "bắt" trên màn laptop ~1000px nên trước đây
// người dùng chọn mà không thấy gì đổi). Các key cũ vẫn giữ để theme_settings
// đã lưu trong DB không bị mất hiệu lực.
export type ContentWidth =
  | "full"
  | "90"
  | "80"
  | "70"
  | "60"
  | "screen-2xl"
  | "7xl"
  | "6xl"
  | "5xl"
export type FontFamily = "geist" | "inter" | "outfit" | "jakarta" | "figtree" | "mono"
export type FontSize = "xs" | "sm" | "md" | "lg" | "xl"
export type Density = "tight" | "normal" | "spacious"
export type NavLayout = "sidebar-collapsible" | "sidebar-fixed" | "top"
export type SidebarWidth = "16rem" | "18rem" | "20rem" | "22rem" | "24rem"
export type ThemeMode = "light" | "dark" | "system"
export type SidebarVariant = "sidebar" | "floating" | "inset"
export type SidebarCollapsible = "icon" | "offcanvas" | "none"
export type TableDensity = "compact" | "normal" | "comfortable"
export type CardStyle = "bordered" | "elevated" | "glass"

export interface PaletteDefinition {
  id: PaletteColor
  label: string
  hex: string
  lightPrimary: string
  darkPrimary: string
  lightRing: string
  darkRing: string
}

export const PALETTES: Record<PaletteColor, PaletteDefinition> = {
  amber: {
    id: "amber",
    label: "Amber Gold",
    hex: "#f59e0b",
    lightPrimary: "oklch(0.72 0.18 75)",
    darkPrimary: "oklch(0.76 0.17 75)",
    lightRing: "oklch(0.72 0.18 75)",
    darkRing: "oklch(0.76 0.17 75)",
  },
  blue: {
    id: "blue",
    label: "Royal Blue",
    hex: "#3b82f6",
    lightPrimary: "oklch(0.55 0.22 260)",
    darkPrimary: "oklch(0.62 0.21 260)",
    lightRing: "oklch(0.55 0.22 260)",
    darkRing: "oklch(0.62 0.21 260)",
  },
  forest: {
    id: "forest",
    label: "Emerald Forest",
    hex: "#10b981",
    lightPrimary: "oklch(0.65 0.19 155)",
    darkPrimary: "oklch(0.70 0.18 155)",
    lightRing: "oklch(0.65 0.19 155)",
    darkRing: "oklch(0.70 0.18 155)",
  },
  citrus: {
    id: "citrus",
    label: "Sunset Citrus",
    hex: "#f97316",
    lightPrimary: "oklch(0.66 0.21 42)",
    darkPrimary: "oklch(0.72 0.20 42)",
    lightRing: "oklch(0.66 0.21 42)",
    darkRing: "oklch(0.72 0.20 42)",
  },
  violet: {
    id: "violet",
    label: "Royal Violet",
    hex: "#8b5cf6",
    lightPrimary: "oklch(0.58 0.24 290)",
    darkPrimary: "oklch(0.66 0.22 290)",
    lightRing: "oklch(0.58 0.24 290)",
    darkRing: "oklch(0.66 0.22 290)",
  },
  rose: {
    id: "rose",
    label: "Vibrant Rose",
    hex: "#f43f5e",
    lightPrimary: "oklch(0.61 0.25 15)",
    darkPrimary: "oklch(0.68 0.22 15)",
    lightRing: "oklch(0.61 0.25 15)",
    darkRing: "oklch(0.68 0.22 15)",
  },
  teal: {
    id: "teal",
    label: "Cyan Teal",
    hex: "#14b8a6",
    lightPrimary: "oklch(0.65 0.15 190)",
    darkPrimary: "oklch(0.72 0.14 190)",
    lightRing: "oklch(0.65 0.15 190)",
    darkRing: "oklch(0.72 0.14 190)",
  },
  zinc: {
    id: "zinc",
    label: "Monochrome Zinc",
    hex: "#71717a",
    lightPrimary: "oklch(0.35 0.02 260)",
    darkPrimary: "oklch(0.85 0.01 260)",
    lightRing: "oklch(0.45 0.02 260)",
    darkRing: "oklch(0.85 0.01 260)",
  },
}

export interface SurfaceTokens {
  bg: string
  card: string
  muted: string
  border: string
  sidebar: string
}

export interface SurfaceDefinition {
  id: SurfaceType
  label: string
  /** Màu đại diện hiển thị trong vòng tròn chọn màu (giống Bảng màu Primary) */
  hex: string
  /** Có phải màu sáng cần dấu check màu tối không */
  darkCheck?: boolean
  light: SurfaceTokens
  dark: SurfaceTokens
}

export const SURFACES: Record<SurfaceType, SurfaceDefinition> = {
  default: {
    id: "default",
    label: "Cool Default",
    hex: "#dbeafe",
    darkCheck: true,
    light: {
      bg: "oklch(0.985 0.006 250)",
      card: "oklch(0.997 0.003 250)",
      muted: "oklch(0.955 0.016 250)",
      border: "oklch(0.905 0.016 250)",
      sidebar: "oklch(0.975 0.01 250)",
    },
    dark: {
      bg: "oklch(0.14 0.02 260)",
      card: "oklch(0.18 0.025 260)",
      muted: "oklch(0.23 0.03 260)",
      border: "oklch(0.27 0.03 260)",
      sidebar: "oklch(0.16 0.025 260)",
    },
  },
  slate: {
    id: "slate",
    label: "Steel Slate",
    hex: "#64748b",
    light: {
      bg: "oklch(0.968 0.012 245)",
      card: "oklch(0.985 0.008 245)",
      muted: "oklch(0.93 0.02 245)",
      border: "oklch(0.875 0.022 245)",
      sidebar: "oklch(0.952 0.015 245)",
    },
    dark: {
      bg: "oklch(0.135 0.03 245)",
      card: "oklch(0.175 0.035 245)",
      muted: "oklch(0.225 0.04 245)",
      border: "oklch(0.27 0.04 245)",
      sidebar: "oklch(0.12 0.03 245)",
    },
  },
  stone: {
    id: "stone",
    label: "Warm Stone",
    hex: "#78716c",
    light: {
      bg: "oklch(0.968 0.01 75)",
      card: "oklch(0.986 0.006 75)",
      muted: "oklch(0.932 0.016 75)",
      border: "oklch(0.88 0.018 75)",
      sidebar: "oklch(0.955 0.012 75)",
    },
    dark: {
      bg: "oklch(0.15 0.012 75)",
      card: "oklch(0.19 0.016 75)",
      muted: "oklch(0.24 0.02 75)",
      border: "oklch(0.28 0.02 75)",
      sidebar: "oklch(0.135 0.012 75)",
    },
  },
  linen: {
    id: "linen",
    label: "Cream Linen",
    hex: "#d6bfa7",
    darkCheck: true,
    light: {
      bg: "oklch(0.972 0.02 80)",
      card: "oklch(0.988 0.014 80)",
      muted: "oklch(0.938 0.028 80)",
      border: "oklch(0.885 0.03 80)",
      sidebar: "oklch(0.96 0.022 80)",
    },
    dark: {
      bg: "oklch(0.165 0.022 65)",
      card: "oklch(0.205 0.026 65)",
      muted: "oklch(0.255 0.03 65)",
      border: "oklch(0.30 0.03 65)",
      sidebar: "oklch(0.15 0.02 65)",
    },
  },
  sand: {
    id: "sand",
    label: "Golden Sand",
    hex: "#eab308",
    light: {
      bg: "oklch(0.975 0.024 90)",
      card: "oklch(0.99 0.016 90)",
      muted: "oklch(0.942 0.035 90)",
      border: "oklch(0.89 0.038 90)",
      sidebar: "oklch(0.962 0.028 90)",
    },
    dark: {
      bg: "oklch(0.16 0.028 80)",
      card: "oklch(0.20 0.032 80)",
      muted: "oklch(0.25 0.038 80)",
      border: "oklch(0.295 0.038 80)",
      sidebar: "oklch(0.145 0.025 80)",
    },
  },
  sage: {
    id: "sage",
    label: "Mint Sage",
    hex: "#34d399",
    light: {
      bg: "oklch(0.974 0.016 160)",
      card: "oklch(0.99 0.01 160)",
      muted: "oklch(0.94 0.025 160)",
      border: "oklch(0.888 0.028 160)",
      sidebar: "oklch(0.96 0.02 160)",
    },
    dark: {
      bg: "oklch(0.145 0.025 160)",
      card: "oklch(0.185 0.03 160)",
      muted: "oklch(0.235 0.035 160)",
      border: "oklch(0.28 0.035 160)",
      sidebar: "oklch(0.13 0.022 160)",
    },
  },
  rosewood: {
    id: "rosewood",
    label: "Rose Mist",
    hex: "#fb7185",
    light: {
      bg: "oklch(0.975 0.016 15)",
      card: "oklch(0.99 0.01 15)",
      muted: "oklch(0.942 0.025 15)",
      border: "oklch(0.892 0.028 15)",
      sidebar: "oklch(0.962 0.02 15)",
    },
    dark: {
      bg: "oklch(0.15 0.028 15)",
      card: "oklch(0.19 0.032 15)",
      muted: "oklch(0.24 0.038 15)",
      border: "oklch(0.285 0.038 15)",
      sidebar: "oklch(0.135 0.024 15)",
    },
  },
  pure: {
    id: "pure",
    label: "Pure Mono",
    hex: "#18181b",
    light: {
      bg: "oklch(1 0 0)",
      card: "oklch(1 0 0)",
      muted: "oklch(0.96 0 0)",
      border: "oklch(0.90 0 0)",
      sidebar: "oklch(0.985 0 0)",
    },
    dark: {
      bg: "oklch(0.09 0 0)",
      card: "oklch(0.13 0 0)",
      muted: "oklch(0.18 0 0)",
      border: "oklch(0.23 0 0)",
      sidebar: "oklch(0.07 0 0)",
    },
  },
}

export const RADIUS_VALUES: Record<BorderRadius, string> = {
  none: "0px",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
}

export const FONT_DEFINITIONS: Record<FontFamily, { label: string; fontClass: string; cssFamily: string }> = {
  geist: { label: "Geist Sans", fontClass: "font-sans", cssFamily: "'Geist Variable', -apple-system, sans-serif" },
  inter: { label: "Inter", fontClass: "font-sans", cssFamily: "'Inter', -apple-system, sans-serif" },
  outfit: { label: "Outfit Display", fontClass: "font-sans", cssFamily: "'Outfit', sans-serif" },
  jakarta: { label: "Plus Jakarta", fontClass: "font-sans", cssFamily: "'Plus Jakarta Sans', sans-serif" },
  figtree: { label: "Figtree Modern", fontClass: "font-sans", cssFamily: "'Figtree', sans-serif" },
  mono: { label: "JetBrains Mono", fontClass: "font-mono", cssFamily: "'JetBrains Mono', monospace" },
}

export const FONT_SIZE_VALUES: Record<FontSize, { label: string; shortLabel: string; px: string; scale: number }> = {
  xs: { label: "Nhỏ (14px)", shortLabel: "14px", px: "14px", scale: 0.875 },
  sm: { label: "Hơi nhỏ (15px)", shortLabel: "15px", px: "15px", scale: 0.9375 },
  md: { label: "Tiêu chuẩn (16px)", shortLabel: "16px", px: "16px", scale: 1 },
  lg: { label: "Lớn (17px)", shortLabel: "17px", px: "17px", scale: 1.0625 },
  xl: { label: "Rất lớn (18px)", shortLabel: "18px", px: "18px", scale: 1.125 },
}

export interface ThemeSettings {
  preset: ThemePreset
  mode: ThemeMode
  palette: PaletteColor
  surface: SurfaceType
  radius: BorderRadius
  contentWidth: ContentWidth
  fontFamily: FontFamily
  fontSize: FontSize
  density: Density
  navLayout: NavLayout
  sidebarWidth: SidebarWidth
  sidebarVariant: SidebarVariant
  sidebarCollapsible: SidebarCollapsible
  stickyTableHeader: boolean
  tableDensity: TableDensity
  tableStriped: boolean
  tableBorders: boolean
  cardStyle: CardStyle
  reducedMotion: boolean
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  preset: "modern",
  mode: "light",
  palette: "blue",
  surface: "default",
  radius: "md",
  contentWidth: "7xl",
  fontFamily: "geist",
  fontSize: "md",
  density: "normal",
  navLayout: "sidebar-collapsible",
  sidebarWidth: "18rem",
  sidebarVariant: "sidebar",
  sidebarCollapsible: "icon",
  stickyTableHeader: true,
  tableDensity: "normal",
  tableStriped: false,
  tableBorders: false,
  cardStyle: "bordered",
  reducedMotion: false,
}

export const PRESET_DEFAULTS: Record<ThemePreset, Partial<ThemeSettings>> = {
  modern: {
    preset: "modern",
    palette: "blue",
    surface: "default",
    radius: "md",
    fontFamily: "geist",
    density: "normal",
  },
  precision: {
    preset: "precision",
    palette: "zinc",
    surface: "slate",
    radius: "none",
    fontFamily: "inter",
    density: "tight",
  },
  velvet: {
    preset: "velvet",
    palette: "violet",
    surface: "linen",
    radius: "xl",
    fontFamily: "outfit",
    density: "spacious",
  },
  obsidian: {
    preset: "obsidian",
    mode: "dark",
    palette: "amber",
    surface: "pure",
    radius: "sm",
    fontFamily: "jakarta",
    density: "normal",
  },
}
