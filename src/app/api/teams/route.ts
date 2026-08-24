// GET / POST /api/teams
//
// Manages teams within the active tenant and workspace.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([])
})

async function getActiveContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
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

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('tenant_id', profile.primary_tenant_id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return { user, tenantId: profile.primary_tenant_id, workspaceId: workspace?.id ?? null }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { tenantId } = await getActiveContext(supabase)

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, slug, avatar_url, description, tags, created_at, team_members(user_id, role)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (teamsError) {
      logger.error('Failed to fetch teams', {
        action: 'api.teams.list',
        details: { tenantId, error: teamsError.message }
      })
      throw AuthError.internal('No se pudieron consultar los equipos.')
    }

    const items = (teams || []).map(team => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      avatarUrl: team.avatar_url,
      description: team.description,
      tags: team.tags || [],
      memberCount: team.team_members?.length || 0,
      createdAt: team.created_at
    }))

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { user, tenantId, workspaceId } = await getActiveContext(supabase)
    const body = parseWithSchema(createTeamSchema, await readJsonBody(request))

    const slug = body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `team-${Date.now()}`

    const { data: newTeam, error: createError } = await supabase
      .from('teams')
      .insert({
        tenant_id: tenantId,
        workspace_id: workspaceId,
        name: body.name,
        slug,
        description: body.description ?? null,
        avatar_url: body.avatarUrl ?? null,
        tags: body.tags ?? [],
        created_by: user.id
      })
      .select('id, name, slug, avatar_url, description, tags, created_at')
      .single()

    if (createError || !newTeam) {
      logger.error('Failed to create team', {
        action: 'api.teams.create',
        details: { tenantId, error: createError?.message }
      })
      throw AuthError.internal('No se pudo crear el equipo.')
    }

    // Add creator as team admin/member
    await supabase.from('team_members').insert({
      team_id: newTeam.id,
      user_id: user.id,
      role: 'admin'
    })

    return NextResponse.json({ ok: true, team: newTeam }, { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
