import { requireAuthenticatedUser, requirePlatformCapability } from '@/features/access/access-service'
import {
  CAPABILITY_MANIFEST,
  isPlatformCapabilityKey,
  type PlatformCapabilityKey
} from '@/features/access/capabilityManifest'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { BillingPlan, BillingInterval } from '@/lib/billing/types'
import { canonicalizeBillingEntitlementKey } from '@/lib/billing/entitlements'
import { asBillingClient, uncheckedBillingTable } from './db-types'
import type { BillingInvoiceRow, PlanRow, PlanEntitlementRow, TenantPlanOverrideRow } from './db-types'
import { resolveSingleRowQuery } from './db-types'
import { BillingError } from './errors'
import { listPlanEntitlementRows, listTenantPlanOverrideRows } from './repository'

export interface AdminPlanEntitlementInput {
  entitlementKey: string
  limitValue: number | null
  isEnabled: boolean
}

export interface AdminPlanEntitlement extends AdminPlanEntitlementInput {
  planId: string
}

export interface AdminPlanSummary extends BillingPlan {
  entitlements: AdminPlanEntitlement[]
}

export interface CreatePlanInput {
  code: string
  name: string
  description?: string | null
  providerPriceId?: string | null
  currency: string
  interval: BillingInterval
  durationSeconds?: number | null
  amountMinor: number
  isActive?: boolean
  isPublic?: boolean
  contactSales?: boolean
  displayOrder?: number
  entitlements?: AdminPlanEntitlementInput[]
}

export interface UpdatePlanInput {
  name?: string
  description?: string | null
  providerPriceId?: string | null
  currency?: string
  interval?: BillingInterval
  durationSeconds?: number | null
  amountMinor?: number
  isActive?: boolean
  isPublic?: boolean
  contactSales?: boolean
  displayOrder?: number
  entitlements?: AdminPlanEntitlementInput[]
}

export interface AdminTrialPolicy {
  id: string
  scope: 'platform' | 'tenant'
  enabled: boolean
  durationSeconds: number
  startsOn: 'first_access' | 'first_action'
  maxSessions: number
  allowGuest: boolean
  allowPdf: boolean
  allowCheckout: boolean
  updatedAt: string | null
}

export interface UpdateTrialPolicyInput {
  enabled?: boolean
  durationSeconds?: number
  startsOn?: 'first_access' | 'first_action'
  maxSessions?: number
  allowGuest?: boolean
  allowPdf?: boolean
  allowCheckout?: boolean
}

