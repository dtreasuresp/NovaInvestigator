import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database, VidRequestStatus, VidVerificationMethod } from '@/lib/supabase/database.types'

import { VidError } from './errors'
import type { VidReviewAction } from './types'

type VidRequestRow = Database['public']['Tables']['vid_requests']['Row']
type VidRequestRpcRow = Database['public']['Functions']['submit_vid_request']['Returns'][number]

const VID_REQUEST_COLUMNS =
  'id, user_id, status, verification_method, provider_reference, metadata, decision_reason, reviewer_user_id, submitted_at, reviewed_at, retention_until, redacted_at, version, correlation_id, created_at, updated_at' as const

const mapRpcRow = (row: VidRequestRpcRow): VidRequestRow => ({
  id: row.id,
  user_id: row.user_id,
  status: row.status,
  verification_method: row.verification_method,
  provider_reference: row.provider_reference,
  metadata: row.metadata,
  decision_reason: row.decision_reason,
  reviewer_user_id: row.reviewer_user_id,
  submitted_at: row.submitted_at,
  reviewed_at: row.reviewed_at,
  retention_until: row.retention_until,
  redacted_at: null,
  version: row.version,
  correlation_id: row.correlation_id,
  created_at: row.created_at,
  updated_at: row.updated_at
})

export async function getLatestVidRequest(userId: string): Promise<VidRequestRow | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('vid_requests')
    .select(VID_REQUEST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function submitVidRequest(input: {
  verificationMethod: VidVerificationMethod
  providerReference?: string
  correlationId: string
}): Promise<VidRequestRow> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('submit_vid_request', {
    p_verification_method: input.verificationMethod,
    p_provider_reference: input.providerReference ?? null,
    p_correlation_id: input.correlationId
  })

  if (error || !data?.[0]) {
    throw error ?? VidError.internal()
  }

  return mapRpcRow(data[0])
}

export async function listVidRequests(input: {
  page: number
  pageSize: number
  status?: VidRequestStatus
}): Promise<{ rows: VidRequestRow[]; total: number }> {
  const supabase = await createSupabaseServerClient()
  const from = (input.page - 1) * input.pageSize
  const to = from + input.pageSize - 1
  let query = supabase
    .from('vid_requests')
    .select(VID_REQUEST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (input.status) {
    query = query.eq('status', input.status)
  }

  const { data, error, count } = await query

  if (error) {
    throw error
  }

  return {
    rows: data ?? [],
    total: count ?? 0
  }
}

export async function getVidProfiles(userIds: string[]) {
  if (userIds.length === 0) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, vid_status')
    .in('id', userIds)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function reviewVidRequest(input: {
  requestId: string
  expectedVersion: number
  action: VidReviewAction
  reason?: string
  correlationId: string
}): Promise<VidRequestRow> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('review_vid_request', {
    p_request_id: input.requestId,
    p_expected_version: input.expectedVersion,
    p_action: input.action,
    p_reason: input.reason ?? null,
    p_correlation_id: input.correlationId
  })

  if (error || !data?.[0]) {
    throw error ?? VidError.internal()
  }

  return mapRpcRow(data[0])
}
