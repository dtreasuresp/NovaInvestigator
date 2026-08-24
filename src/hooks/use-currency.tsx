'use client'

// GAP 4 (plan section 12.6): CurrencyProvider + useCurrency.
// Expone el locale BCP-47 efectivo del cliente (por defecto el del navegador,
// ampliable cuando exista un perfil de idioma global) y helpers de formateo
// de montos en unidades menores ya ligados a ese locale. El módulo resuelve
// el locale de forma lazzi/efimera solo en el cliente para no romper SSR.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { formatAmountMinor, resolveDefaultLocale } from '@/lib/currency/format'
import type { SupportedCurrency } from '@/lib/currency/iso4217'
import { SUPPORTED_CURRENCIES, majorToMinorUnits } from '@/lib/currency/iso4217'

export interface CurrencyContextValue {

  /** Locale BCP-47 efectivo (p.ej. 'es-CL', 'en-US'). */
  locale: string

  /** Cambia el locale efectivo (por ejemplo desde la configuración de perfil). */
  setLocale: (locale: string) => void

  /** Formatea un monto en unidades menores con el locale efectivo. */
  formatAmountMinor: (amountMinor: number, currency: SupportedCurrency | string) => string

  /** Monedas soportadas por el sistema comercial. */
  supportedCurrencies: readonly SupportedCurrency[]

  /**
   * Convierte la cadena visible de un formulario (unidades mayores) a unidades
   * menores de la moneda, con el locale efectivo para validación numérica.
   */
  parseAmountMinorInput: (input: string, currency: SupportedCurrency | string) => number
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export interface CurrencyProviderProps {
  children: ReactNode

  /** Locale inicial (BCP-47). Por defecto se deriva del navegador. */
  defaultLocale?: string
}

export function CurrencyProvider({ children, defaultLocale }: CurrencyProviderProps) {
  const [locale, setLocale] = useState<string>(() => {
    if (defaultLocale && defaultLocale.length > 0) return defaultLocale

    return resolveDefaultLocale() ?? 'en-US'
  })

  const formatAmountMinorBound = useCallback(
    (amountMinor: number, currency: SupportedCurrency | string) => formatAmountMinor(amountMinor, currency, locale),
    [locale]
  )

  const parseAmountMinorInput = useCallback(
    (input: string, currency: SupportedCurrency | string) => {
      const parsed = Number.parseFloat(input)

      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new RangeError('Monto inválido: debe ser un número no negativo.')
      }

      return majorToMinorUnits(parsed, currency)
    },
    []
  )

  const value = useMemo<CurrencyContextValue>(
    () => ({
      locale,
      setLocale,
      formatAmountMinor: formatAmountMinorBound,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      parseAmountMinorInput
    }),
    [locale, formatAmountMinorBound, parseAmountMinorInput]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext)

  if (!context) {
    throw new Error('useCurrency debe usarse dentro de <CurrencyProvider>.')
  }

  return context
}
