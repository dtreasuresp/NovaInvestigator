import { logger } from '@/lib/logger'
import { randomUUID } from 'crypto'
import { NovaiEvidenceRepository } from './evidence-repository'
import type { NovaiEvent, EvidenceEvent, CalculationEvent, AuditFindingEvent, SourceEvent } from './events'

export interface EvidenceLinkOptions {
  runId: string
  tenantId: string
  conversationId?: string | null
  investigationId?: string | null
  event: NovaiEvent
  principal?: unknown
}

export interface CitationGenerationOptions {
  messageId: string
  runId: string
  tenantId: string
  assistantText: string
  events: NovaiEvent[]
}

export class NovaiEvidenceService {
  static async processEvent(client: unknown, options: EvidenceLinkOptions): Promise<void> {
    const { runId, tenantId, conversationId, investigationId, event } = options
    try {
      if (event.type === 'evidence') {
        await this.saveEvidenceFromEvent(client as never, { runId, tenantId, conversationId: conversationId ?? null, investigationId: investigationId ?? null, event: event as EvidenceEvent })
      } else if (event.type === 'calculation') {
        await this.saveCalculationEvidence(client as never, { runId, tenantId, conversationId: conversationId ?? null, investigationId: investigationId ?? null, event: event as CalculationEvent })
      } else if (event.type === 'audit') {
        await this.saveAuditEvidence(client as never, { runId, tenantId, conversationId: conversationId ?? null, investigationId: investigationId ?? null, event: event as AuditFindingEvent })
      } else if (event.type === 'source') {
        await this.saveSourceEvidence(client as never, { runId, tenantId, conversationId: conversationId ?? null, investigationId: investigationId ?? null, event: event as SourceEvent })
      }
    } catch (err) {
      logger.warn('Error processing evidence event', {
        action: 'novai.evidence.process_event',
        details: { eventType: event.type, runId, error: err instanceof Error ? err.message : String(err) }
      })
    }
  }

  private static async saveEvidenceFromEvent(
    client: unknown,
    options: { runId: string; tenantId: string; conversationId: string | null; investigationId: string | null; event: EvidenceEvent }
  ): Promise<void> {
    const { runId, tenantId, conversationId, event } = options
    if (event.source === 'internal' && event.factorId) {
      await NovaiEvidenceRepository.saveEvidence(client as never, {
        tenantId,
        conversationId,
        investigationId: event.investigationId ?? null,
        runId,
        sourceId: `evidence-${event.evidenceId}`,
        sourceType: 'database_evidence',
        claim: `Factor ${event.factorId}: ${event.title}`,
        excerpt: event.snippet,
        location: event.documentName ? `${event.documentName}${event.page ? ` p.${event.page}` : ''}` : null,
        confidence: event.confidence ?? 1.0,
        epistemicStatus: 'FACT',
        factorId: event.factorId,
        documentName: event.documentName ?? null,
        url: null,
        page: event.page != null ? String(event.page) : null,
        retrievedAt: new Date().toISOString(),
        metadata: { factorType: event.factorType } as Record<string, unknown>
      })
    }
  }

  private static async saveCalculationEvidence(
    client: unknown,
    options: { runId: string; tenantId: string; conversationId: string | null; investigationId: string | null; event: CalculationEvent }
  ): Promise<void> {
    const { runId, tenantId, conversationId, investigationId, event } = options
    if (typeof event.total === 'number') {
      await NovaiEvidenceRepository.saveEvidence(client as never, {
        tenantId,
        conversationId,
        investigationId,
        runId,
        sourceId: `calculation-${event.matrixType}-${Date.now()}`,
        sourceType: 'tool_derived',
        claim: `${event.matrixType.toUpperCase()} = ${event.total.toFixed(3)} (${event.summary})`,
        excerpt: event.formula ?? `Σ(weight × rating) sobre ${event.factorsEvaluated ?? 0} factores`,
        location: event.matrixType,
        confidence: 1.0,
        epistemicStatus: 'FACT',
        factorId: null,
        documentName: 'Cálculo Determinista',
        url: null,
        page: null,
        retrievedAt: new Date().toISOString(),
        metadata: { matrixType: event.matrixType, formula: event.formula, factorsEvaluated: event.factorsEvaluated, interpretation: event.interpretation, details: event.details } as Record<string, unknown>
      })
    }
  }

