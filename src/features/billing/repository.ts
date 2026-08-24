// Supabase-backed repository for the billing tables (plan section 9.9-9.14
// and 12). Every query is explicitly column-scoped (no `select('*')`).
// Registered-tenant writes go through the caller's own session-scoped
// client (RLS applies); guest/webhook writes are always passed an
// admin-cast client by the caller (see access.ts and service.ts) — this
// module itself never decides which client to use.
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { BillingError } from './errors'
import { logger } from '@/lib/logger'
import type {
  AccessGrantRow,
  AccessGrantEntitlementRow,
  BillingCheckoutAuthorizationRow,
  BillingCustomerRow,
  BillingInvoiceRow,
  BillingPurchaseAddressRow,
  BillingPurchaseDelegationRow,
  BillingPurchasePolicy,
  BillingPurchasePolicyRow,
  BillingSupabaseClient,
  BillingSubscriptionCheckoutIntentRow,
  BillingWebhookEventStatus,
  GuestAccessGrantRow,
  PlanEntitlementRow,
  PlanRow,
  PdfMonthlyUsageRpcRow,
  SubscriptionRow,
  TenantPlanOverrideRow,
  TrialStartRpcRow
} from './db-types'
import { canonicalizeBillingEntitlementKey } from '@/lib/billing/entitlements'
import {
  resolveRpcQuery,
  resolveRpcScalar,
  resolveSingleRowQuery,
  uncheckedBillingRpc,
  uncheckedBillingTable
} from './db-types'

/* ------------------------------------------------------------------ */
/* plans                                                               */
/* ------------------------------------------------------------------ */

const PLAN_COLUMNS =
  'id, code, name, description, provider_product_id, provider_price_id, currency, interval, amount_minor, is_active, is_public, contact_sales, display_order, duration_seconds, created_at, updated_at' as const

const PLAN_ENTITLEMENT_COLUMNS = 'plan_id, entitlement_key, limit_value, is_enabled' as const

const TENANT_PLAN_OVERRIDE_COLUMNS =
  'id, tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by, created_at, updated_at' as const

export async function listActivePlanRows(client: BillingSupabaseClient): Promise<PlanRow[]> {
  const { data, error } = await client
    .from('plans')
    .select(PLAN_COLUMNS)
    .eq('is_active', true)
    .order('amount_minor', { ascending: true })

  if (error) {
    throw BillingError.internal('No se pudo listar los planes.')
  }

  return data ?? []
}

export async function listPlanEntitlementRows(
  client: BillingSupabaseClient,
  planIds: string[],
  tenantId?: string
): Promise<PlanEntitlementRow[]> {
  if (planIds.length === 0) return []

  const { data, error } = await client
    .from('plan_entitlements')
    .select(PLAN_ENTITLEMENT_COLUMNS)
    .in('plan_id', planIds)
    .order('plan_id', { ascending: true })
    .order('entitlement_key', { ascending: true })

  if (error) {
    throw BillingError.internal('No se pudieron listar los entitlements de los planes.')
  }

  const baseRows = (data as unknown as PlanEntitlementRow[] | null) ?? []

  if (!tenantId) {
    return baseRows
  }

  const overrideRows = await listTenantPlanOverrideRows(client, tenantId, planIds)

  const overridesByKey = new Map(
    overrideRows.map(override => [
      `${override.plan_id}:${canonicalizeBillingEntitlementKey(override.entitlement_key)}`,
      override
    ] as const)
  )

  return baseRows.map(row => {
    const override = overridesByKey.get(`${row.plan_id}:${canonicalizeBillingEntitlementKey(row.entitlement_key)}`)

    if (!override) {
      return row
    }

    return {
      ...row,
      limit_value: override.limit_value,
      is_enabled: override.is_enabled
    }
  })
}

export async function listAccessGrantEntitlementRows(
  client: BillingSupabaseClient,
  grantId: string
): Promise<AccessGrantEntitlementRow[]> {
  const { data, error } = await client
    .from('access_grant_entitlements')
    .select('grant_id, entitlement_key, limit_value, is_enabled, source, created_at')
    .eq('grant_id', grantId)
    .order('entitlement_key', { ascending: true })

  if (error) {
    throw BillingError.internal('No se pudieron listar los entitlements del acceso concedido.')
  }

  return (data as unknown as AccessGrantEntitlementRow[] | null) ?? []
}

