// Application service for Billing & Plans: wires access control (actor +
// capability), payload validation, the repository, and Stripe together, and
// maps DB rows to the camelCase DTOs already defined in
// `src/lib/billing/types.ts`. This is the single entry module for Route Handlers
// under src/app/api/billing and src/app/api/webhooks/stripe.
import { createHash, randomUUID } from 'node:crypto'

import type Stripe from 'stripe'

import { evaluateCommercialAccess, selectCommercialGrant } from '@/features/access/commercial-access'
import { getGuestTrialDefaults } from '@/lib/billing/config'
import { evaluateGuestGrant } from '@/lib/billing/guest-access'
import { logger } from '@/lib/logger'
import type { GuestGrantSnapshot } from '@/lib/billing/guest-access'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendPurchaseDelegationEmail } from './delegation-email'
import { sendPurchaseNotificationToOwnerEmail } from './purchase-notification-email'
import {
  getOneTimeAccessDurationSeconds,
  getStripeInvoiceTaxAmountMinor,
  getStripeInvoiceTaxId,
  getSubscriptionPeriod,
  sanitizeStripeEventForStorage
} from '@/lib/billing/server'
import {
  constructStripeWebhookEvent,
  createCustomerPortalSession,
  createOneTimeCheckoutSession,
  createSubscriptionCheckoutSession,
  getStripe
} from '@/lib/billing/stripe'
import type {
  BillingInvoice,
  BillingPlan,
  BillingSummary,
  CheckoutAuthorization,
  CheckoutContext,
  CheckoutPlanBrief,
  CheckoutProfile,
  CheckoutResponse,
  CommercialAccessSummary,
  GuestAccessSummary,
  PlatformModuleSummary,
  PortalResponse,
  PurchaseAddressSummary,
  RegisteredAccessGrantSummary,
  SubscriptionSummary,
  TrialAccessSummary
} from '@/lib/billing/types'

import {
  assertBillingCapability,
  requireBillingActor,
  requireRegisteredBillingCheckoutActor,
  requireRegisteredBillingActor,
  type RegisteredBillingActor,
  type RegisteredBillingCheckoutActor
} from './access'
import { BILLING_CAPABILITIES } from './capabilities'
import type {
  AccessGrantRow,
  BillingCustomerRow,
  BillingInvoiceRow,
  BillingPurchaseAddressRow,
  BillingPurchaseDelegationRow,
  BillingPurchasePolicy,
  BillingSupabaseClient,
  GuestAccessGrantRow,
  PlanEntitlementRow,
  PlanRow,
  SubscriptionRow,
  TrialStartRpcRow
} from './db-types'
import { BillingError } from './errors'
import { enforceBillingRateLimit } from './rate-limit'
import {
  activateOneTimeGrant,
  attachOneTimeCheckoutReference,
  attachBillingSubscriptionCheckout,
  authorizeBillingCheckout,
  closeActiveTrialGrantsByTenant,
  completeBillingSubscriptionCheckout,
  createPendingOneTimeGrant,
  findAccessGrantById,
  findActiveSubscriptionForTenant,
  findBillingCustomerByTenantId,
  findBillingPurchaseAddress,
  findInvoiceForTenant,
  findLatestGuestGrant,
  listAccessGrantEntitlementRows,
  listAccessGrants,
  findPlanByCode,
  findPlanById,
  findTenantOwners,
  findPlanIdByProviderPriceId,
  findTenantIdByCustomerId,
  findTenantIdBySubscriptionId,
  findWebhookEventStatus,
  createBillingCustomer,
  getBillingPurchasePolicy,
  grantBillingPurchaseDelegation,
  listActivePlanRows,
  listBillingPurchaseDelegations,
  listPlanEntitlementRows,
  listRecentInvoicesForTenant,
  loadTrialPolicyById,
  markWebhookEventFailed,
  markWebhookEventProcessed,
  recordWebhookEventReceived,
  revokePendingOneTimeGrant,
  revokeBillingPurchaseDelegation,
  releaseBillingSubscriptionCheckout,
  reserveBillingSubscriptionCheckout,
  startTrialGrant,
  setBillingPurchasePolicy,
  upsertBillingCustomer,
  upsertBillingPurchaseAddress,
  upsertInvoiceRow,
  upsertSubscriptionRow
} from './repository'
import type {
  BillingPurchaseAddressRequest,
  BillingPurchaseDelegationRequest,
  BillingPurchasePolicyRequest,
  CheckoutOneTimeRequest,
  CheckoutSubscriptionRequest
} from './schema'

/* ------------------------------------------------------------------ */
/* Mapeo de filas a DTOs                                               */
/* ------------------------------------------------------------------ */

const toBillingPlan = (row: PlanRow, entitlements: PlanEntitlementRow[] = []): BillingPlan => {
  const enabledEntitlements = entitlements.filter(entitlement => entitlement.is_enabled)

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    currency: row.currency,
    interval: row.interval,
    durationSeconds: row.duration_seconds ?? null,
    amountMinor: row.amount_minor,
    providerPriceId: row.provider_price_id,
    isActive: row.is_active,
    isPublic: row.is_public ?? true,
    contactSales: row.contact_sales ?? false,
    features: enabledEntitlements.map(entitlement => entitlement.entitlement_key),
    limits: Object.fromEntries(
      enabledEntitlements
        .filter(entitlement => entitlement.limit_value !== null)
        .map(entitlement => [entitlement.entitlement_key, entitlement.limit_value])
    )
  }
}

const toSubscriptionSummary = (row: SubscriptionRow, plan: BillingPlan | null): SubscriptionSummary => ({
  id: row.id,
  planCode: plan?.code ?? '',
  status: row.status,
  currentPeriodStart: row.current_period_start,
  currentPeriodEnd: row.current_period_end,
  cancelAtPeriodEnd: row.cancel_at_period_end
})

const toBillingInvoice = (row: BillingInvoiceRow): BillingInvoice => ({
  id: row.id,
  number: row.number,
  status: row.status,
  amountMinor: row.amount_minor,
  taxAmountMinor: row.tax_amount_minor,
  currency: row.currency,
  issuedAt: row.issued_at,
  paidAt: row.paid_at,
  hostedInvoiceUrl: row.hosted_invoice_url
})

const toGuestGrantSnapshot = (grant: GuestAccessGrantRow): GuestGrantSnapshot => ({
  mode: grant.mode,
  status: grant.status,
  startsAt: grant.starts_at,
  expiresAt: grant.expires_at,
  maxUses: grant.max_uses,
  usedUses: grant.used_uses
})

