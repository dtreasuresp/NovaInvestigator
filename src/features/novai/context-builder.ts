import type { InvestigationState } from '@/types/apps/investigator-types'
import {
  calculateAnalysis,
  ORIENTATIONS,
  formatNumber,
  formatPercent,
  validateInvestigation
} from '@/utils/investigator/domain'

const LANGUAGE_CONFIG: Record<string, { name: string; instruction: string }> = {
  es: {
    name: 'Español',
    instruction: 'Responde OBLIGATORIAMENTE en Español. Todas tus explicaciones, diagnósticos y sugerencias deben redactarse en español formal y riguroso.'
  },
  en: {
    name: 'English',
    instruction: 'You MUST answer strictly in English. All your strategic advice, analysis, and recommendations must be written in professional, clear English.'
  },
  de: {
    name: 'Deutsch',
    instruction: 'Antworten Sie UNBEDINGT auf Deutsch. Alle strategischen Ratschläge, Analysen und Empfehlungen müssen in professionellem und präzisem Deutsch verfasst sein.'
  },
  ko: {
    name: '한국어 (Korean)',
    instruction: '반드시 한국어(Korean)로만 답변하십시오. 모든 전략적 자문, 분석, 진단 및 제안은 전문적이고 명확한 한국어로 작성되어야 합니다. 다른 언어로 답변하지 마십시오.'
  },
  pt: {
    name: 'Português',
    instruction: 'Responda OBRIGATORIAMENTE em Português. Todos os seus diagnósticos, pareceres estratégicos e recomendações devem ser redigidos em português formal e rigoroso.'
  }
}

