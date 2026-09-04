// Hand-authored Supabase database types for the access foundation schema.
//
// These types cover the tables/functions created by
// `supabase/migrations/2026-08-07T00-00-00_access_foundation.sql` and the
// deferred registration bootstrap migration. The deprecated guest tables
// remain temporarily so the pre-migration billing code can be replaced in a
// separate action without collapsing the project type surface in the
// meantime.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProfileStatus = 'active' | 'suspended' | 'deleted'
export type VidStatus = 'pending' | 'verified' | 'rejected'
export type TenantStatus = 'active' | 'suspended' | 'archived'
export type WorkspaceStatus = 'active' | 'suspended' | 'archived'
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'revoked'
export type WorkspaceMembershipStatus = MembershipStatus
export type PlatformMembershipStatus = 'active' | 'suspended' | 'revoked'
export type InvitationDeliveryStatus = 'pending' | 'sent' | 'failed'
export type PlatformRoleKey = string
export type OverrideEffect = 'allow' | 'deny'
export type AccessGrantMode = 'trial' | 'one_time'
export type AccessGrantStatus = 'pending' | 'active' | 'consumed' | 'expired' | 'revoked'
export type TrialPolicyScope = 'platform' | 'tenant'
export type TrialPolicyStartsOn = 'first_access' | 'first_action'
export type GuestGrantMode = AccessGrantMode
export type GuestGrantStatus = 'pending' | 'active' | 'consumed' | 'expired' | 'converted' | 'revoked'
export type GuestTrialScope = TrialPolicyScope
export type GuestTrialStartsOn = TrialPolicyStartsOn
export type GuestTrialSessionStatus = 'active' | 'ended' | 'expired' | 'claimed'
export type TrialEntitlementNamespace = 'modules' | 'actions' | 'limits'
export type AuditSource = 'user' | 'admin' | 'system' | 'migration'
export type VidRequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_resubmission'
export type VidVerificationMethod = 'manual' | 'provider'
export type StrategicObjectiveStatus = 'draft' | 'active' | 'at_risk' | 'achieved' | 'cancelled' | 'archived'
export type OkrPeriodType = 'quarterly' | 'annual' | 'custom'
export type OkrCycleStatus = 'draft' | 'active' | 'closed' | 'archived'
export type OkrCycleObjectiveStatus =
  | 'not_started'
  | 'on_track'
  | 'at_risk'
  | 'off_track'
  | 'achieved'
  | 'dropped'
export type LegalRetentionArchiveSource =
  | 'audit_logs'
  | 'billing_invoices'
  | 'billing_webhook_events'
  | 'access_grants'
  | 'vid_requests'

export type TrialStartRpcRow = {
  grant_id: string
  tenant_id: string
  user_id: string
  mode: AccessGrantMode
  policy_id: string | null
  starts_at: string
  expires_at: string | null
  max_uses: number
  used_uses: number
  status: AccessGrantStatus
  consumed_at: string | null
  allow_pdf: boolean
  allow_checkout: boolean
}

export type PdfMonthlyUsageRpcRow = {
  allowed: boolean
  usage_count: number
  limit_value: number | null
}

export type GuestTrialEntitlementRpcRow = {
  key: string
  limitValue: number | null
  isEnabled: boolean
}

export type GuestTrialStartRpcRow = {
  session_id: string
  policy_id: string
  policy_version: string
  status: GuestTrialSessionStatus
  started_at: string
  expires_at: string
  allow_pdf: boolean
  allow_checkout: boolean
  entitlements: GuestTrialEntitlementRpcRow[]
}

export type GuestTrialSessionRpcRow = GuestTrialStartRpcRow & {
  ended_at: string | null
  claimed_at: string | null
}

