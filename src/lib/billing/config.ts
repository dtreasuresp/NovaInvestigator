const readPositiveInteger = (name: string, fallback: number): number => {
  const raw = process.env[name]

  if (raw === undefined || raw === '') return fallback

  const value = Number.parseInt(raw, 10)

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`La variable ${name} debe ser un entero positivo.`)
  }

  return value
}

const readRequired = (name: string): string => {
  const value = process.env[name]?.trim()

  if (!value) throw new Error(`Falta la variable de entorno ${name}.`)

  return value
}

const readBoolean = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name]?.trim().toLowerCase()

  if (raw === undefined || raw === '') return fallback
  if (raw === 'true') return true
  if (raw === 'false') return false

  throw new Error(`La variable ${name} debe ser true o false.`)
}

const readCountryCodes = (name: string): string[] => {
  const raw = process.env[name]?.trim()

  if (!raw) return []

  const countries = raw
    .split(',')
    .map(country => country.trim().toUpperCase())
    .filter(Boolean)

  if (countries.some(country => !/^[A-Z]{2}$/.test(country))) {
    throw new Error(`La variable ${name} debe contener códigos de país ISO 3166-1 alfa-2 separados por comas.`)
  }

  return Array.from(new Set(countries))
}

export const getStripeSecretKey = (): string => readRequired('STRIPE_SECRET_KEY')

export const getStripeWebhookSecret = (): string => readRequired('STRIPE_WEBHOOK_SECRET')

export const getApplicationUrl = (): string => readRequired('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')

export const getOneTimePriceId = (): string => readRequired('STRIPE_ONE_TIME_PRICE_ID')

export const getStripeTaxConfig = (): { enabled: boolean; allowedCountries: string[] } => ({
  // Preserve the current behavior for deployments that have not added the
  // explicit toggle yet; setting it to false is the opt-out.
  enabled: readBoolean('STRIPE_TAX_ENABLED', true),
  allowedCountries: readCountryCodes('ALLOWED_TAX_COUNTRIES')
})

export const getGuestTrialDefaults = () => ({
  durationSeconds: readPositiveInteger('GUEST_TRIAL_DURATION_SECONDS', 30 * 60),
  maxUses: readPositiveInteger('GUEST_TRIAL_MAX_USES', 1),
  allowPdf: process.env.GUEST_TRIAL_ALLOW_PDF === 'true',
  allowCheckout: process.env.GUEST_TRIAL_ALLOW_CHECKOUT !== 'false',
  allowConversion: process.env.GUEST_TRIAL_ALLOW_CONVERSION !== 'false'
})

export const getRateLimitDefaults = () => ({
  windowSeconds: readPositiveInteger('RATE_LIMIT_WINDOW_SECONDS', 60),
  anonymousRequests: readPositiveInteger('RATE_LIMIT_ANONYMOUS_REQUESTS', 30),
  authenticatedRequests: readPositiveInteger('RATE_LIMIT_AUTHENTICATED_REQUESTS', 120),
  checkoutRequests: readPositiveInteger('RATE_LIMIT_CHECKOUT_REQUESTS', 5),
  pdfRequests: readPositiveInteger('RATE_LIMIT_PDF_REQUESTS', 5)
})