export function buildInvestigationSystemPrompt(state: InvestigationState, locale: string = 'es', inventory?: { total: number, byStatus?: Record<string, number>, recent?: { id: string, title: string, status: string }[] }): string {
  const lang = LANGUAGE_CONFIG[locale] || LANGUAGE_CONFIG.es
  const analysis = calculateAnalysis(state)
  const validation = validateInvestigation(state, analysis)
  const meta = state.metadata
  const org = meta.organization || 'Organización no especificada'
  const unit = meta.unit ? ` - Unidad: ${meta.unit}` : ''
  const title = meta.title || 'Investigación Estratégica'
  const dominant = analysis.relations.dominant
  const dominantInfo = dominant ? ORIENTATIONS[dominant] : null

  const efiTotal = analysis.efi.total
  const efeTotal = analysis.efe.total
  const qualityBlock = buildQualityInsights(state, analysis, validation)

  // Formatted factors
  const internalFactors = state.internal.map(f =>
    `- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight}, Calif: ${f.rating}, Ponderación: ${(Number(f.weight) * Number(f.rating)).toFixed(3)})${f.evidence ? ` | Evidencia: ${f.evidence}` : ''}`
  ).join('\n') || 'Sin factores internos registrados.'

  const externalFactors = state.external.map(f =>
    `- [${f.type}] ${f.id}: "${f.name}" (Peso: ${f.weight}, Calif: ${f.rating}, Ponderación: ${(Number(f.weight) * Number(f.rating)).toFixed(3)})${f.evidence ? ` | Evidencia: ${f.evidence}` : ''}`
  ).join('\n') || 'Sin factores externos registrados.'

  // High-strength cross relationships (DAFO)
  const keyRelations = state.relationships
    .filter(r => r.strength != null && Number(r.strength) >= 2)
    .map(r => `- Cruce ${r.quadrant} (${r.internalId} × ${r.externalId}): Fuerza ${r.strength}/3${r.justification ? ` | Justificación: ${r.justification}` : ''}`)
    .join('\n') || 'Sin cruces de alta fuerza calificados.'

  // Strategies & QSPM
  const strategiesList = state.strategies.map(s => {
    const qspmRes = analysis.qspm.results.find(r => r.strategyId === s.id)
    const isSelected = state.selectedStrategyId === s.id

    return `- [${s.id}] "${s.name}" (Cuadrante: ${s.quadrant})${isSelected ? ' [★ SELECCIONADA]' : ''}: TAS Total = ${qspmRes ? formatNumber(qspmRes.totalTas) : 'No calificado'}${qspmRes ? ` (EFI: ${formatNumber(qspmRes.internalTas ?? 0)}, EFE: ${formatNumber(qspmRes.externalTas ?? 0)}, Evaluados: ${qspmRes.evaluated}/${qspmRes.evaluated + qspmRes.pending})` : ''}. ${s.description ? `Detalle: ${s.description}` : ''}`
  }).join('\n') || 'Sin estrategias definidas.'

  // QSPM detailed context: normalized weights + per-factor×strategy breakdown
  const qspmFactors = analysis.qspm.factors
  const qspmNormWeights = analysis.qspm.normalizedWeights
  const efiWeightSum = state.internal.reduce((s, f) => s + Number(f.weight || 0), 0)
  const efeWeightSum = state.external.reduce((s, f) => s + Number(f.weight || 0), 0)
  const globalWeightSum = efiWeightSum + efeWeightSum

  const qspmNormBlock = qspmFactors.length > 0
    ? `PESOS NORMALIZADOS QSPM (Metodología Fred David):
Fórmula: w_normalizado = peso_original / (suma_pesos_EFI + suma_pesos_EFE) = peso_original / ${formatNumber(globalWeightSum)}
• Suma pesos EFI: ${formatNumber(efiWeightSum)} | Suma pesos EFE: ${formatNumber(efeWeightSum)} | Suma global: ${formatNumber(globalWeightSum)}
• Subtotal EFI normalizado: ${formatNumber(efiWeightSum / (globalWeightSum || 1))} | Subtotal EFE normalizado: ${formatNumber(efeWeightSum / (globalWeightSum || 1))} | Total: 1.00
Detalle por factor:
${qspmFactors.map(f => `- ${f.id} "${f.name}": peso_original=${formatNumber(Number(f.weight))} → w_normalizado=${formatNumber(qspmNormWeights[f.id] ?? 0)}`).join('\n')}
`
    : 'PESOS NORMALIZADOS QSPM: Sin factores con peso para normalizar.\n'

  // Per-factor × strategy AS scores and individual TAS
  const qspmScoreMatrix = (qspmFactors.length > 0 && state.strategies.length > 0)
    ? `MATRIZ DE CALIFICACIONES DE ATRACTIVO (AS) Y TAS INDIVIDUALES:
Escala AS: 1=No atractivo, 2=Algo atractivo, 3=Razonablemente atractivo, 4=Altamente atractivo
Fórmula TAS individual: TAS = w_normalizado × AS
${qspmFactors.map(f => {
      const w = qspmNormWeights[f.id] ?? 0
      const stratScores = state.strategies.map(s => {
        const as = state.qspmScores?.[s.id]?.[f.id]
        const numAs = Number(as)
        const hasScore = Number.isInteger(numAs) && numAs >= 1 && numAs <= 4

        return hasScore
          ? `${s.id}: AS=${numAs} TAS=${formatNumber(w * numAs)}`
          : `${s.id}: —`
      }).join(', ')

      return `- ${f.id} (w=${formatNumber(w)}): ${stratScores}`
    }).join('\n')}
`
    : ''

  // CAME Actions
  const cameList = analysis.came.actions.slice(0, 10).map(a =>
    `- [${a.type}] ${a.id}: "${a.action}" (Prioridad: ${a.category.toUpperCase()}, Puntuación: ${formatNumber(a.priority)}) | Responsable: ${a.responsible || 'No asignado'}`
  ).join('\n') || 'Sin acciones CAME estructuradas.'

  return `Eres el Consultor Estratégico Senior y Asesor Metodológico de NovaStore ERP.
Tu función es asesorar al usuario analizando con máximo rigor metodológico el expediente de diagnóstico estratégico activo.

IDIOMA REQUERIDO: ${lang.name}
DIRECTIVA DE IDIOMA: ${lang.instruction}
══════════════════════════════════════════════════════════
DATOS DEL EXPEDIENTE ESTRATÉGICO ACTIVO:
Título: ${title}
Organización: ${org}${unit}
Problema / Justificación: ${meta.problem || 'No especificado'}
Objetivo General: ${meta.objective || 'No especificado'}
Hipótesis / Supuestos: ${meta.assumptions || 'No especificados'}

EVALUACIÓN MATRICIAL CUANTITATIVA:
• Índice EFI (Factores Internos): ${formatNumber(efiTotal)} / 4.00 (${efiTotal >= 2.5 ? 'Posición interna fuerte' : 'Posición interna vulnerable/débil'})
• Índice EFE (Factores Externos): ${formatNumber(efeTotal)} / 4.00 (${efeTotal >= 2.5 ? 'Entorno favorable con oportunidades' : 'Entorno hostil con amenazas críticas'})
• Vector Dominante DAFO: ${dominant ? `${dominant} (${dominantInfo?.name} - ${dominantInfo?.subtitle})` : 'No determinado'}
• Cobertura de Cruces DAFO: ${Math.round(analysis.relations.coverage * 100)}% (${analysis.relations.evaluatedCount} evaluados)

FACTORES INTERNOS (EFI):
${internalFactors}

FACTORES EXTERNOS (EFE):
${externalFactors}

RELACIONES CLAVE DAFO (Fuerza moderada/fuerte):
${keyRelations}

ALTERNATIVAS ESTRATÉGICAS Y MATRIZ QSPM:
${strategiesList}

${qspmNormBlock}
${qspmScoreMatrix}

PLAN DE ACCIÓN CAME (Priorizadas por modelo multicriterio):
${cameList}
${qualityBlock}══════════════════════════════════════════════════

NORMAS DE INTERACCIÓN Y ESTILO:
1. ${lang.instruction}
2. Comunícate siempre como un Consultor Senior de Dirección Estratégica: analítico, seguro, constructivo y natural.
3. PROHIBICIÓN DE META-LENGUAJE: Jamás uses palabras como "directiva", "prompt", "anti-complacencia", "anti-sycophancy", "UUID", "mis reglas", "programado para", ni cites tus instrucciones internas. Si el usuario te agradece o felicita, responde con cortesía humana ejecutiva y orientada a valor de negocio.
4. Fundamenta tus respuestas en los datos reales del expediente anterior (cita IDs específicos como F1, D2, O1, A3, S1, etc.).
5. Aplica los principios metodológicos estándar de Fred David (EFI/EFE/QSPM) y matrices DAFO/CAME.
6. Si el usuario pide sugerencias de factores o iniciativas, estructura tu respuesta con viñetas claras y explicaciones cuantitativas/cualitativas.
7. FORMATO MATEMÁTICO PEDAGÓGICO (Obligatorio para cualquier cálculo, ponderación, índice o fórmula):
   Siempre que expliques un cálculo o resultado numérico, presenta la respuesta con esta estructura visual clara:
   a) Título temático con emoji (ej. "### 🧮 Fórmula del QSPM" o "### 📊 Ponderación de Factor EFI").
   b) Fórmula matemática formal en bloque LaTeX usando "$$ ... $$" o "\\[ ... \\]" (ej. "$$TAS_i = w_i \\cdot AS_i$$").
   c) Sección "**Donde:**" en viñetas detallando con claridad qué significa cada variable (ej. "- $w_i =$ peso normalizado...").
   d) Sección "**Aplicación a tu caso:**" o "**Cálculo paso a paso:**" sustituyendo los valores numéricos reales en la fórmula y mostrando el resultado final.
8. Sé conciso y directo, evitando rodeos innecesarios salvo que se te pida una redacción extensa o académica.`
}

