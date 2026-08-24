import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

import {
  adminBillingEntitlementRequestSchema,
  adminBillingInvoicesQuerySchema,
  adminBillingTenantQuerySchema,
  adminPlatformModuleCreateSchema,
  adminTrialPolicyEntitlementSchema
} from '@/features/billing/schema'

const read = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('administración billing tenant-scoped', () => {
  it('requires an explicit tenant for entitlement reads and writes', () => {
    assert.deepEqual(adminBillingTenantQuerySchema.parse({ tenantId: '11111111-1111-4111-8111-111111111111' }), {
      tenantId: '11111111-1111-4111-8111-111111111111'
    })
    assert.throws(() => adminBillingTenantQuerySchema.parse({}), /tenantId/)
  })

  it('validates effective entitlement overrides and preserves null as unlimited', () => {
    assert.deepEqual(
      adminBillingEntitlementRequestSchema.parse({
        entitlementKey: 'investigations.max_active',
        limitValue: null,
        isEnabled: true
      }),
      {
        entitlementKey: 'investigations.max_active',
        limitValue: null,
        isEnabled: true
      }
    )
    assert.throws(
      () =>
        adminBillingEntitlementRequestSchema.parse({
          entitlementKey: 'Investigation Limit',
          limitValue: -1,
          isEnabled: true
        }),
      /entitlementKey|limitValue/
    )
  })

  it('bounds administrative invoice reads and allows an optional tenant filter', () => {
    assert.deepEqual(
      adminBillingInvoicesQuerySchema.parse({
        tenantId: '22222222-2222-4222-8222-222222222222',
        limit: '25'
      }),
      {
        tenantId: '22222222-2222-4222-8222-222222222222',
        limit: 25
      }
    )
    assert.throws(() => adminBillingInvoicesQuerySchema.parse({ limit: '101' }), /limit/)
  })
})

describe('administración billing implementation contract', () => {
  it('protects tenant overrides with platform capability, active tenant checks, and audit before/after data', () => {
    const service = read('src/features/billing/admin-service.ts')
    const route = read('src/app/api/admin/billing/entitlements/[planId]/route.ts')

    assert.match(service, /requirePlatformCapability\('platform\.billing\.manage'/)
    assert.match(service, /data\.status !== 'active'/)
    assert.match(service, /eq\('tenant_id', tenantId\)/)
    assert.match(service, /before_data: before/)
    assert.match(service, /after_data: after/)
    assert.match(service, /source: 'admin'/)
    assert.match(route, /parseQuery\(request, adminBillingTenantQuerySchema\)/)
    assert.match(route, /updateAdminTenantEntitlement\(tenantId, planId, body\)/)
  })

  it('keeps invoice administration read-only and tenant-filterable', () => {
    const service = read('src/features/billing/admin-service.ts')
    const route = read('src/app/api/admin/billing/invoices/route.ts')

    assert.match(service, /uncheckedBillingTable\(adminClient, 'billing_invoices'\)/)
    assert.match(service, /\.eq\('tenant_id', tenantId\)/)
    assert.doesNotMatch(service, /billing_invoices[\s\S]*\.delete\(/)
    assert.match(route, /listAdminBillingInvoices\(tenantId, limit\)/)
  })
})

describe('tenant entitlement override migration', () => {
  it('enforces RLS and blocks direct authenticated writes', () => {
    const migration = read('supabase/migrations/2026-08-10T03-00-00_tenant_plan_overrides.sql')

    assert.match(migration, /alter table public\.tenant_plan_overrides enable row level security/)
    assert.match(migration, /public\.has_capability\(auth\.uid\(\), tenant_id, 'billing\.entitlements\.read'\)/)
    assert.match(migration, /revoke insert, update, delete, truncate, references, trigger/)
    assert.match(migration, /grant all on public\.tenant_plan_overrides to service_role/)
  })

  it('treats a null effective limit as unlimited while keeping missing limits fail-closed', () => {
    const migration = read('supabase/migrations/2026-08-10T03-00-00_tenant_plan_overrides.sql')

    assert.match(migration, /if not found then[\s\S]*select false, 0, null::integer/)
    assert.match(migration, /if v_limit is null then[\s\S]*select true, 0, null::integer/)
  })
})

describe('platform module and trial entitlement administration', () => {
  it('validates module metadata and allowlisted trial entitlement namespaces', () => {
    assert.deepEqual(
      adminPlatformModuleCreateSchema.parse({
        moduleKey: 'investigator',
        name: 'Investigator',
        description: null,
        routePrefix: '/apps/investigator',
        isActive: true,
        displayOrder: 10
      }),
      {
        moduleKey: 'investigator',
        name: 'Investigator',
        description: null,
        routePrefix: '/apps/investigator',
        isActive: true,
        displayOrder: 10
      }
    )
    assert.deepEqual(
      adminTrialPolicyEntitlementSchema.parse({
        entitlementKey: 'modules.investigator',
        limitValue: null,
        isEnabled: true
      }),
      {
        entitlementKey: 'modules.investigator',
        limitValue: null,
        isEnabled: true
      }
    )
    assert.throws(
      () =>
        adminPlatformModuleCreateSchema.parse({
          moduleKey: 'Investigator',
          name: 'Investigator',
          routePrefix: 'apps/investigator'
        }),
      /moduleKey|routePrefix/
    )
  })

  it('hardens global trial entitlements and historical module access', () => {
    const migration = read('supabase/migrations/2026-08-13T03-00-00_harden_trial_entitlement_validation.sql')
    const accessService = read('src/features/access/access-service.ts')

    assert.match(migration, /v_key like 'platform\.%'/)
    assert.match(migration, /trial_platform_action_not_allowed/)
    assert.match(migration, /platform_modules_select_active_authenticated/)
    assert.match(migration, /module_row\.is_active/)
    assert.match(accessService, /listActivePlatformModuleKeys/)
    assert.match(accessService, /filterInactiveModuleEntitlements/)
  })
})