export interface AdminPlatformModule {
  moduleKey: string
  name: string
  description: string | null
  routePrefix: string
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminTrialPolicyEntitlement {
  policyId: string
  entitlementKey: string
  limitValue: number | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertPlatformModuleInput {
  moduleKey: string
  name: string
  description?: string | null
  routePrefix: string
  isActive?: boolean
  displayOrder?: number
}

export interface UpdatePlatformModuleInput {
  name?: string
  description?: string | null
  routePrefix?: string
  isActive?: boolean
  displayOrder?: number
}

export interface AdminTrialPolicyEntitlementInput {
  entitlementKey: string
  limitValue: number | null
  isEnabled: boolean
}

export interface AdminSubscriptionSummary {
  id: string
  tenantId: string
  tenantName: string
  planCode: string
  planName: string
  providerCustomerId: string
  providerSubscriptionId: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface AdminBillingAuditLog {
  id: string
  tenantId: string | null
  actorUserId: string | null
  source: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AdminTenantEntitlement {
  tenantId: string
  tenantName: string
  planId: string
  planCode: string
  planName: string
  entitlementKey: string
  baseLimitValue: number | null
  baseIsEnabled: boolean
  overrideId: string | null
  overrideLimitValue: number | null
  overrideIsEnabled: boolean | null
  overrideUpdatedAt: string | null
  effectiveLimitValue: number | null
  effectiveIsEnabled: boolean
}

export interface AdminBillingInvoice {
  id: string
  tenantId: string | null
  tenantName: string | null
  providerInvoiceId: string
  status: string
  number: string | null
  amountMinor: number
  taxAmountMinor: number | null
  currency: string
  issuedAt: string | null
  paidAt: string | null
  hostedInvoiceUrl: string | null
  createdAt: string
  updatedAt: string
}

const ADMIN_ENTITLEMENT_COLUMNS = 'plan_id, entitlement_key, limit_value, is_enabled' as const

const ADMIN_OVERRIDE_COLUMNS =
  'id, tenant_id, plan_id, entitlement_key, limit_value, is_enabled, created_by, updated_by, created_at, updated_at' as const

const ADMIN_INVOICE_COLUMNS =
  'id, tenant_id, provider_invoice_id, status, number, amount_minor, tax_amount_minor, currency, issued_at, paid_at, hosted_invoice_url, created_at, updated_at' as const

const PLATFORM_MODULE_COLUMNS =
  'module_key, name, description, route_prefix, is_active, display_order, created_at, updated_at' as const

const TRIAL_POLICY_ENTITLEMENT_COLUMNS =
  'policy_id, entitlement_key, limit_value, is_enabled, created_at, updated_at' as const

const TRIAL_POLICY_COLUMNS =
  'id, scope, tenant_id, enabled, duration_seconds, starts_on, max_sessions, allow_guest, allow_pdf, allow_checkout, updated_by, updated_at' as const

const MODULE_KEY_PATTERN = /^[a-z][a-z0-9._-]{1,99}$/
const ENTITLEMENT_KEY_PATTERN = /^(modules|actions|limits)\.[a-z0-9._-]+$/

function mapPlatformModule(row: {
  module_key: string
  name: string
  description: string | null
  route_prefix: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}): AdminPlatformModule {
  return {
    moduleKey: row.module_key,
    name: row.name,
    description: row.description,
    routePrefix: row.route_prefix,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTrialPolicyEntitlement(row: {
  policy_id: string
  entitlement_key: string
  limit_value: number | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}): AdminTrialPolicyEntitlement {
  return {
    policyId: row.policy_id,
    entitlementKey: row.entitlement_key,
    limitValue: row.limit_value,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const resolveActionCapabilityKey = (actionKey: string): string => {
  if (actionKey === 'investigations.export_pdf') return 'investigations.export'

  return actionKey
}

function validateEntitlementInput(input: AdminTrialPolicyEntitlementInput): string {
  const entitlementKey = input.entitlementKey.trim().toLowerCase()

  if (!ENTITLEMENT_KEY_PATTERN.test(entitlementKey)) {
    throw BillingError.validation('La clave del entitlement de prueba no es válida.')
  }

  if (input.limitValue !== null && (!Number.isInteger(input.limitValue) || input.limitValue < 0)) {
    throw BillingError.validation('El límite del entitlement debe ser un entero no negativo o null.')
  }

  const separatorIndex = entitlementKey.indexOf('.')
  const namespace = entitlementKey.slice(0, separatorIndex)
  const key = entitlementKey.slice(separatorIndex + 1)

  if (namespace === 'modules' && key && !MODULE_KEY_PATTERN.test(key)) {
    throw BillingError.validation('La clave del módulo del entitlement no es válida.')
  }

  if (namespace === 'actions') {
    const actionCapabilityKey = resolveActionCapabilityKey(key)
    const capability = CAPABILITY_MANIFEST.find(candidate => candidate.key === actionCapabilityKey)

    if (!capability || isPlatformCapabilityKey(capability.key)) {
      throw BillingError.validation('La acción del entitlement no está disponible para un trial.')
    }
  }

  if (namespace === 'limits' && input.limitValue === null) {
    throw BillingError.validation('Los entitlements de límites requieren un valor entero.')
  }

  return entitlementKey
}

async function validatePlanEntitlements(
  adminClient: ReturnType<typeof asBillingClient>,
  entitlements: readonly AdminPlanEntitlementInput[]
): Promise<void> {
  for (const entitlement of entitlements) {
    const canonicalKey = canonicalizeBillingEntitlementKey(entitlement.entitlementKey)
    const separatorIndex = canonicalKey.indexOf('.')
    const namespace = canonicalKey.slice(0, separatorIndex)
    const key = canonicalKey.slice(separatorIndex + 1)

    if (
      !/^(modules|actions|limits)\.[a-z0-9._-]+$/.test(canonicalKey) ||
      (entitlement.limitValue !== null && (!Number.isInteger(entitlement.limitValue) || entitlement.limitValue < 0))
    ) {
      throw BillingError.validation(`El entitlement ${entitlement.entitlementKey} no es válido.`)
    }

    if (namespace === 'modules') {
      const { data: module, error } = await resolveSingleRowQuery<{ module_key: string }>(
        uncheckedBillingTable(adminClient, 'platform_modules')
          .select('module_key')
          .eq('module_key', key)
          .eq('is_active', true)
          .maybeSingle()
      )

      if (error) {
        throw BillingError.internal('No se pudo validar el catálogo de módulos del plan.')
      }

      if (!module) {
        throw BillingError.validation(`El módulo ${key} debe existir y estar activo.`)
      }
    }

    if (namespace === 'actions') {
      const actionCapabilityKey = resolveActionCapabilityKey(key)
      const capability = CAPABILITY_MANIFEST.find(candidate => candidate.key === actionCapabilityKey)

      if (!capability || isPlatformCapabilityKey(capability.key)) {
        throw BillingError.validation(`La acción ${key} no está disponible para planes comerciales.`)
      }
    }
  }
}

async function replaceAdminPlanEntitlements(
  adminClient: ReturnType<typeof asBillingClient>,
  planId: string,
  entitlements: readonly AdminPlanEntitlementInput[]
): Promise<void> {
  const { data: existingRows, error: existingError } = await uncheckedBillingTable(adminClient, 'plan_entitlements')
    .select('entitlement_key')
    .eq('plan_id', planId)

  if (existingError) {
    throw BillingError.internal('No se pudieron leer los entitlements actuales del plan.')
  }

  const submittedKeys = new Set(entitlements.map(entitlement => entitlement.entitlementKey.trim().toLowerCase()))

  for (const row of (existingRows as Array<{ entitlement_key: string }> | null) ?? []) {
    if (!submittedKeys.has(row.entitlement_key.trim().toLowerCase())) {
      const { error } = await uncheckedBillingTable(adminClient, 'plan_entitlements')
        .update({ is_enabled: false, limit_value: null })
        .eq('plan_id', planId)
        .eq('entitlement_key', row.entitlement_key)

      if (error) {
        throw BillingError.internal('No se pudieron desactivar los entitlements retirados del plan.')
      }
    }
  }

  for (const entitlement of entitlements) {
    const { error } = await uncheckedBillingTable(adminClient, 'plan_entitlements').upsert(
      {
        plan_id: planId,
        entitlement_key: entitlement.entitlementKey.trim(),
        limit_value: entitlement.limitValue,
        is_enabled: entitlement.isEnabled
      },
      { onConflict: 'plan_id,entitlement_key' }
    )

    if (error) {
      throw BillingError.internal('No se pudieron guardar los entitlements del plan.')
    }
  }
}

async function getPlatformTrialPolicy(adminClient: ReturnType<typeof asBillingClient>): Promise<{
  id: string
  scope: string
  tenant_id: string | null
  enabled: boolean
  duration_seconds: number
  starts_on: string
  max_sessions: number
  allow_guest: boolean
  allow_pdf: boolean
  allow_checkout: boolean
  updated_by: string | null
  updated_at: string
}> {
  const { data, error } = await resolveSingleRowQuery<{
    id: string
    scope: string
    tenant_id: string | null
    enabled: boolean
    duration_seconds: number
    starts_on: string
    max_sessions: number
    allow_guest: boolean
    allow_pdf: boolean
    allow_checkout: boolean
    updated_by: string | null
    updated_at: string
  }>(
    uncheckedBillingTable(adminClient, 'trial_policies')
      .select(TRIAL_POLICY_COLUMNS)
      .eq('scope', 'platform')
      .is('tenant_id', null)
      .maybeSingle()
  )

  if (error || !data) {
    throw BillingError.trialNotConfigured()
  }

  return data
}

export async function listAdminPlatformModules(): Promise<AdminPlatformModule[]> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  const { data, error } = await uncheckedBillingTable(adminClient, 'platform_modules')
    .select(PLATFORM_MODULE_COLUMNS)
    .order('display_order', { ascending: true })
    .order('module_key', { ascending: true })

  if (error) {
    throw BillingError.internal('No se pudo listar el catálogo de módulos de la plataforma.')
  }

  return (
    (data as Array<{
      module_key: string
      name: string
      description: string | null
      route_prefix: string
      is_active: boolean
      display_order: number
      created_at: string
      updated_at: string
    }> | null) ?? []
  ).map(mapPlatformModule)
}

export async function createAdminPlatformModule(input: UpsertPlatformModuleInput): Promise<AdminPlatformModule> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const moduleKey = input.moduleKey.trim().toLowerCase()
  const name = input.name.trim()
  const routePrefix = input.routePrefix.trim()

  if (!MODULE_KEY_PATTERN.test(moduleKey)) {
    throw BillingError.validation('La clave del módulo debe comenzar por una letra y solo contener caracteres seguros.')
  }

  if (!name || name.length > 128) {
    throw BillingError.validation('El nombre del módulo es obligatorio y no puede superar 128 caracteres.')
  }

  if (!routePrefix.startsWith('/') || routePrefix.length > 256) {
    throw BillingError.validation('La ruta del módulo debe comenzar por / y ser válida.')
  }

  const values = {
    module_key: moduleKey,
    name,
    description: input.description?.trim() || null,
    route_prefix: routePrefix,
    is_active: input.isActive ?? true,
    display_order: input.displayOrder ?? 0
  }

  const { data, error } = await uncheckedBillingTable(adminClient, 'platform_modules')
    .insert(values)
    .select(PLATFORM_MODULE_COLUMNS)
    .single()

  if (error || !data) {
    throw BillingError.platformModuleUpdateFailed()
  }

  const moduleRow = data as typeof values & {
    created_at: string
    updated_at: string
  }

  const { error: auditError } = await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.module_created',
    entity_type: 'platform_module',
    entity_id: null,
    metadata: { module_key: moduleRow.module_key },
    after_data: moduleRow as unknown as Record<string, unknown>
  })

  if (auditError) {
    throw BillingError.platformModuleUpdateFailed()
  }

  return mapPlatformModule(moduleRow)
}

export async function updateAdminPlatformModule(
  moduleKey: string,
  input: UpdatePlatformModuleInput
): Promise<AdminPlatformModule> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const normalizedModuleKey = moduleKey.trim().toLowerCase()

  if (!MODULE_KEY_PATTERN.test(normalizedModuleKey)) {
    throw BillingError.validation('La clave del módulo no es válida.')
  }

  const { data: before, error: beforeError } = await resolveSingleRowQuery<{
    module_key: string
    name: string
    description: string | null
    route_prefix: string
    is_active: boolean
    display_order: number
    created_at: string
    updated_at: string
  }>(
    uncheckedBillingTable(adminClient, 'platform_modules')
      .select(PLATFORM_MODULE_COLUMNS)
      .eq('module_key', normalizedModuleKey)
      .maybeSingle()
  )

  if (beforeError) {
    throw BillingError.platformModuleUpdateFailed()
  }

  if (!before) {
    throw BillingError.platformModuleNotFound()
  }

  const updatePayload: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()

    if (!name || name.length > 128) {
      throw BillingError.validation('El nombre del módulo es obligatorio y no puede superar 128 caracteres.')
    }

    updatePayload.name = name
  }

  if (input.description !== undefined) {
    updatePayload.description = input.description?.trim() || null
  }

  if (input.routePrefix !== undefined) {
    const routePrefix = input.routePrefix.trim()

    if (!routePrefix.startsWith('/') || routePrefix.length > 256) {
      throw BillingError.validation('La ruta del módulo debe comenzar por / y ser válida.')
    }

    updatePayload.route_prefix = routePrefix
  }

  if (input.isActive !== undefined) {
    updatePayload.is_active = input.isActive
  }

  if (input.displayOrder !== undefined) {
    if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) {
      throw BillingError.validation('El orden del módulo debe ser un entero no negativo.')
    }

    updatePayload.display_order = input.displayOrder
  }

  if (Object.keys(updatePayload).length === 0) {
    return mapPlatformModule(before)
  }

  const { data: after, error: updateError } = await resolveSingleRowQuery<typeof before>(
    uncheckedBillingTable(adminClient, 'platform_modules')
      .update(updatePayload)
      .eq('module_key', normalizedModuleKey)
      .select(PLATFORM_MODULE_COLUMNS)
      .single()
  )

  if (updateError || !after) {
    throw BillingError.platformModuleUpdateFailed()
  }

  const { error: auditError } = await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.module_updated',
    entity_type: 'platform_module',
    entity_id: null,
    metadata: { module_key: normalizedModuleKey },
    before_data: before as unknown as Record<string, unknown>,
    after_data: after as unknown as Record<string, unknown>
  })

  if (auditError) {
    throw BillingError.platformModuleUpdateFailed()
  }

  return mapPlatformModule(after)
}

