import type { InvestigationState, Factor } from '@/types/apps/investigator-types'
import { auditDafoCrossing, isWeaknessType, isStrengthType } from './methodology-knowledge'

export interface StrategicAuditFinding {
  code: string
  severity: 'high' | 'medium' | 'low' | 'info'
  category: 'efi' | 'efe' | 'dafo' | 'qspm' | 'came'
  message: string
  suggestedAction: string
}

export interface InvestigationAuditSummary {
  hasCriticalContradictions: boolean
  findings: StrategicAuditFinding[]
  efiStatus: {
    weightSum: number
    isValidSum: boolean
    ratingErrors: string[]
  }
  efeStatus: {
    weightSum: number
    isValidSum: boolean
    ratingErrors: string[]
  }
  suspiciousDafoCrossings: Array<{
    internalFactor: string
    externalFactor: string
    currentScore: number
    suggestedMin: number
    rationale: string
  }>
}

/**
 * Motor determinista de auditoría estratégica y detección de contradicciones.
 */
export function auditInvestigationConsistency(state?: InvestigationState | null): InvestigationAuditSummary {
  const findings: StrategicAuditFinding[] = []
  const suspiciousCrossings: InvestigationAuditSummary['suspiciousDafoCrossings'] = []

  if (!state) {
    return {
      hasCriticalContradictions: false,
      findings: [],
      efiStatus: { weightSum: 0, isValidSum: true, ratingErrors: [] },
      efeStatus: { weightSum: 0, isValidSum: true, ratingErrors: [] },
      suspiciousDafoCrossings: []
    }
  }

  const internal = Array.isArray(state.internal) ? state.internal : []
  const external = Array.isArray(state.external) ? state.external : []
  const relationships = Array.isArray(state.relationships) ? state.relationships : []
  const legacyRelations = (state as unknown as { relations?: Record<string, number> }).relations || {}

  const relMap = new Map<string, number>()

  for (const r of relationships) {
    if (r.internalId && r.externalId) {
      const strength = typeof r.strength === 'number' ? r.strength : 0

      relMap.set(`${r.internalId}-${r.externalId}`, strength)
      relMap.set(`${r.internalId}:${r.externalId}`, strength)
    }
  }

  // 1. Auditoría de EFI
  const efiSum = internal.reduce((acc, f) => acc + (Number(f.weight) || 0), 0)
  const isEfiValidSum = Math.abs(efiSum - 1.0) <= 0.005 || efiSum === 0
  const efiRatingErrors: string[] = []

  if (!isEfiValidSum && internal.length > 0) {
    findings.push({
      code: 'EFI_WEIGHT_SUM_INVALID',
      severity: 'high',
      category: 'efi',
      message: `La sumatoria de ponderaciones EFI es ${efiSum.toFixed(3)}, debiendo ser estrictamente 1.00 (100%).`,
      suggestedAction: 'Normalizar las ponderaciones de los factores internos.'
    })
  }

  for (const f of internal) {
    if (isWeaknessType(f.type) && (f.rating === 3 || f.rating === 4)) {
      const err = `Debilidad "${f.name}" tiene calificación ${f.rating} (incompatible; debilidades deben ser 1 o 2).`

      efiRatingErrors.push(err)
      findings.push({
        code: 'EFI_INVALID_RATING_WEAKNESS',
        severity: 'high',
        category: 'efi',
        message: err,
        suggestedAction: 'Corregir calificación a 1 (Debilidad Mayor) o 2 (Debilidad Menor).'
      })
    }

    if (isStrengthType(f.type) && (f.rating === 1 || f.rating === 2)) {
      const err = `Fortaleza "${f.name}" tiene calificación ${f.rating} (incompatible; fortalezas deben ser 3 o 4).`

      efiRatingErrors.push(err)
      findings.push({
        code: 'EFI_INVALID_RATING_STRENGTH',
        severity: 'high',
        category: 'efi',
        message: err,
        suggestedAction: 'Corregir calificación a 3 (Fortaleza Menor) o 4 (Fortaleza Mayor).'
      })
    }
  }

  // 2. Auditoría de EFE
  const efeSum = external.reduce((acc, f) => acc + (Number(f.weight) || 0), 0)
  const isEfeValidSum = Math.abs(efeSum - 1.0) <= 0.005 || efeSum === 0
  const efeRatingErrors: string[] = []

  if (!isEfeValidSum && external.length > 0) {
    findings.push({
      code: 'EFE_WEIGHT_SUM_INVALID',
      severity: 'high',
      category: 'efe',
      message: `La sumatoria de ponderaciones EFE es ${efeSum.toFixed(3)}, debiendo ser estrictamente 1.00 (100%).`,
      suggestedAction: 'Normalizar las ponderaciones de los factores externos.'
    })
  }

  // 3. Auditoría de Cruces DAFO
  for (const intFactor of internal) {
    for (const extFactor of external) {
      const pairKey = `${intFactor.id}-${extFactor.id}`
      
      const currentScore = relMap.has(pairKey)
        ? relMap.get(pairKey)!
        : typeof legacyRelations[pairKey] === 'number'
          ? legacyRelations[pairKey]
          : 0

      const audit = auditDafoCrossing(
        { name: intFactor.name, type: intFactor.type, rating: intFactor.rating, weight: intFactor.weight },
        { name: extFactor.name, type: extFactor.type, rating: extFactor.rating, weight: extFactor.weight },
        currentScore
      )

      if (audit.isSuspiciousZero) {
        suspiciousCrossings.push({
          internalFactor: intFactor.name,
          externalFactor: extFactor.name,
          currentScore,
          suggestedMin: audit.suggestedMinScore,
          rationale: audit.auditRationale
        })

        findings.push({
          code: 'DAFO_SUSPICIOUS_ZERO_CROSSING',
          severity: 'medium',
          category: 'dafo',
          message: audit.auditRationale,
          suggestedAction: `Reevaluar el cruce entre "${intFactor.name}" y "${extFactor.name}" a fuerza ${audit.suggestedMinScore}.`
        })
      }
    }
  }

  // 4. Auditoría de Cobertura CAME frente a Debilidades y Amenazas Críticas
  const cameActions = Array.isArray(state.cameActions) ? state.cameActions : []
  const criticalWeaknesses = internal.filter(f => f.type === 'D' && Number(f.rating) <= 2)
  const severeThreats = external.filter(f => f.type === 'A' && Number(f.rating) <= 2)

  const actionFactorIds = new Set<string>()
  cameActions.forEach(a => {
    if (a.factorId) actionFactorIds.add(a.factorId)
  })

  const unmitigatedWeaknesses = criticalWeaknesses.filter(
    w => !actionFactorIds.has(w.id) && !cameActions.some(a => a.action?.toLowerCase().includes(w.name.toLowerCase()))
  )

  const unmitigatedThreats = severeThreats.filter(
    t => !actionFactorIds.has(t.id) && !cameActions.some(a => a.action?.toLowerCase().includes(t.name.toLowerCase()))
  )

  if (unmitigatedWeaknesses.length > 0 && cameActions.length > 0) {
    findings.push({
      code: 'CAME_UNMITIGATED_CRITICAL_WEAKNESS',
      severity: 'medium',
      category: 'came',
      message: `Existen ${unmitigatedWeaknesses.length} debilidades críticas sin acción CAME correctiva vinculada (${unmitigatedWeaknesses.map(w => w.name).join(', ')}).`,
      suggestedAction: 'Formular medidas de corrección (C) en el Plan CAME para estas debilidades prioritarias.'
    })
  }

  if (unmitigatedThreats.length > 0 && cameActions.length > 0) {
    findings.push({
      code: 'CAME_UNMITIGATED_SEVERE_THREAT',
      severity: 'medium',
      category: 'came',
      message: `Existen ${unmitigatedThreats.length} amenazas severas sin acción CAME de afrontamiento vinculada (${unmitigatedThreats.map(t => t.name).join(', ')}).`,
      suggestedAction: 'Formular medidas de afrontamiento (A) en el Plan CAME para mitigar estas amenazas de alto impacto.'
    })
  }

  const hasCriticalContradictions = findings.some(f => f.severity === 'high')

  return {
    hasCriticalContradictions,
    findings,
    efiStatus: {
      weightSum: efiSum,
      isValidSum: isEfiValidSum,
      ratingErrors: efiRatingErrors
    },
    efeStatus: {
      weightSum: efeSum,
      isValidSum: isEfeValidSum,
      ratingErrors: efeRatingErrors
    },
    suspiciousDafoCrossings: suspiciousCrossings
  }
}

