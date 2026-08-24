// Local, additive typing for the billing-specific tables described in
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md sections
// 9.9-9.14: `plans`, `plan_entitlements`, `tenant_plan_overrides`, `subscriptions`,
// `billing_customers`, `billing_invoices`, `billing_webhook_events`.
// `guest_access_grants` and `guest_trial_policies` are already declared in
// `src/lib/supabase/database.types.ts` (the access-foundation migration) and
// are reused as-is.
//
// These six tables are not yet present in the shared foundation types.
// Rather than hand-editing that file — out of scope for this billing slice —
// we extend its `Database` type locally, exactly like
// `src/lib/investigations/db-types.ts` already does for `investigations`/
// `investigation_revisions`. Once the access foundation adds these tables to
// the generated types, this file's Row/Insert/Update shapes should be
// reconciled/removed in favor of the generated ones.
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import type {
  BillingInterval,
  GuestGrantMode,
  GuestGrantStatus,
  InvoiceStatus,
  SubscriptionStatus
} from '@/lib/billing/types'
import type {
  AccessGrantStatus,
  Database,
  PdfMonthlyUsageRpcRow,
  TrialStartRpcRow
} from '@/lib/supabase/database.types'

export type { GuestGrantMode, GuestGrantStatus }
export type { PdfMonthlyUsageRpcRow, TrialStartRpcRow }

export type AccessGrantRow = Database['public']['Tables']['access_grants']['Row']
export type AccessGrantEntitlementRow = Database['public']['Tables']['access_grant_entitlements']['Row']

// `guest_access_grants` is already fully typed by the foundation; re-export
// its Row type so the rest of this feature never needs to redeclare it.
export type GuestAccessGrantRow = Database['public']['Tables']['guest_access_grants']['Row']

export type RegisteredAccessGrantStatus = AccessGrantStatus

export type BillingPurchasePolicy = 'owner_only' | 'approved_members' | 'all_active_members'

export type BillingPurchaseAuthorizationSource = 'owner' | 'approved_member' | 'all_active_member'

export interface BillingCheckoutAuthorizationRow {
  workspace_id: string
  policy: BillingPurchasePolicy
  authorization_source: BillingPurchaseAuthorizationSource
}

export interface BillingPurchasePolicyRow {
  tenant_id: string
  policy: BillingPurchasePolicy
  can_manage: boolean
}

