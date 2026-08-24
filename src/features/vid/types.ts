import type { VidRequestStatus, VidVerificationMethod } from '@/lib/supabase/database.types'

export type VidReviewAction = 'start_review' | 'approve' | 'reject' | 'request_resubmission' | 'reopen'

export interface VidRequestSummary {
  id: string
  userId: string
  status: VidRequestStatus
  verificationMethod: VidVerificationMethod
  providerReference: string | null
  decisionReason: string | null
  reviewerUserId: string | null
  submittedAt: string
  reviewedAt: string | null
  retentionUntil: string
  version: number
  correlationId: string | null
  createdAt: string
  updatedAt: string
}

export interface VidUserState {
  profileStatus: string | null
  vidStatus: 'pending' | 'verified' | 'rejected' | null
  request: VidRequestSummary | null
}

export interface VidAdminRequestSummary extends VidRequestSummary {
  displayName: string | null
  profileVidStatus: 'pending' | 'verified' | 'rejected' | null
}

export interface ListVidRequestsResult {
  items: VidAdminRequestSummary[]
  page: number
  pageSize: number
  total: number
}
