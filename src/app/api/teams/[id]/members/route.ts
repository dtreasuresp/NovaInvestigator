// GET / POST / PATCH / DELETE /api/teams/[id]/members
//
// Manages members and roles within a specific team.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'lead']).default('member')
})

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'lead'])
})

async function getTeamAndAuth(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, teamId: string) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw AuthError.authRequired()
  }

  const { data: profile } = await supabase.from('profiles').select('primary_tenant_id').eq('id', user.id).maybeSingle()

  if (!profile?.primary_tenant_id) {
    throw AuthError.primaryTenantUnavailable()
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, tenant_id, workspace_id, created_by')
    .eq('id', teamId)
    .eq('tenant_id', profile.primary_tenant_id)
    .maybeSingle()

  if (teamError || !team) {
    throw AuthError.validation('El equipo especificado no existe o no tienes acceso.')
  }

  return { user, tenantId: profile.primary_tenant_id, team }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { tenantId } = await getTeamAndAuth(supabase, teamId)

    // 1. Fetch team members with profile and membership info
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, created_at')
      .eq('team_id', teamId)

    if (membersError) {
      logger.error('Failed to fetch team members', {
        action: 'api.teams.members.list',
        details: { teamId, error: membersError.message }
      })
      throw AuthError.internal('No se pudieron consultar los miembros del equipo.')
    }

    const userIds = (members || []).map(m => m.user_id)

    // 2. Fetch profiles for user details
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] }

    // 3. Fetch tenant memberships for organizational role
    const { data: memberships } = userIds.length > 0
      ? await supabase
          .from('memberships')
          .select('user_id, roles(key, name)')
          .eq('tenant_id', tenantId)
          .in('user_id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const membershipMap = new Map((memberships || []).map(m => [m.user_id, m]))

    const items = (members || []).map(m => {
      const prof = profileMap.get(m.user_id)
      const mem = membershipMap.get(m.user_id) as { user_id: string; roles?: { key: string; name: string } | null } | undefined
      return {
        userId: m.user_id,
        displayName: prof?.display_name || 'Usuario',
        avatarUrl: prof?.avatar_url || null,
        tenantRole: mem?.roles?.name || mem?.roles?.key || 'Miembro',
        teamRole: m.role as 'admin' | 'member' | 'lead',
        joinedAt: m.created_at
      }
    })

    // 4. Also fetch available tenant members not yet in this team
    const { data: allTenantMembers } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    const availableUserIds = (allTenantMembers || [])
      .map(m => m.user_id)
      .filter(uid => !userIds.includes(uid))

    const { data: availableProfiles } = availableUserIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', availableUserIds)
      : { data: [] }

    const availableMembers = (availableProfiles || []).map(p => ({
      userId: p.id,
      displayName: p.display_name || 'Usuario',
      avatarUrl: p.avatar_url || null
    }))

    return NextResponse.json({ ok: true, items, availableMembers })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { tenantId } = await getTeamAndAuth(supabase, teamId)
    const body = parseWithSchema(addMemberSchema, await readJsonBody(request))

    // Verify user belongs to active tenant
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', body.userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      throw AuthError.validation('El usuario no pertenece a esta organización o su membresía no está activa.')
    }

    // Insert into team_members (upsert)
    const { error: insertError } = await supabase
      .from('team_members')
      .upsert(
        {
          team_id: teamId,
          user_id: body.userId,
          role: body.role
        },
        { onConflict: 'team_id,user_id' }
      )

    if (insertError) {
      logger.error('Failed to add team member', {
        action: 'api.teams.members.add',
        details: { teamId, userId: body.userId, error: insertError.message }
      })
      throw AuthError.internal('No se pudo añadir el miembro al equipo.')
    }

    return NextResponse.json({ ok: true, message: 'Miembro añadido al equipo con éxito.' })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    await getTeamAndAuth(supabase, teamId)
    const body = parseWithSchema(updateRoleSchema, await readJsonBody(request))

    const { error: updateError } = await supabase
      .from('team_members')
      .update({ role: body.role })
      .eq('team_id', teamId)
      .eq('user_id', body.userId)

    if (updateError) {
      throw AuthError.internal('No se pudo actualizar el rol del miembro.')
    }

    return NextResponse.json({ ok: true, message: 'Rol de miembro actualizado con éxito.' })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    await getTeamAndAuth(supabase, teamId)

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      throw AuthError.validation('Se requiere el userId para remover al miembro del equipo.')
    }

    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (deleteError) {
      throw AuthError.internal('No se pudo remover el miembro del equipo.')
    }

    return NextResponse.json({ ok: true, message: 'Miembro removido del equipo con éxito.' })
  } catch (error) {
    return handleRouteError(error)
  }
}
