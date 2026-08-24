import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { enforceBillingRateLimit } from './rate-limit'
import { BillingError } from './errors'
import {
  asBillingClient,
  resolveRpcScalar,
  resolveRpcQuery,
  uncheckedBillingRpc,
  type BillingSupabaseClient
} from './db-types'
import type {
  Database,
  GuestTrialClaimRpcRow,
  GuestTrialSessionRpcRow,
  GuestTrialStartRpcRow
} from '@/lib/supabase/database.types'
import { isRegisteredConfirmedUser } from '@/lib/auth/identity-policy'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const GUEST_TRIAL_COOKIE_NAME = 'novastore_guest_trial'

const COOKIE_VERSION = 1
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const GuestTrialEntitlementSchema = z.object({
  key: z.string().regex(/^(modules|actions|limits)\.[a-z0-9._-]+$/),
  limitValue: z.number().int().nonnegative().nullable(),
  isEnabled: z.boolean()
})

const GuestTrialStartRowSchema = z.object({
  session_id: z.string().uuid(),
  policy_id: z.string().uuid(),
  policy_version: z.string(),
  status: z.enum(['active', 'ended', 'expired', 'claimed']),
  started_at: z.string(),
  expires_at: z.string(),
  allow_pdf: z.boolean(),
  allow_checkout: z.boolean(),
  entitlements: z.array(GuestTrialEntitlementSchema)
})

const GuestTrialSessionRowSchema = GuestTrialStartRowSchema.extend({
  ended_at: z.string().nullable(),
  claimed_at: z.string().nullable()
})

const GuestTrialClaimRowSchema = z.object({
  grant_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_id: z.string().uuid(),
  policy_id: z.string().uuid(),
  starts_at: z.string(),
  expires_at: z.string(),
  status: z.enum(['pending', 'active', 'consumed', 'expired', 'revoked']),
  entitlements: z.array(GuestTrialEntitlementSchema)
})

export interface GuestTrialEntitlement {
  readonly key: string
  readonly limitValue: number | null
  readonly isEnabled: boolean
}

export interface GuestTrialStatus {
  readonly sessionId: string
  readonly policyId: string
  readonly policyVersion: string
  readonly status: 'active' | 'ended' | 'expired' | 'claimed'
  readonly startedAt: string
  readonly expiresAt: string
  readonly endedAt: string | null
  readonly claimedAt: string | null
  readonly allowPdf: boolean
  readonly allowCheckout: false
  readonly entitlements: readonly GuestTrialEntitlement[]
  readonly modules: readonly string[]
  readonly actions: readonly string[]
  readonly limits: Readonly<Record<string, number>>
}

export interface GuestTrialClaimResult {
  readonly grantId: string
  readonly tenantId: string
  readonly userId: string
  readonly policyId: string
  readonly startsAt: string
  readonly expiresAt: string
  readonly status: 'pending' | 'active' | 'consumed' | 'expired' | 'revoked'
  readonly entitlements: readonly GuestTrialEntitlement[]
}

interface GuestTrialCookiePayload {
  readonly v: 1
  readonly sessionId: string
  readonly claimNonce: string
  readonly expiresAt: number
}

function getGuestTrialCookieSecret(): string {
  const secret =
    process.env.GUEST_TRIAL_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!secret) {
    throw BillingError.internal('El acceso de prueba no está configurado en el servidor.')
  }

  return secret
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function hashClaimNonce(claimNonce: string): string {
  return createHash('sha256').update(claimNonce, 'utf8').digest('hex')
}

function signCookiePayload(encodedPayload: string): string {
  return createHmac('sha256', getGuestTrialCookieSecret()).update(encodedPayload, 'utf8').digest('base64url')
}

function parseCookiePayload(encodedPayload: string): GuestTrialCookiePayload | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload))
  } catch {
    return null
  }

  const schema = z.object({
    v: z.literal(COOKIE_VERSION),
    sessionId: z.string().uuid(),
    claimNonce: z.string().regex(/^[a-f0-9]{64}$/),
    expiresAt: z.number().int().positive()
  })

  const result = schema.safeParse(parsed)

  return result.success ? result.data : null
}