export async function listTenantPlanOverrideRows(
  client: BillingSupabaseClient,
  tenantId: string,
  planIds?: string[]
): Promise<TenantPlanOverrideRow[]> {
  let query = client
    .from('tenant_plan_overrides')
    .select(TENANT_PLAN_OVERRIDE_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('plan_id', { ascending: true })
    .order('entitlement_key', { ascending: true })

  if (planIds && planIds.length > 0) {
    query = query.in('plan_id', planIds)
  }

  const { data, error } = await query

  if (error) {
    throw BillingError.internal('No se pudieron listar los overrides de entitlements del tenant.')
  }

  return (data as unknown as TenantPlanOverrideRow[] | null) ?? []
}

export async function findPlanByCode(client: BillingSupabaseClient, code: string): Promise<PlanRow | null> {
  const { data, error } = await resolveSingleRowQuery<PlanRow>(
    client.from('plans').select(PLAN_COLUMNS).eq('code', code).eq('is_active', true).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el plan solicitado.')
  }

  return data ?? null
}

export async function findPlanById(client: BillingSupabaseClient, id: string): Promise<PlanRow | null> {
  const { data, error } = await resolveSingleRowQuery<PlanRow>(
    client.from('plans').select(PLAN_COLUMNS).eq('id', id).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el plan asociado.')
  }

  return data ?? null
}

export async function findPlanIdByProviderPriceId(
  client: BillingSupabaseClient,
  priceId: string
): Promise<string | null> {
  const { data, error } = await resolveSingleRowQuery<{ id: string }>(
    client.from('plans').select('id').eq('provider_price_id', priceId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo resolver el plan por precio de Stripe.')
  }

  return data?.id ?? null
}

export async function authorizeBillingCheckout(
  client: BillingSupabaseClient,
  userId: string,
  tenantId: string,
  workspaceId?: string
): Promise<BillingCheckoutAuthorizationRow | null> {
  const { data, error } = await resolveRpcQuery<BillingCheckoutAuthorizationRow>(
    uncheckedBillingRpc(client, 'authorize_billing_checkout', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_workspace_id: workspaceId ?? null
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo verificar la autorización de compra del tenant.')
  }

  const row = data?.[0]

  if (!row) {
    return null
  }

  return row
}

export async function getBillingPurchasePolicy(
  client: BillingSupabaseClient,
  tenantId: string
): Promise<BillingPurchasePolicyRow | null> {
  const { data, error } = await resolveRpcQuery<BillingPurchasePolicyRow>(
    uncheckedBillingRpc(client, 'get_billing_purchase_policy', { p_tenant_id: tenantId })
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la política de compras del tenant.')
  }

  return data?.[0] ?? null
}

export async function setBillingPurchasePolicy(
  client: BillingSupabaseClient,
  tenantId: string,
  policy: BillingPurchasePolicy
): Promise<{ tenantId: string; policy: BillingPurchasePolicy }> {
  const { data, error } = await resolveRpcQuery<{ tenant_id: string; policy: BillingPurchasePolicy }>(
    uncheckedBillingRpc(client, 'set_billing_purchase_policy', {
      p_tenant_id: tenantId,
      p_policy: policy
    })
  )

  if (error) {
    if (error.message.includes('invalid_billing_purchase_policy')) {
      throw BillingError.validation('La política de compras indicada no es válida.')
    }

    if (error.message.includes('billing_purchase_policy_forbidden')) {
      throw BillingError.forbidden('billing.purchase.manage')
    }

    if (error.message.includes('tenant_required')) {
      throw BillingError.tenantRequired()
    }

    throw BillingError.internal('No se pudo actualizar la política de compras del tenant.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La actualización de la política de compras no devolvió resultado.')
  }

  return { tenantId: row.tenant_id, policy: row.policy }
}

export async function listBillingPurchaseDelegations(
  client: BillingSupabaseClient,
  tenantId: string,
  workspaceId: string
): Promise<BillingPurchaseDelegationRow[]> {
  const { data, error } = await resolveRpcQuery<BillingPurchaseDelegationRow>(
    uncheckedBillingRpc(client, 'list_billing_purchase_delegations', {
      p_tenant_id: tenantId,
      p_workspace_id: workspaceId
    })
  )

  if (error) {
    if (error.message.includes('billing_purchase_delegations_forbidden')) {
      throw BillingError.forbidden('billing.purchase.manage')
    }

    throw BillingError.internal('No se pudieron cargar las delegaciones de compra.')
  }

  return data ?? []
}

export async function grantBillingPurchaseDelegation(
  client: BillingSupabaseClient,
  tenantId: string,
  workspaceId: string,
  userId: string
): Promise<BillingPurchaseDelegationRow> {
  const { data, error } = await resolveRpcQuery<BillingPurchaseDelegationRow>(
    uncheckedBillingRpc(client, 'grant_billing_purchase_delegation', {
      p_tenant_id: tenantId,
      p_workspace_id: workspaceId,
      p_user_id: userId
    })
  )

  if (error) {
    if (error.message.includes('billing_purchase_delegation_forbidden')) {
      throw BillingError.forbidden('billing.purchase.manage')
    }

    if (error.message.includes('workspace_not_found') || error.message.includes('delegation_target_not_found')) {
      throw BillingError.validation('El workspace o miembro indicado no es válido para la delegación.')
    }

    throw BillingError.internal('No se pudo conceder la delegación de compra.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La delegación de compra no devolvió resultado.')
  }

  return row
}

export async function revokeBillingPurchaseDelegation(
  client: BillingSupabaseClient,
  tenantId: string,
  delegationId: string
): Promise<BillingPurchaseDelegationRow> {
  const { data, error } = await resolveRpcQuery<BillingPurchaseDelegationRow>(
    uncheckedBillingRpc(client, 'revoke_billing_purchase_delegation', {
      p_tenant_id: tenantId,
      p_delegation_id: delegationId
    })
  )

  if (error) {
    if (error.message.includes('billing_purchase_delegation_forbidden')) {
      throw BillingError.forbidden('billing.purchase.manage')
    }

    if (error.message.includes('billing_purchase_delegation_not_found')) {
      throw BillingError.validation('La delegación de compra no existe.')
    }

    throw BillingError.internal('No se pudo revocar la delegación de compra.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La revocación de la delegación no devolvió resultado.')
  }

  return row
}

export type TrialGrantStartResult =
  | { ok: true; grant: TrialStartRpcRow }
  | {
      ok: false
      reason:
        | 'authentication_required'
        | 'email_confirmation_required'
        | 'tenant_required'
        | 'capability_denied'
        | 'trial_policy_not_configured'
    }

// The caller derives tenantId from its authenticated active membership, and the
// security-definer RPC repeats the confirmed-email, membership, tenant, and
// capability checks.
// react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
export async function startTrialGrant(client: BillingSupabaseClient, tenantId: string): Promise<TrialGrantStartResult> {
  const { data, error } = await resolveRpcQuery<TrialStartRpcRow>(
    uncheckedBillingRpc(client, 'start_trial', { p_tenant_id: tenantId })
  )

  if (error) {
    const reason = (
      [
        'authentication_required',
        'email_confirmation_required',
        'tenant_required',
        'capability_denied',
        'trial_policy_not_configured'
      ] as const
    ).find(candidate => error.message.includes(candidate))

    if (reason) return { ok: false, reason }

    throw BillingError.internal('No se pudo iniciar el acceso de prueba.')
  }

  const grant = data?.[0]

  if (!grant) {
    throw BillingError.internal('No se recibió el acceso de prueba creado.')
  }

  return { ok: true, grant }
}

export type OneTimeGrantCreateResult =
  | { ok: true; grant: AccessGrantRow }
  | {
      ok: false
      reason:
        | 'authentication_required'
        | 'email_confirmation_required'
        | 'tenant_required'
        | 'capability_denied'
        | 'grant_conflict'
    }

export async function createPendingOneTimeGrant(
  client: BillingSupabaseClient,
  grantId: string,
  tenantId: string,
  planId: string
): Promise<OneTimeGrantCreateResult> {
  const { data, error } = await resolveRpcQuery<AccessGrantRow>(
    uncheckedBillingRpc(client, 'create_pending_one_time_grant', {
      p_grant_id: grantId,
      p_tenant_id: tenantId,
      p_plan_id: planId
    })
  )

  if (error) {
    const reason = (
      [
        'authentication_required',
        'email_confirmation_required',
        'tenant_required',
        'capability_denied',
        'one_time_grant_conflict'
      ] as const
    ).find(candidate => error.message.includes(candidate))

    if (reason === 'one_time_grant_conflict') return { ok: false, reason: 'grant_conflict' }
    if (reason) return { ok: false, reason }

    throw BillingError.internal('No se pudo preparar el acceso de compra única.')
  }

  const grant = data?.[0]

  if (!grant) {
    throw BillingError.internal('No se recibió el acceso de compra única preparado.')
  }

  return { ok: true, grant }
}

export async function attachOneTimeCheckoutReference(
  client: BillingSupabaseClient,
  grantId: string,
  tenantId: string,
  checkoutId: string
): Promise<boolean> {
  const { data, error } = await resolveRpcScalar<boolean>(
    uncheckedBillingRpc(client, 'attach_one_time_checkout_reference', {
      p_grant_id: grantId,
      p_tenant_id: tenantId,
      p_checkout_id: checkoutId
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo registrar la sesión de Stripe Checkout.')
  }

  return data === true
}

const ACCESS_GRANT_COLUMNS =
  'id, tenant_id, user_id, mode, policy_id, source_plan_id, provider_checkout_id, provider_payment_id, starts_at, expires_at, max_uses, used_uses, status, consumed_at, revoked_at, retention_until, created_at, updated_at' as const

export async function listAccessGrants(
  client: BillingSupabaseClient,
  userId: string,
  tenantId: string
): Promise<AccessGrantRow[]> {
  const { data, error } = await client
    .from('access_grants')
    .select(ACCESS_GRANT_COLUMNS)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'consumed', 'expired', 'revoked'])
    .order('created_at', { ascending: false })

  if (error) {
    throw BillingError.internal('No se pudieron cargar los accesos temporales del tenant.')
  }

  return (data as unknown as AccessGrantRow[] | null) ?? []
}

export async function findLatestAccessGrant(
  client: BillingSupabaseClient,
  userId: string,
  tenantId: string
): Promise<AccessGrantRow | null> {
  const { data, error } = await resolveSingleRowQuery<AccessGrantRow>(
    client
      .from('access_grants')
      .select(ACCESS_GRANT_COLUMNS)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'active', 'consumed', 'expired', 'revoked'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el acceso temporal del tenant.')
  }

  return data ?? null
}

export async function findAccessGrantById(
  client: BillingSupabaseClient,
  grantId: string
): Promise<AccessGrantRow | null> {
  const { data, error } = await resolveSingleRowQuery<AccessGrantRow>(
    client.from('access_grants').select(ACCESS_GRANT_COLUMNS).eq('id', grantId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el acceso de compra única.')
  }

  return data ?? null
}

export interface ActivateOneTimeGrantInput {
  grantId: string
  tenantId: string
  userId: string
  checkoutId: string
  paymentId: string | null
  startsAt: Date
  expiresAt: Date | null
}

export async function activateOneTimeGrant(
  client: BillingSupabaseClient,
  input: ActivateOneTimeGrantInput
): Promise<boolean> {
  const current = await findAccessGrantById(client, input.grantId)

  if (!current) return false

  if (
    current.tenant_id !== input.tenantId ||
    current.user_id !== input.userId ||
    current.mode !== 'one_time' ||
    !['pending', 'active'].includes(current.status) ||
    (current.provider_checkout_id !== null && current.provider_checkout_id !== input.checkoutId)
  ) {
    return false
  }

  if (current.status === 'active' && current.provider_checkout_id === input.checkoutId) {
    return true
  }

  const patch = {
    status: 'active' as const,
    starts_at: input.startsAt.toISOString(),
    expires_at: input.expiresAt ? input.expiresAt.toISOString() : null,
    provider_checkout_id: input.checkoutId,
    provider_payment_id: input.paymentId,
    updated_at: new Date().toISOString()
  }

  let query = uncheckedBillingTable(client, 'access_grants')
    .update(patch)
    .eq('id', input.grantId)
    .eq('tenant_id', input.tenantId)
    .eq('user_id', input.userId)
    .eq('mode', 'one_time')
    .in('status', ['pending', 'active'])

  query =
    current.provider_checkout_id === null
      ? query.is('provider_checkout_id', null)
      : query.eq('provider_checkout_id', input.checkoutId)

  const { data, error } = await query.select('id')

  if (error) {
    throw BillingError.internal('No se pudo activar el acceso de compra única.')
  }

  return (data?.length ?? 0) > 0
}

export interface RevokePendingOneTimeGrantInput {
  grantId: string
  tenantId: string
  userId: string
  checkoutId: string
}

export async function revokePendingOneTimeGrant(
  client: BillingSupabaseClient,
  input: RevokePendingOneTimeGrantInput
): Promise<boolean> {
  const current = await findAccessGrantById(client, input.grantId)

  if (!current) return false

  if (
    current.tenant_id !== input.tenantId ||
    current.user_id !== input.userId ||
    current.mode !== 'one_time' ||
    current.status !== 'pending' ||
    (current.provider_checkout_id !== null && current.provider_checkout_id !== input.checkoutId)
  ) {
    return false
  }

  const patch = { status: 'revoked' as const, updated_at: new Date().toISOString() }
  let query = uncheckedBillingTable(client, 'access_grants')
    .update(patch)
    .eq('id', input.grantId)
    .eq('tenant_id', input.tenantId)
    .eq('user_id', input.userId)
    .eq('mode', 'one_time')
    .eq('status', 'pending')

  query =
    current.provider_checkout_id === null
      ? query.is('provider_checkout_id', null)
      : query.eq('provider_checkout_id', input.checkoutId)

  const { data, error } = await query.select('id')

  if (error) {
    throw BillingError.internal('No se pudo revertir el acceso de compra única.')
  }

  return (data?.length ?? 0) > 0
}

/* ------------------------------------------------------------------ */
/* subscriptions                                                       */
/* ------------------------------------------------------------------ */

const SUBSCRIPTION_COLUMNS =
  'id, tenant_id, plan_id, provider_customer_id, provider_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at' as const

export async function reserveBillingSubscriptionCheckout(
  client: BillingSupabaseClient,
  tenantId: string,
  workspaceId: string,
  planId: string,
  idempotencyKey: string | null
): Promise<BillingSubscriptionCheckoutIntentRow> {
  const { data, error } = await resolveRpcQuery<BillingSubscriptionCheckoutIntentRow>(
    uncheckedBillingRpc(client, 'reserve_billing_subscription_checkout', {
      p_tenant_id: tenantId,
      p_workspace_id: workspaceId,
      p_plan_id: planId,
      p_idempotency_key: idempotencyKey
    })
  )

  if (error) {
    if (error.message.includes('billing_purchase_not_allowed')) {
      throw BillingError.forbidden('billing.checkout.create')
    }

    if (error.message.includes('subscription_already_active')) {
      throw BillingError.subscriptionAlreadyActive()
    }

    if (error.message.includes('subscription_checkout_in_progress')) {
      throw BillingError.subscriptionCheckoutInProgress()
    }

    if (error.message.includes('plan_not_found')) {
      throw BillingError.planNotFound()
    }

    throw BillingError.internal('No se pudo reservar el Checkout de suscripción.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La reserva del Checkout de suscripción no devolvió resultado.')
  }

  return row
}

export async function attachBillingSubscriptionCheckout(
  client: BillingSupabaseClient,
  tenantId: string,
  intentId: string,
  providerCheckoutId: string
): Promise<boolean> {
  const { data, error } = await resolveRpcScalar<boolean>(
    uncheckedBillingRpc(client, 'attach_billing_subscription_checkout', {
      p_tenant_id: tenantId,
      p_intent_id: intentId,
      p_provider_checkout_id: providerCheckoutId
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo vincular la sesión de Checkout de suscripción.')
  }

  return data === true
}

export async function releaseBillingSubscriptionCheckout(
  client: BillingSupabaseClient,
  tenantId: string,
  intentId: string
): Promise<boolean> {
  const { data, error } = await resolveRpcScalar<boolean>(
    uncheckedBillingRpc(client, 'release_billing_subscription_checkout', {
      p_tenant_id: tenantId,
      p_intent_id: intentId
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo liberar la reserva de Checkout de suscripción.')
  }

  return data === true
}

export async function completeBillingSubscriptionCheckout(
  client: BillingSupabaseClient,
  providerCheckoutId: string
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_subscription_checkout_intents')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('provider_checkout_id', providerCheckoutId)
    .in('status', ['pending', 'open'])

  if (error) {
    throw BillingError.internal('No se pudo cerrar la reserva de Checkout de suscripción.')
  }
}

// GAP 5 (plan section 7.3): al cerrar el checkout de suscripción ya se ha
// priorizado el acceso por suscripción, pero los grants de trial que quedaron
// activos se cierran literalmente (status='revoked' + revoked_at) vía la RPC
// security-definer `close_tenant_active_trial_grants`. Devuelve cuántos grants
// se cerraron (0 si no quedaba ninguno activo; idempotente).
//
// `p_actor` es opcional para el registro de auditoría; se pasa el userId del
// tenant que completó el checkout (satélite "system" cuando no hay autor). La
// RPC es security definer, por lo que se ejecuta con el client de servicio.
export async function closeActiveTrialGrantsByTenant(
  client: BillingSupabaseClient,
  tenantId: string,
  actorUserId: string | null,
  correlationId?: string
): Promise<number> {
  const { data, error } = await resolveRpcScalar<number>(
    uncheckedBillingRpc(client, 'close_tenant_active_trial_grants', {
      p_tenant_id: tenantId,
      p_actor: actorUserId,
      p_correlation_id: correlationId ?? null
    })
  )

  if (error) {
    throw BillingError.internal('No se pudieron cerrar los accesos de prueba activos.')
  }

  return data ?? 0
}

export async function findActiveSubscriptionForTenant(
  client: BillingSupabaseClient,
  tenantId: string
): Promise<SubscriptionRow | null> {
  const now = new Date().toISOString()

  const { data, error } = await resolveSingleRowQuery<SubscriptionRow>(
    client
      .from('subscriptions')
      .select(SUBSCRIPTION_COLUMNS)
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'trialing'])
      .or(`current_period_start.is.null,current_period_start.lte.${now}`)
      .or(`current_period_end.is.null,current_period_end.gt.${now}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la suscripción del tenant.')
  }

  return data ?? null
}

export interface PdfMonthlyUsageResult {
  readonly allowed: boolean
  readonly usageCount: number
  readonly limitValue: number | null
}

export async function consumePdfMonthlyUsage(
  client: BillingSupabaseClient,
  tenantId: string
): Promise<PdfMonthlyUsageResult> {
  const { data, error } = await resolveRpcQuery<PdfMonthlyUsageRpcRow>(
    uncheckedBillingRpc(client, 'consume_billing_entitlement_usage', {
      p_tenant_id: tenantId,
      p_entitlement_key: 'investigations.export_pdf_monthly'
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo consumir el límite mensual de PDF.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La reserva mensual de PDF no devolvió un resultado.')
  }

  return {
    allowed: row.allowed === true,
    usageCount: row.usage_count,
    limitValue: row.limit_value
  }
}

export async function consumeGrantPdfMonthlyUsage(
  client: BillingSupabaseClient,
  tenantId: string,
  grantId: string
): Promise<PdfMonthlyUsageResult> {
  const { data, error } = await resolveRpcQuery<PdfMonthlyUsageRpcRow>(
    uncheckedBillingRpc(client, 'consume_billing_grant_entitlement_usage', {
      p_tenant_id: tenantId,
      p_grant_id: grantId,
      p_entitlement_key: 'investigations.export_pdf_monthly'
    })
  )

  if (error) {
    throw BillingError.internal('No se pudo consumir el límite mensual de PDF del acceso concedido.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('La reserva mensual de PDF del acceso concedido no devolvió un resultado.')
  }

  return {
    allowed: row.allowed === true,
    usageCount: row.usage_count,
    limitValue: row.limit_value
  }
}

export async function findTenantIdBySubscriptionId(
  client: BillingSupabaseClient,
  providerSubscriptionId: string
): Promise<string | null> {
  const { data, error } = await resolveSingleRowQuery<{ tenant_id: string }>(
    client
      .from('subscriptions')
      .select('tenant_id')
      .eq('provider_subscription_id', providerSubscriptionId)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo resolver el tenant de la suscripción.')
  }

  return data?.tenant_id ?? null
}

export interface UpsertSubscriptionInput {
  tenantId: string
  planId: string
  providerCustomerId: string
  providerSubscriptionId: string
  status: SubscriptionRow['status']
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
}

// Called only from the Stripe webhook handler with an admin-cast client
// (plan section 10.4). Idempotent on `provider_subscription_id`, so
// `customer.subscription.created`/`.updated` retries never create
// duplicate rows.
export async function upsertSubscriptionRow(
  client: BillingSupabaseClient,
  input: UpsertSubscriptionInput
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'subscriptions').upsert(
    {
      tenant_id: input.tenantId,
      plan_id: input.planId,
      provider_customer_id: input.providerCustomerId,
      provider_subscription_id: input.providerSubscriptionId,
      status: input.status,
      current_period_start: input.currentPeriodStart,
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      canceled_at: input.canceledAt,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'provider_subscription_id' }
  )

  if (error) {
    throw BillingError.internal('No se pudo sincronizar la suscripción de Stripe.')
  }
}

/* ------------------------------------------------------------------ */
/* billing_customers                                                   */
/* ------------------------------------------------------------------ */

const CUSTOMER_COLUMNS =
  'id, tenant_id, provider_customer_id, billing_email, country, tax_id, created_at, updated_at' as const

export async function findBillingCustomerByTenantId(
  client: BillingSupabaseClient,
  tenantId: string
): Promise<BillingCustomerRow | null> {
  const { data, error } = await resolveSingleRowQuery<BillingCustomerRow>(
    client.from('billing_customers').select(CUSTOMER_COLUMNS).eq('tenant_id', tenantId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el cliente de facturación.')
  }

  return data ?? null
}

export async function findTenantIdByCustomerId(
  client: BillingSupabaseClient,
  providerCustomerId: string
): Promise<string | null> {
  const { data, error } = await resolveSingleRowQuery<{ tenant_id: string }>(
    client.from('billing_customers').select('tenant_id').eq('provider_customer_id', providerCustomerId).maybeSingle()
  )

  if (error) {
    return null
  }

  return data?.tenant_id ?? null
}

export interface CreateBillingCustomerInput {
  tenantId: string
  workspaceId: string
  providerCustomerId: string
  billingEmail: string | null
}

export async function createBillingCustomer(
  client: BillingSupabaseClient,
  input: CreateBillingCustomerInput
): Promise<BillingCustomerRow> {
  const { data, error } = await resolveRpcQuery<BillingCustomerRow>(
    uncheckedBillingRpc(client, 'create_billing_customer', {
      p_tenant_id: input.tenantId,
      p_workspace_id: input.workspaceId,
      p_provider_customer_id: input.providerCustomerId,
      p_billing_email: input.billingEmail
    })
  )

  if (error || !data?.[0]) {
    throw BillingError.internal('No se pudo registrar el cliente de facturación.')
  }

  return data[0]
}

export interface UpsertBillingCustomerInput {
  tenantId: string
  providerCustomerId: string
  billingEmail: string | null
  country?: string | null
  taxId?: string | null
}

// Called only from the Stripe webhook handler with an admin-cast client.
// Idempotent on `tenant_id` so a retried `checkout.session.completed`
// (subscription mode) never creates a second customer row for the tenant.
export async function upsertBillingCustomer(
  client: BillingSupabaseClient,
  input: UpsertBillingCustomerInput
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_customers').upsert(
    {
      tenant_id: input.tenantId,
      provider_customer_id: input.providerCustomerId,
      billing_email: input.billingEmail,
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.taxId !== undefined ? { tax_id: input.taxId } : {}),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    throw BillingError.internal('No se pudo sincronizar el cliente de facturación de Stripe.')
  }
}

/* ------------------------------------------------------------------ */
/* billing_purchase_addresses                                          */
/* ------------------------------------------------------------------ */

const PURCHASE_ADDRESS_COLUMNS =
  'id, user_id, tenant_id, workspace_id, first_name, last_name, mobile, line1, line2, city, state, postal_code, country, created_at, updated_at' as const

// Reads the caller's own stored billing purchase address. RLS restricts the
// result to the authenticated user's rows, so `workspaceId` acts as an
// additional application-level scope on top of it.
export async function findBillingPurchaseAddress(
  client: BillingSupabaseClient,
  userId: string,
  workspaceId: string
): Promise<BillingPurchaseAddressRow | null> {
  const { data, error } = await resolveSingleRowQuery<BillingPurchaseAddressRow>(
    client
      .from('billing_purchase_addresses')
      .select(PURCHASE_ADDRESS_COLUMNS)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la dirección de facturación.')
  }

  return data ?? null
}

export interface UpsertBillingPurchaseAddressInput {
  userId: string
  tenantId: string
  workspaceId: string
  firstName: string | null
  lastName: string | null
  mobile: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

// Idempotent on (user_id, workspace_id). The security-definer RPC re-checks
// membership + Checkout authorization and writes the audit row; the
// caller's session-scoped client is used so any RLS/audit expectations on
// the caller stay consistent with the rest of the feature.
export async function upsertBillingPurchaseAddress(
  client: BillingSupabaseClient,
  input: UpsertBillingPurchaseAddressInput
): Promise<BillingPurchaseAddressRow> {
  const { data, error } = await resolveRpcQuery<BillingPurchaseAddressRow>(
    uncheckedBillingRpc(client, 'upsert_billing_purchase_address', {
      p_tenant_id: input.tenantId,
      p_workspace_id: input.workspaceId,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_mobile: input.mobile,
      p_line1: input.line1,
      p_line2: input.line2,
      p_city: input.city,
      p_state: input.state,
      p_postal_code: input.postalCode,
      p_country: input.country
    })
  )

  if (error) {
    if (error.message.includes('billing_purchase_not_allowed')) {
      throw BillingError.forbidden('billing.checkout.create')
    }

    if (error.message.includes('authentication_required')) {
      throw BillingError.unauthenticated()
    }

    throw BillingError.internal('No se pudo guardar la dirección de facturación.')
  }

  const row = data?.[0]

  if (!row) {
    throw BillingError.internal('El guardado de la dirección de facturación no devolvió resultado.')
  }

  return row
}

/* ------------------------------------------------------------------ */
/* billing_invoices                                                    */
/* ------------------------------------------------------------------ */

const INVOICE_COLUMNS =
  'id, tenant_id, provider_invoice_id, status, number, amount_minor, tax_amount_minor, tax_id, currency, issued_at, paid_at, hosted_invoice_url, retention_until, created_at, updated_at' as const

export async function listRecentInvoicesForTenant(
  client: BillingSupabaseClient,
  tenantId: string,
  limit = 20
): Promise<BillingInvoiceRow[]> {
  const { data, error } = await client
    .from('billing_invoices')
    .select(INVOICE_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('issued_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw BillingError.internal('No se pudieron listar las facturas.')
  }

  return data ?? []
}

export async function findInvoiceForTenant(
  client: BillingSupabaseClient,
  tenantId: string,
  invoiceId: string
): Promise<BillingInvoiceRow | null> {
  const { data, error } = await resolveSingleRowQuery<BillingInvoiceRow>(
    client.from('billing_invoices').select(INVOICE_COLUMNS).eq('tenant_id', tenantId).eq('id', invoiceId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la factura.')
  }

  return data ?? null
}

export interface UpsertInvoiceInput {
  tenantId: string
  providerInvoiceId: string
  status: BillingInvoiceRow['status']
  number: string | null
  amountMinor: number
  taxAmountMinor: number | null
  taxId: string | null
  currency: string
  issuedAt: string | null
  paidAt: string | null
  hostedInvoiceUrl: string | null
}

// Called only from the Stripe webhook handler with an admin-cast client.
// Idempotent on `provider_invoice_id`; invoices are append-only from the
// application's perspective (plan section 9.13) — this never deletes rows.
export async function upsertInvoiceRow(client: BillingSupabaseClient, input: UpsertInvoiceInput): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_invoices').upsert(
    {
      tenant_id: input.tenantId,
      provider_invoice_id: input.providerInvoiceId,
      status: input.status,
      number: input.number,
      amount_minor: input.amountMinor,
      tax_amount_minor: input.taxAmountMinor,
      tax_id: input.taxId,
      currency: input.currency,
      issued_at: input.issuedAt,
      paid_at: input.paidAt,
      hosted_invoice_url: input.hostedInvoiceUrl,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'provider_invoice_id' }
  )

  if (error) {
    throw BillingError.internal('No se pudo sincronizar la factura de Stripe.')
  }
}

/* ------------------------------------------------------------------ */
/* guest_access_grants / guest_trial_policies                          */
/* ------------------------------------------------------------------ */

const GUEST_GRANT_COLUMNS =
  'id, anonymous_user_id, mode, policy_id, provider_checkout_id, provider_payment_id, starts_at, expires_at, max_uses, used_uses, status, consumed_at, converted_user_id, retention_until, created_at, updated_at' as const

export async function findLatestGuestGrant(
  client: BillingSupabaseClient,
  anonymousUserId: string
): Promise<GuestAccessGrantRow | null> {
  const { data, error } = await resolveSingleRowQuery<GuestAccessGrantRow>(
    client
      .from('guest_access_grants')
      .select(GUEST_GRANT_COLUMNS)
      .eq('anonymous_user_id', anonymousUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo verificar el acceso anónimo.')
  }

  return data ?? null
}

// Looks up the PENDING one-time grant expected to already exist from
// `POST /api/auth/anonymous` (mode: 'one_time'). This module never creates
// one — see `BillingError.guestAccessNotFound()` at the call site.
export async function findPendingOneTimeGrant(
  client: BillingSupabaseClient,
  anonymousUserId: string
): Promise<GuestAccessGrantRow | null> {
  const { data, error } = await resolveSingleRowQuery<GuestAccessGrantRow>(
    client
      .from('guest_access_grants')
      .select(GUEST_GRANT_COLUMNS)
      .eq('anonymous_user_id', anonymousUserId)
      .eq('mode', 'one_time')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo verificar la solicitud de acceso de compra única.')
  }

  return data ?? null
}

export async function findGuestGrantById(
  client: BillingSupabaseClient,
  grantId: string
): Promise<GuestAccessGrantRow | null> {
  const { data, error } = await resolveSingleRowQuery<GuestAccessGrantRow>(
    client.from('guest_access_grants').select(GUEST_GRANT_COLUMNS).eq('id', grantId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar el acceso anónimo.')
  }

  return data ?? null
}

// Attaches the created Stripe Checkout Session id to the still-pending
// grant so a retried checkout request can reuse it (see service.ts).
export async function updateGuestGrantCheckoutReference(
  client: BillingSupabaseClient,
  grantId: string,
  checkoutId: string
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'guest_access_grants')
    .update({ provider_checkout_id: checkoutId, updated_at: new Date().toISOString() })
    .eq('id', grantId)

  if (error) {
    throw BillingError.internal('No se pudo registrar la sesión de Stripe Checkout.')
  }
}

// Activates a one-time grant. Only called from the Stripe webhook handler
// (admin client) after `checkout.session.completed`/
// `.async_payment_succeeded`, and only when the grant is still
// `pending`/`active` — never resurrects a `revoked`/`consumed`/`converted`
// grant. Returns `false` when no matching row was updated (already
// consumed, converted, or the id does not exist), so the caller can treat
// the event as a no-op instead of throwing.
export interface ActivateOneTimeGuestGrantInput {
  grantId: string
  checkoutId: string
  paymentId: string | null
  startsAt: Date
  expiresAt: Date
}

export async function activateOneTimeGuestGrant(
  client: BillingSupabaseClient,
  input: ActivateOneTimeGuestGrantInput
): Promise<boolean> {
  const { data, error } = await uncheckedBillingTable(client, 'guest_access_grants')
    .update({
      status: 'active',
      starts_at: input.startsAt.toISOString(),
      expires_at: input.expiresAt.toISOString(),
      provider_checkout_id: input.checkoutId,
      provider_payment_id: input.paymentId,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.grantId)
    .eq('mode', 'one_time')
    .in('status', ['pending', 'active'])
    .select('id')

  if (error) {
    throw BillingError.internal('No se pudo activar el acceso de compra única.')
  }

  return (data?.length ?? 0) > 0
}

// Reverts a still-pending one-time grant when Stripe reports the async
// payment failed, so it never lingers as a stale "pending" row forever.
export async function revokePendingOneTimeGuestGrant(client: BillingSupabaseClient, grantId: string): Promise<boolean> {
  const { data, error } = await uncheckedBillingTable(client, 'guest_access_grants')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', grantId)
    .eq('mode', 'one_time')
    .eq('status', 'pending')
    .select('id')

  if (error) {
    throw BillingError.internal('No se pudo revertir el acceso de compra única.')
  }

  return (data?.length ?? 0) > 0
}

export interface TrialPolicyAllowFlags {
  allowPdf: boolean
  allowCheckout: boolean
  allowConversion: boolean
}

export interface RegisteredTrialPolicyPdfFlags {
  enabled: boolean
  allowPdf: boolean
}

interface TrialPolicyAllowRow {
  allow_pdf: boolean
  allow_checkout: boolean
  allow_conversion: boolean
}

interface RegisteredTrialPolicyPdfRow {
  enabled: boolean
  allow_pdf: boolean
}

export async function loadRegisteredTrialPolicyById(
  client: BillingSupabaseClient,
  policyId: string,
  tenantId: string
): Promise<RegisteredTrialPolicyPdfFlags | null> {
  const { data, error } = await resolveSingleRowQuery<RegisteredTrialPolicyPdfRow>(
    client
      .from('trial_policies')
      .select('enabled, allow_pdf')
      .eq('id', policyId)
      .eq('tenant_id', tenantId)
      .eq('scope', 'tenant')
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la política de prueba registrada.')
  }

  if (!data) return null

  return { enabled: data.enabled, allowPdf: data.allow_pdf }
}

export async function loadTrialPolicyById(
  client: BillingSupabaseClient,
  policyId: string
): Promise<TrialPolicyAllowFlags | null> {
  const { data, error } = await resolveSingleRowQuery<TrialPolicyAllowRow>(
    client
      .from('guest_trial_policies')
      .select('allow_pdf, allow_checkout, allow_conversion')
      .eq('id', policyId)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo cargar la política de prueba anónima.')
  }

  if (!data) return null

  return { allowPdf: data.allow_pdf, allowCheckout: data.allow_checkout, allowConversion: data.allow_conversion }
}

/* ------------------------------------------------------------------ */
/* billing_webhook_events                                              */
/* ------------------------------------------------------------------ */

export async function findWebhookEventStatus(
  client: BillingSupabaseClient,
  providerEventId: string
): Promise<BillingWebhookEventStatus | null> {
  const { data, error } = await resolveSingleRowQuery<{ status: BillingWebhookEventStatus }>(
    client
      .from('billing_webhook_events')
      .select('status')
      .eq('provider', 'stripe')
      .eq('provider_event_id', providerEventId)
      .maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo verificar la idempotencia del webhook.')
  }

  return data?.status ?? null
}

export interface RecordWebhookEventInput {
  providerEventId: string
  eventType: string
  payloadSanitized: Record<string, unknown>
}

// Best-effort insert: a unique-violation race (two near-simultaneous
// deliveries of the same event) is treated as success, since the row
// already exists either way and `findWebhookEventStatus` already ran first.
export async function recordWebhookEventReceived(
  client: BillingSupabaseClient,
  input: RecordWebhookEventInput
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_webhook_events').insert({
    provider: 'stripe',
    provider_event_id: input.providerEventId,
    event_type: input.eventType,
    payload_sanitized: input.payloadSanitized,
    status: 'received'
  })

  if (error && error.code !== '23505') {
    throw BillingError.internal('No se pudo registrar el evento de webhook.')
  }
}

export async function markWebhookEventProcessed(client: BillingSupabaseClient, providerEventId: string): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('provider', 'stripe')
    .eq('provider_event_id', providerEventId)

  if (error) {
    throw BillingError.internal('No se pudo marcar el webhook como procesado.')
  }
}

export async function markWebhookEventFailed(
  client: BillingSupabaseClient,
  providerEventId: string,
  errorCode: string
): Promise<void> {
  const { error } = await uncheckedBillingTable(client, 'billing_webhook_events')
    .update({ status: 'failed', error_code: errorCode })
    .eq('provider', 'stripe')
    .eq('provider_event_id', providerEventId)

  if (error) {
    logger.error('No se pudo marcar el webhook como fallido', {
      action: 'billing',
      details: { error: error.message, providerEventId, errorCode }
    })
  }
}

/* ------------------------------------------------------------------ */
/* tenant owners                                                      */
/* ------------------------------------------------------------------ */

export interface TenantOwnerInfo {
  userId: string
  email: string | null
  displayName: string | null
}

export async function findTenantOwners(
  client: BillingSupabaseClient,
  tenantId: string
): Promise<TenantOwnerInfo[]> {
  const { data: roleData, error: roleError } = await uncheckedBillingTable(client, 'roles')
    .select('id')
    .eq('key', 'owner')
    .maybeSingle()

  if (roleError || !roleData) {
    return []
  }

  const ownerRoleId = (roleData as { id?: string }).id
  if (!ownerRoleId) return []

  const { data: memberData, error: memberError } = await uncheckedBillingTable(client, 'memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role_id', ownerRoleId)
    .eq('status', 'active')

  const members = (memberData as { user_id: string }[] | null) ?? []
  if (memberError || members.length === 0) {
    return []
  }

  const userIds = members.map(m => m.user_id)
  const admin = createSupabaseAdminClient()

  const [profilesRes, ...authUsers] = await Promise.all([
    uncheckedBillingTable(client, 'profiles').select('id, display_name').in('id', userIds),
    ...userIds.map(uid => admin.auth.admin.getUserById(uid).catch(() => ({ data: { user: null } })))
  ])

  const profiles = (profilesRes.data as { id: string; display_name: string | null }[] | null) ?? []
  const profilesMap = new Map(profiles.map(p => [p.id, p.display_name]))
  const emailMap = new Map(
    authUsers.map((res, idx) => [
      userIds[idx],
      (res as { data: { user: { email?: string } | null } })?.data?.user?.email ?? null
    ])
  )

  return userIds.map(uid => ({
    userId: uid,
    email: emailMap.get(uid) ?? null,
    displayName: profilesMap.get(uid) ?? null
  }))
}