/**
 * Genera una sección de auditoría para inyectar en el System Prompt de NovAi.
 */
export function buildAuditContextPrompt(audit: InvestigationAuditSummary): string {
  if (audit.findings.length === 0) {
    return `
=== AUDITORÍA DETERMINISTA DE COHERENCIA DEL EXPEDIENTE ===
Estado: Coherente. No se detectan contradicciones matemáticas ni lógicas mayores en matrices EFI/EFE/DAFO.
`
  }

  const findingsText = audit.findings
    .map(f => `  • [${f.severity.toUpperCase()} / ${f.category.toUpperCase()}] ${f.message}`)
    .join('\n')

  return `
=== ALERTAS DE AUDITORÍA Y CONTRADICCIONES DETECTADAS EN EL EXPEDIENTE ===
ATENCIÓN CONSULTOR: El motor determinista detectó las siguientes inconsistencias en el expediente activo.
Si el usuario consulta sobre estos temas, señala la discrepancia y orienta la solución:

${findingsText}

${
  audit.suspiciousDafoCrossings.length > 0
    ? `Cruces con posible subestimación (Fuerza 0 sospechosa):
${audit.suspiciousDafoCrossings
  .map(c => `  - Cruce "${c.internalFactor}" × "${c.externalFactor}": Calificado con 0. Sugerido metodológicamente: ≥${c.suggestedMin}. (${c.rationale})`)
  .join('\n')}`
    : ''
}
`
}
