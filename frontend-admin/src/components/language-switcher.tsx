import * as React from "react"
import { useTranslation } from "react-i18next"
import { Languages } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { currentLang, setLang, type Lang } from "@/lib/i18n"

const OPTIONS: Array<{ value: Lang; labelKey: string }> = [
  { value: "vi", labelKey: "common.vietnamese" },
  { value: "en", labelKey: "common.english" },
]

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [lang, setLangState] = React.useState<Lang>(() => currentLang())

  // Giữ state đồng bộ khi ngôn ngữ đổi từ nơi khác (vd. sau khi reload settings).
  React.useEffect(() => {
    const onChange = (next: string) => setLangState(next === "en" ? "en" : "vi")
    i18n.on("languageChanged", onChange)
    return () => {
      i18n.off("languageChanged", onChange)
    }
  }, [i18n])

  const choose = (next: Lang) => {
    setLang(next)
    setLangState(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={t("common.language")}
          className="h-8 gap-1.5 text-xs cursor-pointer"
        >
          <Languages className="size-3.5" />
          <span className="hidden md:inline font-mono uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("common.language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => choose(option.value)}
            className="text-xs cursor-pointer"
          >
            <span className={option.value === lang ? "font-bold text-primary" : ""}>
              {t(option.labelKey)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
