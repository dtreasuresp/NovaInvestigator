/**
 * Proyección de resultados de tools al protocolo canónico NovaiEvent (spec §24).
 *
 * Convierte payloads VERIFICADOS de las tools modulares en eventos estructurados
 * (`evidence`, `audit`, `calculation`, `source`) que la UI renderiza con las
 * tarjetas de dominio. Es una capa de solo lectura: nunca muta resultados,
 * nunca lanza excepciones y devuelve [] cuando no hay proyección posible.
 */

import type {
  AuditFindingEvent,
  CalculationEvent,
  CitationEvent,
  EvidenceEvent,
  NovaiEvent,
  SourceEvent,
  SourceGroupEvent
} from './events'

type SourceGroupEventInput = SourceGroupEvent & { sources: any[] }

type AnyRecord = Record<string, any>

const isRecord = (v: unknown): v is AnyRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const FACTOR_TYPES = new Set(['D', 'F', 'O', 'A'])

const factorTypeFromCode = (code?: string): EvidenceEvent['factorType'] => {
  const first = typeof code === 'string' ? code.trim().charAt(0).toUpperCase() : ''

  return FACTOR_TYPES.has(first) ? (first as EvidenceEvent['factorType']) : undefined
}

const evidenceEventFromFactor = (
  factor: AnyRecord,
  investigationId?: string
): EvidenceEvent => ({
  type: 'evidence',
  evidenceId: `${String(factor.id ?? factor.code ?? 'factor')}-evidence`,
  factorId: String(factor.code ?? factor.id ?? ''),
  factorType: FACTOR_TYPES.has(String(factor.type ?? '').toUpperCase())
    ? (String(factor.type).toUpperCase() as EvidenceEvent['factorType'])
    : undefined,
  title: `${String(factor.code ?? '')} · ${String(factor.name ?? 'Factor')}`.trim(),
  snippet: String(factor.evidence ?? ''),
  source: 'internal',
  documentName: 'Expediente de Investigación',
  investigationId,
  quality: factor.hasEvidence === false ? 'low' : 'unverified'
})

function projectGetFactorEvidence(result: AnyRecord): NovaiEvent[] {
  const factor = isRecord(result.factor) ? result.factor : null

  return factor ? [evidenceEventFromFactor(factor, safeInv(result))] : []
}

function projectSearchEvidence(result: AnyRecord): NovaiEvent[] {
  const results = Array.isArray(result.results) ? result.results : []

  return results.filter(isRecord).map(r => ({
    type: 'evidence',
    evidenceId: `search-${String(r.code ?? results.indexOf(r))}`,
    factorId: String(r.code ?? ''),
    factorType: factorTypeFromCode(String(r.code ?? '')),
    title: String(r.title ?? ''),
    snippet: String(r.snippet ?? ''),
    source: 'internal',
    documentName: 'Expediente de Investigación',
    investigationId: safeInv(result),
    confidence: typeof r.relevanceScore === 'number' ? r.relevanceScore : undefined
  }))
}

function projectGetInvestigationDocuments(result: AnyRecord): NovaiEvent[] {
  const documents = Array.isArray(result.documents) ? result.documents : []

  return documents.filter(isRecord).map(d => ({
    type: 'source',
    sourceType: String(d.sourceName ?? '').toLowerCase().includes('externa') ? 'external' : 'internal',
    name: String(d.sourceName ?? 'Documento'),
    factorCount: Array.isArray(d.linkedFactors) ? d.linkedFactors.length : undefined,
    excerpt: Array.isArray(d.sampleExcerpts) && typeof d.sampleExcerpts[0] === 'string' ? d.sampleExcerpts[0] : undefined,
    retrievedAt: new Date().toISOString()
  })) satisfies SourceEvent[]
}

