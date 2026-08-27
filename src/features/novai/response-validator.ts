/**
 * Response Validator — Epistemic Firewall (§35 §37 §47)
 *
 * El LLM genera interpretación; el runtime determina qué puede ser evidencia verificable.
 *
 * Valida la respuesta FINAL del LLM antes de emitirla, detectando:
 *  - números/scores sin CalculationEvent
 *  - fuentes sin SourceEvent
 *  - claims FACT sin EvidenceEvent
 *  - tool afirmada pero no llamada
 *  - relevance → credibility sin metodología
 *  - razonamiento retrospectivo (CLAIMED_CALCULATION_WITHOUT_CALCULATION_EVENT)
 *
 * Acciones: REJECT | DEGRADE_TO_INFERENCE | INSUFFICIENT_EVIDENCE | PASS
 */

import type { NovaiEvent } from './events'

export type ValidationAction = 'PASS' | 'DEGRADE_TO_INFERENCE' | 'INSUFFICIENT_EVIDENCE' | 'REJECT'

export interface ValidationFinding {
  ruleId: string // R1..R15 + custom
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  action: ValidationAction
  evidence?: string
}

export interface ValidationResult {
  action: ValidationAction
  findings: ValidationFinding[]
  shouldBlock: boolean
  degradedPrefix?: string // texto a prepend si DEGRADE
}

// Reglas canónicas §37
const RULES = {
  R1_NEVER_INVENT_DATA: 'R1',
  R2_NEVER_INVENT_SOURCES: 'R2',
  R3_TOOL_CLAIMED_NOT_CALLED: 'R3',
  R4_SOURCE_CLAIMED_NOT_RETRIEVED: 'R4',
  R5_INFERENCE_AS_FACT: 'R5',
  R6_ESTIMATION_AS_CALCULATION: 'R6',
  R7_SCORE_WITHOUT_METHODOLOGY: 'R7',
  R8_RETROSPECTIVE_JUSTIFICATION: 'R8',
  R9_RELEVANCE_AS_CREDIBILITY: 'R9',
  R10_EXTERNAL_VALIDATES_INTERNAL: 'R10',
  R11_MISSING_EVIDENCE: 'R11',
  R12_TOOL_UNAVAILABLE_IMPROVISED: 'R12',
  R13_REVALIDATE_ON_CHALLENGE: 'R13',
  R14_MEMORY_AS_EVIDENCE: 'R14',
  R15_DETERMINISTIC_CALCULATION: 'R15'
} as const

interface ValidatorContext {
  userMessage: string
  assistantText: string
  events: NovaiEvent[] // todos los eventos emitidos en este run
  intentType?: string
  requiredTools?: string[]
}

// Helpers para inspeccionar eventos
function hasToolCall(events: NovaiEvent[], toolName: string): boolean {
  return events.some(e => e.type === 'tool-call' && (e as { tool: string }).tool === toolName)
}
function hasToolResultSuccess(events: NovaiEvent[], toolName: string): boolean {
  return events.some(e => e.type === 'tool-result' && (e as { tool: string }).tool === toolName && !(e as { isError?: boolean }).isError)
}
function hasSourceEvent(events: NovaiEvent[]): boolean {
  return events.some(e => e.type === 'source')
}
function hasCalculationEvent(events: NovaiEvent[]): boolean {
  return events.some(e => e.type === 'calculation')
}
function hasEvidenceEvent(events: NovaiEvent[]): boolean {
  return events.some(e => e.type === 'evidence')
}
function countSourceEvents(events: NovaiEvent[]): number {
  return events.filter(e => e.type === 'source').length
}
function getToolResults(events: NovaiEvent[]): Array<{ tool: string; result: unknown }> {
  return events.filter(e => e.type === 'tool-result').map(e => e as unknown as { tool: string; result: unknown })
}

/**
 * Detecta si el texto afirma haber usado una tool sin haberla llamado.
 */
