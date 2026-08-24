import {
  getCurrentPrincipal,
  requireAuthenticatedUser,
  requirePlatformCapability
} from '@/features/access/access-service'
import type { VidStatus } from '@/lib/supabase/database.types'

import { VidError } from './errors'
import { enforceVidRateLimit } from './rate-limit'
import {
  getLatestVidRequest,
  getVidProfiles,
  listVidRequests,
  reviewVidRequest,
  submitVidRequest
} from './repository'
import type {
  ListVidRequestsResult,
  VidAdminRequestSummary,
  VidRequestSummary,
  VidUserState
} from './types'
import type { VidRequestStatus, VidVerificationMethod } from '@/lib/supabase/database.types'

const mapRequest = (row: {
  id: string
  user_id: string
  status: VidRequestStatus
  verification_method: VidVerificationMethod
  provider_reference: string | null
  decision_reason: string | null
  reviewer_user_id: string | null
  submitted_at: string
  reviewed_at: string | null
  retention_until: string
  version: number
  correlation_id: string | null
  created_at: string
  updated_at: string
}): VidRequestSummary => ({
  id: row.id,
  userId: row.user_id,
  status: row.status,
  verificationMethod: row.verification_method,
  providerReference: row.provider_reference,
  decisionReason: row.decision_reason,
  reviewerUserId: row.reviewer_user_id,
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  retentionUntil: row.retention_until,
  version: row.version,
  correlationId: row.correlation_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const requireVidProfile = async () => {
  const principal = await requireAuthenticatedUser()

  if (principal.isAnonymous || principal.profileStatus !== 'active') {
    throw VidError.profileUnavailable()
  }

  return principal
}

export async function getCurrentVidState(): Promise<VidUserState> {
  const principal = await requireVidProfile()
  const request = await getLatestVidRequest(principal.userId)

  return {
    profileStatus: principal.profileStatus,
    vidStatus: principal.vidStatus,
    request: request ? mapRequest(request) : null
  }
}

export async function submitCurrentUserVid(input: {
  verificationMethod: VidVerificationMethod
  providerReference?: string
  correlationId: string
}): Promise<VidUserState> {
  const principal = await requireVidProfile()

  await enforceVidRateLimit('submit', principal.userId)
  const request = await submitVidRequest(input)
  const nextPrincipal = await getCurrentPrincipal()

  return {
    profileStatus: nextPrincipal?.profileStatus ?? principal.profileStatus,
    vidStatus: nextPrincipal?.vidStatus ?? 'pending',
    request: mapRequest(request)
  }
}

export async function getPlatformVidRequests(input: {
  page: number
  pageSize: number
  status?: VidRequestStatus
}): Promise<ListVidRequestsResult> {
  await requirePlatformCapability('platform.vid.read')
  const { rows, total } = await listVidRequests(input)
  const profiles = await getVidProfiles(rows.map(row => row.user_id))
  const profileById = new Map(profiles.map(profile => [profile.id, profile]))

  const items: VidAdminRequestSummary[] = rows.map(row => {
    const profile = profileById.get(row.user_id)

    return {
      ...mapRequest(row),
      displayName: profile?.display_name ?? null,
      profileVidStatus: (profile?.vid_status as VidStatus | undefined) ?? null
    }
  })

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total
  }
}

export async function reviewPlatformVidRequest(input: {
  requestId: string
  expectedVersion: number
  action: 'start_review' | 'approve' | 'reject' | 'request_resubmission' | 'reopen'
  reason?: string
  correlationId: string
}): Promise<VidRequestSummary> {
  const principal = await requireAuthenticatedUser()

  await requirePlatformCapability('platform.vid.review')

  await enforceVidRateLimit('review', `${principal.userId}:${input.requestId}`)

  const request = await reviewVidRequest(input)

  return mapRequest(request)
}