export async function listAdminTrialPolicyEntitlements(): Promise<AdminTrialPolicyEntitlement[]> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const policy = await getPlatformTrialPolicy(adminClient)

  const { data, error } = await uncheckedBillingTable(adminClient, 'trial_policy_entitlements')
    .select(TRIAL_POLICY_ENTITLEMENT_COLUMNS)
    .eq('policy_id', policy.id)
    .order('entitlement_key', { ascending: true })

  if (error) {
    throw BillingError.internal('No se pudieron listar los entitlements de la política de prueba.')
  }

  return (
    (data as Array<{
      policy_id: string
      entitlement_key: string
      limit_value: number | null
      is_enabled: boolean
      created_at: string
      updated_at: string
    }> | null) ?? []
  ).map(mapTrialPolicyEntitlement)
}

export async function updateAdminTrialPolicyEntitlement(
  input: AdminTrialPolicyEntitlementInput
): Promise<AdminTrialPolicyEntitlement> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const entitlementKey = validateEntitlementInput(input)
  const policy = await getPlatformTrialPolicy(adminClient)

  if (entitlementKey.startsWith('modules.')) {
    const moduleKey = entitlementKey.slice('modules.'.length)

    const { data: module, error: moduleError } = await resolveSingleRowQuery<{ module_key: string }>(
      uncheckedBillingTable(adminClient, 'platform_modules')
        .select('module_key')
        .eq('module_key', moduleKey)
        .eq('is_active', true)
        .maybeSingle()
    )

    if (moduleError) {
      throw BillingError.trialEntitlementUpdateFailed()
    }

    if (!module) {
      throw BillingError.validation('El módulo del entitlement debe existir y estar activo.')
    }
  }

  const { data: before, error: beforeError } = await resolveSingleRowQuery<{
    policy_id: string
    entitlement_key: string
    limit_value: number | null
    is_enabled: boolean
    created_at: string
    updated_at: string
  }>(
    uncheckedBillingTable(adminClient, 'trial_policy_entitlements')
      .select(TRIAL_POLICY_ENTITLEMENT_COLUMNS)
      .eq('policy_id', policy.id)
      .eq('entitlement_key', entitlementKey)
      .maybeSingle()
  )

  if (beforeError) {
    throw BillingError.trialEntitlementUpdateFailed()
  }

  const values = {
    policy_id: policy.id,
    entitlement_key: entitlementKey,
    limit_value: input.limitValue,
    is_enabled: input.isEnabled
  }

  const { data: after, error: saveError } = await resolveSingleRowQuery<
    typeof values & {
      created_at: string
      updated_at: string
    }
  >(
    uncheckedBillingTable(adminClient, 'trial_policy_entitlements')
      .upsert(values, { onConflict: 'policy_id,entitlement_key' })
      .select(TRIAL_POLICY_ENTITLEMENT_COLUMNS)
      .single()
  )

  if (saveError || !after) {
    throw BillingError.trialEntitlementUpdateFailed()
  }

  const { error: auditError } = await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.trial_entitlement_updated',
    entity_type: 'trial_policy_entitlement',
    entity_id: `${policy.id}:${entitlementKey}`,
    before_data: before as unknown as Record<string, unknown> | null,
    after_data: after as unknown as Record<string, unknown>
  })

  if (auditError) {
    throw BillingError.trialEntitlementUpdateFailed()
  }

  return mapTrialPolicyEntitlement(after)
}