// Reflects the server-clock-evaluated state (never the client's) in the
// displayed status, and resolves allow flags from the grant's trial policy
// when present, falling back to the env-configured defaults in
// src/lib/billing/config.ts — the same fallback `src/app/api/auth/_lib/guest.ts`
// already uses. `guest_trial_policies` is read-only here.
async function toGuestAccessSummary(
  client: BillingSupabaseClient,
  grant: GuestAccessGrantRow
): Promise<GuestAccessSummary> {
  const decision = evaluateGuestGrant(toGuestGrantSnapshot(grant), new Date())
  const effectiveStatus = !decision.allowed && decision.reason === 'expired' ? 'expired' : grant.status

  const isTrial = grant.mode === 'trial'
  const policy = isTrial && grant.policy_id ? await loadTrialPolicyById(client, grant.policy_id) : null
  const defaults = getGuestTrialDefaults()

  return {
    mode: grant.mode,
    status: effectiveStatus,
    startsAt: grant.starts_at,
    expiresAt: grant.expires_at,
    remainingUses: Math.max(grant.max_uses - grant.used_uses, 0),
    allowPdf: isTrial ? (policy?.allowPdf ?? defaults.allowPdf) : true,
    allowCheckout: isTrial ? (policy?.allowCheckout ?? defaults.allowCheckout) : false,
    allowConversion: isTrial ? (policy?.allowConversion ?? defaults.allowConversion) : true
  }
}

const toGuestCommercialAccessSummary = (grant: GuestAccessGrantRow | null, now: Date): CommercialAccessSummary => {
  if (!grant) {
    return {
      status: 'missing',
      source: null,
      startsAt: null,
      expiresAt: null
    }
  }

  const decision = evaluateGuestGrant(toGuestGrantSnapshot(grant), now)

  return {
    status: decision.allowed ? 'active' : decision.reason === 'expired' ? 'expired' : 'missing',
    source: grant.mode,
    startsAt: grant.starts_at,
    expiresAt: grant.expires_at
  }
}

const toTrialAccessSummary = (grant: TrialStartRpcRow): TrialAccessSummary => ({
  grantId: grant.grant_id,
  tenantId: grant.tenant_id,
  mode: 'trial',
  status: grant.status,
  startsAt: grant.starts_at,
  expiresAt: grant.expires_at,
  remainingUses: Math.max(grant.max_uses - grant.used_uses, 0),
  allowPdf: grant.allow_pdf,
  allowCheckout: grant.allow_checkout
})

const toRegisteredAccessGrantSummary = (grant: AccessGrantRow): RegisteredAccessGrantSummary => ({
  grantId: grant.id,
  tenantId: grant.tenant_id,
  mode: grant.mode,
  status: grant.status,
  startsAt: grant.starts_at,
  expiresAt: grant.expires_at,
  remainingUses: Math.max(grant.max_uses - grant.used_uses, 0)
})

