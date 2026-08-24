// GET / PATCH / DELETE /api/teams/[id]
//
// Manages a single team.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateTeamSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional()
})

async function getTeamContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, teamId: string) {
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
    .select('id, name, slug, avatar_url, description, tags, tenant_id, workspace_id, created_by')
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
    const { team } = await getTeamContext(supabase, teamId)

    return NextResponse.json({ ok: true, team })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    await getTeamContext(supabase, teamId)
    const body = parseWithSchema(updateTeamSchema, await readJsonBody(request))

    const updatePayload: {
      updated_at: string
      name?: string
      slug?: string
      description?: string | null
      avatar_url?: string | null
      tags?: string[]
    } = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) {
      updatePayload.name = body.name
      updatePayload.slug =
        body.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `team-${Date.now()}`
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description
    }

    if (body.avatarUrl !== undefined) {
      updatePayload.avatar_url = body.avatarUrl
    }

    if (body.tags !== undefined) {
      updatePayload.tags = body.tags
    }

    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(updatePayload)
      .eq('id', teamId)
      .select('id, name, slug, avatar_url, description, tags, updated_at')
      .single()

    if (updateError || !updatedTeam) {
      logger.error('Failed to update team', {
        action: 'api.teams.update',
        details: { teamId, error: updateError?.message }
      })
      throw AuthError.internal('No se pudo actualizar el equipo.')
    }

    return NextResponse.json({ ok: true, team: updatedTeam })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
    const supabase = await createSupabaseServerClient()
    await getTeamContext(supabase, teamId)

    // Delete members first
    await supabase.from('team_members').delete().eq('team_id', teamId)

    // Delete team
    const { error: deleteError } = await supabase.from('teams').delete().eq('id', teamId)

    if (deleteError) {
      logger.error('Failed to delete team', {
        action: 'api.teams.delete',
        details: { teamId, error: deleteError.message }
      })
      throw AuthError.internal('No se pudo eliminar el equipo.')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