function verifyGuestTrialCookie(value: string, allowExpired: boolean): GuestTrialCookiePayload | null {
  const [encodedPayload, signature, extra] = value.split('.')

  if (!encodedPayload || !signature || extra) return null

  const expectedSignature = signCookiePayload(encodedPayload)
  const actualBytes = Buffer.from(signature, 'utf8')
  const expectedBytes = Buffer.from(expectedSignature, 'utf8')

  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return null
  }

  const payload = parseCookiePayload(encodedPayload)

  if (!payload) return null

  if (!allowExpired && payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

export function createGuestTrialCookie(
  sessionId: string,
  claimNonce: string,
  expiresAt: string
): { value: string; maxAge: number } {
  const expiresAtSeconds = Math.floor(new Date(expiresAt).getTime() / 1000)

  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(Date.now() / 1000)) {
    throw BillingError.internal('La sesión de prueba devolvió una expiración inválida.')
  }

  const payload: GuestTrialCookiePayload = {
    v: COOKIE_VERSION,
    sessionId,
    claimNonce,
    expiresAt: expiresAtSeconds
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  return {
    value: `${encodedPayload}.${signCookiePayload(encodedPayload)}`,
    maxAge: Math.min(COOKIE_MAX_AGE_SECONDS, expiresAtSeconds - Math.floor(Date.now() / 1000))
  }
}

export function getGuestTrialCookieOptions(maxAge: number): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  }
}

export function getGuestTrialCookieDeletionOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: 0
} {
  return { ...getGuestTrialCookieOptions(0), maxAge: 0 }
}

export function getGuestTrialEligibilityKeyHash(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  const ipAddress =
    forwardedFor ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-client-ip')?.trim() ||
    'unknown'

  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown'
  const fingerprint = `guest-trial:v1:${ipAddress}:${userAgent}`

  return createHmac('sha256', getGuestTrialCookieSecret()).update(fingerprint, 'utf8').digest('hex')
}

function mapRpcError(
  operation: 'start' | 'get' | 'end' | 'claim',
  error: { code?: string | null; message?: string | null }
): BillingError {
  const marker = error.message ?? ''

  logger.error('Guest trial RPC failed', {
    action: `billing/guest-trial/${operation}`,
    details: {
      operation,
      code: error.code ?? 'unknown'
    }
  })

  if (marker.includes('guest_trial_not_configured')) return BillingError.trialNotConfigured()
  if (marker.includes('guest_trial_unavailable')) return BillingError.trialUnavailable()
  if (marker.includes('guest_trial_request_invalid')) return BillingError.validation('La solicitud de prueba no es válida.')
  if (marker.includes('authentication_required')) return BillingError.unauthenticated()
  if (marker.includes('email_not_confirmed')) return BillingError.emailNotConfirmed()
  if (marker.includes('tenant_required')) return BillingError.tenantRequired()

  return BillingError.internal()
}

function normalizeEntitlements(value: unknown): GuestTrialEntitlement[] {
  const result = z.array(GuestTrialEntitlementSchema).safeParse(value)

  if (!result.success) {
    throw BillingError.internal('La configuración de entitlements del acceso de prueba no es válida.')
  }

  return result.data
}

function toStatus(row: GuestTrialSessionRpcRow | GuestTrialStartRpcRow): GuestTrialStatus {
  const entitlements = normalizeEntitlements(row.entitlements)
  const modules: string[] = []
  const actions: string[] = []
  const limits: Record<string, number> = {}

  for (const entitlement of entitlements) {
    if (!entitlement.isEnabled) continue

    if (entitlement.key.startsWith('modules.')) {
      modules.push(entitlement.key.slice('modules.'.length))
    } else if (entitlement.key.startsWith('actions.')) {
      actions.push(entitlement.key.slice('actions.'.length))
    } else if (entitlement.key.startsWith('limits.') && entitlement.limitValue !== null) {
      limits[entitlement.key.slice('limits.'.length)] = entitlement.limitValue
    }
  }

  return {
    sessionId: row.session_id,
    policyId: row.policy_id,
    policyVersion: row.policy_version,
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: 'ended_at' in row ? row.ended_at : null,
    claimedAt: 'claimed_at' in row ? row.claimed_at : null,
    allowPdf: row.allow_pdf,
    allowCheckout: false,
    entitlements,
    modules,
    actions,
    limits
  }
}

function toClaimResult(row: GuestTrialClaimRpcRow): GuestTrialClaimResult {
  return {
    grantId: row.grant_id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    policyId: row.policy_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    status: row.status,
    entitlements: normalizeEntitlements(row.entitlements)
  }
}

async function getRegisteredAuthUser(client: BillingSupabaseClient) {
  const {
    data: { user },
    error
  } = await client.auth.getUser()

  if (error || !user) {
    throw BillingError.unauthenticated()
  }

  if (user.is_anonymous === true) {
    throw BillingError.registeredAccountRequired()
  }

  if (!isRegisteredConfirmedUser(user)) {
    throw BillingError.emailNotConfirmed()
  }

  return user
}

