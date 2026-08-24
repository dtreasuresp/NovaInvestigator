import { createSupabaseServerClient } from '@/lib/supabase/server'

import { requireAuthenticatedUser } from './access-service'
import { AuthenticationRequiredError, PrimaryTenantMembershipRequiredError } from './errors'
import type { PrimaryTenantOption, PrimaryTenantSelection } from './types'

type AuthenticatedPrincipal = Awaited<ReturnType<typeof requireAuthenticatedUser>>

async function listActiveTenantOptions(principal: AuthenticatedPrincipal): Promise<PrimaryTenantSelection> {
  const activeMemberships = principal.memberships.filter(membership => membership.status === 'active')

  if (activeMemberships.length === 0) {
    return {
      primaryTenantId: null,
      items: []
    }
  }

  const client = await createSupabaseServerClient()

  const { data, error } = await client
    .from('tenants')
    .select('id, name, slug, status')
    .in(
      'id',
      activeMemberships.map(membership => membership.tenantId)
    )
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  const items: PrimaryTenantOption[] = (data ?? []).map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug
  }))

  const activeTenantIds = new Set(items.map(item => item.id))

  return {
    primaryTenantId:
      principal.primaryTenantId && activeTenantIds.has(principal.primaryTenantId) ? principal.primaryTenantId : null,
    items
  }
}

export async function listPrimaryTenantOptions(): Promise<PrimaryTenantSelection> {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous) {
    throw new AuthenticationRequiredError()
  }

  return listActiveTenantOptions(principal)
}

export async function setPrimaryTenant(tenantId: string): Promise<PrimaryTenantSelection> {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous) {
    throw new AuthenticationRequiredError()
  }

  const membership = principal.memberships.find(item => item.tenantId === tenantId && item.status === 'active')

  if (!membership) {
    throw new PrimaryTenantMembershipRequiredError(tenantId)
  }

  const client = await createSupabaseServerClient()

  const { data, error } = await client.rpc('set_primary_tenant', {
    p_tenant_id: tenantId
  })

  if (error) {
    if (error.message.includes('primary_tenant_membership_required')) {
      throw new PrimaryTenantMembershipRequiredError(tenantId)
    }

    throw error
  }

  if (data !== tenantId) {
    throw new Error('The primary tenant selection was not persisted.')
  }

  return {
    ...(await listActiveTenantOptions(principal)),
    primaryTenantId: tenantId
  }
}