function projectCalculateMatrix(result: AnyRecord): NovaiEvent[] {
  const calc = isRecord(result.calculation) ? result.calculation : null
  const matrixType = String(result.matrixType ?? '').toLowerCase()

  if (!calc) return []

  if ((matrixType === 'efi' || matrixType === 'efe') && typeof calc.totalIndex === 'number') {
    const factors = Array.isArray(calc.factors) ? calc.factors.filter(isRecord) : []

    return [{
      type: 'calculation',
      matrixType,
      total: calc.totalIndex,
      summary: `${matrixType.toUpperCase()} = Σ(peso × calificación) sobre ${factors.length} factores`,
      formula: 'Σ(weight × rating)',
      factorsEvaluated: factors.length,
      interpretation: typeof calc.interpretation === 'string' ? calc.interpretation : undefined,
      items: factors.map(f => ({
        code: String(f.id ?? ''),
        name: String(f.name ?? ''),
        weight: Number(f.weight ?? 0),
        rating: Number(f.rating ?? 0),
        weightedScore: Number(f.score ?? 0)
      })),
      details: { weightsSum: calc.weightsSum }
    } satisfies CalculationEvent]
  }

  if (matrixType === 'qspm' && isRecord(calc.qspm)) {
    const qspm = calc.qspm as AnyRecord
    const results = Array.isArray(qspm.results) ? qspm.results.filter(isRecord) : []
    const winnerId = typeof qspm.winner === 'string' ? qspm.winner : null
    const winner = winnerId ? results.find(r => r.strategyId === winnerId) : null
    const winnerTas = winner && typeof winner.totalTas === 'number' ? winner.totalTas : 0
    const topDiff = typeof qspm.topDifference === 'number' ? qspm.topDifference : 0

    return [{
      type: 'calculation',
      matrixType: 'qspm',
      total: Number(winnerTas.toFixed(3)),
      summary: winnerId
        ? `QSPM · Ganadora ${winnerId} TAS ${Number(winnerTas).toFixed(3)} · Δ ${Number(topDiff).toFixed(3)} sobre 2ª`
        : 'QSPM · Sin evaluación completa — faltan puntuaciones AS',
      formula: 'TAS = Σ(weight_normalized × AS)',
      factorsEvaluated: results.length,
      interpretation: typeof calc.interpretation === 'string' ? calc.interpretation : undefined,
      details: { winner: winnerId, topDifference: topDiff, tie: Boolean(qspm.tie), warnings: qspm.warnings, resultsCount: results.length }
    } satisfies CalculationEvent]
  }

  if (matrixType === 'all' && isRecord(calc.qspm) && isRecord((calc.qspm as AnyRecord))) {
    const qspmAll = calc.qspm as AnyRecord
    const resultsAll = Array.isArray(qspmAll.results) ? qspmAll.results : []

    if (resultsAll.length > 0 && typeof qspmAll.winner === 'string') {
      const win = resultsAll.find((r: AnyRecord) => r.strategyId === qspmAll.winner) as AnyRecord | undefined
      const tas = win && typeof win.totalTas === 'number' ? win.totalTas : 0

      return [{
        type: 'calculation',
        matrixType: 'qspm',
        total: Number(tas.toFixed(3)),
        summary: `QSPM ALL · Ganadora ${String(qspmAll.winner)} TAS ${Number(tas).toFixed(3)}`,
        formula: 'TAS = Σ(weight_normalized × AS)',
        factorsEvaluated: resultsAll.length,
        details: { tie: Boolean(qspmAll.tie), topDifference: qspmAll.topDifference }
      } satisfies CalculationEvent]
    }
  }

  return []
}

function projectValidateMethodology(result: AnyRecord): NovaiEvent[] {
  const events: NovaiEvent[] = []
  const status = String(result.status ?? '')
  const errorsCount = Number(result.errorsCount ?? 0)
  const warningsCount = Number(result.warningsCount ?? 0)
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations.map(String) : []

  events.push({
    type: 'audit',
    status: status === 'ERRORS' ? 'INVALID' : status === 'WARNINGS' ? 'WARNING' : 'VALID',
    severity: errorsCount > 0 ? 'high' : warningsCount > 0 ? 'medium' : 'info',
    target: `Metodología ${String(result.stageEvaluated ?? 'ALL')}`,
    code: 'METHODOLOGY_VALIDATION',
    message: `${errorsCount} error(es) y ${warningsCount} advertencia(s) metodológica(s). Puntuación: ${Number(result.methodologyScore ?? 0)}/100.`,
    recommendation: recommendations[0]
  } satisfies AuditFindingEvent)

  const idx = isRecord(result.calculatedIndices) ? result.calculatedIndices : {}

  if (typeof idx.efiTotal === 'number') {
    events.push({
      type: 'calculation',
      matrixType: 'efi',
      total: idx.efiTotal,
      summary: `EFI verificado durante la validación${idx.dominantQuadrant ? ` · Cuadrante dominante: ${String(idx.dominantQuadrant)}` : ''}`
    })
  }

  if (typeof idx.efeTotal === 'number') {
    events.push({
      type: 'calculation',
      matrixType: 'efe',
      total: idx.efeTotal,
      summary: 'EFE verificado durante la validación'
    })
  }

  return events
}

