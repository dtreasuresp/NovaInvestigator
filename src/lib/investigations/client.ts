import type { InvestigationCollaborator, InvestigationState } from '@/types/apps/investigator-types'

import { SCHEMA_VERSION, normalizeStoredState } from '@/utils/investigator/workspace'

import type {
  InvestigationMetadataDto,
  InvestigationRecordDto,
  ListInvestigationsResultDto
} from './service'

interface ApiErrorPayload {
  error?: {
    code?: string
    messageKey?: string
    details?: Record<string, unknown>
  }
}

export class InvestigationClientError extends Error {
  readonly status: number
  readonly code: string
  readonly messageKey: string
  readonly details?: Record<string, unknown>

  constructor(
    status: number,
    code: string,
    messageKey: string,
    details?: Record<string, unknown>
  ) {
    super(messageKey)
    this.name = 'InvestigationClientError'
    this.status = status
    this.code = code
    this.messageKey = messageKey
    this.details = details
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  })

  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload

    throw new InvestigationClientError(
      response.status,
      errorPayload.error?.code ?? 'INTERNAL_ERROR',
      errorPayload.error?.messageKey ?? 'investigations.internalError',
      errorPayload.error?.details
    )
  }

  return payload as T
}

async function listRemoteMetadata(): Promise<InvestigationMetadataDto[]> {
  const pageSize = 100
  const items: InvestigationMetadataDto[] = []
  let page = 1
  let total = 0

  do {
    const result = await request<ListInvestigationsResultDto>(
      `/api/investigations?page=${page}&pageSize=${pageSize}&includeArchived=true`
    )

    items.push(...result.items)
    total = result.total
    page += 1
  } while (items.length < total)

  return items
}

export async function listRemoteInvestigations(): Promise<InvestigationRecordDto[]> {
  const metadata = await listRemoteMetadata()

  return Promise.all(metadata.map(item => getRemoteInvestigation(item.id)))
}

export function mapRemoteInvestigation(record: InvestigationRecordDto): InvestigationState {
  const state = normalizeStoredState(record.state)

  return {
    ...state,
    metadata: {
      ...state.metadata,
      id: record.id,
      title: record.title,
      status: record.status,
      archivedAt: record.archivedAt,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      ownerId: record.ownerId,
      createdByName: record.createdByName,
      updatedByName: record.updatedByName,
      lastOpenedAt: record.lastOpenedAt,
      lastOpenedByName: record.lastOpenedByName,
      isLocked: record.isLocked,
      accessLevel: record.accessLevel,
      collaborators:
        (record.state as unknown as InvestigationState)?.metadata?.collaborators ||
        state.metadata?.collaborators ||
        [],
      version: record.version
    }
  }
}

export async function getRemoteInvestigation(
  id: string,
  options: { touch?: boolean } = {}
): Promise<InvestigationRecordDto> {
  const query = options.touch ? '?touch=true' : ''

  return request<InvestigationRecordDto>(`/api/investigations/${encodeURIComponent(id)}${query}`)
}

export interface CreateRemoteInvestigationOptions {
  idempotencyKey?: string
  source?: 'user' | 'migration'
}

function generateClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return (([1e7] as unknown as string) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    )
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}

export async function createRemoteInvestigation(
  state: InvestigationState,
  options: CreateRemoteInvestigationOptions = {}
): Promise<InvestigationRecordDto> {
  return request<InvestigationRecordDto>('/api/investigations', {
    method: 'POST',
    body: JSON.stringify({
      title: state.metadata.title,
      state,
      schemaVersion: SCHEMA_VERSION,
      idempotencyKey: options.idempotencyKey ?? generateClientUuid(),
      source: options.source ?? 'user'
    })
  })
}

export interface PatchRemoteInvestigationOptions {
  isLocked?: boolean
  accessLevel?: 'private' | 'team_read' | 'team_write'
  collaborators?: InvestigationCollaborator[]
}

export async function patchRemoteInvestigation(
  id: string,
  version: number,
  state: InvestigationState,
  options?: PatchRemoteInvestigationOptions
): Promise<InvestigationRecordDto> {
  return request<InvestigationRecordDto>(`/api/investigations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version,
      title: state.metadata.title,
      state,
      ...(options?.isLocked !== undefined ? { isLocked: options.isLocked } : {}),
      ...(options?.accessLevel !== undefined ? { accessLevel: options.accessLevel } : {}),
      ...(options?.collaborators !== undefined ? { collaborators: options.collaborators } : {})
    })
  })
}

export async function toggleRemoteInvestigationLock(
  id: string,
  version: number,
  isLocked: boolean,
  accessLevel?: 'private' | 'team_read' | 'team_write'
): Promise<InvestigationRecordDto> {
  return request<InvestigationRecordDto>(`/api/investigations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version,
      isLocked,
      ...(accessLevel !== undefined ? { accessLevel } : {})
    })
  })
}

export async function updateRemoteInvestigationSharing(
  id: string,
  version: number,
  params: {
    isLocked?: boolean
    accessLevel?: 'private' | 'team_read' | 'team_write'
    collaborators?: InvestigationCollaborator[]
  }
): Promise<InvestigationRecordDto> {
  return request<InvestigationRecordDto>(`/api/investigations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version,
      ...(params.isLocked !== undefined ? { isLocked: params.isLocked } : {}),
      ...(params.accessLevel !== undefined ? { accessLevel: params.accessLevel } : {}),
      ...(params.collaborators !== undefined ? { collaborators: params.collaborators } : {})
    })
  })
}

export async function transitionRemoteInvestigation(
  id: string,
  action: 'archive' | 'restore' | 'close',
  version: number
): Promise<InvestigationRecordDto> {
  return request<InvestigationRecordDto>(`/api/investigations/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ version })
  })
}