  private static async saveAuditEvidence(
    client: unknown,
    options: { runId: string; tenantId: string; conversationId: string | null; investigationId: string | null; event: AuditFindingEvent }
  ): Promise<void> {
    const { runId, tenantId, conversationId, investigationId, event } = options
    await NovaiEvidenceRepository.saveEvidence(client as never, {
      tenantId,
      conversationId,
      investigationId,
      runId,
      sourceId: `audit-${event.code}-${Date.now()}`,
      sourceType: 'tool_derived',
      claim: `Auditoría: ${event.code} - ${event.message}`,
      excerpt: event.recommendation ?? event.message,
      location: event.target,
      confidence: event.status === 'VALID' ? 1.0 : event.status === 'WARNING' ? 0.7 : 0.3,
      epistemicStatus: event.status === 'VALID' ? 'FACT' : 'INFERENCE',
      factorId: null,
      documentName: 'Auditoría Determinista',
      url: null,
      page: null,
      retrievedAt: new Date().toISOString(),
      metadata: { code: event.code, severity: event.severity, status: event.status, target: event.target, recommendation: event.recommendation, contradictionWith: event.contradictionWith } as Record<string, unknown>
    })
  }

  private static async saveSourceEvidence(
    client: unknown,
    options: { runId: string; tenantId: string; conversationId: string | null; investigationId: string | null; event: SourceEvent }
  ): Promise<void> {
    const { runId, tenantId, conversationId, investigationId, event } = options
    const isExternal = event.sourceType === 'external'
    const sourceType = isExternal ? 'web_source' as const : 'internal_document' as const
    await NovaiEvidenceRepository.saveEvidence(client as never, {
      tenantId,
      conversationId,
      investigationId,
      runId,
      sourceId: `source-${event.name}-${Date.now()}`,
      sourceType,
      claim: `Fuente ${isExternal ? 'externa' : 'interna'}: ${event.name}`,
      excerpt: event.excerpt ?? event.name,
      location: event.url ?? event.documentId ?? null,
      confidence: 1.0,
      epistemicStatus: isExternal ? 'INFERENCE' : 'FACT',
      factorId: null,
      documentName: event.name,
      url: event.url ?? null,
      page: event.page != null ? String(event.page) : null,
      retrievedAt: event.retrievedAt ?? new Date().toISOString(),
      metadata: { sourceType: event.sourceType, factorCount: (event as { factorCount?: number }).factorCount, page: event.page } as Record<string, unknown>
    })
  }

  static async generateInlineCitations(
    _client: unknown,
    options: CitationGenerationOptions
  ): Promise<Array<{ id: string; evidenceId: string; messageId: string; runId: string; claim: string; excerpt: string; location: string }>> {
    const { messageId, runId, assistantText, events } = options
    const evidenceMap = new Map<string, EvidenceEvent>()
    for (const event of events) {
      if (event.type === 'evidence') evidenceMap.set((event as EvidenceEvent).evidenceId, event as EvidenceEvent)
    }
    if (evidenceMap.size === 0) return []
    const citations: Array<{ id: string; evidenceId: string; messageId: string; runId: string; claim: string; excerpt: string; location: string }> = []
    const factorCodes = assistantText.match(/\b([DFAO])-?\d{1,2}\b/gi) ?? []
    for (const factorCode of factorCodes) {
      const upperCode = factorCode.toUpperCase()
      const matching = Array.from(evidenceMap.values()).filter(e => e.factorId?.toUpperCase() === upperCode)
      for (const event of matching) {
        citations.push({ id: randomUUID(), evidenceId: event.evidenceId, messageId, runId, claim: `Factor ${upperCode} referenciado`, excerpt: event.snippet ?? event.title ?? `Evidencia ${upperCode}`, location: `factor:${upperCode}` })
      }
    }
    return citations
  }

  static async getSourceGroupsForRun(client: unknown, runId: string, tenantId: string) {
    return NovaiEvidenceRepository.getEvidenceGroupedBySource(client as never, runId, tenantId)
  }
}
