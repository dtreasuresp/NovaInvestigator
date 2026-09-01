import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type KanbanColumnRow = {
  id: string
  tenant_id: string
  name: string
  slug: string
  position: number
  created_at: string
}

export type KanbanTaskRow = {
  id: string
  tenant_id: string
  column_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  cover_image: string | null
  tags: string[] | null
  assignee_ids: string[]
  due_date: string | null
  project_id: string | null
  activity_id: string | null
  came_action_id: string | null
  budget_amount: number | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

type WithRelationships<Table> = Table extends { Relationships: readonly unknown[] }
  ? Table
  : Table & { Relationships: [] }

type NormalizedTables<Tables> = {
  [TableName in keyof Tables]: WithRelationships<Tables[TableName]>
}

type KanbanExtraTables = {
  kanban_columns: {
    Row: KanbanColumnRow
    Insert: Partial<Pick<KanbanColumnRow, 'id' | 'created_at'>> &
      Omit<KanbanColumnRow, 'id' | 'created_at'>
    Update: Partial<KanbanColumnRow>
    Relationships: []
  }
  kanban_tasks: {
    Row: KanbanTaskRow
    Insert: {
      id?: string
      tenant_id: string
      column_id: string
      title: string
      description?: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      cover_image?: string | null
      tags?: string[] | null
      assignee_ids?: string[]
      due_date?: string | null
      project_id?: string | null
      activity_id?: string | null
      came_action_id?: string | null
      budget_amount?: number | null
      position?: number
      created_by?: string
      created_at?: string
      updated_at?: string
    }
    Update: Partial<KanbanTaskRow>
    Relationships: [
      {
        foreignKeyName: 'kanban_tasks_column_id_fkey'
        columns: ['column_id']
        isOneToOne: false
        referencedRelation: 'kanban_columns'
        referencedColumns: ['id']
      }
    ]
  }
}

export type KanbanDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: NormalizedTables<Database['public']['Tables']> & KanbanExtraTables
  }
}

export type KanbanSupabaseClient = SupabaseClient<KanbanDatabase>

export const asKanbanClient = (client: SupabaseClient<Database>): KanbanSupabaseClient =>
  client as unknown as KanbanSupabaseClient
