// GET /api/user/account/summary
//
// Evaluates pre-deletion conditions for the authenticated user:
//   - Checks if user is the LAST OWNER of an active workspace or tenant.
//   - Evaluates active commercial access / paid subscription status.
//   - Summarizes stored data counts (memberships, workspaces).
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    // 1. Check if the user is the owner of any active tenant/workspace
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, tenant_id, role_id, status, roles!inner(key)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    let isLastOwner = false
    const ownedTenants: string[] = []

    if (memberships) {
      for (const m of memberships) {
        const roleObj = (Array.isArray(m.roles) ? m.roles[0] : m.roles) as { key?: string } | null
        const roleKey = roleObj?.key

        if (roleKey === 'owner') {
          ownedTenants.push(m.tenant_id)


          // Count active owners in this tenant
          const { count } = await supabase
            .from('memberships')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', m.tenant_id)
            .eq('role_id', m.role_id)
            .eq('status', 'active')

          if ((count ?? 0) <= 1) {
            isLastOwner = true
          }
        }
      }
    }

    // 2. Check active subscription status
    const { data: rawSubscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    const subscription = rawSubscription as { status: string; current_period_end: string | null } | null

    const hasActiveSubscription = !!subscription
    const subscriptionExpiresAt = subscription?.current_period_end ?? null

    // 3. Count stored workspaces & memberships
    const totalMemberships = memberships?.length ?? 0

    return NextResponse.json({
      ok: true,
      summary: {
        isLastOwner,
        ownedTenantsCount: ownedTenants.length,
        hasActiveSubscription,
        subscriptionExpiresAt,
        totalMemberships
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