async function requireActiveAdminTenant(
  adminClient: ReturnType<typeof asBillingClient>,
  tenantId: string
): Promise<{ id: string; name: string }> {
  const { data, error } = await resolveSingleRowQuery<{ id: string; name: string; status: string }>(
    uncheckedBillingTable(adminClient, 'tenants').select('id, name, status').eq('id', tenantId).maybeSingle()
  )

  if (error) {
    throw BillingError.internal('No se pudo verificar el tenant de administración.')
  }

  if (!data || data.status !== 'active') {
    throw BillingError.tenantNotFound()
  }

  return { id: data.id, name: data.name }
}

function toAdminTenantEntitlement(
  tenant: { id: string; name: string },
  plan: Pick<PlanRow, 'id' | 'code' | 'name'>,
  base: PlanEntitlementRow,
  override: TenantPlanOverrideRow | null
): AdminTenantEntitlement {
  const hasOverride = override !== null

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    entitlementKey: base.entitlement_key,
    baseLimitValue: base.limit_value,
    baseIsEnabled: base.is_enabled,
    overrideId: override?.id ?? null,
    overrideLimitValue: override?.limit_value ?? null,
    overrideIsEnabled: override?.is_enabled ?? null,
    overrideUpdatedAt: override?.updated_at ?? null,
    effectiveLimitValue: hasOverride ? override.limit_value : base.limit_value,
    effectiveIsEnabled: hasOverride ? override.is_enabled : base.is_enabled
  }
}

