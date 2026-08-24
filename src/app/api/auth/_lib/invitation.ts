import crypto from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

import { AuthError } from './http'

type AdminClient = SupabaseClient<Database>

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function assertPendingInvitation(
  admin: AdminClient,
  token: string,
  email: string
): Promise<{ tokenHash: string }> {
  const tokenHash = hashInvitationToken(token)
  const normalizedEmail = email.trim().toLowerCase()

  const { data: invitation, error } = await admin
    .from('invitations')
    .select('id, tenant_id, workspace_id, email, expires_at, accepted_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !invitation || invitation.email.toLowerCase() !== normalizedEmail) {
    throw AuthError.validation('La invitación no es válida o ha expirado.')
  }

  if (
    invitation.accepted_at ||
    invitation.revoked_at ||
    Date.parse(invitation.expires_at) <= Date.now()
  ) {
    throw AuthError.validation('La invitación no es válida o ha expirado.')
  }

  const [{ data: tenant, error: tenantError }, { data: workspace, error: workspaceError }] = await Promise.all([
    admin.from('tenants').select('id').eq('id', invitation.tenant_id).eq('status', 'active').maybeSingle(),
    admin
      .from('workspaces')
      .select('id')
      .eq('id', invitation.workspace_id)
      .eq('tenant_id', invitation.tenant_id)
      .eq('status', 'active')
      .maybeSingle()
  ])

  if (tenantError || workspaceError || !tenant || !workspace) {
    throw AuthError.validation('La invitación no es válida o ha expirado.')
  }

  return { tokenHash }
}
