// GET / PATCH /api/workspace
//
// Reads and updates the active workspace for the authenticated user and current tenant.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/, 'Slug only allows lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(500).optional().nullable(),
  timezone: z.string().max(100).optional().nullable()
})

async function getActiveWorkspaceContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw AuthError.authRequired()
  }

  // 1. Get primary tenant
  const { data: profile } = await supabase.from('profiles').select('primary_tenant_id').eq('id', user.id).maybeSingle()

  const tenantId = profile?.primary_tenant_id

  if (!tenantId) {
    throw AuthError.primaryTenantUnavailable()
  }

  // 2. Get workspace associated with primary tenant
  let { data: workspace } = await supabase
    .from('workspaces')
    .select('id, tenant_id, name, slug, status, avatar_url, description, timezone')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // If no workspace exists yet for this tenant, create default one
  if (!workspace) {
    const { data: tenant } = await supabase.from('tenants').select('name, slug').eq('id', tenantId).maybeSingle()

    const defaultName = tenant?.name ? `${tenant.name} Workspace` : 'Principal Workspace'
    const defaultSlug = tenant?.slug ? `${tenant.slug}-workspace` : 'principal-workspace'

    const { data: newWorkspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        tenant_id: tenantId,
        name: defaultName,
        slug: defaultSlug,
        status: 'active',
        created_by: user.id
      })
      .select('id, tenant_id, name, slug, status, avatar_url, description, timezone')
      .single()

    if (createError || !newWorkspace) {
      logger.error('Failed to create default workspace for tenant', {
        action: 'api.workspace.create_default',
        details: { tenantId }
      })
      throw AuthError.internal('No se pudo inicializar el espacio de trabajo.')
    }

    workspace = newWorkspace
  }

  return { user, tenantId, workspace }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { workspace } = await getActiveWorkspaceContext(supabase)

    return NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.id,
        tenantId: workspace.tenant_id,
        name: workspace.name,
        slug: workspace.slug,
        avatarUrl: workspace.avatar_url,
        description: workspace.description,
        timezone: workspace.timezone ?? 'UTC',
        appId: workspace.id.slice(0, 8)
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { workspace } = await getActiveWorkspaceContext(supabase)
    const body = parseWithSchema(updateWorkspaceSchema, await readJsonBody(request))

    const updatePayload: {
      name?: string
      slug?: string
      description?: string | null
      timezone?: string | null
      updated_at: string
    } = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updatePayload.name = body.name
    if (body.slug !== undefined) updatePayload.slug = body.slug
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.timezone !== undefined) updatePayload.timezone = body.timezone

    const { error: updateError } = await supabase
      .from('workspaces')
      .update(updatePayload)
      .eq('id', workspace.id)

    if (updateError) {
      logger.error('Failed to update workspace', {
        action: 'api.workspace.update',
        details: { workspaceId: workspace.id, error: updateError.message }
      })
      throw AuthError.internal('No se pudieron guardar los cambios del espacio de trabajo.')
    }

    return NextResponse.json({
      ok: true,
      message: 'Workspace updated successfully.'
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