export async function listAdminTenantEntitlements(tenantId: string): Promise<AdminTenantEntitlement[]> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const tenant = await requireActiveAdminTenant(adminClient, tenantId)

  const { data: plansData, error: plansError } = await uncheckedBillingTable(adminClient, 'plans')
    .select('id, code, name')
    .order('display_order', { ascending: true })

  if (plansError) {
    throw BillingError.internal('No se pudieron listar los planes para sus entitlements.')
  }

  const plans = (plansData as Array<Pick<PlanRow, 'id' | 'code' | 'name'>> | null) ?? []
  const planIds = plans.map(plan => plan.id)

  const [baseRows, overrideRows] = await Promise.all([
    listPlanEntitlementRows(adminClient, planIds),
    listTenantPlanOverrideRows(adminClient, tenantId, planIds)
  ])

  const planById = new Map(plans.map(plan => [plan.id, plan]))

  const overridesByKey = new Map(
    overrideRows.map(override => [`${override.plan_id}:${override.entitlement_key}`, override] as const)
  )

  return baseRows.flatMap(base => {
    const plan = planById.get(base.plan_id)

    if (!plan) {
      return []
    }

    return [
      toAdminTenantEntitlement(
        tenant,
        plan,
        base,
        overridesByKey.get(`${base.plan_id}:${base.entitlement_key}`) ?? null
      )
    ]
  })
}

export async function updateAdminTenantEntitlement(
  tenantId: string,
  planId: string,
  input: AdminPlanEntitlementInput
): Promise<AdminTenantEntitlement> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())
  const tenant = await requireActiveAdminTenant(adminClient, tenantId)

  if (input.limitValue !== null && (!Number.isInteger(input.limitValue) || input.limitValue < 0)) {
    throw BillingError.validation('El límite del entitlement debe ser un entero no negativo o null.')
  }

  const { data: plan, error: planError } = await resolveSingleRowQuery<Pick<PlanRow, 'id' | 'code' | 'name'>>(
    uncheckedBillingTable(adminClient, 'plans').select('id, code, name').eq('id', planId).maybeSingle()
  )

  if (planError) {
    throw BillingError.internal('No se pudo verificar el plan del entitlement.')
  }

  if (!plan) {
    throw BillingError.planNotFound()
  }

  const { data: base, error: baseError } = await resolveSingleRowQuery<PlanEntitlementRow>(
    uncheckedBillingTable(adminClient, 'plan_entitlements')
      .select(ADMIN_ENTITLEMENT_COLUMNS)
      .eq('plan_id', planId)
      .eq('entitlement_key', input.entitlementKey)
      .maybeSingle()
  )

  if (baseError) {
    throw BillingError.internal('No se pudo verificar el entitlement del plan.')
  }

  if (!base) {
    throw BillingError.entitlementNotFound()
  }

  const { data: before, error: beforeError } = await resolveSingleRowQuery<TenantPlanOverrideRow>(
    uncheckedBillingTable(adminClient, 'tenant_plan_overrides')
      .select(ADMIN_OVERRIDE_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('plan_id', planId)
      .eq('entitlement_key', input.entitlementKey)
      .maybeSingle()
  )

  if (beforeError) {
    throw BillingError.entitlementUpdateFailed()
  }

  const values = {
    tenant_id: tenantId,
    plan_id: planId,
    entitlement_key: input.entitlementKey,
    limit_value: input.limitValue,
    is_enabled: input.isEnabled,
    created_by: principal.userId,
    updated_by: principal.userId
  }

  const savedQuery = before
    ? uncheckedBillingTable(adminClient, 'tenant_plan_overrides')
        .update({
          limit_value: values.limit_value,
          is_enabled: values.is_enabled,
          updated_by: values.updated_by
        })
        .eq('id', before.id)
        .select(ADMIN_OVERRIDE_COLUMNS)
        .single()
    : uncheckedBillingTable(adminClient, 'tenant_plan_overrides').insert(values).select(ADMIN_OVERRIDE_COLUMNS).single()

  const { data: after, error: saveError } = await resolveSingleRowQuery<TenantPlanOverrideRow>(savedQuery)

  if (saveError || !after) {
    throw BillingError.entitlementUpdateFailed()
  }

  const { error: auditError } = await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: tenantId,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.entitlement_override_updated',
    entity_type: 'tenant_plan_override',
    entity_id: after.id,
    before_data: before as unknown as Record<string, unknown> | null,
    after_data: after as unknown as Record<string, unknown>,
    metadata: {
      planId,
      planCode: plan.code,
      entitlementKey: input.entitlementKey
    }
  })

  if (auditError) {
    throw BillingError.entitlementUpdateFailed()
  }

  return toAdminTenantEntitlement(tenant, plan, base, after)
}