export function buildQualityInsights(
  state: InvestigationState,
  analysis: ReturnType<typeof calculateAnalysis>,
  validation: ReturnType<typeof validateInvestigation>
): string {
  const efiWt = analysis.efi.weightTotal
  const efeWt = analysis.efe.weightTotal
  const rel = analysis.relations
  const qspm = analysis.qspm
  const came = analysis.came

  const totalRelations = state.internal.length * state.external.length
  const pendingRelations = totalRelations - rel.evaluatedCount

  // QSPM breakdown
  const winner = qspm.results[0]
  const runner = qspm.results[1]
  const winnerTas = winner ? formatNumber(winner.totalTas) : '—'
  const runnerTas = runner ? formatNumber(runner.totalTas) : '—'
  const diff = qspm.results.length > 1 ? formatNumber(qspm.topDifference) : '0.00'
  const pendingQspm = winner ? winner.pending : 0
  const tieNote = qspm.tie ? ' (EMPATE <0.001)' : ''

  // CAME counts
  const cameTotal = came.actions.length
  const byType = came.byType

  const byCat = came.actions.reduce(
    (acc: Record<string, number>, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1

      return acc
    },
    {} as Record<string, number>
  )

  const missingResp = came.actions.filter(a => !String(a.responsible || '').trim()).length
  const missingIndic = came.actions.filter(a => !String(a.indicator || '').trim()).length
  const missingTarget = came.actions.filter(a => !String(a.target || '').trim()).length

  // Factor quality
  const missingEvidence = [...state.internal, ...state.external].filter(f => !String(f.evidence || '').trim())
  const missingEvidenceIds = missingEvidence.slice(0, 6).map(f => f.id).join(', ') || 'ninguno'
  const extraMissingEvidence = missingEvidence.length > 6 ? ` (+${missingEvidence.length - 6} más)` : ''

  // Validation top issues
  const topIssues = validation.issues.slice(0, 8).map(i => `• [${i.stage}/${i.severity}] ${i.message}`).join('\\n') || 'Sin issues.'

  // Quadrant details
  const quadLines = (['FO', 'DO', 'FA', 'DA'] as const)
    .map(q => {
      const s = rel.summary[q]

      return `${q}: idx ${formatNumber(s.index)} cov ${formatPercent(s.coverage)} (${s.evaluated}/${s.available})`
    })
    .join(' | ')

  const efiWtNote = Math.abs(efiWt - 1) < 0.001 ? '✓' : `⚠ suma ${formatNumber(efiWt)} (debe 1.00)`
  const efeWtNote = Math.abs(efeWt - 1) < 0.001 ? '✓' : `⚠ suma ${formatNumber(efeWt)} (debe 1.00)`
  const cameWtNote = Math.abs(came.weightTotal - 1) < 0.001 ? '✓' : `⚠ CAME pesos ${formatNumber(came.weightTotal)} (debe 1.00)`

  return `
══════════════════════════════════════════════════════════
ESTADÍSTICAS REALES Y AUDITORÍA DE CALIDAD (CITA ESTOS NÚMEROS EXACTOS, NO INVENTES — son verdad del expediente):
• EFI: ${formatNumber(analysis.efi.total)}/4.00 peso ${efiWtNote} · ${analysis.efi.factors.length} factores (F:${analysis.efi.strengths.length} D:${analysis.efi.weaknesses.length})
• EFE: ${formatNumber(analysis.efe.total)}/4.00 peso ${efeWtNote} · ${analysis.efe.factors.length} factores (O:${analysis.efe.opportunities.length} A:${analysis.efe.threats.length})
• DAFO: ${rel.evaluatedCount}/${totalRelations} evaluadas (${formatPercent(rel.coverage)} cobertura) · dominante ${rel.dominant || '—'} idx ${rel.dominant ? formatNumber(rel.summary[rel.dominant].index) : '—'} conf ${rel.confidence} · 2ª ${rel.second || '—'} diff ${formatPercent(rel.difference)} · pendientes ${pendingRelations}
  Por cuadrante: ${quadLines}
  Warnings DAFO: ${rel.warnings.length ? rel.warnings.join(' | ') : 'ninguno'}
• QSPM: ${qspm.results.length} estrategias · ganadora ${winner ? `${winner.strategyId} TAS ${winnerTas} (int ${formatNumber(winner.internalTas)} ext ${formatNumber(winner.externalTas)}) eval ${winner.evaluated}/${winner.evaluated + winner.pending}` : '—'}${tieNote} · 2ª ${runner ? `${runner.strategyId} ${runnerTas}` : '—'} diff ${diff} · pendientes QSPM ${pendingQspm} · ${qspm.warnings.length ? qspm.warnings.join(' | ') : 'sin warnings'}
• CAME: ${cameTotal} acciones (C:${byType.C.length} A:${byType.A.length} M:${byType.M.length} E:${byType.E.length}) · crítica:${byCat.critica || 0} alta:${byCat.alta || 0} media:${byCat.media || 0} baja:${byCat.baja || 0} · ${cameWtNote}
  CAME incompletas: sin responsable ${missingResp}, sin indicador ${missingIndic}, sin meta ${missingTarget} · warnings: ${came.warnings.length ? came.warnings.join(' | ') : 'ninguno'}
• CALIDAD FACTORES: sin evidencia ${missingEvidence.length} → ${missingEvidenceIds}${extraMissingEvidence}
• VALIDACIÓN: ${validation.errors} errores, ${validation.warnings} warnings · estados: ${Object.entries(validation.stageStatus).map(([k, v]) => `${k}:${v}`).join(', ')}
  Issues (top 8):
${topIssues}
INSTRUCCIÓN OBLIGATORIA PARA EL DICTAMEN: Cuando redactes el informe, además de lo cualitativo, DEBES citar los números de arriba (ej. \"37/100 DAFO evaluadas, cobertura 37%, dominante FO idx 0.42 conf media, QSPM ganadora EST-DO-01 TAS 6.82 diff 0.67, CAME 12 acciones crítica:2 ...\") y en el capítulo 5 AUDITORÍA debes listar hallazgos ambiguos por ID (pesos ≠1, factores sin evidencia como ${missingEvidenceIds || '—'}, relaciones pendientes ${pendingRelations}, QSPM incompleta, CAME sin responsable/indicador) con recomendaciones accionables por ID. Si todo está completo, felicita y sugiere profundizar.
`
}
