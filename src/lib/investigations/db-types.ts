// Local, additive typing for the `investigations` and `investigation_revisions`
// tables described in doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// sections 9.17-9.18.
//
// These tables are not yet present in `src/lib/supabase/database.types.ts`
// (the access-foundation schema is still being built out; see that file's
// header comment). Rather than hand-editing the shared foundation file — out
// of scope for this slice — we extend its `Database` type locally so the
// Supabase client stays fully typed for this feature. Once the access
// foundation adds these tables to the generated types, this file's Row/Insert/
// Update shapes should be reconciled/removed in favor of the generated ones.
//
// This file also normalizes a *local* copy of the whole public schema (see
// `NormalizedTables` below) to work around a real type-inference defect that
// otherwise makes every Supabase call in this feature (and, pre-existing and
// out of scope, throughout the rest of the codebase) resolve to `never`:
// `@supabase/postgrest-js`'s `GenericTable` requires a `Relationships`
// property on every table entry
// (node_modules/@supabase/postgrest-js/.../types/common/common.ts), and
// `@supabase/supabase-js`'s `SupabaseClient<Database, ...>` computes its
// `Schema` generic as
//   `Omit<Database, '__InternalSupabase'>[SchemaName] extends GenericSchema
//     ? Omit<Database, '__InternalSupabase'>[SchemaName]
//     : never`
// (node_modules/@supabase/supabase-js/src/SupabaseClient.ts). Because
// `database.types.ts`'s table entries omit `Relationships`, `Database['public']`
// fails the `extends GenericSchema` check and `Schema` collapses to `never`,
// which is why `.from(...).insert(...)`/`.update(...)`/`.select(...)` and
// `.rpc(...)` all infer `never`/`undefined` project-wide. Adding the missing
// `Relationships: []` here (only to this feature's local schema copy) makes
// `Schema` resolve correctly for the client instance used by this feature,
// without editing the shared foundation file.
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/supabase/database.types'

// Declared as `type` aliases (not `interface`): `@supabase/postgrest-js`'s
// `GenericTable` constraint (`Row`/`Insert`/`Update`/`Relationships`, each
// bound to `Record<string, unknown>`/`GenericRelationship[]`) is checked via
// a conditional-type `extends`, and TypeScript only treats an object shape as
// satisfying an index-signature type like `Record<string, unknown>` in that
// kind of check when it is a fresh object-literal type. A top-level
// `interface` never structurally satisfies `Record<string, unknown>` in an
// `extends` clause even with identical members — only `type` aliases (or
// inline literals, like the ones already used throughout
// `src/lib/supabase/database.types.ts`) do. Using `interface` here silently
// reproduced the same "collapses to `never`" failure described above, scoped
// to just these two tables.
export type InvestigationRow = {
  id: string
  tenant_id: string
  owner_id: string
  title: string
  status: string
  archived_at: string | null
  idempotency_key: string | null
  state: Json
  schema_version: number
  version: number
  created_at: string
  updated_at: string
  updated_by: string | null
  last_opened_at: string | null
  last_opened_by: string | null
  is_locked: boolean
  access_level: 'private' | 'team_read' | 'team_write'
}

export type InvestigationRevisionRow = {
  id: string
  investigation_id: string
  tenant_id: string
  version: number
  state: Json
  reason: string
  changed_by: string | null
  created_at: string
}

export type InvestigationAiReportRow = {
  investigation_id: string
  tenant_id: string
  report_text: string
  locale: string
  format: string
  model: string | null
  generated_at: string
  generated_by: string | null
  created_at: string
  updated_at: string
}

// Adds the `Relationships` property `GenericTable` requires to any table
// entry that doesn't already declare it, without altering `Row`/`Insert`/
// `Update`. No foreign-key-based embeds (`select('parent(*)')`) are used by
// this feature, so an empty tuple is accurate for every table reached
// through `InvestigationsSupabaseClient`.
type WithRelationships<Table> = Table extends { Relationships: readonly unknown[] }
  ? Table
  : Table & { Relationships: [] }

type NormalizedTables<Tables> = {
  [TableName in keyof Tables]: WithRelationships<Tables[TableName]>
}

// `type`, not `interface`, for the same reason as `InvestigationRow` above —
// this is intersected into `Tables`, and each of its properties needs to
// resolve as a fresh object-literal type to satisfy `GenericTable`.
type InvestigationsExtraTables = {
  investigations: {
    Row: InvestigationRow
    Insert: Partial<Pick<InvestigationRow, 'id' | 'created_at' | 'updated_at' | 'version'>> &
      Omit<InvestigationRow, 'id' | 'created_at' | 'updated_at' | 'version'>
    Update: Partial<InvestigationRow>
    Relationships: []
  }
  investigation_revisions: {
    Row: InvestigationRevisionRow
    Insert: Partial<Pick<InvestigationRevisionRow, 'id' | 'created_at'>> &
      Omit<InvestigationRevisionRow, 'id' | 'created_at'>
    Update: Partial<InvestigationRevisionRow>
    Relationships: []
  }
  investigation_ai_reports: {
    Row: InvestigationAiReportRow
    Insert: Partial<Pick<InvestigationAiReportRow, 'created_at' | 'updated_at' | 'generated_at'>> &
      Omit<InvestigationAiReportRow, 'created_at' | 'updated_at' | 'generated_at'>
    Update: Partial<InvestigationAiReportRow>
    Relationships: []
  }
}

type InvestigationsExtraFunctions = {
  touch_investigation_access: {
    Args: {
      p_investigation_id: string
      p_tenant_id: string
      p_user_id: string
    }
    Returns: void
  }
}

export type InvestigationsDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: NormalizedTables<Database['public']['Tables']> & InvestigationsExtraTables
    Functions: Database['public']['Functions'] & InvestigationsExtraFunctions
  }
}

export type InvestigationsSupabaseClient = SupabaseClient<InvestigationsDatabase>

// The shared `createSupabaseServerClient()` helper is typed against the
// foundation-only `Database`. Cast at this single boundary so callers in this
// feature keep full column-level typing for the two extra tables (and a
// working `Schema` generic — see the file header) without touching the
// shared client factory.
export const asInvestigationsClient = (
  client: SupabaseClient<Database>
): InvestigationsSupabaseClient => client as unknown as InvestigationsSupabaseClient
