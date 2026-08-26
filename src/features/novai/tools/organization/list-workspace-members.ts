import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const listWorkspaceMembersSchema = z.object({})

export type ListWorkspaceMembersInput = z.infer<typeof listWorkspaceMembersSchema>

export async function executeListWorkspaceMembers(
  _args: ListWorkspaceMembersInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const generalClient = principal.client as unknown as {
      from: (table: string) => any
    }

    const { data: teams } = await generalClient
      .from('teams')
      .select('id, name, slug, description, created_at')
      .eq('tenant_id', principal.tenantId)

    const { data: members } = await generalClient
      .from('memberships')
      .select('user_id, role, status, created_at')
      .eq('tenant_id', principal.tenantId)
      .eq('status', 'active')

    return {
      toolName: 'list_workspace_members_and_teams',
      success: true,
      data: {
        teams: teams || [],
        activeMembersCount: (members || []).length
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'list_workspace_members_and_teams',
      success: false,
      error: `Error listando miembros y equipos del workspace: ${errorMsg}`
    }
  }
}

export const listWorkspaceMembersTool: NovaiModularTool<typeof listWorkspaceMembersSchema> = {
  metadata: {
    name: 'list_workspace_members_and_teams',
    label: 'Listar Miembros y Equipos',
    description: 'Lista los equipos de trabajo (teams) y colaboradores del workspace a los que el usuario tiene visibilidad.',
    category: 'organization',
    riskLevel: 'low'
  },
  schema: listWorkspaceMembersSchema,
  openAiDeclaration: {
    name: 'list_workspace_members_and_teams',
    description: 'Lista los equipos de trabajo (teams) y colaboradores del workspace a los que el usuario tiene visibilidad.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  execute: executeListWorkspaceMembers,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Lista los equipos de trabajo (teams) y colaboradores del workspace.',
      inputSchema: listWorkspaceMembersSchema,
      execute: async () => {
        const res = await executeListWorkspaceMembers({}, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
