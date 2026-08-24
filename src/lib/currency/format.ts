// GAP 4 (plan section 12.6): formateo de montos en unidades menores.
// Antes del fix, el cliente dividía SIEMPRE por 100:
//
//   new Intl.NumberFormat(undefined, { style: 'currency', currency })
//     .format(amountMinor / 100)
//
// Eso es incorrecto para CLP (exponente ISO 4217 = 0, no 2): un plan de
// 9.500 CLP en unidades menores se mostraba como 95,00 CLP. Este módulo
// centraliza el formateo usando la conversión por exponente de iso4217.

import { majorToMinorUnits, minorToMajorUnits } from './iso4217'

/** BCP-47 por defecto: el idioma del navegador (o el del runtime si no hay DOM). */
export function resolveDefaultLocale(): string | undefined {
  // `navigator` solo existe en navegador; en SSR/runtime Node se usa el
  // locale por defecto del proceso (Intl lo resuelve igualmente).
  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language.length > 0) {
    return navigator.language
  }

  return undefined
}

/**
 * Formatea un monto en unidades menores como moneda legible, usando el
 * exponente ISO 4217 correcto de la moneda.
 *
 * @example
 * formatAmountMinor(1200, 'USD')        // "$12.00"
 * formatAmountMinor(1200, 'USD', 'es-CL') // "12,00 US$"
 * formatAmountMinor(9500, 'CLP')        // "$9.500" (NO "95,00")
 *
 * El locale es opcional (BCP-47, p.ej. 'es-CL', 'en-US'); si se omite se usa
 * el locale por defecto del entorno.
 */
export function formatAmountMinor(amountMinor: number, currency: string, locale?: string): string {
  const majorUnits = minorToMajorUnits(amountMinor, currency)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(majorUnits)
}

/**
 * Convierte la cadena visible de un formulario (en unidades mayores) a la
 * representación entera en unidades menores de la moneda.
 */
export function parseAmountMinor(input: string, currency: string): number {
  const parsed = Number.parseFloat(input)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new RangeError('Monto inválido: debe ser un número no negativo.')
  }

  return majorToMinorUnits(parsed, currency)
}