export async function listAdminBillingInvoices(tenantId?: string, limit = 100): Promise<AdminBillingInvoice[]> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  if (tenantId) {
    await requireActiveAdminTenant(adminClient, tenantId)
  }

  let invoiceQuery = uncheckedBillingTable(adminClient, 'billing_invoices').select(ADMIN_INVOICE_COLUMNS)

  if (tenantId) {
    invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
  }

  const { data: invoiceData, error: invoiceError } = await invoiceQuery
    .order('issued_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (invoiceError) {
    throw BillingError.invoicesListFailed()
  }

  const invoices = (invoiceData as BillingInvoiceRow[] | null) ?? []
  const tenantIds = Array.from(new Set(invoices.flatMap(invoice => (invoice.tenant_id ? [invoice.tenant_id] : []))))
  const tenantNames = new Map<string, string>()

  if (tenantIds.length > 0) {
    const { data: tenantData, error: tenantError } = await uncheckedBillingTable(adminClient, 'tenants')
      .select('id, name')
      .in('id', tenantIds)

    if (tenantError) {
      throw BillingError.invoicesListFailed()
    }

    for (const tenant of (tenantData as Array<{ id: string; name: string }> | null) ?? []) {
      tenantNames.set(tenant.id, tenant.name)
    }
  }

  return invoices.map(invoice => ({
    id: invoice.id,
    tenantId: invoice.tenant_id,
    tenantName: invoice.tenant_id ? (tenantNames.get(invoice.tenant_id) ?? null) : null,
    providerInvoiceId: invoice.provider_invoice_id,
    status: invoice.status,
    number: invoice.number,
    amountMinor: invoice.amount_minor,
    taxAmountMinor: invoice.tax_amount_minor,
    currency: invoice.currency,
    issuedAt: invoice.issued_at,
    paidAt: invoice.paid_at,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  }))
}

export async function listAdminPlans(): Promise<AdminPlanSummary[]> {
  await requirePlatformCapability('billing.plans.manage' as PlatformCapabilityKey)
  const client = asBillingClient(createSupabaseAdminClient())

  const { data: planData, error: plansError } = await client
    .from('plans')
    .select('*')
    .order('amount_minor', { ascending: true })

  if (plansError) {
    throw BillingError.internal('No se pudieron listar los planes de administración.')
  }

  const planRows = (planData as unknown as PlanRow[]) ?? []
  const planIds = planRows.map(p => p.id)

  const { data: entData } =
    planIds.length > 0 ? await client.from('plan_entitlements').select('*').in('plan_id', planIds) : { data: [] }

  const entitlementRows = (entData as unknown as PlanEntitlementRow[]) ?? []

  const featuresByPlan = new Map<string, string[]>()
  const limitsByPlan = new Map<string, Record<string, number | null>>()

  for (const ent of entitlementRows) {
    if (ent.is_enabled) {
      const featList = featuresByPlan.get(ent.plan_id) ?? []

      featList.push(`${ent.entitlement_key}: ${ent.limit_value ?? 'unlimited'}`)
      featuresByPlan.set(ent.plan_id, featList)

      const limMap = limitsByPlan.get(ent.plan_id) ?? {}

      limMap[ent.entitlement_key] = ent.limit_value
      limitsByPlan.set(ent.plan_id, limMap)
    }
  }

  const entitlementsByPlan = new Map<string, AdminPlanEntitlement[]>()

  for (const entitlement of entitlementRows) {
    const planEntitlements = entitlementsByPlan.get(entitlement.plan_id) ?? []

    planEntitlements.push({
      planId: entitlement.plan_id,
      entitlementKey: entitlement.entitlement_key,
      limitValue: entitlement.limit_value,
      isEnabled: entitlement.is_enabled
    })
    entitlementsByPlan.set(entitlement.plan_id, planEntitlements)
  }

  return planRows.map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    providerPriceId: p.provider_price_id,
    currency: p.currency,
    interval: p.interval as BillingInterval,
    durationSeconds: p.duration_seconds ?? null,
    amountMinor: p.amount_minor,
    isActive: p.is_active,
    isPublic: p.is_public ?? true,
    contactSales: p.contact_sales ?? false,
    displayOrder: p.display_order ?? 0,
    features: featuresByPlan.get(p.id) ?? [],
    limits: limitsByPlan.get(p.id) ?? {},
    entitlements: entitlementsByPlan.get(p.id) ?? []
  }))
}

