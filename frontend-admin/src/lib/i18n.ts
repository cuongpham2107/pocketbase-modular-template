import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from '@/locales/en'
import { vi } from '@/locales/vi'

export const LANG_KEY = 'i18n.lang'
export const SUPPORTED_LANGS = ['vi', 'en'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]
export const DEFAULT_LANG: Lang = 'vi'

function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value)
}

/** `localStorage` → `navigator.language` → mặc định `vi`. */
export function detectLang(): Lang {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LANG_KEY)
    if (isLang(stored)) return stored
  }
  if (typeof navigator !== 'undefined') {
    const short = navigator.language?.slice(0, 2).toLowerCase()
    if (isLang(short)) return short
  }
  return DEFAULT_LANG
}

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: detectLang(),
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (lang) => {
  if (isLang(lang)) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang)
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }
})

export function currentLang(): Lang {
  return isLang(i18n.language) ? i18n.language : DEFAULT_LANG
}

export function setLang(lang: Lang): void {
  void i18n.changeLanguage(lang)
}

/**
 * Dịch mã lỗi backend (`error.code`) sang ngôn ngữ hiện tại, fallback về
 * message gốc từ server rồi tới key `errors.<CODE>`.
 */
export function translateErrorCode(code: string | undefined, fallback?: string): string {
  if (code) {
    const key = `errors.${code}`
    const translated = i18n.t(key)
    if (translated && translated !== key) return translated
  }
  return fallback || i18n.t('errors.INTERNAL_ERROR')
}

export default i18n
