import * as React from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Settings as SettingsIcon,
  Upload,
  Trash2,
  Save,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Copy,
  Image as ImageIcon,
} from "lucide-react"

import {
  PageShell,
  PageHeader,
  PageCard,
  PageErrorBanner,
  RefreshButton,
  FormField,
} from "@/components/layout/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DEFAULT_THEME_SETTINGS,
  PALETTES,
  SURFACES,
  RADIUS_VALUES,
  FONT_DEFINITIONS,
  normalizeFontFamily,
  PRESET_DEFAULTS,
  type ThemePreset,
  type ThemeSettings,
  type PaletteColor,
  type SurfaceType,
  type BorderRadius,
  type FontFamily,
  type TableDensity,
} from "@/features/theme/theme-config"
import { useThemeCustomizer } from "@/features/theme/theme-context"
import { api } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import type { SiteSettings } from "@/types"

function parseTheme(raw?: string): ThemeSettings {
  if (!raw) return DEFAULT_THEME_SETTINGS
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const merged = { ...DEFAULT_THEME_SETTINGS, ...(parsed as Partial<ThemeSettings>) }
      merged.fontFamily = normalizeFontFamily(
        (parsed as Record<string, unknown>).fontFamily,
        DEFAULT_THEME_SETTINGS.fontFamily,
      )
      return merged
    }
  } catch {
    // ignore malformed json
  }
  return DEFAULT_THEME_SETTINGS
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canUpdate = can("settings:update")
  const {
    settings: activeUserTheme,
    hasUserOverride,
    resetToDefault,
  } = useThemeCustomizer()

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [siteTitle, setSiteTitle] = React.useState("")
  const [siteDescription, setSiteDescription] = React.useState("")
  const [logoUrl, setLogoUrl] = React.useState<string>("")
  const [faviconUrl, setFaviconUrl] = React.useState<string>("")
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [faviconFile, setFaviconFile] = React.useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = React.useState(false)
  const [removeFavicon, setRemoveFavicon] = React.useState(false)
  const [systemTheme, setSystemTheme] = React.useState<ThemeSettings>(DEFAULT_THEME_SETTINGS)
  const [updatedAt, setUpdatedAt] = React.useState<string>("")

  const logoInputRef = React.useRef<HTMLInputElement | null>(null)
  const faviconInputRef = React.useRef<HTMLInputElement | null>(null)

  const logoPreview = React.useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile)
    return removeLogo ? "" : logoUrl
  }, [logoFile, logoUrl, removeLogo])

  const faviconPreview = React.useMemo(() => {
    if (faviconFile) return URL.createObjectURL(faviconFile)
    return removeFavicon ? "" : faviconUrl
  }, [faviconFile, faviconUrl, removeFavicon])

  React.useEffect(() => {
    return () => {
      if (logoFile && logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview)
    }
  }, [logoFile, logoPreview])

  React.useEffect(() => {
    return () => {
      if (faviconFile && faviconPreview.startsWith("blob:")) URL.revokeObjectURL(faviconPreview)
    }
  }, [faviconFile, faviconPreview])

  const applyDto = React.useCallback((dto: SiteSettings) => {
    setSiteTitle(dto.site_title || "")
    setSiteDescription(dto.site_description || "")
    setLogoUrl(dto.logo_url || "")
    setFaviconUrl(dto.favicon_url || "")
    setLogoFile(null)
    setFaviconFile(null)
    setRemoveLogo(false)
    setRemoveFavicon(false)
    setSystemTheme(parseTheme(dto.theme_settings))
    setUpdatedAt(dto.updated_at || "")
  }, [])

  const loadSettings = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dto = await api.getSettings()
      applyDto(dto)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unknownError"))
    } finally {
      setLoading(false)
    }
  }, [applyDto, t])

  React.useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const updateThemeField = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSystemTheme((prev) => ({ ...prev, [key]: value }))
  }

  const handleApplyPreset = (preset: ThemePreset) => {
    setSystemTheme((prev) => ({
      ...prev,
      ...PRESET_DEFAULTS[preset],
      preset,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canUpdate) return
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("site_title", siteTitle.trim())
      fd.append("site_description", siteDescription.trim())
      fd.append("theme_settings", JSON.stringify(systemTheme))
      if (removeLogo) fd.append("remove_logo", "true")
      else if (logoFile) fd.append("logo", logoFile)
      if (removeFavicon) fd.append("remove_favicon", "true")
      else if (faviconFile) fd.append("favicon", faviconFile)

      const updated = await api.updateSettings(fd)
      applyDto(updated)
      window.dispatchEvent(new CustomEvent("site:settings-updated", { detail: updated }))
      window.dispatchEvent(
        new CustomEvent("theme:system-sync", { detail: updated.theme_settings ?? "" }),
      )
      toast.success(t("settings.saved"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unknownError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        icon={SettingsIcon}
        title={t("settings.title")}
        description={t("settings.description")}
        badge={
          updatedAt ? (
            <Badge variant="outline" className="px-2 py-0.5 font-mono text-[11px]">
              Singleton
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <RefreshButton
              loading={loading}
              label={t("common.refresh")}
              onClick={() => void loadSettings()}
            />
            {canUpdate && (
              <Button
                type="submit"
                form="system-settings-form"
                size="sm"
                disabled={saving || loading}
                className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
              >
                <Save className="size-3.5" />
                {saving ? t("common.saving") : t("settings.saveChanges")}
              </Button>
            )}
          </>
        }
      />

      <PageErrorBanner message={error} />

      <form id="system-settings-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card 1: General & Branding */}
          <PageCard className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <ImageIcon className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {t("settings.brandingSection")}
              </h2>
            </div>

            <FormField label={t("settings.siteTitle")}>
              <Input
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder={t("settings.siteTitlePlaceholder")}
                disabled={!canUpdate || loading}
                maxLength={200}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField label={t("settings.siteDescription")}>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder={t("settings.siteDescriptionPlaceholder")}
                disabled={!canUpdate || loading}
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Logo Upload */}
              <FormField label={t("settings.logo")} hint={t("settings.imageHint")}>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="size-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="size-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          setLogoFile(file)
                          setRemoveLogo(false)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={!canUpdate || loading}
                      onClick={() => logoInputRef.current?.click()}
                      className="cursor-pointer gap-1 text-[11px]"
                    >
                      <Upload className="size-3" />
                      {t("settings.uploadImage")}
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={!canUpdate || loading}
                        onClick={() => {
                          setLogoFile(null)
                          setRemoveLogo(true)
                          if (logoInputRef.current) logoInputRef.current.value = ""
                        }}
                        className="cursor-pointer gap-1 text-[11px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        {t("settings.removeImage")}
                      </Button>
                    )}
                  </div>
                </div>
              </FormField>

              {/* Favicon Upload */}
              <FormField label={t("settings.favicon")} hint={t("settings.faviconHint")}>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                    {faviconPreview ? (
                      <img
                        src={faviconPreview}
                        alt="Favicon"
                        className="size-8 object-contain"
                      />
                    ) : (
                      <Sparkles className="size-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          setFaviconFile(file)
                          setRemoveFavicon(false)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={!canUpdate || loading}
                      onClick={() => faviconInputRef.current?.click()}
                      className="cursor-pointer gap-1 text-[11px]"
                    >
                      <Upload className="size-3" />
                      {t("settings.uploadImage")}
                    </Button>
                    {faviconPreview && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={!canUpdate || loading}
                        onClick={() => {
                          setFaviconFile(null)
                          setRemoveFavicon(true)
                          if (faviconInputRef.current) faviconInputRef.current.value = ""
                        }}
                        className="cursor-pointer gap-1 text-[11px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        {t("settings.removeImage")}
                      </Button>
                    )}
                  </div>
                </div>
              </FormField>
            </div>
          </PageCard>

          {/* Card 2: Global Default Theme */}
          <PageCard className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  {t("settings.themeSection")}
                </h2>
              </div>
              {canUpdate && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setSystemTheme(activeUserTheme)}
                    className="cursor-pointer gap-1 text-[11px]"
                  >
                    <Copy className="size-3" />
                    {t("settings.useCurrentTheme")}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setSystemTheme(DEFAULT_THEME_SETTINGS)}
                    className="cursor-pointer gap-1 text-[11px] text-muted-foreground"
                  >
                    <RotateCcw className="size-3" />
                    {t("settings.resetTheme")}
                  </Button>
                </div>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("settings.themeHint")}
            </p>

            {hasUserOverride && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px]">
                <span className="text-foreground">
                  Tài khoản hiện tại đang dùng giao diện tuỳ biến riêng trong Theme Studio nên chưa hiển thị cấu hình mặc định hệ thống.
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    resetToDefault()
                    toast.success("Đã chuyển tài khoản về giao diện mặc định hệ thống")
                  }}
                  className="cursor-pointer shrink-0 text-[11px]"
                >
                  Dùng mặc định hệ thống cho tôi
                </Button>
              </div>
            )}

            {/* Live Preview of Selected System Theme */}
            {(() => {
              const isDarkPreview =
                systemTheme.mode === "dark" ||
                (systemTheme.mode === "system" &&
                  typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches)
              const pal = PALETTES[systemTheme.palette] || PALETTES.blue
              const surf = SURFACES[systemTheme.surface] || SURFACES.default
              const tokens = isDarkPreview ? surf.dark : surf.light
              const primary = isDarkPreview ? pal.darkPrimary : pal.lightPrimary
              const radius = RADIUS_VALUES[systemTheme.radius] || RADIUS_VALUES.md
              const font = FONT_DEFINITIONS[systemTheme.fontFamily]
              return (
                <div
                  className="rounded-xl border p-3 transition-colors"
                  style={{
                    backgroundColor: tokens.bg,
                    borderColor: tokens.border,
                    fontFamily: font?.cssFamily,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: isDarkPreview ? "#f8fafc" : "#0f172a" }}
                    >
                      Xem trước giao diện mặc định ({systemTheme.mode} · {pal.label} · {surf.label})
                    </span>
                    <span
                      className="px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: primary, borderRadius: radius }}
                    >
                      Primary
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between gap-2 border px-2.5 py-2 text-[11px]"
                    style={{
                      backgroundColor: tokens.card,
                      borderColor: tokens.border,
                      borderRadius: radius,
                      color: isDarkPreview ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <span>Card &amp; Surface ({surf.label})</span>
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-mono"
                      style={{ backgroundColor: tokens.muted, borderRadius: radius }}
                    >
                      {systemTheme.tableDensity}
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* Mode */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Chế độ hiển thị</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                {(
                  [
                    { id: "light", label: "Sáng", icon: Sun },
                    { id: "dark", label: "Tối", icon: Moon },
                    { id: "system", label: "Hệ thống", icon: Monitor },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon
                  const active = systemTheme.mode === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("mode", item.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 ${
                        active
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Preset</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(PRESET_DEFAULTS) as ThemePreset[]).map((preset) => {
                  const active = systemTheme.preset === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => handleApplyPreset(preset)}
                      className={`rounded-xl border px-2.5 py-2 text-xs font-medium capitalize transition-colors cursor-pointer disabled:opacity-60 ${
                        active
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Palette */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Màu chủ đạo</span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {(Object.keys(PALETTES) as PaletteColor[]).map((key) => {
                  const pal = PALETTES[key]
                  const active = systemTheme.palette === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("palette", key)}
                      title={pal.label}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[10px] cursor-pointer disabled:opacity-60 ${
                        active
                          ? "border-primary bg-primary/10 font-semibold text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <span
                        className="flex size-5 items-center justify-center rounded-full border border-border/50"
                        style={{ backgroundColor: pal.hex }}
                      >
                        {active && <Check className="size-3 text-white" />}
                      </span>
                      <span className="truncate max-w-full">{pal.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Surface */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Tông màu nền (Surface)</span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {SURFACES[systemTheme.surface]?.label || systemTheme.surface}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {(Object.keys(SURFACES) as SurfaceType[]).map((key) => {
                  const surf = SURFACES[key]
                  const isSelected = systemTheme.surface === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("surface", key)}
                      title={surf.label}
                      className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition-all cursor-pointer disabled:opacity-60 ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary font-semibold text-foreground"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div
                        className="size-5 rounded-full border border-black/15 dark:border-white/15 shadow-xs flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: surf.hex }}
                      >
                        {isSelected && (
                          <Check
                            className={`size-3 ${surf.darkCheck ? "text-slate-900" : "text-white"}`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-medium truncate max-w-full">
                        {surf.label.split(" ")[1] || surf.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Độ bo góc (Radius)</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase">
                  {RADIUS_VALUES[systemTheme.radius]}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                {(["none", "sm", "md", "lg", "xl", "full"] as BorderRadius[]).map((rad) => {
                  const isActive = systemTheme.radius === rad
                  return (
                    <button
                      key={rad}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("radius", rad)}
                      className={`rounded-lg py-1.5 text-center text-[10px] font-medium uppercase transition-all cursor-pointer disabled:opacity-60 ${
                        isActive
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rad}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-foreground">Phông chữ hiển thị</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(Object.keys(FONT_DEFINITIONS) as FontFamily[]).map((key) => {
                  const font = FONT_DEFINITIONS[key]
                  const isActive = systemTheme.fontFamily === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("fontFamily", key)}
                      className={`flex items-center justify-between rounded-xl border p-2 text-left transition-all cursor-pointer disabled:opacity-60 ${
                        isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold text-foreground"
                          : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-xs truncate" style={{ fontFamily: font.cssFamily }}>
                        {font.label}
                      </span>
                      {isActive && <Check className="size-3 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Table Row Density */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Mật độ bảng dữ liệu (Row Density)
                </span>
                <span className="text-[11px] font-medium text-muted-foreground capitalize">
                  {systemTheme.tableDensity || "normal"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                {(
                  [
                    { id: "compact", label: "Siêu gọn" },
                    { id: "normal", label: "Chuẩn" },
                    { id: "comfortable", label: "Thoáng" },
                  ] as { id: TableDensity; label: string }[]
                ).map((td) => {
                  const isActive = (systemTheme.tableDensity || "normal") === td.id
                  return (
                    <button
                      key={td.id}
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => updateThemeField("tableDensity", td.id)}
                      className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer disabled:opacity-60 ${
                        isActive
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {td.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </PageCard>
        </div>
      </form>
    </PageShell>
  )
}