export async function assertGuestStartAllowed(client: BillingSupabaseClient): Promise<void> {
  const {
    data: { user }
  } = await client.auth.getUser()

  if (user) {
    throw BillingError.registeredAccountRequired()
  }
}

export async function startGuestTrial(eligibilityKeyHash: string): Promise<{
  cookie: { value: string; maxAge: number }
  status: GuestTrialStatus
}> {
  await enforceBillingRateLimit('guest_trial_start', eligibilityKeyHash)

  const sessionId = randomUUID()
  const claimNonce = randomBytes(32).toString('hex')
  const claimNonceHash = hashClaimNonce(claimNonce)
  const admin = asBillingClient(createSupabaseAdminClient())

  const { data, error } = await resolveRpcQuery<GuestTrialStartRpcRow>(
    uncheckedBillingRpc(admin, 'start_guest_trial', {
      p_eligibility_key_hash: eligibilityKeyHash,
      p_session_id: sessionId,
      p_claim_nonce_hash: claimNonceHash
    })
  )

  if (error) throw mapRpcError('start', error)

  const rawRow = data?.[0]
  const parsedRow = GuestTrialStartRowSchema.safeParse(rawRow)

  if (!parsedRow.success) {
    throw BillingError.internal('La sesión de prueba no devolvió un estado válido.')
  }

  return {
    cookie: createGuestTrialCookie(parsedRow.data.session_id, claimNonce, parsedRow.data.expires_at),
    status: toStatus(parsedRow.data)
  }
}

export async function getGuestTrialStatus(cookieValue: string | null): Promise<GuestTrialStatus | null> {
  if (!cookieValue) return null

  const cookie = verifyGuestTrialCookie(cookieValue, true)

  if (!cookie) return null

  const admin = asBillingClient(createSupabaseAdminClient())

  const { data, error } = await resolveRpcQuery<GuestTrialSessionRpcRow>(
    uncheckedBillingRpc(admin, 'get_guest_trial_session', {
      p_session_id: cookie.sessionId,
      p_claim_nonce_hash: hashClaimNonce(cookie.claimNonce)
    })
  )

  if (error) throw mapRpcError('get', error)

  const rawRow = data?.[0]

  if (!rawRow) return null

  const parsedRow = GuestTrialSessionRowSchema.safeParse(rawRow)

  if (!parsedRow.success) {
    throw BillingError.internal('La sesión de prueba no devolvió un estado válido.')
  }

  return toStatus(parsedRow.data)
}

export async function endGuestTrial(cookieValue: string | null): Promise<void> {
  if (!cookieValue) return

  const cookie = verifyGuestTrialCookie(cookieValue, true)

  if (!cookie) return

  const admin = asBillingClient(createSupabaseAdminClient())

  const { data, error } = await resolveRpcScalar<boolean>(
    uncheckedBillingRpc(admin, 'end_guest_trial', {
      p_session_id: cookie.sessionId,
      p_claim_nonce_hash: hashClaimNonce(cookie.claimNonce)
    })
  )

  if (error) throw mapRpcError('end', error)

  if (data !== true) {
    throw BillingError.internal('No se pudo cerrar la sesión de prueba.')
  }
}

export async function claimGuestTrial(
  client: SupabaseClient<Database>,
  cookieValue: string | null
): Promise<GuestTrialClaimResult | null> {
  if (!cookieValue) return null

  const billingClient = asBillingClient(client)

  await getRegisteredAuthUser(billingClient)

  const cookie = verifyGuestTrialCookie(cookieValue, true)

  if (!cookie) return null

  const { data, error } = await resolveRpcQuery<GuestTrialClaimRpcRow>(
    uncheckedBillingRpc(billingClient, 'claim_guest_trial', {
      p_session_id: cookie.sessionId,
      p_claim_nonce_hash: hashClaimNonce(cookie.claimNonce)
    })
  )

  if (error) throw mapRpcError('claim', error)

  const rawRow = data?.[0]

  if (!rawRow) {
    throw BillingError.internal('El claim del acceso de prueba no devolvió un resultado.')
  }

  const parsedRow = GuestTrialClaimRowSchema.safeParse(rawRow)

  if (!parsedRow.success) {
    throw BillingError.internal('El claim del acceso de prueba devolvió un estado inválido.')
  }

  return toClaimResult(parsedRow.data)
}