export type GuestTrialClaimRpcRow = {
  grant_id: string
  tenant_id: string
  user_id: string
  policy_id: string
  starts_at: string
  expires_at: string
  status: AccessGrantStatus
  entitlements: GuestTrialEntitlementRpcRow[]
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          primary_tenant_id: string | null
          avatar_url: string | null
          locale: string | null
          timezone: string | null
          status: ProfileStatus
          vid_status: VidStatus
          vid_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          primary_tenant_id?: string | null
          avatar_url?: string | null
          locale?: string | null
          timezone?: string | null
          status?: ProfileStatus
          vid_status?: VidStatus
          vid_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          primary_tenant_id?: string | null
          avatar_url?: string | null
          locale?: string | null
          timezone?: string | null
          status?: ProfileStatus
          vid_status?: VidStatus
          vid_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategic_objectives: {
        Row: {
          id: string
          tenant_id: string
          workspace_id: string | null
          team_id: string | null
          title: string
          description: string
          status: StrategicObjectiveStatus
          owner_user_id: string | null
          source_investigation_id: string | null
          source_came_action_id: string | null
          source_snapshot: Json
          archived_at: string | null
          created_by: string | null
          updated_by: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          workspace_id?: string | null
          team_id?: string | null
          title: string
          description?: string
          status?: StrategicObjectiveStatus
          owner_user_id?: string | null
          source_investigation_id?: string | null
          source_came_action_id?: string | null
          source_snapshot?: Json
          archived_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          workspace_id?: string | null
          team_id?: string | null
          title?: string
          description?: string
          status?: StrategicObjectiveStatus
          owner_user_id?: string | null
          source_investigation_id?: string | null
          source_came_action_id?: string | null
          source_snapshot?: Json
          archived_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      okr_cycles: {
        Row: {
          id: string
          tenant_id: string
          workspace_id: string | null
          team_id: string | null
          name: string
          description: string
          period_type: OkrPeriodType
          start_date: string
          end_date: string
          status: OkrCycleStatus
          owner_user_id: string | null
          archived_at: string | null
          created_by: string | null
          updated_by: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          workspace_id?: string | null
          team_id?: string | null
          name: string
          description?: string
          period_type?: OkrPeriodType
          start_date: string
          end_date: string
          status?: OkrCycleStatus
          owner_user_id?: string | null
          archived_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          workspace_id?: string | null
          team_id?: string | null
          name?: string
          description?: string
          period_type?: OkrPeriodType
          start_date?: string
          end_date?: string
          status?: OkrCycleStatus
          owner_user_id?: string | null
          archived_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      okr_cycle_objectives: {
        Row: {
          id: string
          tenant_id: string
          cycle_id: string
          strategic_objective_id: string
          owner_user_id: string | null
          commitment: string
          weight: number
          status: OkrCycleObjectiveStatus
          progress: number
          created_by: string | null
          updated_by: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cycle_id: string
          strategic_objective_id: string
          owner_user_id?: string | null
          commitment?: string
          weight?: number
          status?: OkrCycleObjectiveStatus
          progress?: number
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cycle_id?: string
          strategic_objective_id?: string
          owner_user_id?: string | null
          commitment?: string
          weight?: number
          status?: OkrCycleObjectiveStatus
          progress?: number
          created_by?: string | null
          updated_by?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vid_requests: {
        Row: {
          id: string
          user_id: string
          status: VidRequestStatus
          verification_method: VidVerificationMethod
          provider_reference: string | null
          metadata: Json
          decision_reason: string | null
          reviewer_user_id: string | null
          submitted_at: string
          reviewed_at: string | null
          retention_until: string
          redacted_at: string | null
          version: number
          correlation_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: VidRequestStatus
          verification_method?: VidVerificationMethod
          provider_reference?: string | null
          metadata?: Json
          decision_reason?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          retention_until?: string
          redacted_at?: string | null
          version?: number
          correlation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: VidRequestStatus
          verification_method?: VidVerificationMethod
          provider_reference?: string | null
          metadata?: Json
          decision_reason?: string | null
          reviewer_user_id?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          retention_until?: string
          redacted_at?: string | null
          version?: number
          correlation_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          user_id: string
          display_name: string
          company_name: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          display_name: string
          company_name?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string
          company_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          status: TenantStatus
          logo_url: string | null
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: TenantStatus
          logo_url?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: TenantStatus
          logo_url?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          status: WorkspaceStatus
          avatar_url: string | null
          description: string | null
          timezone: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          status?: WorkspaceStatus
          avatar_url?: string | null
          description?: string | null
          timezone?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          status?: WorkspaceStatus
          avatar_url?: string | null
          description?: string | null
          timezone?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          tenant_id: string
          workspace_id: string | null
          name: string
          slug: string
          avatar_url: string | null
          description: string | null
          tags: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          workspace_id?: string | null
          name: string
          slug: string
          avatar_url?: string | null
          description?: string | null
          tags?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          workspace_id?: string | null
          name?: string
          slug?: string
          avatar_url?: string | null
          description?: string | null
          tags?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          tenant_id: string | null
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          key: string
          name: string
          is_system?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          key?: string
          name?: string
          is_system?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          id: string
          key: PlatformRoleKey
          name: string
          is_system: boolean
          is_active: boolean
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          key: PlatformRoleKey
          name: string
          is_system?: boolean
          is_active?: boolean
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: PlatformRoleKey
          name?: string
          is_system?: boolean
          is_active?: boolean
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      platform_memberships: {
        Row: {
          id: string
          user_id: string
          role_id: string
          status: PlatformMembershipStatus
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          status?: PlatformMembershipStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          status?: PlatformMembershipStatus
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_role_capabilities: {
        Row: {
          role_id: string
          capability_key: string
        }
        Insert: {
          role_id: string
          capability_key: string
        }
        Update: {
          role_id?: string
          capability_key?: string
        }
        Relationships: []
      }
      platform_registration_settings: {
        Row: {
          id: boolean
          pending_retention_days: number
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          pending_retention_days?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          pending_retention_days?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role_id: string
          status: MembershipStatus
          invited_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role_id: string
          status?: MembershipStatus
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role_id?: string
          status?: MembershipStatus
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_memberships: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role_id: string
          status: WorkspaceMembershipStatus
          invited_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role_id: string
          status?: WorkspaceMembershipStatus
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role_id?: string
          status?: WorkspaceMembershipStatus
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      capabilities: {
        Row: {
          key: string
          description: string
          resource: string
          action: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          key: string
          description: string
          resource: string
          action: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          key?: string
          description?: string
          resource?: string
          action?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      role_capabilities: {
        Row: {
          role_id: string
          capability_key: string
        }
        Insert: {
          role_id: string
          capability_key: string
        }
        Update: {
          role_id?: string
          capability_key?: string
        }
        Relationships: []
      }
      member_capability_overrides: {
        Row: {
          membership_id: string
          capability_key: string
          effect: OverrideEffect
          reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          membership_id: string
          capability_key: string
          effect: OverrideEffect
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          membership_id?: string
          capability_key?: string
          effect?: OverrideEffect
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          tenant_id: string
          workspace_id: string
          email: string
          role_id: string
          token_hash: string
          expires_at: string
          accepted_at: string | null
          revoked_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          delivery_status: InvitationDeliveryStatus
          delivered_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          workspace_id: string
          email: string
          role_id: string
          token_hash: string
          expires_at: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          delivery_status?: InvitationDeliveryStatus
          delivered_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          workspace_id?: string
          email?: string
          role_id?: string
          token_hash?: string
          expires_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          delivery_status?: InvitationDeliveryStatus
          delivered_at?: string | null
        }
        Relationships: []
      }
      trial_policies: {
        Row: {
          id: string
          scope: TrialPolicyScope
          tenant_id: string | null
          enabled: boolean
          duration_seconds: number
          starts_on: TrialPolicyStartsOn
          max_sessions: number
          allow_pdf: boolean
          allow_checkout: boolean
          allow_guest: boolean
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          scope: TrialPolicyScope
          tenant_id?: string | null
          enabled?: boolean
          duration_seconds: number
          starts_on?: TrialPolicyStartsOn
          max_sessions?: number
          allow_pdf?: boolean
          allow_checkout?: boolean
          allow_guest?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: TrialPolicyScope
          tenant_id?: string | null
          enabled?: boolean
          duration_seconds?: number
          starts_on?: TrialPolicyStartsOn
          max_sessions?: number
          allow_pdf?: boolean
          allow_checkout?: boolean
          allow_guest?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_modules: {
        Row: {
          module_key: string
          name: string
          description: string | null
          route_prefix: string
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          module_key: string
          name: string
          description?: string | null
          route_prefix: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          module_key?: string
          name?: string
          description?: string | null
          route_prefix?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trial_policy_entitlements: {
        Row: {
          policy_id: string
          entitlement_key: string
          limit_value: number | null
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          policy_id: string
          entitlement_key: string
          limit_value?: number | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          policy_id?: string
          entitlement_key?: string
          limit_value?: number | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_trial_eligibilities: {
        Row: {
          eligibility_key_hash: string
          policy_id: string | null
          session_count: number
          first_started_at: string | null
          last_started_at: string | null
          claimed_at: string | null
          claimed_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          eligibility_key_hash: string
          policy_id?: string | null
          session_count?: number
          first_started_at?: string | null
          last_started_at?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          eligibility_key_hash?: string
          policy_id?: string | null
          session_count?: number
          first_started_at?: string | null
          last_started_at?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_trial_sessions: {
        Row: {
          id: string
          eligibility_key_hash: string
          policy_id: string
          policy_version: string
          claim_nonce_hash: string
          started_at: string
          expires_at: string
          ended_at: string | null
          claimed_at: string | null
          claimed_user_id: string | null
          status: GuestTrialSessionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          eligibility_key_hash: string
          policy_id: string
          policy_version: string
          claim_nonce_hash: string
          started_at?: string
          expires_at: string
          ended_at?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          status?: GuestTrialSessionStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          eligibility_key_hash?: string
          policy_id?: string
          policy_version?: string
          claim_nonce_hash?: string
          started_at?: string
          expires_at?: string
          ended_at?: string | null
          claimed_at?: string | null
          claimed_user_id?: string | null
          status?: GuestTrialSessionStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      access_grant_entitlements: {
        Row: {
          grant_id: string
          entitlement_key: string
          limit_value: number | null
          is_enabled: boolean
          source: 'policy' | 'trial_policy' | 'plan' | 'manual'
          created_at: string
        }
        Insert: {
          grant_id: string
          entitlement_key: string
          limit_value?: number | null
          is_enabled?: boolean
          source?: 'policy' | 'trial_policy' | 'plan' | 'manual'
          created_at?: string
        }
        Update: {
          grant_id?: string
          entitlement_key?: string
          limit_value?: number | null
          is_enabled?: boolean
          source?: 'policy' | 'trial_policy' | 'plan' | 'manual'
          created_at?: string
        }
        Relationships: []
      }

      access_grants: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          mode: AccessGrantMode
          policy_id: string | null
          source_plan_id: string | null
          provider_checkout_id: string | null
          provider_payment_id: string | null
          starts_at: string
          expires_at: string | null
          max_uses: number
          used_uses: number
          status: AccessGrantStatus
          consumed_at: string | null
          revoked_at: string | null
          retention_until: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          mode: AccessGrantMode
          policy_id?: string | null
          source_plan_id?: string | null
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          starts_at?: string
          expires_at?: string | null
          max_uses?: number
          used_uses?: number
          status?: AccessGrantStatus
          consumed_at?: string | null
          revoked_at?: string | null
          retention_until?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          mode?: AccessGrantMode
          policy_id?: string | null
          source_plan_id?: string | null
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          starts_at?: string
          expires_at?: string | null
          max_uses?: number
          used_uses?: number
          status?: AccessGrantStatus
          consumed_at?: string | null
          revoked_at?: string | null
          retention_until?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Deprecated compatibility entries; remove after the guest billing
      // repository and routes are migrated to the tables above.
      guest_trial_policies: {
        Row: {
          id: string
          scope: GuestTrialScope
          tenant_id: string | null
          enabled: boolean
          duration_seconds: number
          starts_on: GuestTrialStartsOn
          max_sessions: number
          allow_pdf: boolean
          allow_checkout: boolean
          allow_conversion: boolean
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          scope: GuestTrialScope
          tenant_id?: string | null
          enabled?: boolean
          duration_seconds: number
          starts_on?: GuestTrialStartsOn
          max_sessions?: number
          allow_pdf?: boolean
          allow_checkout?: boolean
          allow_conversion?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: GuestTrialScope
          tenant_id?: string | null
          enabled?: boolean
          duration_seconds?: number
          starts_on?: GuestTrialStartsOn
          max_sessions?: number
          allow_pdf?: boolean
          allow_checkout?: boolean
          allow_conversion?: boolean
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guest_access_grants: {
        Row: {
          id: string
          anonymous_user_id: string
          mode: GuestGrantMode
          policy_id: string | null
          provider_checkout_id: string | null
          provider_payment_id: string | null
          starts_at: string
          expires_at: string | null
          max_uses: number
          used_uses: number
          status: GuestGrantStatus
          consumed_at: string | null
          converted_user_id: string | null
          retention_until: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anonymous_user_id: string
          mode: GuestGrantMode
          policy_id?: string | null
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          starts_at?: string
          expires_at?: string | null
          max_uses?: number
          used_uses?: number
          status?: GuestGrantStatus
          consumed_at?: string | null
          converted_user_id?: string | null
          retention_until?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anonymous_user_id?: string
          mode?: GuestGrantMode
          policy_id?: string | null
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          starts_at?: string
          expires_at?: string | null
          max_uses?: number
          used_uses?: number
          status?: GuestGrantStatus
          consumed_at?: string | null
          converted_user_id?: string | null
          retention_until?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          tenant_id: string | null
          workspace_id: string | null
          actor_user_id: string | null
          source: AuditSource
          action: string
          entity_type: string
          entity_id: string | null
          before_data: Json | null
          after_data: Json | null
          metadata: Json | null
          retention_until: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          workspace_id?: string | null
          actor_user_id?: string | null
          source: AuditSource
          action: string
          entity_type: string
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json | null
          retention_until?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          workspace_id?: string | null
          actor_user_id?: string | null
          source?: AuditSource
          action?: string
          entity_type?: string
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json | null
          retention_until?: string
          created_at?: string
        }
        Relationships: []
      }
      legal_retention_archives: {
        Row: {
          id: string
          source_table: LegalRetentionArchiveSource
          source_id: string
          tenant_id: string | null
          source_snapshot: Json
          retention_until: string
          archived_at: string
          created_at: string
        }
        Insert: {
          id?: string
          source_table: LegalRetentionArchiveSource
          source_id: string
          tenant_id?: string | null
          source_snapshot: Json
          retention_until: string
          archived_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          source_table?: LegalRetentionArchiveSource
          source_id?: string
          tenant_id?: string | null
          source_snapshot?: Json
          retention_until?: string
          archived_at?: string
          created_at?: string
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          id: string
          user_id: string
          generation_id: string
          code_hash: string
          used_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          generation_id: string
          code_hash: string
          used_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          generation_id?: string
          code_hash?: string
          used_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          id: string
          scope: string
          key: string
          action: string
          window_start: string
          window_seconds: number
          max_attempts: number
          attempt_count: number
          last_attempt_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scope: string
          key: string
          action: string
          window_start: string
          window_seconds: number
          max_attempts: number
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: string
          key?: string
          action?: string
          window_start?: string
          window_seconds?: number
          max_attempts?: number
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_entitlement_usage: {
        Row: {
          id: string
          tenant_id: string
          entitlement_key: string
          period_start: string
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          entitlement_key: string
          period_start: string
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          entitlement_key?: string
          period_start?: string
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_invitation_by_id: {
        Args: {
          p_invitation_id: string
        }
        Returns: {
          invitation_id: string
          tenant_id: string
          workspace_id: string
        }[]
      }
      is_active_tenant_member: {
        Args: { p_user_id: string; p_tenant_id: string }
        Returns: boolean
      }
      is_active_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      has_capability: {
        Args: { p_user_id: string; p_tenant_id: string; p_capability_key: string }
        Returns: boolean
      }
      is_active_platform_member: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      get_platform_capabilities: {
        Args: { p_user_id: string }
        Returns: { capability_key: string }[]
      }
      has_platform_capability: {
        Args: { p_user_id: string; p_capability_key: string }
        Returns: boolean
      }
      create_platform_role: {
        Args: { p_key: string; p_name: string }
        Returns: {
          id: string
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          updated_at: string
          created_at: string
        }[]
      }
      update_platform_role: {
        Args: {
          p_role_id: string
          p_name: string | null
          p_is_active: boolean | null
          p_updated_at: string
        }
        Returns: {
          id: string
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          updated_at: string
          created_at: string
        }[]
      }
      replace_platform_role_capabilities: {
        Args: {
          p_role_id: string
          p_capability_keys: string[]
          p_updated_at: string
        }
        Returns: {
          id: string
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          updated_at: string
          created_at: string
        }[]
      }
      replace_role_capabilities: {
        Args: {
          p_role_id: string
          p_capability_keys: string[]
          p_updated_at: string
        }
        Returns: {
          id: string
          tenant_id: string | null
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      create_unified_tenant_role: {
        Args: {
          p_tenant_id: string | null
          p_key: string
          p_name: string
          p_global?: boolean
        }
        Returns: {
          id: string
          tenant_id: string | null
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      update_unified_tenant_role: {
        Args: {
          p_role_id: string
          p_name: string | null
          p_is_active: boolean | null
          p_updated_at: string
        }
        Returns: {
          id: string
          tenant_id: string | null
          key: string
          name: string
          is_system: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      provision_initial_super_admin: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_effective_capabilities: {
        Args: { p_user_id: string; p_tenant_id: string }
        Returns: { capability_key: string }[]
      }
      get_effective_workspace_capabilities: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: { capability_key: string }[]
      }
      has_workspace_capability: {
        Args: { p_user_id: string; p_workspace_id: string; p_capability_key: string }
        Returns: boolean
      }
      accept_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          invitation_id: string
          tenant_id: string
          workspace_id: string
        }[]
      }
      complete_pending_registration: {
        Args: { p_user_id: string }
        Returns: string | null
      }
      set_primary_tenant: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      create_billing_customer: {
        Args: {
          p_tenant_id: string
          p_provider_customer_id: string
          p_billing_email: string | null
        }
        Returns: {
          id: string
          tenant_id: string
          provider_customer_id: string
          billing_email: string | null
          country: string | null
          tax_id: string | null
          created_at: string
          updated_at: string
        }[]
      }
      get_pending_registration_cleanup_status: {
        Args: Record<string, never>
        Returns: {
          retention_days: number
          pending_count: number
          eligible_count: number
          oldest_created_at: string | null
        }[]
      }
      update_pending_registration_retention: {
        Args: { p_retention_days: number }
        Returns: {
          retention_days: number
          pending_count: number
          eligible_count: number
          oldest_created_at: string | null
        }[]
      }
      cleanup_pending_registrations: {
        Args: Record<string, never>
        Returns: {
          deleted_count: number
          retention_days: number
          cutoff_at: string
        }[]
      }
      consume_access_grant: {
        Args: { p_grant_id: string; p_user_id: string }
        Returns: boolean
      }
      start_trial: {
        Args: { p_tenant_id: string }
        Returns: TrialStartRpcRow[]
      }
      start_guest_trial: {
        Args: {
          p_eligibility_key_hash: string
          p_session_id: string
          p_claim_nonce_hash: string
        }
        Returns: GuestTrialStartRpcRow[]
      }
      get_guest_trial_session: {
        Args: {
          p_session_id: string
          p_claim_nonce_hash: string
        }
        Returns: GuestTrialSessionRpcRow[]
      }
      end_guest_trial: {
        Args: {
          p_session_id: string
          p_claim_nonce_hash: string
        }
        Returns: boolean
      }
      claim_guest_trial: {
        Args: {
          p_session_id: string
          p_claim_nonce_hash: string
        }
        Returns: GuestTrialClaimRpcRow[]
      }
      create_pending_one_time_grant: {
        Args: { p_grant_id: string; p_plan_id: string; p_tenant_id: string }
        Returns: {
          id: string
          tenant_id: string
          user_id: string
          mode: AccessGrantMode
          policy_id: string | null
          source_plan_id: string | null
          provider_checkout_id: string | null
          provider_payment_id: string | null
          starts_at: string
          expires_at: string | null
          max_uses: number
          used_uses: number
          status: AccessGrantStatus
          consumed_at: string | null
          revoked_at: string | null
          retention_until: string
          created_at: string
          updated_at: string
        }[]
      }
      attach_one_time_checkout_reference: {
        Args: { p_grant_id: string; p_tenant_id: string; p_checkout_id: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: {
          p_scope: string
          p_key: string
          p_action: string
          p_window_seconds: number
          p_max_attempts: number
        }
        Returns: boolean
      }
      replace_mfa_recovery_codes: {
        Args: {
          p_user_id: string
          p_generation_id: string
          p_code_hashes: string[]
        }
        Returns: number
      }
      revoke_mfa_recovery_codes: {
        Args: { p_user_id: string }
        Returns: number
      }
      consume_billing_entitlement_usage: {
        Args: {
          p_tenant_id: string
          p_entitlement_key: string
        }
        Returns: PdfMonthlyUsageRpcRow[]
      }
      consume_billing_grant_entitlement_usage: {
        Args: {
          p_tenant_id: string
          p_grant_id: string
          p_entitlement_key: string
        }
        Returns: PdfMonthlyUsageRpcRow[]
      }
      submit_vid_request: {
        Args: {
          p_verification_method: string
          p_provider_reference: string | null
          p_correlation_id: string | null
        }
        Returns: {
          id: string
          user_id: string
          status: VidRequestStatus
          verification_method: VidVerificationMethod
          provider_reference: string | null
          metadata: Json
          decision_reason: string | null
          reviewer_user_id: string | null
          submitted_at: string
          reviewed_at: string | null
          retention_until: string
          version: number
          correlation_id: string | null
          created_at: string
          updated_at: string
        }[]
      }
      review_vid_request: {
        Args: {
          p_request_id: string
          p_expected_version: number
          p_action: string
          p_reason: string | null
          p_correlation_id: string | null
        }
        Returns: {
          id: string
          user_id: string
          status: VidRequestStatus
          verification_method: VidVerificationMethod
          provider_reference: string | null
          metadata: Json
          decision_reason: string | null
          reviewer_user_id: string | null
          submitted_at: string
          reviewed_at: string | null
          retention_until: string
          version: number
          correlation_id: string | null
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