function detectToolClaimWithoutCall(text: string, events: NovaiEvent[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const lower = text.toLowerCase()

  const toolClaims: Array<{ phrase: RegExp; tool: string; label: string }> = [
    { phrase: /consult[eé].*expediente|obtuve.*expediente|revis[eé].*investigaci[oó]n/i, tool: 'get_investigation_details', label: 'expediente' },
    { phrase: /investigu[eé].*web|busqu[eé].*web|fuente.*externa.*consult/i, tool: 'web_research', label: 'búsqueda web' },
    { phrase: /calcul[eé]|tas\s*=|índice.*efi|índice.*efe/i, tool: 'calculate_matrix', label: 'cálculo' },
    { phrase: /verifiqu[eé].*afirmaci[oó]n|contrast[eé].*claim/i, tool: 'verify_claim', label: 'verificación de claim' },
    { phrase: /audit[eé].*factor/i, tool: 'audit_factor', label: 'auditoría de factor' }
  ]

  for (const c of toolClaims) {
    if (c.phrase.test(lower) && !hasToolCall(events, c.tool)) {
      findings.push({
        ruleId: RULES.R3_TOOL_CLAIMED_NOT_CALLED,
        severity: 'CRITICAL',
        message: `Afirma haber realizado "${c.label}" pero no existe ToolCallEvent para ${c.tool}.`,
        action: 'INSUFFICIENT_EVIDENCE',
        evidence: `Texto contiene patrón ${c.phrase} sin tool-call ${c.tool}`
      })
    }
  }
  return findings
}

/**
 * Detecta scores numéricos de credibilidad sin CalculationEvent
 * §37 R7 + §6 regla de números
 */
function detectScoreWithoutCalculation(text: string, events: NovaiEvent[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const hasCalc = hasCalculationEvent(events)

  // Patrones que indican score inventado
  const scorePatterns = [
    /\b0\.\d{2,3}\s*[-–]\s*0\.\d{2,3}\s*(?:puntaje|credibilidad|confianza|score)/i,
    /\bcredibilidad\s*[:=]?\s*0\.\d+\b/i,
    /\bconfianza\s*[:=]?\s*0\.\d+\b/i,
    /\b\d{1,2}\s*\/\s*1\.0\b.*confian/i,
    /\b\d+\s*\/\s*1\.0\b.*credib/i
  ]

  const weightPatterns = [
    /autoridad.*0\.\d+\s*.*\d+\.\d+\s*.*transparencia/i,
    /\(0\.\d+\s*×\s*0\.\d+\).*=\s*0\.\d+/i
  ]

  const statPatterns = [
    /intervalo\s*95%/i,
    /desviaci[oó]n\s*t[ií]pica/i,
    /0\.\d+\s*±\s*0\.\d+/i
  ]

  const lower = text.toLowerCase()

  for (const pat of scorePatterns) {
    if (pat.test(text) && !hasCalc) {
      findings.push({
        ruleId: RULES.R7_SCORE_WITHOUT_METHODOLOGY,
        severity: 'HIGH',
        message: `Presenta score numérico de credibilidad/confianza (${pat}) sin CalculationEvent previo.`,
        action: 'DEGRADE_TO_INFERENCE',
        evidence: `Match: ${pat}`
      })
      break // solo una por categoría
    }
  }

  for (const pat of weightPatterns) {
    if (pat.test(text) && !hasCalc) {
      findings.push({
        ruleId: RULES.R6_ESTIMATION_AS_CALCULATION,
        severity: 'CRITICAL',
        message: `Presenta cálculo ponderado con pesos/dimensiones sin metodología versionada ni CalculationEvent.`,
        action: 'REJECT',
        evidence: `Match: ${pat}`
      })
      break
    }
  }

  // Solo reportar estadística si parece cálculo metodológico, no si solo menciona fuentes
  for (const pat of statPatterns) {
    if (pat.test(text) && !hasCalc) {
      // Verificar que realmente haya un cálculo numérico tipo intervalo, no solo mención
      const hasNumericInterval = /0\.\d+\s*±\s*0\.\d+\s*=\s*\[0\.\d+,\s*0\.\d+\]/i.test(text)
      if (hasNumericInterval) {
        findings.push({
          ruleId: RULES.R15_DETERMINISTIC_CALCULATION,
          severity: 'HIGH',
          message: `Usa lenguaje estadístico (intervalo/desviación) sin tamaño muestral ni fórmula registrada.`,
          action: 'DEGRADE_TO_INFERENCE',
          evidence: `Match: ${pat}`
        })
        break
      }
    }
  }

  // R9: relevance → credibility
  if (/tavily.*score|relevance.*score.*credib|score.*tavily.*credib/i.test(lower) && !hasCalc) {
    findings.push({
      ruleId: RULES.R9_RELEVANCE_AS_CREDIBILITY,
      severity: 'CRITICAL',
      message: `Convierte relevance/retrieval score de Tavily en credibility score sin metodología.`,
      action: 'REJECT',
      evidence: 'Tavily score = ranking, no credibilidad'
    })
  }

  return findings
}

/**
 * Detecta afirmación de fuentes sin SourceEvent
 */
function detectSourceClaimWithoutEvent(text: string, events: NovaiEvent[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const hasSource = hasSourceEvent(events)
  const lower = text.toLowerCase()

  const sourceClaimPatterns = [
    /fuente.*oficial|resoluci[oó]n.*\d+\/2026|mtss.*confirmado|seg[uú]n.*fuentes/i,
    /fuente.*externa|medios.*especializados.*credibilidad/i
  ]

  for (const pat of sourceClaimPatterns) {
    if (pat.test(text) && !hasSource) {
      findings.push({
        ruleId: RULES.R4_SOURCE_CLAIMED_NOT_RETRIEVED,
        severity: 'HIGH',
        message: `Afirma fuentes externas/confirmação sin SourceEvent verificable.`,
        action: 'INSUFFICIENT_EVIDENCE',
        evidence: `Match: ${pat}`
      })
      break
    }
  }

  // Si hay SourceEvent pero tool web_research retornó 0 resultados, también es falla
  if (hasSource) {
    const webResults = getToolResults(events).find(r => r.tool === 'web_research')
    if (webResults && typeof webResults.result === 'object' && webResults.result !== null) {
      const res = webResults.result as Record<string, unknown>
      if (res.status === 'EXTERNAL_RESEARCH_DISABLED' || res.status === 'EXTERNAL_RESEARCH_ERROR') {
        // Ya se está afirmando fuente pero el tool estaba deshabilitado/error → hallucination
        if (/fuente.*externa.*valida|confirma.*reforma/i.test(text)) {
          findings.push({
            ruleId: RULES.R2_NEVER_INVENT_SOURCES,
            severity: 'CRITICAL',
            message: `Afirma validación con fuentes externas cuando web_research estaba deshabilitado/error.`,
            action: 'INSUFFICIENT_EVIDENCE',
            evidence: `web_research status: ${String(res.status)}`
          })
        }
      }
    }
  }

  return findings
}

/**
 * Detecta R10: external valida interno automáticamente
 */
function detectExternalValidatesInternal(text: string, events: NovaiEvent[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const hasSource = hasSourceEvent(events)
  const hasEvidence = hasEvidenceEvent(events)

  if (hasSource && /d-0\d.*validado|factor.*validado.*reforma|remuneraci[oó]n.*confirmada.*externa/i.test(text.toLowerCase())) {
    // Tiene fuente externa pero no tiene evidencia interna que vincule factor D-01 con reforma
    // Esto es hallucination de vínculo
    if (!hasEvidence) {
      findings.push({
        ruleId: RULES.R10_EXTERNAL_VALIDATES_INTERNAL,
        severity: 'HIGH',
        message: `Fuente externa confirma contexto general pero se presenta como validación automática de factor interno sin vínculo de evidencia.`,
        action: 'DEGRADE_TO_INFERENCE',
        evidence: 'External source ≠ internal factor validation without relation'
      })
    }
  }

  return findings
}

/**
 * Detecta razonamiento retrospectivo: explica metodología después de haber dado score sin cálculo
 */
function detectRetrospectiveJustification(text: string, events: NovaiEvent[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const hasCalc = hasCalculationEvent(events)

  if (!hasCalc && /por qu[eé].*0\.68.*0\.74|en qu[eé].*te basaste.*c[aá]lculo|dimensi[oó]n.*peso.*autoridad/i.test(text.toLowerCase())) {
    // El texto contiene explicación retrospectiva con dimensiones/pesos sin CalculationEvent previo
    // Esto es el caso exacto del incidente: segunda respuesta inventa metodología para justificar score previo
    if (/autoridad.*0\.35.*timeliness.*0\.30.*objetividad.*0\.20/i.test(text)) {
      findings.push({
        ruleId: RULES.R8_RETROSPECTIVE_JUSTIFICATION,
        severity: 'CRITICAL',
        message: `Fabrica metodología retrospectiva con dimensiones/pesos para justificar score previo sin CalculationEvent registrado.`,
        action: 'REJECT',
        evidence: 'CLAIMED_CALCULATION_WITHOUT_CALCULATION_EVENT'
      })
    }
  }

  return findings
}

export function validateResponse(ctx: ValidatorContext): ValidationResult {
  const findings: ValidationFinding[] = []

  // Acumular todas las reglas
  findings.push(...detectToolClaimWithoutCall(ctx.assistantText, ctx.events))
  findings.push(...detectScoreWithoutCalculation(ctx.assistantText, ctx.events))
  findings.push(...detectSourceClaimWithoutEvent(ctx.assistantText, ctx.events))
  findings.push(...detectExternalValidatesInternal(ctx.assistantText, ctx.events))
  findings.push(...detectRetrospectiveJustification(ctx.assistantText, ctx.events))

  // R11: si requiredTools no fueron llamadas, forzar INSUFFICIENT_EVIDENCE
  if (ctx.requiredTools && ctx.requiredTools.length > 0) {
    const missing = ctx.requiredTools.filter(t => !hasToolCall(ctx.events, t))
    if (missing.length > 0) {
      findings.push({
        ruleId: RULES.R12_TOOL_UNAVAILABLE_IMPROVISED,
        severity: 'CRITICAL',
        message: `Faltan tools obligatorias para intent ${ctx.intentType}: ${missing.join(', ')}. No debe improvisar.`,
        action: 'INSUFFICIENT_EVIDENCE',
        evidence: `required: ${ctx.requiredTools.join(', ')} missing: ${missing.join(', ')}`
      })
    } else {
      // Verificar postconditions: tool llamada pero sin evidencia
      for (const tool of ctx.requiredTools) {
        if (tool === 'web_research') {
          const hasSuccess = hasToolResultSuccess(ctx.events, tool)
          const sourceCount = countSourceEvents(ctx.events)
          if (!hasSuccess || sourceCount === 0) {
            findings.push({
              ruleId: 'R11_MISSING_EVIDENCE',
              severity: 'HIGH',
              message: `Tool ${tool} fue llamada pero no produjo evidencia utilizable (zero results o error).`,
              action: 'INSUFFICIENT_EVIDENCE',
              evidence: `hasSuccess: ${hasSuccess} sourceCount: ${sourceCount}`
            })
          }
        }
        if (tool === 'calculate_matrix' && !hasCalculationEvent(ctx.events)) {
          findings.push({
            ruleId: RULES.R15_DETERMINISTIC_CALCULATION,
            severity: 'HIGH',
            message: `Tool ${tool} requerida pero no hay CalculationEvent verificable.`,
            action: 'INSUFFICIENT_EVIDENCE',
            evidence: `required calculation missing`
          })
        }
      }
    }
  }

  // Determinar acción global (la más severa gana)
  let action: ValidationAction = 'PASS'
  let shouldBlock = false

  const hasReject = findings.some(f => f.action === 'REJECT')
  const hasInsufficient = findings.some(f => f.action === 'INSUFFICIENT_EVIDENCE')
  const hasDegrade = findings.some(f => f.action === 'DEGRADE_TO_INFERENCE')

  if (hasReject) action = 'REJECT'
  else if (hasInsufficient) action = 'INSUFFICIENT_EVIDENCE'
  else if (hasDegrade) action = 'DEGRADE_TO_INFERENCE'

  if (action === 'REJECT' || action === 'INSUFFICIENT_EVIDENCE') shouldBlock = true
  if (action === 'DEGRADE_TO_INFERENCE') shouldBlock = false // deja pasar pero con degradación

  let degradedPrefix: string | undefined
  if (action === 'DEGRADE_TO_INFERENCE') {
    degradedPrefix =
      '⚠️ *Nota epistemológica:* La siguiente interpretación no está respaldada por cálculo determinista o evidencia verificable y debe considerarse como inferencia, no como hecho verificado.\n\n'
  } else if (action === 'INSUFFICIENT_EVIDENCE') {
    degradedPrefix =
      '⚠️ *Evidencia insuficiente:* No pude obtener evidencia verificable suficiente para la afirmación solicitada con las herramientas disponibles. A continuación detallo lo que sí pude verificar y lo que falta:\n\n'
  } else if (action === 'REJECT') {
    degradedPrefix =
      '⚠️ *Rechazado por firewall epistemológico:* La respuesta generada contenía afirmaciones sin provenance verificable y fue bloqueada. Reintento con trazabilidad estricta:\n\n'
  }

  return { action, findings, shouldBlock, degradedPrefix }
}

// Utilidad para tests forenses: verifica si un texto contiene hallucination de score
export function containsHallucinatedScore(text: string): boolean {
  return /\b0\.68\s*[-–]\s*0\.74\b/.test(text) || /\b0\.85\s*\/\s*1\.0\b.*confian/i.test(text)
}