const deriveGrantId = (actor: RegisteredBillingActor, input: CheckoutOneTimeRequest, planId: string): string => {
  const idempotencyKey = input.idempotencyKey?.trim()

  if (!idempotencyKey) return randomUUID()

  const digest = createHash('sha256')
    .update(`registered-one-time:${actor.userId}:${actor.tenantId}:${planId}:${idempotencyKey}`)
    .digest('hex')

  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${(
    8 +
    (Number.parseInt(digest.slice(16, 17), 16) % 4)
  ).toString(16)}${digest.slice(17, 20)}-${digest.slice(20, 32)}`
}

/* ------------------------------------------------------------------ */
/* Catálogo de planes                                                  */
/* ------------------------------------------------------------------ */

// Public: the pricing/plans catalog is not sensitive and must be readable
// before a session (anonymous or registered) exists at all, per plan
// section 13.5 ("Pricing... pasará a una ruta interna de Billing & Plans").
export async function listPlans(client: BillingSupabaseClient): Promise<BillingPlan[]> {
  const rows = await listActivePlanRows(client)

  const entitlements = await listPlanEntitlementRows(
    client,
    rows.map(row => row.id)
  )

  const entitlementsByPlanId = new Map<string, PlanEntitlementRow[]>()

  for (const entitlement of entitlements) {
    const planEntitlements = entitlementsByPlanId.get(entitlement.plan_id) ?? []

    planEntitlements.push(entitlement)
    entitlementsByPlanId.set(entitlement.plan_id, planEntitlements)
  }

  return rows.map(row => toBillingPlan(row, entitlementsByPlanId.get(row.id)))
}

export async function listPlatformModules(client: BillingSupabaseClient): Promise<PlatformModuleSummary[]> {
  const { data, error } = await client
    .from('platform_modules')
    .select('module_key, name, description, route_prefix, is_active, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    return []
  }

  type PlatformModuleRow = {
    module_key: string
    name: string
    description: string | null
    route_prefix: string | null
    is_active: boolean
    display_order: number
  }

  const rows = (data as unknown as PlatformModuleRow[] | null) ?? []

  return rows.map(row => ({
    moduleKey: row.module_key,
    name: row.name,
    description: row.description,
    routePrefix: row.route_prefix,
    isActive: row.is_active,
    displayOrder: row.display_order
  }))
}

/* ------------------------------------------------------------------ */
/* Estado de acceso anónimo (guest)                                    */
/* ------------------------------------------------------------------ */

export async function getGuestAccessStatus(): Promise<{ guestAccess: GuestAccessSummary | null }> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'anonymous') {
    return { guestAccess: null }
  }

  const grant = await findLatestGuestGrant(actor.client, actor.anonymousUserId)

  return { guestAccess: grant ? await toGuestAccessSummary(actor.client, grant) : null }
}

/* ------------------------------------------------------------------ */
/* GET /api/billing/me                                                 */
/* ------------------------------------------------------------------ */

export async function getBillingSummary(): Promise<BillingSummary> {
  const actor = await requireBillingActor()
  const now = new Date()

  if (actor.kind === 'anonymous') {
    const grant = await findLatestGuestGrant(actor.client, actor.anonymousUserId)
    const guestAccess = grant ? await toGuestAccessSummary(actor.client, grant) : null

    return {
      accessMode: grant?.mode === 'one_time' ? 'anonymous_one_time' : 'anonymous_trial',
      accountStatus: 'anonymous',
      commercialAccess: toGuestCommercialAccessSummary(grant, now),
      tenantId: null,
      plan: null,
      subscription: null,
      accessGrant: null,
      guestAccess,
      invoices: []
    }
  }

  await assertBillingCapability(actor.tenantId, BILLING_CAPABILITIES.subscriptionRead)

  const [subscriptionRow, invoiceRows, accessGrants] = await Promise.all([
    findActiveSubscriptionForTenant(actor.client, actor.tenantId),
    listRecentInvoicesForTenant(actor.client, actor.tenantId, 20),
    listAccessGrants(actor.client, actor.userId, actor.tenantId)
  ])

  const subscriptionPlan = subscriptionRow ? await findPlanById(actor.client, subscriptionRow.plan_id) : null

  const commercialAccess = evaluateCommercialAccess(
    {
      subscription: subscriptionRow,
      planIsActive: subscriptionPlan?.is_active === true,
      accessGrants
    },
    now
  )

  const selectedGrant = selectCommercialGrant(accessGrants, now)?.grant

  const accessGrant = commercialAccess.source === 'subscription'
    ? null
    : selectedGrant?.id
      ? accessGrants.find(grant => grant.id === selectedGrant.id) ?? null
      : null

  const oneTimePlan = accessGrant?.mode === 'one_time' && accessGrant.source_plan_id
    ? await findPlanById(actor.client, accessGrant.source_plan_id)
    : null

  const plan = commercialAccess.source === 'subscription' ? subscriptionPlan : oneTimePlan

  const entitlements = plan
    ? commercialAccess.source === 'one_time' && accessGrant
      ? (await listAccessGrantEntitlementRows(actor.client, accessGrant.id)).map(row => ({
          plan_id: plan.id,
          entitlement_key: row.entitlement_key,
          limit_value: row.limit_value,
          is_enabled: row.is_enabled
        }))
      : await listPlanEntitlementRows(actor.client, [plan.id], actor.tenantId)
    : []

  const billingPlan = plan ? toBillingPlan(plan, entitlements) : null

  const effectiveInvoices = invoiceRows

  return {
    accessMode: commercialAccess.source === 'subscription'
      ? 'registered_subscription'
      : accessGrant?.mode === 'one_time'
        ? 'registered_one_time'
        : accessGrant?.mode === 'trial'
          ? 'registered_trial'
          : 'registered_manual',
    accountStatus: 'active',
    commercialAccess,
    tenantId: actor.tenantId,
    plan: billingPlan,
    subscription: subscriptionRow ? toSubscriptionSummary(subscriptionRow, billingPlan) : null,
    accessGrant: accessGrant ? toRegisteredAccessGrantSummary(accessGrant) : null,
    guestAccess: null,
    invoices: effectiveInvoices.map(toBillingInvoice)
  }
}

/* ------------------------------------------------------------------ */
/* Inicio de Trial autenticado                                         */
/* ------------------------------------------------------------------ */

export async function startTrial(): Promise<{ trialAccess: TrialAccessSummary }> {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.trialStart)

  await enforceBillingRateLimit('trial_start', `${actor.tenantId}:${actor.userId}`)

  const result = await startTrialGrant(actor.client, actor.tenantId)

  if (!result.ok) {
    switch (result.reason) {
      case 'authentication_required':
        throw BillingError.unauthenticated()
      case 'email_confirmation_required':
        throw BillingError.emailNotConfirmed()
      case 'tenant_required':
        throw BillingError.tenantRequired()
      case 'capability_denied':
        throw BillingError.forbidden(BILLING_CAPABILITIES.trialStart)
      case 'trial_policy_not_configured':
        throw BillingError.trialNotConfigured()
    }
  }

  const trialAccess = toTrialAccessSummary(result.grant)
  const isExpired = trialAccess.expiresAt !== null && new Date(trialAccess.expiresAt).getTime() <= new Date().getTime()

  if (isExpired || (trialAccess.status !== 'active' && trialAccess.status !== 'pending')) {
    // start_trial reuses the tenant's existing trial grant instead of creating
    // duplicates, so reaching this branch means a trial record for this
    // user + tenant already existed and was consumed/expired.
    throw BillingError.trialAlreadyUsed()
  }

  return { trialAccess }
}

const toBillingPurchaseDelegation = (row: BillingPurchaseDelegationRow) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  userId: row.user_id,
  grantedBy: row.granted_by,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  revokedAt: row.revoked_at
})

export async function getPurchasePolicy(): Promise<{
  tenantId: string
  policy: BillingPurchasePolicy
  canManage: boolean
}> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'registered') {
    throw BillingError.registeredAccountRequired()
  }

  const row = await getBillingPurchasePolicy(actor.client, actor.tenantId)

  if (!row) {
    throw BillingError.tenantRequired()
  }

  return {
    tenantId: row.tenant_id,
    policy: row.policy,
    canManage: row.can_manage
  }
}

export async function updatePurchasePolicy(input: BillingPurchasePolicyRequest): Promise<{
  tenantId: string
  policy: BillingPurchasePolicy
}> {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.purchaseManage)
  const result = await setBillingPurchasePolicy(actor.client, actor.tenantId, input.policy)

  return result
}

async function resolveUserEmails(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map()
  const admin = createSupabaseAdminClient()
  const entries = await Promise.all(
    userIds.map(async id => {
      try {
        const { data } = await admin.auth.admin.getUserById(id)
        return [id, data.user?.email ?? null] as const
      } catch {
        return [id, null] as const
      }
    })
  )
  return new Map(entries)
}

export async function getPurchaseDelegations(workspaceId: string) {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.purchaseManage)
  const rows = await listBillingPurchaseDelegations(actor.client, actor.tenantId, workspaceId)

  interface ProfileBrief {
    id: string
    display_name: string | null
    avatar_url: string | null
  }

  // Hydrate user profiles for delegated rows
  const userIds = rows.map(r => r.user_id)
  let profiles: ProfileBrief[] = []
  let emailMap = new Map<string, string | null>()

  if (userIds.length > 0) {
    const [{ data }, emails] = await Promise.all([
      actor.client.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
      resolveUserEmails(userIds)
    ])
    profiles = (data || []) as ProfileBrief[]
    emailMap = emails
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // Fetch available tenant and workspace members to delegate
  const { data: rawWsMembers } = await actor.client
    .from('workspace_memberships')
    .select('user_id, status')
    .eq('workspace_id', workspaceId)

  const { data: rawTenantMembers } = await actor.client
    .from('memberships')
    .select('user_id, status')
    .eq('tenant_id', actor.tenantId)

  const { data: rawTenantProfiles } = await actor.client
    .from('profiles')
    .select('id, display_name, avatar_url')

  const wsMembers = (rawWsMembers || []) as unknown as Array<{ user_id: string; status?: string }>
  const tenantMembers = (rawTenantMembers || []) as unknown as Array<{ user_id: string; status?: string }>
  const tenantProfiles = (rawTenantProfiles || []) as ProfileBrief[]

  const combinedUserIds = new Set<string>()
  wsMembers.forEach(m => {
    if (m.status !== 'suspended' && m.status !== 'revoked') {
      combinedUserIds.add(m.user_id)
    }
  })
  tenantMembers.forEach(m => {
    if (m.status !== 'suspended' && m.status !== 'revoked') {
      combinedUserIds.add(m.user_id)
    }
  })
  tenantProfiles.forEach(p => {
    combinedUserIds.add(p.id)
  })

  const activeDelegatedUserIds = rows.filter(r => r.status === 'active').map(r => r.user_id)
  const availableUserIds = Array.from(combinedUserIds).filter(
    uid => uid !== actor.userId && !activeDelegatedUserIds.includes(uid)
  )

  let availableProfiles: ProfileBrief[] = []
  let availableEmailMap = new Map<string, string | null>()

  if (availableUserIds.length > 0) {
    const [{ data }, emails] = await Promise.all([
      actor.client.from('profiles').select('id, display_name, avatar_url').in('id', availableUserIds),
      resolveUserEmails(availableUserIds)
    ])
    availableProfiles = (data || []) as ProfileBrief[]
    availableEmailMap = emails
  }

  const availableMembers = availableProfiles.map(p => {
    const email = availableEmailMap.get(p.id) ?? null
    return {
      userId: p.id,
      displayName: p.display_name || email?.split('@')[0] || 'Miembro',
      avatarUrl: p.avatar_url || null,
      email
    }
  })

  return {
    tenantId: actor.tenantId,
    workspaceId,
    items: rows.map(r => {
      const p = profileMap.get(r.user_id)
      const email = emailMap.get(r.user_id) ?? null
      return {
        ...toBillingPurchaseDelegation(r),
        displayName: p?.display_name || email?.split('@')[0] || 'Miembro',
        avatarUrl: p?.avatar_url || null,
        email
      }
    }),
    availableMembers
  }
}

export async function grantPurchaseDelegation(input: BillingPurchaseDelegationRequest) {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.purchaseManage)
  const row = await grantBillingPurchaseDelegation(actor.client, actor.tenantId, input.workspaceId, input.userId)

  // Asynchronous notification email to delegated member
  try {
    const admin = createSupabaseAdminClient()
    const [
      { data: granterProfile },
      { data: recipientProfile },
      { data: recipientAuth },
      { data: workspaceRow },
      { data: tenantRow }
    ] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', actor.userId).maybeSingle(),
      admin.from('profiles').select('display_name').eq('id', input.userId).maybeSingle(),
      admin.auth.admin.getUserById(input.userId),
      admin.from('workspaces').select('name').eq('id', input.workspaceId).maybeSingle(),
      admin.from('tenants').select('name').eq('id', actor.tenantId).maybeSingle()
    ])

    const recipientEmail = recipientAuth?.user?.email
    if (recipientEmail) {
      await sendPurchaseDelegationEmail({
        email: recipientEmail,
        recipientName: recipientProfile?.display_name || recipientEmail.split('@')[0] || 'Colaborador',
        granterName: granterProfile?.display_name || 'El propietario del espacio de trabajo',
        workspaceName: workspaceRow?.name || 'Espacio de trabajo',
        tenantName: tenantRow?.name || 'Organización'
      })
    }
  } catch (emailError) {
    logger.warn('No se pudo enviar el correo de notificación de delegación de compra.', {
      action: 'billing.purchase_delegation.notify',
      details: {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        workspaceId: input.workspaceId,
        userId: input.userId
      }
    })
  }

  return toBillingPurchaseDelegation(row)
}

export async function revokePurchaseDelegation(delegationId: string) {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.purchaseManage)
  const row = await revokeBillingPurchaseDelegation(actor.client, actor.tenantId, delegationId)

  return toBillingPurchaseDelegation(row)
}

/* ------------------------------------------------------------------ */
/* Checkout de compra única (registrado)                                */
/* ------------------------------------------------------------------ */

export async function createOneTimeCheckout(
  input: CheckoutOneTimeRequest,
  correlationId?: string
): Promise<CheckoutResponse> {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.checkoutCreate)

  await enforceBillingRateLimit('checkout_one_time', actor.tenantId)

  const planRow = await findPlanByCode(actor.client, input.planCode)

  if (!planRow || planRow.interval !== 'one_time') {
    throw BillingError.planNotFound()
  }

  if (!planRow.provider_price_id) {
    throw BillingError.planNotConfigured()
  }

  const grantId = deriveGrantId(actor, input, planRow.id)
  const grantResult = await createPendingOneTimeGrant(actor.client, grantId, actor.tenantId, planRow.id)

  if (!grantResult.ok) {
    switch (grantResult.reason) {
      case 'authentication_required':
        throw BillingError.unauthenticated()
      case 'email_confirmation_required':
        throw BillingError.emailNotConfirmed()
      case 'tenant_required':
        throw BillingError.tenantRequired()
      case 'capability_denied':
        throw BillingError.forbidden(BILLING_CAPABILITIES.checkoutCreate)
      case 'grant_conflict':
        throw BillingError.checkoutFailed()
    }
  }

  const grant = grantResult.grant

  if (grant.status !== 'pending') {
    throw BillingError.checkoutFailed()
  }

  if (grant.provider_checkout_id) {
    const reused = await tryReuseOpenCheckoutSession(grant.provider_checkout_id)

    if (reused) {
      logger.info('Checkout de compra única reutilizado', {
        action: 'billing.checkout.one_time',
        correlationId,
        details: { checkoutSessionId: reused.checkoutSessionId }
      })

      return reused
    }

    throw BillingError.checkoutFailed()
  }

  const session = await createOneTimeCheckoutSession({
    priceId: planRow.provider_price_id,
    clientReferenceId: grant.id,
    metadata: {
      grantId: grant.id,
      userId: actor.userId,
      tenantId: actor.tenantId,
      planCode: planRow.code
    },
    customerEmail: actor.email ?? undefined
  })

  if (!session.url) {
    throw BillingError.checkoutFailed()
  }

  const attached = await attachOneTimeCheckoutReference(actor.client, grant.id, actor.tenantId, session.id)

  if (!attached) {
    throw BillingError.checkoutFailed()
  }

  const response = { checkoutUrl: session.url, checkoutSessionId: session.id }

  logger.info('Checkout de compra única creado', {
    action: 'billing.checkout.one_time',
    correlationId,
    details: { checkoutSessionId: session.id, tenantId: actor.tenantId }
  })

  return response
}

async function tryReuseOpenCheckoutSession(checkoutSessionId: string): Promise<CheckoutResponse | null> {
  try {
    const existing = await getStripe().checkout.sessions.retrieve(checkoutSessionId)

    if (existing.status === 'open' && existing.url) {
      return { checkoutUrl: existing.url, checkoutSessionId: existing.id }
    }
  } catch {
    // Session expired/not found: fall through and create a new one.
  }

  return null
}

/* ------------------------------------------------------------------ */
/* Checkout de suscripción (registrado)                                */
/* ------------------------------------------------------------------ */

async function ensureBillingCustomer(actor: RegisteredBillingCheckoutActor): Promise<BillingCustomerRow> {
  const existing = await findBillingCustomerByTenantId(actor.client, actor.tenantId)

  if (existing) return existing

  const stripeCustomer = await getStripe().customers.create(
    { email: actor.email ?? undefined, metadata: { tenantId: actor.tenantId } },
    { idempotencyKey: `billing-customer:${actor.tenantId}` }
  )

  try {
    return await createBillingCustomer(actor.client, {
      tenantId: actor.tenantId,
      workspaceId: actor.workspaceId,
      providerCustomerId: stripeCustomer.id,
      billingEmail: actor.email
    })
  } catch (error) {
    // A concurrent request may have inserted the row first (unique
    // tenant_id/provider_customer_id race) — re-read rather than fail.
    const raceWinner = await findBillingCustomerByTenantId(actor.client, actor.tenantId)

    if (raceWinner) return raceWinner

    throw error
  }
}

export async function createSubscriptionCheckout(
  input: CheckoutSubscriptionRequest,
  correlationId?: string
): Promise<CheckoutResponse> {
  const actor = await requireRegisteredBillingCheckoutActor(input.workspaceId)

  await enforceBillingRateLimit('checkout_subscription', actor.tenantId)

  const activeSub = await findActiveSubscriptionForTenant(actor.client, actor.tenantId)

  // Block if the owner is trying to buy the exact same active subscription with no change in tier or payer
  if (activeSub && activeSub.status === 'active' && actor.authorizationSource === 'owner') {
    const activePlan = await findPlanById(actor.client, activeSub.plan_id)
    if (activePlan && activePlan.code === input.planCode) {
      throw BillingError.subscriptionAlreadyActive()
    }
  }

  const planRow = await findPlanByCode(actor.client, input.planCode)

  if (!planRow || planRow.interval === 'one_time') {
    throw BillingError.planNotFound()
  }

  if (!planRow.provider_price_id) {
    throw BillingError.planNotConfigured()
  }

  const intent = await reserveBillingSubscriptionCheckout(
    actor.client,
    actor.tenantId,
    actor.workspaceId,
    planRow.id,
    input.idempotencyKey?.trim() || null
  )

  if (!intent.is_new) {
    if (intent.provider_checkout_id) {
      const reused = await tryReuseOpenCheckoutSession(intent.provider_checkout_id)

      if (reused) {
        logger.info('Checkout de suscripción reutilizado', {
          action: 'billing.checkout.subscription',
          correlationId,
          details: { checkoutSessionId: reused.checkoutSessionId, tenantId: actor.tenantId }
        })

        return reused
      }
    }

    throw BillingError.subscriptionCheckoutInProgress()
  }

  let stripeSessionCreated = false

  try {
    // Owner flow: reuse the tenant's Stripe customer so the subscription is
    // consolidated under the existing billing relationship. Delegated flow
    // (approved_member / all_active_member buying on the workspace's behalf):
    // never touch the tenant's customer; Stripe creates a fresh billing-only
    // customer captured through `customer_email` at checkout time.
    const isOwner = actor.authorizationSource === 'owner'

    const customer = isOwner ? await ensureBillingCustomer(actor) : null

    const session = await createSubscriptionCheckoutSession({
      priceId: planRow.provider_price_id,
      clientReferenceId: intent.client_reference_id,
      metadata: {
        tenantId: actor.tenantId,
        workspaceId: actor.workspaceId,
        initiatedBy: actor.userId,
        checkoutIntentId: intent.id,
        planId: planRow.id,
        planCode: planRow.code,
        purchasePolicy: actor.purchasePolicy,
        authorizationSource: actor.authorizationSource
      },
      customerId: customer?.provider_customer_id,
      customerEmail: customer ? undefined : actor.email ?? undefined
    })

    stripeSessionCreated = true

    if (!session.url) {
      await releaseBillingSubscriptionCheckout(actor.client, actor.tenantId, intent.id)
      throw BillingError.checkoutFailed()
    }

    const attached = await attachBillingSubscriptionCheckout(actor.client, actor.tenantId, intent.id, session.id)

    if (!attached) {
      throw BillingError.checkoutFailed()
    }

    const response = { checkoutUrl: session.url, checkoutSessionId: session.id }

    logger.info('Checkout de suscripción creado', {
      action: 'billing.checkout.subscription',
      correlationId,
      details: { checkoutSessionId: session.id, tenantId: actor.tenantId }
    })

    return response
  } catch (error) {
    if (!stripeSessionCreated) {
      await releaseBillingSubscriptionCheckout(actor.client, actor.tenantId, intent.id)
    }

    throw error
  }
}

/* ------------------------------------------------------------------ */
/* Checkout context (registrado)                                       */
/* ------------------------------------------------------------------ */

const toPurchaseAddressSummary = (row: BillingPurchaseAddressRow): PurchaseAddressSummary => ({
  firstName: row.first_name,
  lastName: row.last_name,
  mobile: row.mobile,
  line1: row.line1,
  line2: row.line2,
  city: row.city,
  state: row.state,
  postalCode: row.postal_code,
  country: row.country
})

// Lightweight snapshot used to hydrate the upgrade wizard: the profile, the
// full plan catalog, the tenant's current plan (if any), the caller's Checkout
// authorization for the requested workspace (or the default one), and the
// caller's stored billing purchase address. Anything heavier (invoices,
// external provider syncs) lives in `/pricing` and `user-settings`.
export async function getCheckoutContext(workspaceId?: string): Promise<CheckoutContext> {
  const actor = await requireBillingActor()

  if (actor.kind !== 'registered') {
    throw BillingError.registeredAccountRequired()
  }

  const authorizationRow = await authorizeBillingCheckout(actor.client, actor.userId, actor.tenantId, workspaceId)

  // The caller's own auth metadata (Supabase user_metadata) supplies the
  // personal information prefill for the wizard's step 2, and the profiles
  // row supplies display name/avatar. Everything is resolved server-side;
  // nothing is trusted from the client. `profiles` and `workspaces` are not
  // part of the local billing schema typing, so rows are narrowed explicitly.
  const [
    { data: authData },
    { data: rawProfileRow },
    { data: rawWorkspaceRow }
  ] = await Promise.all([
    actor.client.auth.getUser(),
    actor.client.from('profiles').select('display_name, avatar_url').eq('id', actor.userId).maybeSingle(),
    authorizationRow
      ? actor.client.from('workspaces').select('name').eq('id', authorizationRow.workspace_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string | null } | null })
  ])

  const profileRow = rawProfileRow as { display_name: string | null; avatar_url: string | null } | null
  const workspaceRow = rawWorkspaceRow as { name: string | null } | null

  const userMetadata = (authData?.user?.user_metadata ?? {}) as Record<string, unknown>

  const authorization: CheckoutAuthorization | null = authorizationRow
    ? {
        source: authorizationRow.authorization_source as CheckoutAuthorization['source'],
        policy: authorizationRow.policy,
        isOwner: authorizationRow.authorization_source === 'owner',
        workspaceId: authorizationRow.workspace_id,
        workspaceName: workspaceRow?.name ?? null
      }
    : null

  const [plans, subscriptionRow] = await Promise.all([
    listPlans(actor.client),
    findActiveSubscriptionForTenant(actor.client, actor.tenantId)
  ])

  const planRow = subscriptionRow ? await findPlanById(actor.client, subscriptionRow.plan_id) : null

  const currentPlan: CheckoutPlanBrief | null = planRow
    ? { code: planRow.code, name: planRow.name, interval: planRow.interval }
    : null

  const checkoutWorkspaceId = authorization?.workspaceId ?? null

  const purchaseAddress = checkoutWorkspaceId
    ? await findBillingPurchaseAddress(actor.client, actor.userId, checkoutWorkspaceId)
    : null

  const profile: CheckoutProfile = {
    userId: actor.userId,
    email: actor.email,
    displayName: profileRow?.display_name || actor.email?.split('@')[0] || 'Miembro',
    firstName: (userMetadata.firstName as string) || null,
    lastName: (userMetadata.lastName as string) || null,
    mobile: (userMetadata.mobile as string) || null,
    country: (userMetadata.country as string) || null,
    avatarUrl: profileRow?.avatar_url ?? null
  }

  const profileAddressFallback: PurchaseAddressSummary | null = (
    userMetadata.line1 ||
    userMetadata.city ||
    userMetadata.postalCode ||
    userMetadata.country ||
    userMetadata.mobile
  )
    ? {
        firstName: (userMetadata.firstName as string) || (profileRow?.display_name?.split(' ')[0] ?? '') || '',
        lastName: (userMetadata.lastName as string) || (profileRow?.display_name?.split(' ').slice(1).join(' ') ?? '') || '',
        mobile: (userMetadata.mobile as string) || '',
        line1: (userMetadata.line1 as string) || '',
        line2: (userMetadata.line2 as string) || '',
        city: (userMetadata.city as string) || '',
        state: (userMetadata.state as string) || '',
        postalCode: (userMetadata.postalCode as string) || '',
        country: (userMetadata.country as string) || 'US'
      }
    : null

  const resolvedPurchaseAddress = purchaseAddress
    ? toPurchaseAddressSummary(purchaseAddress)
    : profileAddressFallback

  return {
    profile,
    plans,
    currentPlan,
    subscription: subscriptionRow && planRow ? toSubscriptionSummary(subscriptionRow, toBillingPlan(planRow, [])) : null,
    authorization,
    purchaseAddress: resolvedPurchaseAddress
  }
}

export async function savePurchaseAddress(
  input: BillingPurchaseAddressRequest
): Promise<{ purchaseAddress: PurchaseAddressSummary }> {
  const actor = await requireRegisteredBillingCheckoutActor(input.workspaceId)

  await enforceBillingRateLimit('checkout_address', `${actor.tenantId}:${actor.userId}:${actor.workspaceId}`)

  const address = await upsertBillingPurchaseAddress(actor.client, {
    userId: actor.userId,
    tenantId: actor.tenantId,
    workspaceId: actor.workspaceId,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    mobile: input.mobile ?? null,
    line1: input.line1 ?? null,
    line2: input.line2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    country: input.country ?? null
  })

  logger.info('Dirección de facturación de compra guardada', {
    action: 'billing.purchase.address.upserted',
    details: { workspaceId: actor.workspaceId, tenantId: actor.tenantId }
  })

  return { purchaseAddress: toPurchaseAddressSummary(address) }
}

/* ------------------------------------------------------------------ */
/* Customer Portal (registrado)                                        */
/* ------------------------------------------------------------------ */

export async function createPortalSession(correlationId?: string): Promise<PortalResponse> {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.subscriptionManage)

  await enforceBillingRateLimit('customer_portal', actor.tenantId)

  const customer = await findBillingCustomerByTenantId(actor.client, actor.tenantId)

  if (!customer) {
    throw BillingError.customerNotFound()
  }

  const session = await createCustomerPortalSession(customer.provider_customer_id)

  logger.info('Portal de Customer creado', {
    action: 'billing.customer_portal',
    correlationId,
    details: { tenantId: actor.tenantId }
  })

  return { portalUrl: session.url }
}

/* ------------------------------------------------------------------ */
/* Facturas (registrado)                                               */
/* ------------------------------------------------------------------ */

export async function getInvoice(invoiceId: string): Promise<BillingInvoice> {
  const actor = await requireRegisteredBillingActor(BILLING_CAPABILITIES.invoicesRead)

  const row = await findInvoiceForTenant(actor.client, actor.tenantId, invoiceId)

  if (!row) {
    throw BillingError.invoiceNotFound()
  }

  return toBillingInvoice(row)
}

/* ------------------------------------------------------------------ */
/* Webhook de Stripe                                                    */
/* ------------------------------------------------------------------ */

export interface WebhookProcessingResult {
  status: 'processed' | 'ignored' | 'already_processed'
}

// Verifies the signature, then processes the event through an idempotent,
// auditable transaction against `billing_webhook_events` (plan section
// 12.4): every event is recorded before it is interpreted, and a `processed`
// row short-circuits any redelivery. Never activates access from the
// Checkout success_url — only this verified webhook may do so (plan section
// 7.2/17.2). Uses the admin client throughout, per plan section 10.4.
export async function processStripeWebhookEvent(
  rawPayload: string,
  signatureHeader: string | null,
  client: BillingSupabaseClient,
  correlationId?: string
): Promise<WebhookProcessingResult> {
  if (!signatureHeader) {
    throw BillingError.webhookSignatureInvalid()
  }

  let event: Stripe.Event

  try {
    event = constructStripeWebhookEvent(rawPayload, signatureHeader)
  } catch {
    throw BillingError.webhookSignatureInvalid()
  }

  const existingStatus = await findWebhookEventStatus(client, event.id)

  if (existingStatus === 'processed') {
    logger.info('Webhook Stripe duplicado ya procesado', {
      action: 'billing.webhook',
      correlationId,
      details: { eventId: event.id, eventType: event.type }
    })

    return { status: 'already_processed' }
  }

  if (!existingStatus) {
    await recordWebhookEventReceived(client, {
      providerEventId: event.id,
      eventType: event.type,
      payloadSanitized: sanitizeStripeEventForStorage(event)
    })
  }

  try {
    const outcome = await dispatchStripeEvent(client, event, correlationId)

    await markWebhookEventProcessed(client, event.id)

    logger.info('Webhook Stripe procesado', {
      action: 'billing.webhook',
      correlationId,
      details: { eventId: event.id, eventType: event.type, outcome }
    })

    return { status: outcome }
  } catch (error) {
    const billingError = error instanceof BillingError ? error : BillingError.webhookProcessingFailed(event.type)

    await markWebhookEventFailed(client, event.id, billingError.code)

    logger.error('Webhook Stripe fallido', {
      action: 'billing.webhook',
      correlationId,
      details: { eventId: event.id, eventType: event.type, errorType: error instanceof Error ? error.name : typeof error }
    })

    throw billingError
  }
}

async function dispatchStripeEvent(
  client: BillingSupabaseClient,
  event: Stripe.Event,
  correlationId?: string
): Promise<'processed' | 'ignored'> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return handleCheckoutSessionSucceeded(client, event.data.object as Stripe.Checkout.Session, correlationId)

    case 'checkout.session.async_payment_failed':
      return handleCheckoutSessionFailed(client, event.data.object as Stripe.Checkout.Session)

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return handleSubscriptionUpsert(client, event.data.object as Stripe.Subscription)

    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(client, event.data.object as Stripe.Subscription)

    case 'invoice.paid':
    case 'invoice.payment_failed':
      return handleInvoiceEvent(client, event.data.object as Stripe.Invoice, event.type)

    default:
      return 'ignored'
  }
}

async function handleCheckoutSessionSucceeded(
  client: BillingSupabaseClient,
  session: Stripe.Checkout.Session,
  correlationId?: string
): Promise<'processed' | 'ignored'> {
  if (session.mode === 'payment') {
    const grantId = session.client_reference_id
    const userId = session.metadata?.userId
    const tenantId = session.metadata?.tenantId

    if (!grantId || !userId || !tenantId || session.metadata?.grantId !== grantId) return 'ignored'

    const paymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

    const existingGrant = await findAccessGrantById(client, grantId)
    const plan = existingGrant?.source_plan_id ? await findPlanById(client, existingGrant.source_plan_id) : null

    const startsAt = new Date()
    let expiresAt: Date | null = null

    if (plan?.duration_seconds && plan.duration_seconds > 0) {
      expiresAt = new Date(startsAt.getTime() + plan.duration_seconds * 1000)
    } else if (plan && plan.duration_seconds === null) {
      // Lifetime plan: permanent access without expiration
      expiresAt = null
    } else {
      // Fallback if plan doesn't specify duration_seconds
      expiresAt = new Date(startsAt.getTime() + getOneTimeAccessDurationSeconds() * 1000)
    }

    const activated = await activateOneTimeGrant(client, {
      grantId,
      tenantId,
      userId,
      checkoutId: session.id,
      paymentId: paymentIntentId,
      startsAt,
      expiresAt
    })

    return activated ? 'processed' : 'ignored'
  }

  if (session.mode === 'subscription') {
    const tenantId = session.metadata?.tenantId
    const userId = session.metadata?.userId
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null)
    const newSubscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null)

    if (!tenantId || !customerId) return 'ignored'

    const existingActiveSub = await findActiveSubscriptionForTenant(client, tenantId)

    // Decouple/cancel previous Stripe subscription if it's different to prevent double-charging the previous owner
    if (
      existingActiveSub &&
      existingActiveSub.provider_subscription_id &&
      newSubscriptionId &&
      existingActiveSub.provider_subscription_id !== newSubscriptionId
    ) {
      try {
        const stripe = getStripe()

        await stripe.subscriptions.cancel(existingActiveSub.provider_subscription_id)
        logger.info('Suscripción previa en Stripe cancelada automáticamente tras nuevo checkout', {
          action: 'billing.subscription.previous_canceled',
          correlationId,
          details: {
            oldSubscriptionId: existingActiveSub.provider_subscription_id,
            newSubscriptionId,
            tenantId
          }
        })
      } catch (cancelErr) {
        logger.warn('No se pudo cancelar la suscripción anterior en Stripe (posiblemente ya cancelada)', {
          action: 'billing.subscription.cancel_warning',
          correlationId,
          details: { error: cancelErr instanceof Error ? cancelErr.message : String(cancelErr) }
        })
      }
    }

    await upsertBillingCustomer(client, {
      tenantId,
      providerCustomerId: customerId,
      billingEmail: session.customer_details?.email ?? null,
      country: session.customer_details?.address?.country,
      taxId: session.customer_details?.tax_ids?.[0]?.value
    })
    await completeBillingSubscriptionCheckout(client, session.id)

    // GAP 5: al activar la suscripción, cierra literalmente cualquier grant de
    // trial que hubiera quedado activo (el acceso por suscripción ya tiene
    // prioridad, pero eliminamos la posibilidad de un uso residual del trial).
    // Idempotente: devuelve 0 si no quedaba ningún grant activo.
    await closeActiveTrialGrantsByTenant(client, tenantId, userId ?? null, correlationId)

    // Notify owner(s) if this was a delegated purchase
    if (session.metadata?.authorizationSource && session.metadata?.authorizationSource !== 'owner') {
      try {
        const owners = await findTenantOwners(client, tenantId)

        if (owners.length > 0) {
          const buyerEmail = session.customer_details?.email || session.metadata?.initiatedBy || 'Usuario'
          const planRow = session.metadata?.planId ? await findPlanById(client, session.metadata.planId) : null
          const previousPlan = existingActiveSub ? await findPlanById(client, existingActiveSub.plan_id) : null

          let operationType: 'upgrade' | 'downgrade' | 'renewal' | 'new_subscription' = 'new_subscription'

          if (previousPlan && planRow) {
            if (previousPlan.code === planRow.code) {
              operationType = 'renewal'
            } else if (planRow.amount_minor > previousPlan.amount_minor) {
              operationType = 'upgrade'
            } else {
              operationType = 'downgrade'
            }
          }

          const [{ data: tenantRow }, { data: workspaceRow }] = await Promise.all([
            client.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
            session.metadata?.workspaceId
              ? client.from('workspaces').select('name').eq('id', session.metadata.workspaceId).maybeSingle()
              : Promise.resolve({ data: null as { name: string | null } | null })
          ])

          const tenantName = (tenantRow as { name?: string } | null)?.name || 'Organización'
          const workspaceName = (workspaceRow as { name?: string } | null)?.name || 'Espacio de trabajo'
          const buyerName = session.customer_details?.name || buyerEmail.split('@')[0] || 'Miembro delegado'

          const amountFormatted = planRow ? `$${(planRow.amount_minor / 100).toFixed(2)} / ${planRow.interval}` : '—'

          for (const owner of owners) {
            if (owner.email) {
              await sendPurchaseNotificationToOwnerEmail({
                ownerEmail: owner.email,
                ownerName: owner.displayName || 'Propietario',
                buyerName,
                buyerEmail,
                workspaceName,
                tenantName,
                previousPlanName: previousPlan?.name ?? null,
                newPlanName: planRow?.name ?? 'Plan',
                amountFormatted,
                operationType
              })
            }
          }

          logger.info('Notificación de compra delegada enviada al propietario', {
            action: 'billing.delegated.purchase.owner_notified',
            correlationId,
            details: { tenantId, ownersCount: owners.length }
          })
        }
      } catch (notifyErr) {
        logger.error('No se pudo enviar la notificación de compra delegada al propietario', {
          action: 'billing.delegated_notification_failed',
          correlationId,
          details: { error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr), tenantId }
        })
      }
    }

    return 'processed'
  }

  return 'ignored'
}

async function handleCheckoutSessionFailed(
  client: BillingSupabaseClient,
  session: Stripe.Checkout.Session
): Promise<'processed' | 'ignored'> {
  if (session.mode !== 'payment') return 'ignored'

  const grantId = session.client_reference_id
  const userId = session.metadata?.userId
  const tenantId = session.metadata?.tenantId

  if (!grantId || !userId || !tenantId || session.metadata?.grantId !== grantId) return 'ignored'

  const revoked = await revokePendingOneTimeGrant(client, {
    grantId,
    tenantId,
    userId,
    checkoutId: session.id
  })

  return revoked ? 'processed' : 'ignored'
}

// `SubscriptionStatus` (src/lib/billing/types.ts, not modified in this
// slice) is narrower than Stripe's `Subscription.Status`, which also
// includes `'incomplete_expired'`, `'paused'`, and a forward-compatible
// `OtherString` catch-all. Maps every Stripe value onto our fixed domain
// enum instead of widening it, so a future new Stripe status never breaks
// the `subscriptions.status` column type.
const mapStripeSubscriptionStatus = (status: Stripe.Subscription.Status): SubscriptionRow['status'] => {
  switch (status) {
    case 'incomplete':
      return 'incomplete'
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'unpaid':
      return 'unpaid'
    case 'paused':
      return 'past_due'
    default:
      return 'past_due'
  }
}

async function handleSubscriptionUpsert(
  client: BillingSupabaseClient,
  subscription: Stripe.Subscription
): Promise<'processed' | 'ignored'> {
  const tenantId = subscription.metadata?.tenantId

  if (!tenantId) return 'ignored'

  const priceId = subscription.items.data[0]?.price?.id
  const planId = priceId ? await findPlanIdByProviderPriceId(client, priceId) : null

  if (!planId) return 'ignored'

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription)

  await upsertSubscriptionRow(client, {
    tenantId,
    planId,
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  })

  return 'processed'
}

async function handleSubscriptionDeleted(
  client: BillingSupabaseClient,
  subscription: Stripe.Subscription
): Promise<'processed' | 'ignored'> {
  const tenantId = subscription.metadata?.tenantId ?? (await findTenantIdBySubscriptionId(client, subscription.id))

  if (!tenantId) return 'ignored'

  const priceId = subscription.items.data[0]?.price?.id
  const planId = priceId ? await findPlanIdByProviderPriceId(client, priceId) : null

  if (!planId) return 'ignored'

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription)

  await upsertSubscriptionRow(client, {
    tenantId,
    planId,
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    status: 'canceled',
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : new Date().toISOString()
  })

  return 'processed'
}

const mapStripeInvoiceStatus = (status: Stripe.Invoice.Status | null): BillingInvoiceRow['status'] => {
  switch (status) {
    case 'draft':
      return 'draft'
    case 'open':
      return 'open'
    case 'paid':
      return 'paid'
    case 'void':
      return 'void'
    case 'uncollectible':
      return 'uncollectible'
    default:
      return 'open'
  }
}

async function handleInvoiceEvent(
  client: BillingSupabaseClient,
  invoice: Stripe.Invoice,
  eventType: 'invoice.paid' | 'invoice.payment_failed'
): Promise<'processed' | 'ignored'> {
  if (!invoice.id) return 'ignored'

  let tenantId = (invoice.metadata?.tenantId as string | undefined) ?? null

  if (!tenantId) {
    const rawInvoice = invoice as unknown as { subscription?: string | { id?: string } }
    const subscriptionRef = rawInvoice.subscription ?? invoice.parent?.subscription_details?.subscription
    const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : (subscriptionRef?.id ?? null)

    if (subscriptionId) {
      tenantId = await findTenantIdBySubscriptionId(client, subscriptionId)
    }
  }

  if (!tenantId && typeof invoice.customer === 'string') {
    tenantId = await findTenantIdByCustomerId(client, invoice.customer)
  }

  if (!tenantId) return 'ignored'

  if (typeof invoice.customer === 'string') {
    await upsertBillingCustomer(client, {
      tenantId,
      providerCustomerId: invoice.customer,
      billingEmail: invoice.customer_email,
      country: invoice.customer_address?.country ?? undefined,
      taxId: getStripeInvoiceTaxId(invoice) ?? undefined
    })
  }

  await upsertInvoiceRow(client, {
    tenantId,
    providerInvoiceId: invoice.id,
    status: eventType === 'invoice.payment_failed' ? 'open' : mapStripeInvoiceStatus(invoice.status),
    number: invoice.number,
    amountMinor: invoice.amount_paid || invoice.amount_due,
    taxAmountMinor: getStripeInvoiceTaxAmountMinor(invoice),
    taxId: getStripeInvoiceTaxId(invoice),
    currency: invoice.currency,
    issuedAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null
  })

  return 'processed'
}
