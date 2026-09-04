import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Database,
  Json,
  OkrCycleObjectiveStatus,
  OkrCycleStatus,
  OkrPeriodType,
  StrategicObjectiveStatus
} from '@/lib/supabase/database.types'

export type {
  Json,
  OkrCycleObjectiveStatus,
  OkrCycleStatus,
  OkrPeriodType,
  StrategicObjectiveStatus
}

export type StrategicObjectiveRow = Database['public']['Tables']['strategic_objectives']['Row']
export type StrategicObjectiveInsert = Database['public']['Tables']['strategic_objectives']['Insert']
export type StrategicObjectiveUpdate = Database['public']['Tables']['strategic_objectives']['Update']

export type OkrCycleRow = Database['public']['Tables']['okr_cycles']['Row']
export type OkrCycleInsert = Database['public']['Tables']['okr_cycles']['Insert']
export type OkrCycleUpdate = Database['public']['Tables']['okr_cycles']['Update']

export type OkrCycleObjectiveRow = Database['public']['Tables']['okr_cycle_objectives']['Row']
export type OkrCycleObjectiveInsert = Database['public']['Tables']['okr_cycle_objectives']['Insert']
export type OkrCycleObjectiveUpdate = Database['public']['Tables']['okr_cycle_objectives']['Update']

export type StrategySupabaseClient = SupabaseClient<Database>
