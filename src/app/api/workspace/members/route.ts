// GET /api/workspace/members
//
// Devuelve la lista de miembros activos del tenant/workspace actual para
// su uso en selectores de colaboración, co-autoría y asignación de permisos.
import { NextResponse } from 'next/server'

import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    // 1. Obtener el tenant primario del usuario autenticado
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    const tenantId = profile?.primary_tenant_id

    if (!tenantId) {
      throw AuthError.primaryTenantUnavailable()
    }

    // 2. Consultar membresías activas del tenant
    const { data: memberships, error: memError } = await supabase
      .from('memberships')
      .select('user_id, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (memError) {
      throw AuthError.internal('No se pudieron consultar las membresías del espacio de trabajo.')
    }

    const userIds = (memberships || []).map(m => m.user_id)

    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, members: [] })
    }

    // 3. Consultar perfiles de los miembros
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    if (profError) {
      throw AuthError.internal('No se pudieron consultar los perfiles de los miembros.')
    }

    const members = (profiles || []).map(p => ({
      userId: p.id,
      displayName: p.display_name || 'Miembro',
      avatarUrl: p.avatar_url || null
    }))

    return NextResponse.json({ ok: true, members })
  } catch (error) {
    return handleRouteError(error)
  }
}
