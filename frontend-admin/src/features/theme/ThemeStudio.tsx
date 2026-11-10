import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Palette,
  X,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useThemeCustomizer } from "./theme-context"
import {
  PALETTES,
  SURFACES,
  RADIUS_VALUES,
  FONT_DEFINITIONS,
  FONT_SIZE_VALUES,
  type PaletteColor,
  type SurfaceType,
  type BorderRadius,
  type ContentWidth,
  type FontFamily,
  type FontSize,
  type SidebarWidth,
  type SidebarVariant,
  type SidebarCollapsible,
  type TableDensity,
  type CardStyle,
} from "./theme-config"

export function ThemeStudio() {
  const {
    settings,
    updateSetting,
    applyPreset,
    resetToDefault,
    isOpen,
    setIsOpen,
    toggleOpen,
    exportCss,
  } = useThemeCustomizer()

  const [copied, setCopied] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"all" | "style" | "layout" | "table">("all")

  const handleCopyCss = () => {
    navigator.clipboard.writeText(exportCss())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      {/* Header Palette Icon Button Only */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleOpen}
        className={`h-8 w-8 rounded-lg border-border/60 transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? "bg-primary text-primary-foreground border-primary shadow-xs"
            : "bg-muted/40 text-foreground hover:bg-muted"
        }`}
        title="Tùy biến theme & bố cục"
      >
        <Palette
          className={`size-4 transition-transform ${
            isOpen ? "text-primary-foreground rotate-12" : "text-amber-500"
          }`}
        />
      </Button>

      {/* Popover Dropdown Anchored Directly Below Header Icon */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setIsOpen(false)}
            />

            {/* Anchored Dropdown Card */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute right-0 top-10 z-50 w-[360px] sm:w-[430px] max-w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 bg-card/98 backdrop-blur-xl shadow-2xl p-4 sm:p-5 text-foreground space-y-4 sm:space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">Theme Studio</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Tùy biến giao diện, bố cục &amp; bảng dữ liệu thời gian thực
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={resetToDefault}
                    title="Khôi phục mặc định"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setIsOpen(false)}
                    title="Đóng"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 text-xs">
                {(
                  [
                    { id: "all", label: "Tất cả" },
                    { id: "style", label: "Phong cách" },
                    { id: "layout", label: "Bố cục" },
                    { id: "table", label: "Bảng dữ liệu" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Section 1: Light / Dark / System Mode */}
              <section className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Chế độ hiển thị</label>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => updateSetting("mode", "light")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      settings.mode === "light"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="size-3.5 text-amber-500" />
                    <span>Sáng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("mode", "dark")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      settings.mode === "dark"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="size-3.5 text-primary" />
                    <span>Tối</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting("mode", "system")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      settings.mode === "system"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Monitor className="size-3.5 text-emerald-500" />
                    <span>Hệ thống</span>
                  </button>
                </div>
              </section>

              {/* ========================================================= */}
              {/* TAB: PHONG CÁCH (STYLE)                                   */}
              {/* ========================================================= */}
              {(activeTab === "all" || activeTab === "style") && (
                <>
                  {/* Presets */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Preset Thiết Kế</span>
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {settings.preset}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "modern", name: "Modern", desc: "Cân bằng & Tinh tế" },
                        { id: "precision", name: "Precision", desc: "Vuông vắn kỹ thuật" },
                        { id: "velvet", name: "Velvet", desc: "Mềm mại & Bo tròn" },
                        { id: "obsidian", name: "Obsidian", desc: "Tương phản sâu" },
                      ].map((p) => {
                        const isActive = settings.preset === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPreset(p.id as any)}
                            className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                              isActive
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-border/80 hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{p.name}</span>
                              {isActive && <Check className="size-3 text-primary" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Primary Palette */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Bảng màu Primary</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {PALETTES[settings.palette]?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(PALETTES) as PaletteColor[]).map((key) => {
                        const pal = PALETTES[key]
                        const isSelected = settings.palette === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateSetting("palette", key)}
                            className={`group flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            <div
                              className="size-5 rounded-full shadow-xs flex items-center justify-center transition-transform group-hover:scale-110"
                              style={{ backgroundColor: pal.hex }}
                            >
                              {isSelected && <Check className="size-3 text-white" />}
                            </div>
                            <span className="text-[10px] font-medium truncate w-full">
                              {pal.label.split(" ")[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Corner Radius */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Độ bo góc (Radius)</span>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">
                        {RADIUS_VALUES[settings.radius]}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(["none", "sm", "md", "lg", "xl", "full"] as BorderRadius[]).map((rad) => {
                        const isActive = settings.radius === rad
                        return (
                          <button
                            key={rad}
                            type="button"
                            onClick={() => updateSetting("radius", rad)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium uppercase transition-all cursor-pointer ${
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
                  </section>

                  {/* Surface Tint (Giống Bảng màu Primary) */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Tông màu nền (Surface)</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {SURFACES[settings.surface]?.label || settings.surface}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(SURFACES) as SurfaceType[]).map((key) => {
                        const surf = SURFACES[key]
                        const isSelected = settings.surface === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateSetting("surface", key)}
                            className={`group flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            <div
                              className="size-5 rounded-full border border-black/15 dark:border-white/15 shadow-xs flex items-center justify-center transition-transform group-hover:scale-110"
                              style={{ backgroundColor: surf.hex }}
                            >
                              {isSelected && (
                                <Check
                                  className={`size-3 ${
                                    surf.darkCheck ? "text-slate-900" : "text-white"
                                  }`}
                                />
                              )}
                            </div>
                            <span className="text-[10px] font-medium truncate w-full">
                              {surf.label.split(" ")[1] || surf.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Card Style */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Kiểu khung thẻ (Card Style)</span>
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {settings.cardStyle || "bordered"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(
                        [
                          { id: "bordered", label: "Viền mảnh" },
                          { id: "elevated", label: "Đổ bóng nổi" },
                          { id: "glass", label: "Kính mờ" },
                        ] as { id: CardStyle; label: string }[]
                      ).map((c) => {
                        const isActive = (settings.cardStyle || "bordered") === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => updateSetting("cardStyle", c.id)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Typography */}
                  <section className="space-y-2">
                    <span className="text-xs font-semibold text-foreground">Phông chữ hiển thị</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(FONT_DEFINITIONS) as FontFamily[]).map((key) => {
                        const font = FONT_DEFINITIONS[key]
                        const isActive = settings.fontFamily === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateSetting("fontFamily", key)}
                            className={`flex items-center justify-between rounded-xl border p-2 text-left transition-all cursor-pointer ${
                              isActive
                                ? "border-primary bg-primary/5 ring-1 ring-primary font-semibold"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            <span className="text-xs">{font.label}</span>
                            {isActive && <Check className="size-3 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Font Size */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Cỡ chữ (Font Size)</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {FONT_SIZE_VALUES[settings.fontSize || "md"]?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(Object.keys(FONT_SIZE_VALUES) as FontSize[]).map((sizeKey) => {
                        const def = FONT_SIZE_VALUES[sizeKey]
                        const isActive = (settings.fontSize || "md") === sizeKey
                        return (
                          <button
                            key={sizeKey}
                            type="button"
                            onClick={() => updateSetting("fontSize", sizeKey)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title={def.label}
                          >
                            {def.shortLabel}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Reduced Motion */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Hiệu ứng chuyển động (Animations)
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {settings.reducedMotion ? "Tắt (Tức thì)" : "Mượt mà"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => updateSetting("reducedMotion", false)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          !settings.reducedMotion
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bật (Mượt mà)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("reducedMotion", true)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          settings.reducedMotion
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tắt (Phản hồi tức thì)
                      </button>
                    </div>
                  </section>
                </>
              )}

              {/* ========================================================= */}
              {/* TAB: BỐ CỤC (LAYOUT & SIDEBAR)                            */}
              {/* ========================================================= */}
              {(activeTab === "all" || activeTab === "layout") && (
                <>
                  {/* Sidebar Variant */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Kiểu dáng Sidebar</span>
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {settings.sidebarVariant || "sidebar"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(
                        [
                          { id: "sidebar", label: "Cổ điển" },
                          { id: "floating", label: "Nổi (Floating)" },
                          { id: "inset", label: "Lồng khung (Inset)" },
                        ] as { id: SidebarVariant; label: string }[]
                      ).map((v) => {
                        const isActive = (settings.sidebarVariant || "sidebar") === v.id
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => updateSetting("sidebarVariant", v.id)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Sidebar Collapsible Mode */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Chế độ thu gọn Sidebar</span>
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {settings.sidebarCollapsible || "icon"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(
                        [
                          { id: "icon", label: "Thu về Icon" },
                          { id: "offcanvas", label: "Ẩn hẳn" },
                          { id: "none", label: "Luôn mở" },
                        ] as { id: SidebarCollapsible; label: string }[]
                      ).map((c) => {
                        const isActive = (settings.sidebarCollapsible || "icon") === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => updateSetting("sidebarCollapsible", c.id)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Sidebar Width */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Độ rộng Sidebar</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {settings.sidebarWidth}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(["16rem", "18rem", "20rem", "22rem", "24rem"] as SidebarWidth[]).map((sw) => {
                        const isActive = settings.sidebarWidth === sw
                        return (
                          <button
                            key={sw}
                            type="button"
                            onClick={() => updateSetting("sidebarWidth", sw)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {sw}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Content Width */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Độ rộng nội dung</span>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">
                        {settings.contentWidth}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(["full", "90", "80", "70", "60"] as ContentWidth[]).map((width) => {
                        const isActive = settings.contentWidth === width
                        return (
                          <button
                            key={width}
                            type="button"
                            onClick={() => updateSetting("contentWidth", width)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium uppercase transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {width === "full" ? "100%" : `${width}%`}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Page Density */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Mật độ khung trang</span>
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {settings.density}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      {(
                        [
                          { id: "tight", label: "Gọn gàng" },
                          { id: "normal", label: "Tiêu chuẩn" },
                          { id: "spacious", label: "Rộng rãi" },
                        ] as const
                      ).map((d) => {
                        const isActive = settings.density === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => updateSetting("density", d.id)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? "bg-card text-foreground shadow-xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}

              {/* ========================================================= */}
              {/* TAB: BẢNG DỮ LIỆU (TABLE EXPERIENCE)                      */}
              {/* ========================================================= */}
              {(activeTab === "all" || activeTab === "table") && (
                <>
                  {/* Sticky Table Header */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Ghim tiêu đề bảng (Sticky Header)
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {settings.stickyTableHeader ? "Đang bật" : "Đang tắt"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => updateSetting("stickyTableHeader", true)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          settings.stickyTableHeader
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bật (Ghim tiêu đề)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("stickyTableHeader", false)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          !settings.stickyTableHeader
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tắt (Cuộn thường)
                      </button>
                    </div>
                  </section>

                  {/* Table Row Density */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Chiều cao dòng bảng (Row Density)
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground capitalize">
                        {settings.tableDensity || "normal"}
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
                        const isActive = (settings.tableDensity || "normal") === td.id
                        return (
                          <button
                            key={td.id}
                            type="button"
                            onClick={() => updateSetting("tableDensity", td.id)}
                            className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
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
                  </section>

                  {/* Table Zebra Stripes */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Màu dòng xen kẽ (Zebra Stripes)
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {settings.tableStriped ? "Đang bật" : "Đang tắt"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => updateSetting("tableStriped", true)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          settings.tableStriped
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bật (Xen kẽ dòng)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("tableStriped", false)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          !settings.tableStriped
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tắt (Đồng màu)
                      </button>
                    </div>
                  </section>

                  {/* Table Cell Borders */}
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Đường kẻ dọc giữa các cột (Grid Borders)
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {settings.tableBorders ? "Đang bật" : "Đang tắt"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => updateSetting("tableBorders", true)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          settings.tableBorders
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Bật (Kẻ ô dọc)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSetting("tableBorders", false)}
                        className={`rounded-lg py-1.5 text-center text-[10px] font-medium transition-all cursor-pointer ${
                          !settings.tableBorders
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tắt (Chỉ kẻ ngang)
                      </button>
                    </div>
                  </section>
                </>
              )}

              {/* Footer Actions: Copy CSS Variables */}
              <div className="pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCss}
                  className="w-full text-xs font-medium gap-1.5 rounded-xl border-border/80 shadow-2xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Đã sao chép CSS variables!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-muted-foreground" />
                      <span>Sao chép CSS biến số (CSS Tokens)</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ThemeStudio