export interface BillingPurchaseAddressRow {
  id: string
  user_id: string
  tenant_id: string
  workspace_id: string
  first_name: string | null
  last_name: string | null
  mobile: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface BillingPurchaseDelegationRow {
  id: string
  workspace_id: string
  user_id: string
  granted_by: string | null
  status: 'active' | 'revoked'
  created_at: string
  updated_at: string
  revoked_at: string | null
}

export interface BillingSubscriptionCheckoutIntentRow {
  id: string
  tenant_id: string
  workspace_id: string
  plan_id: string
  initiated_by: string
  client_reference_id: string
  request_idempotency_key: string | null
  provider_checkout_id: string | null
  status: 'pending' | 'open' | 'completed' | 'released' | 'expired'
  expires_at: string
  is_new: boolean
}

export interface PlanRow {
  id: string
  code: string
  name: string
  description: string | null
  provider_product_id: string | null
  provider_price_id: string | null
  currency: string
  interval: BillingInterval
  duration_seconds?: number | null
  amount_minor: number
  is_active: boolean
  is_public?: boolean
  contact_sales?: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface PlanEntitlementRow {
  plan_id: string
  entitlement_key: string
  limit_value: number | null
  is_enabled: boolean
}

export interface TenantPlanOverrideRow {
  id: string
  tenant_id: string
  plan_id: string
  entitlement_key: string
  limit_value: number | null
  is_enabled: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionRow {
  id: string
  tenant_id: string
  plan_id: string
  provider_customer_id: string
  provider_subscription_id: string
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface BillingCustomerRow {
  id: string
  tenant_id: string | null
  provider_customer_id: string
  billing_email: string | null
  country: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
}

export interface BillingInvoiceRow {
  id: string
  tenant_id: string | null
  provider_invoice_id: string
  status: InvoiceStatus
  number: string | null
  amount_minor: number
  tax_amount_minor: number | null
  tax_id: string | null
  currency: string
  issued_at: string | null
  paid_at: string | null
  hosted_invoice_url: string | null
  retention_until: string
  created_at: string
  updated_at: string
}

export type BillingWebhookEventStatus = 'received' | 'processed' | 'failed'

export interface BillingWebhookEventRow {
  id: string
  provider: string
  provider_event_id: string
  event_type: string
  payload_sanitized: Record<string, unknown>
  status: BillingWebhookEventStatus
  processed_at: string | null
  error_code: string | null
  retention_until: string
  created_at: string
}

// `Relationships: []` is required (not optional) on every table entry:
// supabase-js's `SupabaseClient<Database>` only resolves `Schema` (and thus
// every table's Row/Insert/Update types) when `Database['public']` extends
// postgrest-js's `GenericSchema`, which requires `Tables: Record<string,
// GenericTable>` where `GenericTable` itself requires a `Relationships`
// array. Omitting it silently collapses every table's type (including the
// foundation's own, unrelated to this feature) to `never` instead of
// producing a targeted error — see report/assumptions for how this was
// diagnosed. None of these six tables need embedded-resource (`select`
// with FK joins) support, so an empty tuple is accurate.
interface BillingExtraTables {
  plans: {
    Row: PlanRow
    Insert: Partial<Pick<PlanRow, 'id' | 'created_at' | 'updated_at'>> &
      Omit<PlanRow, 'id' | 'created_at' | 'updated_at'>
    Update: Partial<PlanRow>
    Relationships: []
  }
  plan_entitlements: {
    Row: PlanEntitlementRow
    Insert: {
      plan_id: string
      entitlement_key: string
      limit_value?: number | null
      is_enabled?: boolean
    }
    Update: Partial<PlanEntitlementRow>
    Relationships: []
  }
  tenant_plan_overrides: {
    Row: TenantPlanOverrideRow
    Insert: Partial<Pick<TenantPlanOverrideRow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>> &
      Omit<TenantPlanOverrideRow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
    Update: Partial<TenantPlanOverrideRow>
    Relationships: []
  }
  billing_subscription_checkout_intents: {
    Row: BillingSubscriptionCheckoutIntentRow
    Insert: Partial<Pick<BillingSubscriptionCheckoutIntentRow, 'id'>> &
      Omit<BillingSubscriptionCheckoutIntentRow, 'id'>
    Update: Partial<BillingSubscriptionCheckoutIntentRow>
    Relationships: []
  }
  billing_purchase_addresses: {
    Row: BillingPurchaseAddressRow
    Insert: Partial<
      Pick<
        BillingPurchaseAddressRow,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'first_name'
        | 'last_name'
        | 'mobile'
        | 'line1'
        | 'line2'
        | 'city'
        | 'state'
        | 'postal_code'
        | 'country'
      >
    > &
      Omit<
        BillingPurchaseAddressRow,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'first_name'
        | 'last_name'
        | 'mobile'
        | 'line1'
        | 'line2'
        | 'city'
        | 'state'
        | 'postal_code'
        | 'country'
      >
    Update: Partial<BillingPurchaseAddressRow>
    Relationships: []
  }
  subscriptions: {
    Row: SubscriptionRow
    Insert: Partial<Pick<SubscriptionRow, 'id' | 'created_at' | 'updated_at'>> &
      Omit<SubscriptionRow, 'id' | 'created_at' | 'updated_at'>
    Update: Partial<SubscriptionRow>
    Relationships: []
  }
  billing_customers: {
    Row: BillingCustomerRow
    Insert: Partial<Pick<BillingCustomerRow, 'id' | 'created_at' | 'updated_at' | 'country' | 'tax_id'>> &
      Omit<BillingCustomerRow, 'id' | 'created_at' | 'updated_at' | 'country' | 'tax_id'>
    Update: Partial<BillingCustomerRow>
    Relationships: []
  }
  billing_invoices: {
    Row: BillingInvoiceRow
    Insert: Partial<Pick<BillingInvoiceRow, 'id' | 'created_at' | 'updated_at'>> &
      Omit<BillingInvoiceRow, 'id' | 'created_at' | 'updated_at'>
    Update: Partial<BillingInvoiceRow>
    Relationships: []
  }
  billing_webhook_events: {
    Row: BillingWebhookEventRow
    Insert: Partial<Pick<BillingWebhookEventRow, 'id' | 'created_at' | 'status' | 'processed_at' | 'error_code'>> &
      Omit<BillingWebhookEventRow, 'id' | 'created_at' | 'status' | 'processed_at' | 'error_code'>
    Update: Partial<BillingWebhookEventRow>
    Relationships: []
  }
}

export type BillingDatabase = {
  public: {
    Tables: Database['public']['Tables'] & BillingExtraTables
    Views: Database['public']['Views']
    Functions: Database['public']['Functions']
    Enums: Database['public']['Enums']
    CompositeTypes: Database['public']['CompositeTypes']
  }
}

export type BillingSupabaseClient = SupabaseClient<BillingDatabase>

// The shared `createSupabaseServerClient()`/`createSupabaseAdminClient()`
// helpers are typed against the foundation-only `Database`. Cast at this
// single boundary so callers in this feature keep full column-level typing
// for the six extra tables without touching the shared client factories.
export const asBillingClient = (client: SupabaseClient<Database>): BillingSupabaseClient =>
  client as unknown as BillingSupabaseClient

/* ------------------------------------------------------------------ */
/* Diagnosed upstream type-inference workarounds                       */
/* ------------------------------------------------------------------ */
//
// Two narrow, deliberately unsafe-looking helpers below work around a
// TypeScript inference limitation confirmed by isolated repro testing
// against this exact toolchain (TypeScript 5.9.3 + @supabase/supabase-js
// 2.112.2 + @supabase/postgrest-js 2.112.2): once `SupabaseClient` is
// parameterized with ANY reshaped/extended `Database` type (not the bare
// `Database` interface reference itself — confirmed by testing the same
// query shape against plain `SupabaseClient<Database>`, which type-checks
// correctly), two specific call patterns silently collapse to `never`
// instead of producing a real error:
//   1. `await query.maybeSingle()` (or `.single()`), then narrowing on
//      `error` before reading `.data` (reading `.data` WITHOUT narrowing
//      first, as `src/features/access/access-service.ts` already does,
//      does not trigger it).
//   2. Passing an object literal to `.update(...)`/`.insert(...)`.
// This also reproduces against the *unmodified* foundation `Database` type
// once reshaped the same way, and against the pre-existing
// `src/lib/investigations/db-types.ts extends Database` pattern — so it is
// not specific to the five tables added in this file, and is out of scope
// to fix at the root (that would mean changing how
// `src/lib/supabase/database.types.ts` itself is authored/consumed, which
// is a Supabase-foundation file this task must not modify). Runtime
// behavior is completely unaffected either way; only these two narrow
// compile-time checks are bypassed, and every caller still supplies a
// properly Row/Insert-typed local value before either helper is used.

// Cast for `.maybeSingle()`/`.single()` results only. `Row` must be
// supplied explicitly by the caller (the real, already-declared table Row
// type), so the destructured `data`/`error` stay meaningfully typed.
export async function resolveSingleRowQuery<Row>(
  query: PromiseLike<unknown>
): Promise<{ data: Row | null; error: PostgrestError | null }> {
  return (await query) as { data: Row | null; error: PostgrestError | null }
}

export async function resolveRpcQuery<Row>(
  query: PromiseLike<unknown>
): Promise<{ data: Row[] | null; error: PostgrestError | null }> {
  return (await query) as { data: Row[] | null; error: PostgrestError | null }
}

export async function resolveRpcScalar<Row>(
  query: PromiseLike<unknown>
): Promise<{ data: Row | null; error: PostgrestError | null }> {
  return (await query) as { data: Row | null; error: PostgrestError | null }
}

// Cast for the `.from(table)` call immediately before `.update(...)`/
// `.insert(...)`. Only bypasses Supabase's own argument validation for
// that one mutation call; every call site still declares its `patch`/
// `values` object against the table's real Row/Insert interface first, so
// a typo in a column name is still caught there.
export interface UncheckedTableQueryBuilder<Row = Record<string, unknown>> {
  select: (columns?: string) => UncheckedTableQueryBuilder<Row>
  insert: (values: unknown) => UncheckedTableQueryBuilder<Row>
  update: (values: unknown) => UncheckedTableQueryBuilder<Row>
  upsert: (values: unknown, options?: unknown) => UncheckedTableQueryBuilder<Row>
  delete: () => UncheckedTableQueryBuilder<Row>
  eq: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  neq: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  in: (column: string, values: unknown[]) => UncheckedTableQueryBuilder<Row>
  is: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  lte: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  gte: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  lt: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  gt: (column: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  like: (column: string, pattern: string) => UncheckedTableQueryBuilder<Row>
  ilike: (column: string, pattern: string) => UncheckedTableQueryBuilder<Row>
  not: (column: string, operator: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  filter: (column: string, operator: string, value: unknown) => UncheckedTableQueryBuilder<Row>
  match: (query: Record<string, unknown>) => UncheckedTableQueryBuilder<Row>
  or: (filters: string) => UncheckedTableQueryBuilder<Row>
  range: (from: number, to: number) => UncheckedTableQueryBuilder<Row>
  order: (column: string, options?: { ascending?: boolean }) => UncheckedTableQueryBuilder<Row>
  limit: (count: number) => UncheckedTableQueryBuilder<Row>
  single: () => Promise<{ data: any; error: any }>
  maybeSingle: () => Promise<{ data: any; error: any }>
  then: <TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>
}

export const uncheckedBillingTable = (
  client: BillingSupabaseClient,
  table: string
): UncheckedTableQueryBuilder =>
  (client as unknown as { from: (relation: string) => UncheckedTableQueryBuilder }).from(table)

// Cast for RPC calls only. The extended client loses the function argument
// shape when the shared hand-authored schema is intersected with billing
// tables, so the result is immediately normalized by `resolveRpcQuery`.
export const uncheckedBillingRpc = (
  client: BillingSupabaseClient,
  functionName: string,
  args: Record<string, unknown>
): PromiseLike<unknown> =>
  (
    client as unknown as {
      rpc: (name: string, parameters: Record<string, unknown>) => PromiseLike<unknown>
    }
  ).rpc(functionName, args)
