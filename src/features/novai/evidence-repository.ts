import type { SupabaseClient } from '@supabase/supabase-js'

import { logger } from '@/lib/logger'
import type { Evidence, Citation, SourceGroup, EvidenceSourceType } from './evidence-model'

interface EvidenceRow {
  id: string
  tenant_id: string
  conversation_id: string | null
  investigation_id: string | null
  run_id: string | null
  source_id: string
  source_type: EvidenceSourceType
  claim: string
  excerpt: string
  location: string | null
  confidence: number
  epistemic_status: string
  factor_id: string | null
  document_name: string | null
  url: string | null
  page: string | null
  retrieved_at: string
  created_at: string
  metadata: Record<string, unknown>
}

interface CitationRow {
  id: string
  tenant_id: string
  evidence_id: string
  message_id: string | null
  run_id: string | null
  claim: string
  excerpt: string
  location: string | null
  created_at: string
}

/**
 * NovAi Evidence Repository
 * Persistencia y recuperación de evidencia estructurada y citas
 */
export class NovaiEvidenceRepository {
  /**
   * Guarda una evidencia nueva
   */
  static async saveEvidence(
    client: SupabaseClient,
    evidence: Omit<Evidence, 'id' | 'createdAt'>
  ): Promise<Evidence | null> {
    try {
      const payload: Record<string, unknown> = {
        tenant_id: evidence.tenantId,
        conversation_id: evidence.conversationId,
        investigation_id: evidence.investigationId,
        run_id: evidence.runId,
        source_id: evidence.sourceId,
        source_type: evidence.sourceType,
        claim: evidence.claim,
        excerpt: evidence.excerpt,
        location: evidence.location,
        confidence: evidence.confidence,
        epistemic_status: evidence.epistemicStatus,
        factor_id: evidence.factorId,
        document_name: evidence.documentName,
        url: evidence.url,
        page: evidence.page,
        retrieved_at: evidence.retrievedAt,
        metadata: evidence.metadata
      }

      const { data, error } = await client
        .from('novai_evidence')
        .insert(payload as never)
        .select()
        .single()

      if (error) {
        logger.warn('Error saving evidence', {
          action: 'novai.evidence.save',
          details: { errorMessage: error.message, tenantId: evidence.tenantId }
        })
        return null
      }

      return this.mapRowToEvidence(data as EvidenceRow)
    } catch (err) {
      logger.warn('Exception saving evidence', {
        action: 'novai.evidence.save',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return null
    }
  }

  /**
   * Guarda múltiples evidencias en batch
   */
  static async saveEvidenceBatch(
    client: SupabaseClient,
    evidences: Array<Omit<Evidence, 'id' | 'createdAt'>>
  ): Promise<Evidence[]> {
    if (evidences.length === 0) return []

    try {
      const payload = evidences.map(e => ({
        tenant_id: e.tenantId,
        conversation_id: e.conversationId,
        investigation_id: e.investigationId,
        run_id: e.runId,
        source_id: e.sourceId,
        source_type: e.sourceType,
        claim: e.claim,
        excerpt: e.excerpt,
        location: e.location,
        confidence: e.confidence,
        epistemic_status: e.epistemicStatus,
        factor_id: e.factorId,
        document_name: e.documentName,
        url: e.url,
        page: e.page,
        retrieved_at: e.retrievedAt,
        metadata: e.metadata
      }))

      const { data, error } = await client
        .from('novai_evidence')
        .insert(payload)
        .select()

      if (error) {
        logger.warn('Error saving evidence batch', {
          action: 'novai.evidence.save_batch',
          details: { errorMessage: error.message, count: evidences.length }
        })
        return []
      }

      return (data || []).map(this.mapRowToEvidence)
    } catch (err) {
      logger.warn('Exception saving evidence batch', {
        action: 'novai.evidence.save_batch',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return []
    }
  }

  /**
   * Guarda una cita inline
   */
  static async saveCitation(
    client: SupabaseClient,
    citation: Omit<Citation, 'id' | 'createdAt'>
  ): Promise<Citation | null> {
    try {
      const payload = {
        tenant_id: citation.tenantId,
        evidence_id: citation.evidenceId,
        message_id: citation.messageId,
        run_id: citation.runId,
        claim: citation.claim,
        excerpt: citation.excerpt,
        location: citation.location
      }

      const { data, error } = await client
        .from('novai_citations')
        .insert(payload)
        .select()
        .single()

      if (error) {
        logger.warn('Error saving citation', {
          action: 'novai.citation.save',
          details: { errorMessage: error.message }
        })
        return null
      }

      return this.mapRowToCitation(data)
    } catch (err) {
      logger.warn('Exception saving citation', {
        action: 'novai.citation.save',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return null
    }
  }

  /**
   * Obtiene evidencias por run_id
   */
  static async getEvidenceByRunId(
    client: SupabaseClient,
    runId: string,
    tenantId: string
  ): Promise<Evidence[]> {
    try {
      const { data, error } = await client
        .from('novai_evidence')
        .select('*')
        .eq('run_id', runId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.warn('Error fetching evidence by run', {
          action: 'novai.evidence.get_by_run',
          details: { errorMessage: error.message, runId }
        })
        return []
      }

      return (data || []).map(this.mapRowToEvidence)
    } catch (err) {
      logger.warn('Exception fetching evidence by run', {
        action: 'novai.evidence.get_by_run',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return []
    }
  }

  /**
   * Obtiene evidencias por conversation_id
   */
  static async getEvidenceByConversationId(
    client: SupabaseClient,
    conversationId: string,
    tenantId: string
  ): Promise<Evidence[]> {
    try {
      const { data, error } = await client
        .from('novai_evidence')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.warn('Error fetching evidence by conversation', {
          action: 'novai.evidence.get_by_conversation',
          details: { errorMessage: error.message, conversationId }
        })
        return []
      }

      return (data || []).map(this.mapRowToEvidence)
    } catch (err) {
      logger.warn('Exception fetching evidence by conversation', {
        action: 'novai.evidence.get_by_conversation',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return []
    }
  }

  /**
   * Obtiene citas por message_id
   */
  static async getCitationsByMessageId(
    client: SupabaseClient,
    messageId: string,
    tenantId: string
  ): Promise<Citation[]> {
    try {
      const { data, error } = await client
        .from('novai_citations')
        .select('*')
        .eq('message_id', messageId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (error) {
        logger.warn('Error fetching citations by message', {
          action: 'novai.citation.get_by_message',
          details: { errorMessage: error.message, messageId }
        })
        return []
      }

      return (data || []).map(this.mapRowToCitation)
    } catch (err) {
      logger.warn('Exception fetching citations by message', {
        action: 'novai.citation.get_by_message',
        details: { errorMessage: err instanceof Error ? err.message : String(err) }
      })
      return []
    }
  }

  /**
   * Obtiene evidencias agrupadas por source_type para UI de agrupación
   */
  static async getEvidenceGroupedBySource(
    client: SupabaseClient,
    runId: string,
    tenantId: string
  ): Promise<SourceGroup[]> {
    const evidences = await this.getEvidenceByRunId(client, runId, tenantId)

    const groups = new Map<EvidenceSourceType, Evidence[]>()

    for (const ev of evidences) {
      const group = groups.get(ev.sourceType) || []
      group.push(ev)
      groups.set(ev.sourceType, group)
    }

    const sourceGroups: SourceGroup[] = []

    for (const [sourceType, evs] of groups) {
      const sourceMap = new Map<string, typeof evs[0][]>()

      for (const ev of evs) {
        const key = ev.documentName || ev.url || ev.sourceId || 'unknown'
        const arr = sourceMap.get(key) || []
        arr.push(ev)
        sourceMap.set(key, arr)
      }

      const sources = Array.from(sourceMap.entries()).map(([name, evs]) => ({
        id: name,
        name,
        url: evs[0]?.url,
        documentName: evs[0]?.documentName,
        factorCount: new Set(evs.map(e => e.factorId).filter(Boolean)).size,
        excerpt: evs[0]?.excerpt?.slice(0, 200),
        retrievedAt: evs[0]?.retrievedAt,
        evidenceCount: evs.length
      }))

      sourceGroups.push({
        sourceType,
        sources,
        totalEvidence: evs.length
      })
    }

    return sourceGroups
  }

  // Mapping helpers
  private static mapRowToEvidence(row: EvidenceRow): Evidence {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      conversationId: row.conversation_id,
      investigationId: row.investigation_id,
      runId: row.run_id,
      sourceId: row.source_id,
      sourceType: row.source_type,
      claim: row.claim,
      excerpt: row.excerpt,
      location: row.location,
      confidence: Number(row.confidence),
      epistemicStatus: row.epistemic_status as any,
      factorId: row.factor_id,
      documentName: row.document_name,
      url: row.url,
      page: row.page,
      retrievedAt: row.retrieved_at,
      createdAt: row.created_at,
      metadata: row.metadata
    }
  }

  private static mapRowToCitation(row: CitationRow): Citation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      evidenceId: row.evidence_id,
      messageId: row.message_id,
      runId: row.run_id,
      claim: row.claim,
      excerpt: row.excerpt,
      location: row.location,
      createdAt: row.created_at
    }
  }

  // Aliases for backward compat with tools/tests (Fase 5)
  static async createEvidence(client: SupabaseClient, evidence: Record<string, unknown>): Promise<Evidence | null> {
    const normalized: Omit<Evidence, 'id' | 'createdAt'> = {
      tenantId: (evidence.tenantId as string) ?? (evidence.tenant_id as string) ?? '',
      conversationId: (evidence.conversationId as string | null) ?? (evidence.conversation_id as string | null) ?? null,
      investigationId: (evidence.investigationId as string | null) ?? (evidence.investigation_id as string | null) ?? null,
      runId: (evidence.runId as string | null) ?? (evidence.run_id as string | null) ?? null,
      sourceId: (evidence.sourceId as string) ?? (evidence.source_id as string) ?? (evidence.url as string) ?? `src-${Date.now()}`,
      sourceType: (evidence.sourceType as Evidence['sourceType']) ?? (evidence.source_type as Evidence['sourceType']) ?? 'web_source',
      claim: (evidence.claim as string) ?? '',
      excerpt: (evidence.excerpt as string) ?? (evidence.snippet as string) ?? '',
      location: (evidence.location as string | null) ?? (evidence.url as string | null) ?? null,
      confidence: (evidence.confidence as number) ?? 1.0,
      epistemicStatus: (evidence.epistemicStatus as Evidence['epistemicStatus']) ?? (evidence.epistemic as string as Evidence['epistemicStatus']) ?? 'FACT',
      factorId: (evidence.factorId as string | null) ?? (evidence.factor_id as string | null) ?? null,
      documentName: (evidence.documentName as string | null) ?? (evidence.document_name as string | null) ?? null,
      url: (evidence.url as string | null) ?? null,
      page: (evidence.page as string | null) ?? null,
      retrievedAt: (evidence.retrievedAt as string) ?? (evidence.retrieved_at as string) ?? new Date().toISOString(),
      metadata: (evidence.metadata as Record<string, unknown>) ?? {},
    }
    return this.saveEvidence(client, normalized)
  }

  static async batchCreateEvidence(
    client: SupabaseClient,
    tenantIdOrEvidences: string | Array<Record<string, unknown>>,
    maybeEvidences?: Array<Record<string, unknown>>
  ): Promise<Evidence[]> {
    let evidences: Array<Omit<Evidence, 'id' | 'createdAt'>>
    if (typeof tenantIdOrEvidences === 'string' && Array.isArray(maybeEvidences)) {
      evidences = (maybeEvidences as unknown as Array<Record<string, unknown>>).map((e) => ({
        tenantId: (e.tenantId as string) ?? (tenantIdOrEvidences as string),
        conversationId: (e.conversationId as string | null) ?? null,
        investigationId: (e.investigationId as string | null) ?? null,
        runId: (e.runId as string | null) ?? null,
        sourceId: (e.sourceId as string) ?? (e.url as string) ?? `src-${Date.now()}`,
        sourceType: (e.sourceType as Evidence['sourceType']) ?? 'web_source',
        claim: (e.claim as string) ?? (e.title as string) ?? 'Evidencia externa',
        excerpt: (e.excerpt as string) ?? (e.snippet as string) ?? '',
        location: (e.location as string | null) ?? (e.url as string | null) ?? null,
        confidence: (e.confidence as number) ?? 1.0,
        epistemicStatus: (e.epistemicStatus as Evidence['epistemicStatus']) ?? (e.epistemic as string as Evidence['epistemicStatus']) ?? 'FACT',
        factorId: (e.factorId as string | null) ?? null,
        documentName: (e.documentName as string | null) ?? null,
        url: (e.url as string | null) ?? null,
        page: (e.page as string | null) ?? null,
        retrievedAt: (e.retrievedAt as string) ?? new Date().toISOString(),
        metadata: (e.metadata as Record<string, unknown>) ?? {},
      }))
    } else {
      const arr = tenantIdOrEvidences as Array<Record<string, unknown>>
      evidences = arr.map((e) => ({
        tenantId: (e.tenantId as string) ?? (e.tenant_id as string) ?? '',
        conversationId: (e.conversationId as string | null) ?? null,
        investigationId: (e.investigationId as string | null) ?? null,
        runId: (e.runId as string | null) ?? null,
        sourceId: (e.sourceId as string) ?? `src-${Date.now()}`,
        sourceType: (e.sourceType as Evidence['sourceType']) ?? 'web_source',
        claim: (e.claim as string) ?? '',
        excerpt: (e.excerpt as string) ?? '',
        location: (e.location as string | null) ?? null,
        confidence: (e.confidence as number) ?? 1.0,
        epistemicStatus: (e.epistemicStatus as Evidence['epistemicStatus']) ?? (e.epistemic as string as Evidence['epistemicStatus']) ?? 'FACT',
        factorId: (e.factorId as string | null) ?? null,
        documentName: (e.documentName as string | null) ?? null,
        url: (e.url as string | null) ?? null,
        page: (e.page as string | null) ?? null,
        retrievedAt: (e.retrievedAt as string) ?? new Date().toISOString(),
        metadata: (e.metadata as Record<string, unknown>) ?? {},
      }))
    }
    return this.saveEvidenceBatch(client, evidences)
  }

  static async createCitation(client: SupabaseClient, citation: Record<string, unknown>): Promise<Citation | null> {
    const normalized: Omit<Citation, 'id' | 'createdAt'> = {
      tenantId: (citation.tenantId as string) ?? (citation.tenant_id as string) ?? '',
      evidenceId: (citation.evidenceId as string) ?? (citation.evidence_id as string) ?? '',
      messageId: (citation.messageId as string | null) ?? (citation.message_id as string | null) ?? null,
      runId: (citation.runId as string | null) ?? (citation.run_id as string | null) ?? null,
      claim: (citation.claim as string) ?? '',
      excerpt: (citation.excerpt as string) ?? '',
      location: (citation.location as string | null) ?? null,
    }
    return this.saveCitation(client, normalized)
  }

  static async listEvidenceByInvestigation(
    client: SupabaseClient,
    investigationIdOrParams: string | { tenantId: string; investigationId: string },
    maybeTenantId?: string
  ): Promise<Evidence[]> {
    let investigationId: string
    let tenantId: string
    if (typeof investigationIdOrParams === 'object' && investigationIdOrParams !== null) {
      investigationId = (investigationIdOrParams as { investigationId: string }).investigationId
      tenantId = (investigationIdOrParams as { tenantId: string }).tenantId
    } else {
      investigationId = investigationIdOrParams as string
      tenantId = maybeTenantId as string
    }
    try {
      const baseQuery: unknown = (client as unknown as { from: (t: string) => unknown }).from('novai_evidence')
      const q1 = (baseQuery as { select: (s: string) => { eq: (f: string, v: string) => unknown } }).select('*')
      const q2 = (q1 as { eq: (f: string, v: string) => { eq: (f: string, v: string) => unknown } }).eq('investigation_id', investigationId)
      const q3 = (q2 as { eq: (f: string, v: string) => { order: (col: string, opts: unknown) => unknown } }).eq('tenant_id', tenantId)
      const q4 = (q3 as { order: (col: string, opts: unknown) => unknown }).order('created_at', { ascending: true })
      // Support both patterns: order -> {data,error} or order -> {limit -> {data,error}}
      const maybeLimit = q4 as { limit?: (n: number) => Promise<{ data: unknown; error: unknown }> }
      const result = typeof maybeLimit?.limit === 'function' ? await maybeLimit.limit(100) : await (q4 as Promise<{ data: unknown; error: unknown }>)
      const { data, error } = result as { data: unknown; error: unknown }
      if (error) return []
      return (data as EvidenceRow[] || []).map((r) => this.mapRowToEvidence(r as EvidenceRow))
    } catch {
      return []
    }
  }
}