export async function createAdminPlan(input: CreatePlanInput): Promise<BillingPlan> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('billing.plans.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  if (input.entitlements && input.entitlements.length > 0) {
    await validatePlanEntitlements(adminClient, input.entitlements)
  }

  const newPlanPayload = {
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    provider_product_id: null,
    provider_price_id: input.providerPriceId ?? null,
    currency: input.currency,
    interval: input.interval,
    duration_seconds: input.interval === 'one_time' || input.interval === 'free' ? (input.durationSeconds ?? null) : null,
    amount_minor: input.amountMinor,
    is_active: input.isActive ?? true,
    is_public: input.isPublic ?? true,
    contact_sales: input.contactSales ?? false,
    display_order: input.displayOrder ?? 0
  }

  const { data: newPlanData, error: insertError } = await uncheckedBillingTable(adminClient, 'plans')
    .insert(newPlanPayload)
    .select()
    .single()

  if (insertError || !newPlanData) {
    throw BillingError.internal('No se pudo crear el plan comercial.')
  }

  const newPlan = newPlanData as PlanRow

  if (input.entitlements !== undefined && input.entitlements.length > 0) {
    await replaceAdminPlanEntitlements(adminClient, newPlan.id, input.entitlements)
  }

  await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.plan_created',
    entity_type: 'plan',
    entity_id: newPlan.id,
    after_data: newPlan as unknown as Record<string, unknown>
  })

  return {
    id: newPlan.id,
    code: newPlan.code,
    name: newPlan.name,
    description: newPlan.description,
    providerPriceId: newPlan.provider_price_id,
    currency: newPlan.currency,
    interval: newPlan.interval as BillingInterval,
    durationSeconds: newPlan.duration_seconds ?? null,
    amountMinor: newPlan.amount_minor,
    isActive: newPlan.is_active,
    isPublic: newPlan.is_public ?? true,
    contactSales: newPlan.contact_sales ?? false,
    features: [],
    limits: {}
  }
}

export async function updateAdminPlan(planId: string, input: UpdatePlanInput): Promise<BillingPlan> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('billing.plans.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  if (input.entitlements && input.entitlements.length > 0) {
    await validatePlanEntitlements(adminClient, input.entitlements)
  }

  const updatePayload: Record<string, unknown> = {}

  if (input.name !== undefined) updatePayload.name = input.name
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.providerPriceId !== undefined) updatePayload.provider_price_id = input.providerPriceId
  if (input.currency !== undefined) updatePayload.currency = input.currency
  if (input.interval !== undefined) updatePayload.interval = input.interval
  if (input.durationSeconds !== undefined) updatePayload.duration_seconds = input.durationSeconds
  if (input.amountMinor !== undefined) updatePayload.amount_minor = input.amountMinor
  if (input.isActive !== undefined) updatePayload.is_active = input.isActive
  if (input.isPublic !== undefined) updatePayload.is_public = input.isPublic
  if (input.contactSales !== undefined) updatePayload.contact_sales = input.contactSales
  if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder
  updatePayload.updated_at = new Date().toISOString()

  const { data: updatedPlanData, error: updateError } = await uncheckedBillingTable(adminClient, 'plans')
    .update(updatePayload)
    .eq('id', planId)
    .select()
    .single()

  if (updateError || !updatedPlanData) {
    throw BillingError.internal('No se pudo actualizar el plan comercial.')
  }

  const updatedPlan = updatedPlanData as PlanRow

  if (input.entitlements !== undefined) {
    await replaceAdminPlanEntitlements(adminClient, planId, input.entitlements)
  }

  await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.plan_updated',
    entity_type: 'plan',
    entity_id: planId,
    after_data: updatedPlan as unknown as Record<string, unknown>
  })

  return {
    id: updatedPlan.id,
    code: updatedPlan.code,
    name: updatedPlan.name,
    description: updatedPlan.description,
    providerPriceId: updatedPlan.provider_price_id,
    currency: updatedPlan.currency,
    interval: updatedPlan.interval as BillingInterval,
    durationSeconds: updatedPlan.duration_seconds ?? null,
    amountMinor: updatedPlan.amount_minor,
    isActive: updatedPlan.is_active,
    isPublic: updatedPlan.is_public ?? true,
    contactSales: updatedPlan.contact_sales ?? false,
    features: [],
    limits: {}
  }
}