function projectFindContradictions(result: AnyRecord): NovaiEvent[] {
  const contradictions = Array.isArray(result.contradictions) ? result.contradictions : []

  return contradictions.slice(0, 10).filter(isRecord).map(c => ({
    type: 'audit',
    status: 'WARNING',
    severity: c.severity === 'high' ? 'critical' : c.severity === 'medium' ? 'medium' : 'low',
    target: String(c.title ?? 'Contradicción'),
    code: String(c.type ?? 'CONTRADICTION'),
    message: String(c.explanation ?? ''),
    recommendation: typeof c.recommendation === 'string' ? c.recommendation : undefined
  }) satisfies AuditFindingEvent)
}

function projectAuditFactor(result: AnyRecord): NovaiEvent[] {
  const factor = isRecord(result.factor) ? result.factor : null
  const audit = isRecord(result.audit) ? result.audit : null

  if (!factor || !audit) return []

  const criticalErrorsCount = Number(audit.criticalErrorsCount ?? 0)
  const warningsCount = Number(audit.warningsCount ?? 0)
  const findings = Array.isArray(audit.findings) ? audit.findings.filter(isRecord) : []

  const events: NovaiEvent[] = [{
    type: 'audit',
    status: criticalErrorsCount > 0 ? 'INVALID' : warningsCount > 0 ? 'WARNING' : 'VALID',
    severity: criticalErrorsCount > 0 ? 'critical' : warningsCount > 0 ? 'medium' : 'info',
    target: String(factor.code ?? 'Factor'),
    code: 'FACTOR_AUDIT',
    message: criticalErrorsCount > 0
      ? `El factor presenta ${criticalErrorsCount} problema(s) metodológico(s) crítico(s).`
      : warningsCount > 0
        ? `El factor es válido con ${warningsCount} advertencia(s).`
        : 'El factor es metodológicamente válido.',
    recommendation: typeof findings[0]?.suggestedFix === 'string' ? findings[0].suggestedFix : undefined
  }]

  if (typeof factor.calculatedScore === 'number') {
    events.push({
      type: 'calculation',
      matrixType: factor.category === 'external' ? 'efe' : 'efi',
      total: factor.calculatedScore,
      summary: `${String(factor.code ?? '')}: peso × calificación`,
      formula: `${String(factor.weight ?? 0)} × ${String(factor.rating ?? 0)} = ${factor.calculatedScore}`,
      factorsEvaluated: 1
    })
  }

  return events
}

function projectAuditRelationship(result: AnyRecord): NovaiEvent[] {
  const audit = isRecord(result.audit) ? result.audit : null
  const internalFactor = isRecord(result.internalFactor) ? result.internalFactor : null
  const externalFactor = isRecord(result.externalFactor) ? result.externalFactor : null

  if (!audit) return []

  const events: NovaiEvent[] = []

  if (internalFactor) events.push(evidenceEventFromFactor(internalFactor, safeInv(result)))
  if (externalFactor) events.push(evidenceEventFromFactor(externalFactor, safeInv(result)))

  const connection = String(audit.evidenceConnectionStatus ?? '')
  const isSuspiciousZero = Boolean(audit.isSuspiciousZero)

  const status = connection === 'proven'
    ? 'VALID'
    : connection === 'plausible_unproven' || isSuspiciousZero
      ? 'WARNING'
      : 'INVALID'

  events.push({
    type: 'audit',
    status,
    severity: status === 'INVALID' || isSuspiciousZero ? 'high' : status === 'WARNING' ? 'medium' : 'info',
    target: String(result.crossing ?? 'Relación'),
    code: isSuspiciousZero ? 'DAFO_SUSPICIOUS_ZERO_CROSSING' : 'RELATIONSHIP_AUDIT',
    message: isSuspiciousZero
      ? 'Cero sospechoso: ambos factores son críticos pero el cruce fue evaluado con fuerza 0.'
      : status === 'VALID'
        ? 'La evidencia sustenta el vínculo estratégico del cruce.'
        : status === 'WARNING'
          ? 'El cruce es plausible pero la evidencia actual no lo demuestra suficientemente.'
          : 'El cruce carece de justificación probatoria.',
    recommendation: typeof audit.recommendation === 'string' ? audit.recommendation : undefined,
    contradictionWith: isSuspiciousZero ? String(result.crossing ?? '') : undefined
  })

  return events
}

