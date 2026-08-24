import { requirePlatformCapability } from '@/features/access/access-service'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const PENDING_REGISTRATION_CLEANUP_CAPABILITY = 'platform.auth.registrations.manage' as const

export interface PendingRegistrationCleanupStatus {
  retentionDays: number
  pendingCount: number
  eligibleCount: number
  oldestCreatedAt: string | null
}

export interface PendingRegistrationCleanupResult {
  deletedCount: number
  retentionDays: number
  cutoffAt: string
}

type CleanupStatusRow = {
  retention_days: number
  pending_count: number
  eligible_count: number
  oldest_created_at: string | null
}

type CleanupResultRow = {
  deleted_count: number
  retention_days: number
  cutoff_at: string
}

const toStatus = (row: CleanupStatusRow): PendingRegistrationCleanupStatus => ({
  retentionDays: row.retention_days,
  pendingCount: Number(row.pending_count),
  eligibleCount: Number(row.eligible_count),
  oldestCreatedAt: row.oldest_created_at
})

const toResult = (row: CleanupResultRow): PendingRegistrationCleanupResult => ({
  deletedCount: Number(row.deleted_count),
  retentionDays: row.retention_days,
  cutoffAt: row.cutoff_at
})

const getAuthorizedClient = async () => {
  await requirePlatformCapability(PENDING_REGISTRATION_CLEANUP_CAPABILITY)

  return createSupabaseServerClient()
}

export async function getPendingRegistrationCleanupStatus(): Promise<PendingRegistrationCleanupStatus> {
  const supabase = await getAuthorizedClient()
  const { data, error } = await supabase.rpc('get_pending_registration_cleanup_status', {})

  if (error || !data?.[0]) {
    throw new Error('pending_registration_cleanup_status_failed')
  }

  return toStatus(data[0])
}

export async function updatePendingRegistrationRetention(retentionDays: number) {
  const supabase = await getAuthorizedClient()

  const { data, error } = await supabase.rpc('update_pending_registration_retention', {
    p_retention_days: retentionDays
  })

  if (error || !data?.[0]) {
    throw new Error('pending_registration_retention_update_failed')
  }

  return toStatus(data[0])
}

export async function cleanupPendingRegistrations(): Promise<{
  result: PendingRegistrationCleanupResult
  status: PendingRegistrationCleanupStatus
}> {
  const supabase = await getAuthorizedClient()
  const { data, error } = await supabase.rpc('cleanup_pending_registrations', {})

  if (error || !data?.[0]) {
    throw new Error('pending_registration_cleanup_failed')
  }

  const { data: statusData, error: statusError } = await supabase.rpc('get_pending_registration_cleanup_status', {})

  if (statusError || !statusData?.[0]) {
    throw new Error('pending_registration_cleanup_status_failed')
  }

  return {
    result: toResult(data[0]),
    status: toStatus(statusData[0])
  }
}
