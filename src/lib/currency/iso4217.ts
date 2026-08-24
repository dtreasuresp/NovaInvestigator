// GAP 4 (plan section 12.6): dominio ISO 4217. Los montos se almacenan
// SIEMPRE en unidades menores (`amount_minor` = la subdivisión más pequeña de
// la moneda, p.ej. centavos para USD/EUR, el peso chileno entero para CLP).
// Para convertir a unidades mayores se divide por 10^exponente, donde el
// exponente es el número de dígitos decimales de la moneda según ISO 4217.
//
// Este módulo es puro (sin DOM, sin fetch): solo datos y funciones de
// conversión, testeable sin mocking — convención del repo.

/** Monedas que el sistema comercial soporta de forma explícita. */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CLP'] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/**
 * Exponente ISO 4217 (dígitos decimales) por moneda.
 * - USD: 2 (dólar -> centavos)
 * - EUR: 2 (euro -> céntimos)
 * - CLP: 0 (el peso chileno no tiene subdivisión oficial en circulación)
 */
export const MINOR_TO_MAJOR_EXPONENTS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  CLP: 0
}

/** Moneda por defecto usada cuando no se declara una. */
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD'

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/**
 * Devuelve el exponente ISO 4217 (dígitos decimales) de una moneda.
 * Monedas no declaradas asumen expoente 2 (el estándar más común) y son
 * formateables, pero no deben usarse para planes nuevos (restringido a
 * SUPPORTED_CURRENCIES en la UI).
 */
export function getMinorExponent(currency: string): number {
  const exponent = MINOR_TO_MAJOR_EXPONENTS[currency]

  return isFiniteNonNegative(exponent) ? exponent : 2
}

/** ¿Es una de las monedas soportadas por el sistema comercial? */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
}

/**
 * Convierte un monto en unidades menores a su equivalente en unidades
 * mayores (número, no string) usando el exponente ISO 4217 correcto.
 * Ejemplo: amountMinor=1200, 'USD' -> 12; amountMinor=9500, 'CLP' -> 9500.
 */
export function minorToMajorUnits(amountMinor: number, currency: string): number {
  if (!isFiniteNonNegative(amountMinor)) {
    throw new RangeError('El monto en unidades menores debe ser un número no negativo finito.')
  }

  const exponent = getMinorExponent(currency)

  // Evita errores de coma flotante (p.ej. 123 / 100 !== 1.23 exacto).
  return amountMinor / 10 ** exponent
}

/**
 * Convierte un monto en unidades mayores a unidades menores multiplicando por
 * 10^exponente y redondeando al entero más cercano (Stripe y casi todos los
 * gateways trabajan con enteros). Útil en parseo de formularios.
 */
export function majorToMinorUnits(amountMajor: number, currency: string): number {
  if (!isFiniteNonNegative(amountMajor)) {
    throw new RangeError('El monto en unidades mayores debe ser un número no negativo finito.')
  }

  const exponent = getMinorExponent(currency)

  return Math.round(amountMajor * 10 ** exponent)
}