function safeInv(result: AnyRecord): string | undefined {
  return typeof result.investigationId === 'string' ? result.investigationId : undefined
}

function projectWebResearch(result: AnyRecord): NovaiEvent[] {
  const results = Array.isArray(result.results) ? result.results : []

  // Solo proyectar cuando hay EXTERNAL_EVIDENCE real — degradación no genera tarjetas
  if (result.status === 'EXTERNAL_RESEARCH_DISABLED' || result.status === 'EXTERNAL_RESEARCH_ERROR' || results.length === 0) {
    return []
  }

  return results.slice(0, 5).filter(isRecord).map(r => ({
    type: 'source',
    sourceType: 'external' as const,
    name: String(r.title ?? 'Fuente externa'),
    url: String(r.url ?? ''),
    excerpt: typeof r.snippet === 'string' && r.snippet.trim() ? r.snippet.trim() : undefined,
    page: undefined,
    retrievedAt: String(r.retrievedAt ?? result.retrievedAt ?? new Date().toISOString())
  })) satisfies SourceEvent[]
}

function projectWebExtract(result: AnyRecord): NovaiEvent[] {
  const results = Array.isArray(result.results) ? result.results : []

  if (result.status === 'EXTERNAL_RESEARCH_DISABLED' || result.status === 'EXTERNAL_RESEARCH_ERROR' || results.length === 0) {
    return []
  }

  return results.slice(0, 3).filter(isRecord).map(p => {
    const rawContent = String(p.content ?? '').trim()
    const snippet = rawContent.length > 280 ? rawContent.slice(0, 280) + '...' : rawContent

    return {
      type: 'source',
      sourceType: 'external' as const,
      name: String(p.title ?? p.url ?? 'Documento Extraído'),
      url: String(p.url ?? ''),
      excerpt: snippet || undefined,
      page: undefined,
      retrievedAt: String(p.retrievedAt ?? result.retrievedAt ?? new Date().toISOString())
    } satisfies SourceEvent
  })
}

function projectCitationsFromEvidence(evidences: AnyRecord[]): CitationEvent[] {
  return evidences.map(e => ({
    type: 'citation',
    citationId: `citation-${String(e.evidenceId ?? e.evidence_id ?? `ev-${Date.now()}-${Math.random().toString(36).slice(2,9)}`)}`,
    evidenceId: String(e.evidenceId ?? e.evidence_id ?? ''),
    claim: String(e.claim ?? e.title ?? 'Evidencia citada'),
    excerpt: String(e.excerpt ?? e.snippet ?? e.evidence ?? 'Evidencia'),
    location: e.location ? String(e.location) : e.factorId ? `factor:${String(e.factorId)}` : undefined
  }))
}

function projectSourceGroupFromResult(result: AnyRecord): SourceGroupEvent[] {
  const sourceType = String(result.sourceType ?? '').toLowerCase()
  const sources = Array.isArray(result.sources) ? result.sources : []

  if (sources.length === 0) return []

  const grouped = new Map<string, typeof sources[0][]>()

  for (const s of sources) {
    const key = String(s.documentName ?? s.name ?? s.url ?? s.id ?? 'unknown')
    const arr = grouped.get(key) || []
    arr.push(s)
    grouped.set(key, arr)
  }

  const sourcesArray = Array.from(grouped.entries()).map(([name, srcs]) => ({
    id: name,
    name: String(srcs[0]?.name ?? name),
    url: srcs[0]?.url,
    documentName: srcs[0]?.documentName,
    factorCount: new Set(srcs.map(s => s.factorId ?? s.factor_id).filter(Boolean)).size,
    excerpt: srcs[0]?.excerpt?.slice(0, 200),
    retrievedAt: String(srcs[0]?.retrievedAt ?? srcs[0]?.retrieved_at ?? new Date().toISOString()),
    evidenceCount: srcs.length
  }))

  return [{
    type: 'source-group',
    groupId: `source-group-${String(result.sourceType ?? sourceType ?? 'unknown')}-${Date.now()}`,
    sourceType: (sourceType === 'external' ? 'web_source' : 
                 sourceType === 'internal' ? 'internal_document' :
                 sourceType === 'tool_derived' ? 'tool_derived' : 'database_evidence') as SourceGroupEvent['sourceType'],
    sources: sourcesArray,
    totalEvidence: sources.reduce((acc, s) => acc + (s.evidenceCount ?? 1), 0)
  }]
}