export async function getAdminTrialPolicy(): Promise<AdminTrialPolicy> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const row = await getPlatformTrialPolicy(asBillingClient(createSupabaseAdminClient()))

  return {
    id: row.id,
    scope: row.scope as 'platform' | 'tenant',
    enabled: row.enabled,
    durationSeconds: row.duration_seconds,
    startsOn: row.starts_on as 'first_access' | 'first_action',
    maxSessions: row.max_sessions,
    allowGuest: row.allow_guest,
    allowPdf: row.allow_pdf,
    allowCheckout: row.allow_checkout,
    updatedAt: row.updated_at
  }
}

export async function updateAdminTrialPolicy(input: UpdateTrialPolicyInput): Promise<AdminTrialPolicy> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  const updatePayload: Record<string, unknown> = {}

  if (input.enabled !== undefined) updatePayload.enabled = input.enabled
  if (input.durationSeconds !== undefined) updatePayload.duration_seconds = input.durationSeconds
  if (input.startsOn !== undefined) updatePayload.starts_on = input.startsOn
  if (input.maxSessions !== undefined) updatePayload.max_sessions = input.maxSessions
  if (input.allowGuest !== undefined) updatePayload.allow_guest = input.allowGuest
  if (input.allowPdf !== undefined) updatePayload.allow_pdf = input.allowPdf
  if (input.allowCheckout !== undefined) updatePayload.allow_checkout = input.allowCheckout
  updatePayload.updated_by = principal.userId
  updatePayload.updated_at = new Date().toISOString()

  const { data, error } = await uncheckedBillingTable(adminClient, 'trial_policies')
    .update(updatePayload)
    .eq('scope', 'platform')
    .is('tenant_id', null)
    .select()
    .maybeSingle()

  if (error || !data) {
    throw BillingError.internal('No se pudo actualizar la política de prueba global.')
  }

  const row = data as unknown as {
    id: string
    scope: string
    enabled: boolean
    duration_seconds: number
    starts_on: string
    max_sessions: number
    allow_guest: boolean
    allow_pdf: boolean
    allow_checkout: boolean
    updated_at: string | null
  }

  await uncheckedBillingTable(adminClient, 'audit_logs').insert({
    tenant_id: null,
    actor_user_id: principal.userId,
    source: 'admin',
    action: 'platform.billing.trial_policy_updated',
    entity_type: 'trial_policy',
    entity_id: row.id,
    after_data: row as unknown as Record<string, unknown>
  })

  return {
    id: row.id,
    scope: row.scope as 'platform' | 'tenant',
    enabled: row.enabled,
    durationSeconds: row.duration_seconds,
    startsOn: row.starts_on as 'first_access' | 'first_action',
    maxSessions: row.max_sessions,
    allowGuest: row.allow_guest,
    allowPdf: row.allow_pdf,
    allowCheckout: row.allow_checkout,
    updatedAt: row.updated_at
  }
}

export async function listAdminSubscriptions(): Promise<AdminSubscriptionSummary[]> {
  await requirePlatformCapability('platform.billing.manage' as PlatformCapabilityKey)
  const adminClient = asBillingClient(createSupabaseAdminClient())

  const { data: subs, error } = await adminClient
    .from('subscriptions')
    .select('*, tenants(name), plans(code, name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw BillingError.internal('No se pudieron listar las suscripciones de plataforma.')
  }

  return ((subs as unknown as Array<Record<string, unknown>>) ?? []).map(s => {
    const tenantObj = s.tenants as { name?: string } | null
    const planObj = s.plans as { code?: string; name?: string } | null

    return {
      id: String(s.id),
      tenantId: String(s.tenant_id),
      tenantName: tenantObj?.name ?? 'Tenant ' + String(s.tenant_id).slice(0, 8),
      planCode: planObj?.code ?? 'unknown',
      planName: planObj?.name ?? 'Plan ' + String(s.plan_id).slice(0, 8),
      providerCustomerId: String(s.provider_customer_id),
      providerSubscriptionId: String(s.provider_subscription_id),
      status: String(s.status),
      currentPeriodStart: s.current_period_start ? String(s.current_period_start) : null,
      currentPeriodEnd: s.current_period_end ? String(s.current_period_end) : null,
      cancelAtPeriodEnd: Boolean(s.cancel_at_period_end),
      createdAt: String(s.created_at)
    }
  })
}

export async function listAdminBillingAuditLogs(): Promise<AdminBillingAuditLog[]> {
  await requirePlatformCapability('platform.audit.read' as PlatformCapabilityKey)
  const adminClient = createSupabaseAdminClient()

  const { data: logs, error } = await adminClient
    .from('audit_logs')
    .select('*')
    .or('action.ilike.billing.%,action.ilike.platform.billing.%')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw BillingError.internal('No se pudo listar la auditoría de billing.')
  }

  return ((logs as unknown as Array<Record<string, unknown>>) ?? []).map(l => ({
    id: String(l.id),
    tenantId: l.tenant_id ? String(l.tenant_id) : null,
    actorUserId: l.actor_user_id ? String(l.actor_user_id) : null,
    source: String(l.source),
    action: String(l.action),
    entityType: String(l.entity_type),
    entityId: l.entity_id ? String(l.entity_id) : null,
    metadata: (l.metadata as Record<string, unknown>) ?? null,
    createdAt: String(l.created_at)
  }))
}
