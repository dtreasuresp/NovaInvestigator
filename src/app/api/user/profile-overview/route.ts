import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/features/access'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { asInvestigationsClient } from '@/lib/investigations/db-types'
import { asKanbanClient } from '@/features/kanban/db-types'
import type { InvestigationState } from '@/types/apps/investigator-types'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const principal = await requireAuthenticatedUser()
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    const tenantId = principal.primaryTenantId

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, locale, timezone, status, created_at')
      .eq('id', principal.userId)
      .maybeSingle()

    const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const displayName = profile?.display_name || (userMetadata.displayName as string) || principal.email?.split('@')[0] || 'Usuario'
    const parts = displayName.split(' ').filter(Boolean)
    const firstName = (userMetadata.firstName as string) || parts[0] || ''
    const lastName = (userMetadata.lastName as string) || parts.slice(1).join(' ') || ''
    const membershipRole = principal.memberships.find(m => m.tenantId === principal.primaryTenantId)?.roleKey
    const defaultInstitutionalRole = membershipRole === 'owner' ? 'Propietario' : membershipRole === 'admin' ? 'Administrador' : 'Miembro'
    const institutionalRole = (userMetadata.role as string) || defaultInstitutionalRole
    const country = (userMetadata.country as string) || profile?.locale || ''
    const mobile = (userMetadata.mobile as string) || ''
    const languages = (userMetadata.languages as string) || ''
    const skype = (userMetadata.skype as string) || ''

    // 2. Fetch Tenant Info
    let tenantName = ''
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .maybeSingle()

      if (tenant?.name) {
        tenantName = tenant.name
      }
    }

    // 3. Fetch Tenant Members (Connections)
    let connections: Array<{
      id: string
      name: string
      initials: string
      avatar: string | null
      role: string
      institutionalRole: string
      tags: { label: string }[]
      stats: { projects: string; tasks: string; connections: string }
      isConnected: boolean
      email: string
    }> = []

    let totalConnections = 0

    if (tenantId) {
      const { data: rawMembers } = await supabase
        .from('memberships')
        .select('user_id, role_id, status, created_at, profiles(id, display_name, avatar_url, email, status)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')

      const memberList = (rawMembers ?? []) as unknown as Array<{
        user_id: string
        role_id: string | null
        status: string
        created_at: string
        profiles: { id?: string; display_name?: string; avatar_url?: string; email?: string; status?: string } | null
      }>
      totalConnections = memberList.length

      connections = memberList.map(m => {
        const p = m.profiles || {}
        const mName = p.display_name || p.email?.split('@')[0] || 'Colega'
        const initials = mName
          .split(' ')
          .filter(Boolean)
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        const instRole = m.role_id === 'owner' ? 'Propietario' : m.role_id === 'admin' ? 'Administrador' : 'Miembro'

        return {
          id: m.user_id,
          name: mName,
          initials,
          avatar: p.avatar_url ?? null,
          role: m.role_id ?? 'member',
          institutionalRole: instRole,
          tags: [],
          stats: {
            projects: '0',
            tasks: '0',
            connections: `${totalConnections}`
          },
          isConnected: m.user_id !== principal.userId,
          email: p.email ?? ''
        }
      })
    }

    // 4. Fetch Workspaces (Teams)
    let teams: Array<{
      id: string
      name: string
      description: string
      initials: string
      avatar: string | null
      totalMembers: string
      memberAvatars: Array<{ name: string; avatar?: string; initials: string }>
      tags: { label: string }[]
      isFavorite: boolean
    }> = []

    if (tenantId) {
      const { data: rawTeams } = await supabase
        .from('teams')
        .select('id, name, slug, avatar_url, description, tags, created_at, team_members(user_id, role)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      const teamList = (rawTeams ?? []) as unknown as Array<{
        id: string
        name: string
        slug: string
        avatar_url: string | null
        description: string | null
        tags: string[] | null
        created_at: string
        team_members: Array<{ user_id: string; role: string }> | null
      }>

      // Gather all team member userIds to fetch their profiles
      const allTeamMemberUserIds = Array.from(
        new Set(teamList.flatMap(t => (t.team_members || []).map(m => m.user_id)))
      )

      const { data: teamProfiles } = allTeamMemberUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', allTeamMemberUserIds)
        : { data: [] }

      const profileMap = new Map((teamProfiles || []).map(p => [p.id, p]))

      teams = teamList.map(t => {
        const initials = t.name
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'EQ'

        const teamMems = t.team_members || []
        const memberAvatars = teamMems.map(m => {
          const prof = profileMap.get(m.user_id)
          const name = prof?.display_name || 'Miembro'
          const memInitials = name
            .split(' ')
            .filter(Boolean)
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'MB'
          return {
            name,
            avatar: prof?.avatar_url ?? undefined,
            initials: memInitials
          }
        })

        const teamTags = (t.tags || []).map(tag => ({ label: tag }))

        return {
          id: t.id,
          name: t.name,
          description: t.description || '',
          initials,
          avatar: t.avatar_url,
          totalMembers: `${teamMems.length} ${teamMems.length === 1 ? 'miembro' : 'miembros'}`,
          memberAvatars,
          tags: teamTags,
          isFavorite: false
        }
      })
    }

    // 5. Fetch Tasks & Projects from investigations & kanban
    let tasksCompiled = 0
    let totalTasksCount = 0

    if (tenantId) {
      const kanbanClient = asKanbanClient(supabase)
      const { data: doneCol } = await kanbanClient
        .from('kanban_columns')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', 'done')
        .maybeSingle()

      const { data: allTasks } = await kanbanClient
        .from('kanban_tasks')
        .select('id, column_id')
        .eq('tenant_id', tenantId)

      const typedTasks = (allTasks ?? []) as Array<{ id: string; column_id: string }>

      totalTasksCount = typedTasks.length
      tasksCompiled = doneCol ? typedTasks.filter(t => t.column_id === doneCol.id).length : 0
    }

    // 6. Fetch Investigations / Projects
    let projects: Array<{
      id: string
      name: string
      client: string
      logo: string
      budget: string
      efiScore: number
      efeScore: number
      startDate: string
      deadline: string
      description: string
      allHours: string
      daysLeft: string
      tasksCount: number
      totalTasks: number
      progressPercent: number
      teamMembers: Array<{ name: string; avatar?: string; initials: string }>
      commentsCount: number
      status: string
    }> = []

    if (tenantId) {
      const invClient = asInvestigationsClient(supabase)
      const { data: rawInvs } = await invClient
        .from('investigations')
        .select('id, title, state, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })

      const invList = (rawInvs ?? []) as Array<{
        id: string
        title: string | null
        state: unknown
        created_at: string
        updated_at: string
      }>

      projects = invList.map(inv => {
        const state = (inv.state ?? {}) as Partial<InvestigationState>
        const meta = state.metadata
        const rawState = (inv.state ?? {}) as Record<string, unknown>
        const efi = (rawState.efi ?? {}) as Record<string, unknown>
        const efe = (rawState.efe ?? {}) as Record<string, unknown>
        const came = state.cameActions ?? []

        const efiScore = Number(efi.total || efi.weightedScore || 0)
        const efeScore = Number(efe.total || efe.weightedScore || 0)
        const totalCame = Array.isArray(came) ? came.length : 0
        const doneCame = Array.isArray(came)
          ? came.filter(a => a.status === 'completada').length
          : 0
        const progress = totalCame > 0 ? Math.round((doneCame / totalCame) * 100) : 0

        return {
          id: inv.id,
          name: inv.title || meta?.organization || 'Investigación sin título',
          client: meta?.organization ? `Organización: ${meta.organization}` : (tenantName ? `Organización: ${tenantName}` : ''),
          logo: '/images/logos/investigator-logo.png',
          budget: efiScore > 0 || efeScore > 0 ? `EFI: ${efiScore.toFixed(2)} / EFE: ${efeScore.toFixed(2)}` : '',
          efiScore,
          efeScore,
          startDate: inv.created_at ? new Date(inv.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '',
          deadline: meta?.evaluationDate || '',
          description: meta?.problem || meta?.objective || '',
          allHours: '',
          daysLeft: '',
          tasksCount: doneCame,
          totalTasks: totalCame,
          progressPercent: progress,
          teamMembers: connections.slice(0, 3).map(c => ({ name: c.name, avatar: c.avatar ?? undefined, initials: c.initials })),
          commentsCount: 0,
          status: meta?.status || 'active'
        }
      })
    }

    // 7. Fetch Activity Timeline from audit_logs
    let timeline: Array<{
      id: string | number
      description: string
      timestamp: string
      detail?: string
      attachment?: { name: string; fileType: 'pdf' | 'image' | 'doc' | 'excel' }
      person?: { name: string; initials: string; avatar?: string; role?: string }
      teamMembers?: Array<{ name: string; initials: string; avatar?: string }>
      teamExtraCount?: number
    }> = []

    if (tenantId) {
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, created_at, actor_user_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (logs && logs.length > 0) {
        timeline = logs.map(l => {
          const date = new Date(l.created_at)
          const timeAgo = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

          return {
            id: l.id,
            description: `Operación: ${l.action}`,
            timestamp: timeAgo,
            detail: `Entidad ${l.entity_type} procesada en el tenant.`,
            attachment: l.action.includes('export') || l.action.includes('pdf')
              ? { name: 'informe_metodologico.pdf', fileType: 'pdf' }
              : undefined
          }
        })
      }
    }

    return NextResponse.json({
      ok: true,
      profile: {
        id: principal.userId,
        email: principal.email,
        displayName,
        firstName,
        lastName,
        avatarUrl: profile?.avatar_url ?? null,
        mobile,
        country,
        languages,
        skype,
        role: principal.memberships.find(m => m.tenantId === principal.primaryTenantId)?.roleKey || 'member',
        institutionalRole,
        status: profile?.status || 'active',
        createdAt: profile?.created_at || user.created_at,
        tenantName
      },
      metrics: {
        tasksCompiled,
        totalConnections,
        projectsCompiled: projects.length
      },
      timeline,
      connections,
      teams,
      projects
    })
  } catch (error) {
    logger.error('Error fetching profile overview', { details: { error: error instanceof Error ? error.message : String(error) } })
    return handleRouteError(error)
  }
}