const PROJECTORS: Record<string, (result: AnyRecord) => NovaiEvent[]> = {
  get_factor_evidence: projectGetFactorEvidence,
  search_evidence: projectSearchEvidence,
  get_investigation_documents: projectGetInvestigationDocuments,
  calculate_matrix: projectCalculateMatrix,
  validate_methodology: projectValidateMethodology,
  find_contradictions: projectFindContradictions,
  audit_factor: projectAuditFactor,
  audit_relationship: projectAuditRelationship,
  web_research: projectWebResearch,
  web_extract: projectWebExtract
}

/**
 * Genera eventos de citación a partir de las evidencias acumuladas en un run
 * Se llama al final del streaming (message-complete)
 */
export function projectCitationsFromRun(
  evidences: Array<{ evidenceId?: string; evidence_id?: string; claim?: string; title?: string; snippet?: string; excerpt?: string; location?: string; factorId?: string; factor_id?: string }>
): CitationEvent[] {
  return evidences
    .filter(e => e.evidenceId || e.evidence_id)
    .map(e => ({
      type: 'citation',
      citationId: `citation-${String(e.evidenceId ?? e.evidence_id ?? `ev-${Date.now()}-${Math.random().toString(36).slice(2,9)}`)}`,
      evidenceId: String(e.evidenceId ?? e.evidence_id ?? ''),
      claim: String(e.claim ?? e.title ?? 'Evidencia citada'),
      excerpt: String(e.excerpt ?? e.snippet ?? 'Evidencia'),
      location: e.location ? String(e.location) : e.factorId || e.factor_id ? `factor:${String(e.factorId ?? e.factor_id)}` : undefined
    }))
}

/**
 * Genera evento de agrupación de fuentes a partir de las fuentes acumuladas
 * Se llama al final del streaming (message-complete)
 */
export function projectSourceGroupFromRun(
  sources: Array<{ sourceType?: string; source_type?: string; sources?: any[] }>
): SourceGroupEvent[] {
  if (!sources.length) return []

  const allSources = sources.flatMap(s => s.sources || [])
  if (!allSources.length) return []

  const sourceType = String(allSources[0]?.sourceType ?? allSources[0]?.source_type ?? '').toLowerCase()

  const grouped = new Map<string, any[]>()

  for (const s of allSources) {
    const key = String(s.documentName ?? s.name ?? s.url ?? s.id ?? 'unknown')
    const arr = grouped.get(key) || []
    arr.push(s)
    grouped.set(key, arr)
  }

  const sourcesArray = Array.from(grouped.entries()).map(([name, srcs]) => ({
    id: name,
    name: String(srcs[0]?.name ?? name),
    url: srcs[0]?.url,
    documentName: srcs[0]?.documentName,
    factorCount: new Set(srcs.map(s => s.factorId ?? s.factor_id).filter(Boolean)).size,
    excerpt: srcs[0]?.excerpt?.slice(0, 200),
    retrievedAt: String(srcs[0]?.retrievedAt ?? srcs[0]?.retrieved_at ?? new Date().toISOString()),
    evidenceCount: srcs.length
  }))

  return [{
    type: 'source-group',
    groupId: `source-group-${String(allSources[0]?.sourceType ?? allSources[0]?.source_type ?? 'unknown')}-${Date.now()}`,
    sourceType: (allSources[0]?.sourceType === 'external' || allSources[0]?.source_type === 'external' ? 'web_source' :
                 allSources[0]?.sourceType === 'internal' || allSources[0]?.source_type === 'internal' ? 'internal_document' :
                 allSources[0]?.sourceType === 'tool_derived' || allSources[0]?.source_type === 'tool_derived' ? 'tool_derived' : 'database_evidence') as SourceGroupEvent['sourceType'],
    sources: sourcesArray,
    totalEvidence: allSources.reduce((acc, s) => acc + (s.evidenceCount ?? 1), 0)
  }]
}

/**
 * Punto de entrada: dado el nombre de la tool y su resultado exitoso,
 * devuelve los eventos estructurados a emitir por el Agent Runtime.
 */
export function projectToolResultToEvents(toolName: string, result: unknown): NovaiEvent[] {
  try {
    const projector = PROJECTORS[toolName]

    if (!projector || !isRecord(result)) return []

    return projector(result)
  } catch {
    // La proyección es best-effort: jamás debe romper el streaming.
    return []
  }
}
