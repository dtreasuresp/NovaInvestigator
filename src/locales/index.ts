import { es, type TranslationSchema } from './es'
import { en } from './en'
import { de } from './de'
import { pt } from './pt'
import { ko } from './ko'

export type SupportedLocale = 'es' | 'en' | 'de' | 'pt' | 'ko'

export type { TranslationSchema }

export interface LanguageMeta {
  code: SupportedLocale
  name: string
  nativeName: string
  flag: string
  bcp47: string
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    bcp47: 'es-ES'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    bcp47: 'en-US'
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    bcp47: 'de-DE'
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    bcp47: 'pt-BR'
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    bcp47: 'ko-KR'
  }
]

export const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
  es,
  en,
  de,
  pt,
  ko
}

export const DEFAULT_LOCALE: SupportedLocale = 'es'

/**
 * Normalizes input string to supported locale or fallback to default
 */
export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE

  const clean = locale.toLowerCase().trim()

  if (clean in DICTIONARIES) {
    return clean as SupportedLocale
  }

  // Handle language codes like 'es-ES', 'en-US', 'de-DE', 'pt-BR', 'ko-KR'
  const langPrefix = clean.split('-')[0] as SupportedLocale

  if (langPrefix in DICTIONARIES) {
    return langPrefix
  }

  // Handle legacy names like 'spanish', 'english', 'german', 'portuguese', 'korean'
  const nameMap: Record<string, SupportedLocale> = {
    spanish: 'es',
    espanol: 'es',
    español: 'es',
    english: 'en',
    german: 'de',
    deutsch: 'de',
    portuguese: 'pt',
    portugues: 'pt',
    português: 'pt',
    korean: 'ko',
    hangul: 'ko'
  }

  return nameMap[clean] ?? DEFAULT_LOCALE
}
