// DELETE /api/user/account
//
// Deletes/deactivates the authenticated user's account after enforcing
// LAST_OWNER_PROTECTED safeguards. Sets profiles.status = 'deleted' and
// terminates the active session via supabase.auth.signOut().
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    // Enforce Last Owner Protection check server-side
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, tenant_id, role_id, status, roles!inner(key)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (memberships) {
      for (const m of memberships) {
        const roleObj = (Array.isArray(m.roles) ? m.roles[0] : m.roles) as { key?: string } | null
        const roleKey = roleObj?.key

        if (roleKey === 'owner') {
          const { count } = await supabase
            .from('memberships')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', m.tenant_id)
            .eq('role_id', m.role_id)
            .eq('status', 'active')

          if ((count ?? 0) <= 1) {
            return NextResponse.json(
              {
                error: {
                  code: 'LAST_OWNER_PROTECTED',
                  messageKey: 'users.lastOwnerProtected',
                  message:
                    'No puedes eliminar tu cuenta porque eres el propietario único activo de un Workspace o Tenant. Transfiere la propiedad antes de proceder.'
                }
              },
              { status: 409 }
            )
          }
        }
      }
    }

    // 1. Soft-delete profile by setting status = 'deleted'
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      throw AuthError.internal('No se pudo desactivar el perfil del usuario.')
    }

    // 2. Sign out the user session
    await supabase.auth.signOut()

    return NextResponse.json({ ok: true, messageKey: 'auth.accountDeleted' })
  } catch (error) {
    return handleRouteError(error)
  }
}
