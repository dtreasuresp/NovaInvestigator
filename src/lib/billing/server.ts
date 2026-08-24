// Server-only, framework-agnostic helpers for the Billing & Plans backend.
// Mirrors the style of the other files in this folder (config.ts, stripe.ts,
// guest-access.ts): pure functions with no Next.js or Supabase imports, so
// they stay trivially unit-testable. Supabase/Stripe I/O and access-control
// wiring live in src/features/billing/* instead, which is where the actual
// Database typing for the billing tables (not yet part of
// src/lib/supabase/database.types.ts) is defined.
//
// Kept in `src/lib/billing` (rather than `src/features/billing`) because it
// only depends on the Stripe SDK types and the existing, unmodified
// `./config` — exactly the same dependency shape as `stripe.ts`.
import { createHash } from 'node:crypto'

import type Stripe from 'stripe'

// `./config` intentionally does not export its `readPositiveInteger` helper
// (it is a private implementation detail of that module, which this task
// must not modify), so the same small parsing rule is duplicated here for
// the two billing-only env vars this file owns.
const readPositiveInteger = (name: string, fallback: number): number => {
  const raw = process.env[name]

  if (raw === undefined || raw === '') return fallback

  const value = Number.parseInt(raw, 10)

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`La variable ${name} debe ser un entero positivo.`)
  }

  return value
}

// Stripe API version pinned in ./stripe.ts stores current_period_start/end
// on the subscription's first item, not on the top-level Subscription object
// (removed there in recent API versions). Centralized here so every caller
// reads the period the same way.
export const getSubscriptionPeriod = (
  subscription: Stripe.Subscription
): { currentPeriodStart: string | null; currentPeriodEnd: string | null } => {
  const item = subscription.items.data[0]

  return {
    currentPeriodStart: item ? new Date(item.current_period_start * 1000).toISOString() : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000).toISOString() : null
  }
}

// Reduces a Stripe event to only the non-sensitive identifiers worth storing
// in `billing_webhook_events.payload_sanitized` for idempotency/audit
// purposes (plan section 9.14). Deliberately excludes email, card, address,
// and amount fields, and every other field Stripe sends — only object
// identifiers and lifecycle status are kept.
export const sanitizeStripeEventForStorage = (event: Stripe.Event): Record<string, unknown> => {
  const object = event.data.object as unknown as Record<string, unknown>

  return {
    id: event.id,
    type: event.type,
    createdAt: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
    objectId: typeof object.id === 'string' ? object.id : null,
    objectType: typeof object.object === 'string' ? object.object : null,
    mode: typeof object.mode === 'string' ? object.mode : null,
    status: typeof object.status === 'string' ? object.status : null
  }
}

// One-time (`mode: 'payment'`) guest access does not come from a
// subscription period, so it needs its own duration source. `plans`/
// `plan_entitlements` are out of scope for this slice (see report), so this
// reads a small, dedicated env var with a safe default rather than
// hardcoding a magic number inline.
export const getOneTimeAccessDurationSeconds = (): number =>
  readPositiveInteger('BILLING_ONE_TIME_ACCESS_DURATION_SECONDS', 24 * 60 * 60)

// Explicit, short request timeout applied to outbound Supabase calls made by
// the billing feature (in addition to the Stripe SDK's own client-level
// timeout already configured in ./stripe.ts). Kept here so both the
// checkout/portal Route Handlers and the webhook handler share one value.
export const getBillingDbTimeoutMs = (): number => readPositiveInteger('BILLING_DB_TIMEOUT_MS', 8_000)

export const getStripeInvoiceTaxAmountMinor = (invoice: Stripe.Invoice): number => {
  const totalTaxes = invoice.total_taxes

  if (!Array.isArray(totalTaxes)) return 0

  return totalTaxes.reduce((total, tax) => total + Math.max(0, tax.amount), 0)
}

export const getStripeInvoiceTaxId = (invoice: Stripe.Invoice): string | null => {
  const taxId = invoice.customer_tax_ids?.find(candidate => typeof candidate.value === 'string' && candidate.value.trim())?.value

  return taxId?.trim() || null
}

// Deterministic, RFC 4122-shaped (version 5-like) UUID derived from a seed
// string. Used only where a stable identifier must be derivable from inputs
// we do not control end-to-end (e.g. bridging a client-supplied
// idempotency key to a primary key) without adding the `uuid` package as a
// new dependency (out of scope: package.json must not change).
export const deriveIdempotentUuid = (seed: string): string => {
  const hash = createHash('sha256').update(`novainvestigator.billing:${seed}`).digest('hex')
  const timeLow = hash.slice(0, 8)
  const timeMid = hash.slice(8, 12)
  const timeHiAndVersion = `5${hash.slice(13, 16)}`
  const variantNibble = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)
  const clockSeq = `${variantNibble}${hash.slice(17, 20)}`
  const node = hash.slice(20, 32)

  return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeq}-${node}`
}
