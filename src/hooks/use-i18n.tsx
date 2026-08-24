'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import {
  DICTIONARIES,
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  normalizeLocale,
  type LanguageMeta,
  type SupportedLocale,
  type TranslationSchema
} from '@/locales'

export interface I18nContextValue {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale | string) => void
  t: (key: string, params?: Record<string, string | number>) => string
  languages: LanguageMeta[]
  currentLanguage: LanguageMeta
}

const STORAGE_KEY = 'novastore_locale'
const COOKIE_KEY = 'NEXT_LOCALE'

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
  defaultLocale?: SupportedLocale
}

function getInitialLocale(defaultFallback: SupportedLocale): SupportedLocale {
  if (typeof window === 'undefined') {
    return defaultFallback
  }

  try {
    // 1. Try localStorage
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      return normalizeLocale(saved)
    }

    // 2. Try cookie
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`))

    if (match?.[1]) {
      return normalizeLocale(decodeURIComponent(match[1]))
    }

    // 3. Try browser navigator
    if (navigator.language) {
      return normalizeLocale(navigator.language)
    }
  } catch {
    // Ignore storage/cookie read errors
  }

  return defaultFallback
}

export function I18nProvider({ children, defaultLocale = DEFAULT_LOCALE }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getInitialLocale(defaultLocale))

  const setLocale = useCallback((newLocaleInput: SupportedLocale | string) => {
    const normalized = normalizeLocale(newLocaleInput)

    setLocaleState(normalized)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, normalized)
        document.cookie = `${COOKIE_KEY}=${normalized}; path=/; max-age=31536000; SameSite=Lax`
        document.documentElement.lang = normalized
      } catch {
        // Ignore storage write errors
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const currentLanguage = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === locale) ?? SUPPORTED_LANGUAGES[0]
  }, [locale])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.')

      // Helper to traverse object
      const getNested = (obj: unknown, path: string[]): string | undefined => {
        let current: unknown = obj

        for (const k of path) {
          if (current && typeof current === 'object' && k in current) {
            current = (current as Record<string, unknown>)[k]
          } else {
            return undefined
          }
        }

        return typeof current === 'string' ? current : undefined
      }

      // 1. Try active locale dictionary
      const activeDict = DICTIONARIES[locale]
      let translation = getNested(activeDict, keys)

      // 2. Fallback to default dictionary (es)
      if (translation === undefined && locale !== DEFAULT_LOCALE) {
        const fallbackDict = DICTIONARIES[DEFAULT_LOCALE]

        translation = getNested(fallbackDict, keys)
      }

      // 3. If still undefined, return the key
      if (translation === undefined) {
        return key
      }

      // 4. Interpolate parameters like {name}, {count}
      if (params) {
        return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
          return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        }, translation)
      }

      return translation
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguage
    }),
    [locale, setLocale, t, currentLanguage]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    // Fallback safe context if used outside provider (for resilient testing / standalone components)
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string) => key,
      languages: SUPPORTED_LANGUAGES,
      currentLanguage: SUPPORTED_LANGUAGES[0]
    }
  }

  return context
}
