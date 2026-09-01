import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectBudgetMode = 'action_based' | 'total_first'
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectActivityStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type ProjectMemberRole = 'leader' | 'member'
export type CameActionType = 'C' | 'A' | 'M' | 'E'

export type ProjectRow = {
  id: string
  tenant_id: string
  workspace_id: string | null
  team_id: string | null
  investigation_id: string | null
  name: string
  description: string
  objective: string
  priority: ProjectPriority
  start_date: string | null
  end_date: string | null
  leader_user_id: string | null
  budget_total: number
  budget_mode: ProjectBudgetMode
  status: ProjectStatus
  idempotency_key: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProjectActivityRow = {
  id: string
  tenant_id: string
  project_id: string
  came_action_id: string | null
  title: string
  description: string
  owner_user_id: string | null
  priority: ProjectPriority
  start_date: string | null
  end_date: string | null
  budget: number
  status: ProjectActivityStatus
  position: number
  created_at: string
  updated_at: string
}

export type ProjectMemberRow = {
  id: string
  tenant_id: string
  project_id: string
  user_id: string
  role: ProjectMemberRole
  created_at: string
}

export type ProjectCameActionRow = {
  id: string
  tenant_id: string
  project_id: string
  investigation_id: string
  came_action_id: string
  action_type: CameActionType
  budget_allocated: number
  snapshot: Json
  created_at: string
}

type WithRelationships<Table> = Table extends { Relationships: readonly unknown[] }
  ? Table
  : Table & { Relationships: [] }

type NormalizedTables<Tables> = {
  [TableName in keyof Tables]: WithRelationships<Tables[TableName]>
}

export type ProjectsExtraTables = {
  projects: {
    Row: ProjectRow
    Insert: Partial<Pick<ProjectRow, 'id' | 'created_at' | 'updated_at' | 'description' | 'objective' | 'priority' | 'budget_total' | 'budget_mode' | 'status'>> &
      Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>
    Update: Partial<ProjectRow>
    Relationships: [
      {
        foreignKeyName: 'projects_tenant_id_fkey'
        columns: ['tenant_id']
        isOneToOne: false
        referencedRelation: 'tenants'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'projects_team_id_fkey'
        columns: ['team_id']
        isOneToOne: false
        referencedRelation: 'teams'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'projects_investigation_id_fkey'
        columns: ['investigation_id']
        isOneToOne: false
        referencedRelation: 'investigations'
        referencedColumns: ['id']
      }
    ]
  }
  project_members: {
    Row: ProjectMemberRow
    Insert: Partial<Pick<ProjectMemberRow, 'id' | 'created_at' | 'role'>> &
      Omit<ProjectMemberRow, 'id' | 'created_at'>
    Update: Partial<ProjectMemberRow>
    Relationships: [
      {
        foreignKeyName: 'project_members_project_id_fkey'
        columns: ['project_id']
        isOneToOne: false
        referencedRelation: 'projects'
        referencedColumns: ['id']
      }
    ]
  }
  project_came_actions: {
    Row: ProjectCameActionRow
    Insert: Partial<Pick<ProjectCameActionRow, 'id' | 'created_at' | 'budget_allocated' | 'snapshot'>> &
      Omit<ProjectCameActionRow, 'id' | 'created_at'>
    Update: Partial<ProjectCameActionRow>
    Relationships: [
      {
        foreignKeyName: 'project_came_actions_project_id_fkey'
        columns: ['project_id']
        isOneToOne: false
        referencedRelation: 'projects'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'project_came_actions_investigation_id_fkey'
        columns: ['investigation_id']
        isOneToOne: false
        referencedRelation: 'investigations'
        referencedColumns: ['id']
      }
    ]
  }
  project_activities: {
    Row: ProjectActivityRow
    Insert: {
      id?: string
      tenant_id: string
      project_id: string
      came_action_id?: string | null
      title: string
      description?: string | null
      owner_user_id?: string | null
      priority?: ProjectPriority
      start_date?: string | null
      end_date?: string | null
      budget?: number
      status?: ProjectActivityStatus
      position?: number
      created_at?: string
      updated_at?: string
    }
    Update: Partial<ProjectActivityRow>
    Relationships: [
      {
        foreignKeyName: 'project_activities_project_id_fkey'
        columns: ['project_id']
        isOneToOne: false
        referencedRelation: 'projects'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'project_activities_owner_user_id_fkey'
        columns: ['owner_user_id']
        isOneToOne: false
        referencedRelation: 'users'
        referencedColumns: ['id']
      }
    ]
  }
}

export type ProjectsDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: NormalizedTables<Database['public']['Tables']> & ProjectsExtraTables
  }
}

export type ProjectsSupabaseClient = SupabaseClient<ProjectsDatabase>

export const asProjectsClient = (client: SupabaseClient<Database>): ProjectsSupabaseClient =>
  client as unknown as ProjectsSupabaseClient
