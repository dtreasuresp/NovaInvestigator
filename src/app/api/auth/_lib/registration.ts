import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import type { createSupabaseAdminClient } from '@/lib/supabase/admin'

import { AuthError } from './http'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type ServerClient = SupabaseClient<Database>

export function mapRegistrationCompletionError(error: { message?: string | null }): AuthError {
  const message = error.message ?? ''

  if (message.includes('pending_registration_not_found')) {
    return AuthError.accountSetupRequired()
  }

  if (message.includes('email_not_confirmed')) {
    return AuthError.emailNotConfirmed()
  }

  if (message.includes('account_not_active')) {
    return AuthError.accountSuspended()
  }

  if (message.includes('owner_role_not_configured') || message.includes('platform_trial_policy_not_configured')) {
    return AuthError.authServiceUnavailable()
  }

  return AuthError.internal('No se pudo completar la configuración inicial de la cuenta.')
}

export async function queuePendingRegistration(
  admin: AdminClient,
  userId: string,
  displayName: string,
  companyName: string | null
): Promise<void> {
  const normalizedDisplayName = displayName.trim()
  const normalizedCompanyName = companyName?.trim() || null

  if (!normalizedDisplayName || (companyName !== null && !normalizedCompanyName)) {
    throw AuthError.internal('No se pudo guardar la configuración inicial de la cuenta.')
  }

  const { error } = await admin.from('pending_registrations').upsert(
    {
      user_id: userId,
      display_name: normalizedDisplayName,
      company_name: normalizedCompanyName
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw AuthError.internal('No se pudo guardar la configuración inicial de la cuenta.')
  }
}

export async function completePendingRegistration(server: ServerClient, userId: string): Promise<string | null> {
  const { data, error } = await server.rpc('complete_pending_registration', {
    p_user_id: userId
  })

  if (error) {
    throw mapRegistrationCompletionError(error)
  }

  return data
}
