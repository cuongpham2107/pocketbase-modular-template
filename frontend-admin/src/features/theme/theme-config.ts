// Cấu hình theme thuần dữ liệu (type, bảng màu, preset) — tách khỏi Provider để Fast Refresh hoạt động.
export type ThemePreset = "modern" | "precision" | "velvet" | "obsidian"
export type PaletteColor = "amber" | "blue" | "forest" | "citrus" | "violet" | "rose" | "teal" | "zinc"
export type SurfaceType = "default" | "linen" | "slate" | "stone" | "pure"
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
