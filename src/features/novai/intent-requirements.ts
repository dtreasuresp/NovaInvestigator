/**
 * Matriz Intent → Required Tools & Epistemic Requirements (§33 §34)
 * Determina, a partir de la intención del usuario, qué tools son obligatorias,
 * qué evidencia/cálculo es obligatorio y qué debe existir antes/después.
 *
 * Esta es la única fuente canónica para decidir:
 *  INTENT → REQUIRED_TOOLS + EVIDENCE_REQUIRED + CALCULATION_REQUIRED
 *
 * El LLM NO decide si puede improvisar; esta matriz lo determina.
 */

export type IntentType =
  | 'VERIFY_DATA' // "verifica si este valor es correcto"
  | 'VERIFY_INVESTIGATION' // "verifica si la investigación es correcta / nivel confianza"
  | 'VERIFY_FACTOR' // "verifica D-01"
  | 'CALCULATE_MATRIX' // "calcula EFI/EFE/DAFO/QSPM/CAME"
  | 'SEARCH_WEB' // "busca en web información confiable"
  | 'COMPARE_SCENARIOS' // "compara estrategias A vs B"
  | 'RECOMMEND' // "recomienda estrategia / acción"
  | 'GENERAL_CHAT' // saludos, ayuda general, sin verificación

export interface IntentRequirement {
  intent: IntentType
  label: string
  description: string
  requiredTools: string[] // tools que DEBEN haber sido llamadas con éxito
  evidenceRequired: boolean
  calculationRequired: boolean | 'depends'
  requiredEvidenceType?: 'INTERNAL_EVIDENCE' | 'EXTERNAL_EVIDENCE' | 'BOTH' | 'EITHER'
  fallback: 'INSUFFICIENT_EVIDENCE' | 'DEGRADE_TO_INFERENCE' | 'REQUIRE_TOOL'
  exampleQueries: string[]
}

export const INTENT_REQUIREMENTS: Record<IntentType, IntentRequirement> = {
  VERIFY_DATA: {
    intent: 'VERIFY_DATA',
    label: 'Verificar dato puntual',
    description: 'Verifica si un valor, cifra o afirmación es correcto contra evidencia.',
    requiredTools: ['get_active_investigation', 'get_factor_evidence'],
    evidenceRequired: true,
    calculationRequired: false,
    requiredEvidenceType: 'INTERNAL_EVIDENCE',
    fallback: 'INSUFFICIENT_EVIDENCE',
    exampleQueries: ['verifica si D-01 es correcto', 'este valor EFI está bien?', '¿de dónde sale este porcentaje?']
  },
  VERIFY_INVESTIGATION: {
    intent: 'VERIFY_INVESTIGATION',
    label: 'Verificar investigación completa / nivel de confianza',
    description: 'Verifica si el nivel de confianza, estado o resultado global de la investigación es correcto. Requiere expediente + matrices + evidencia externa.',
    requiredTools: ['get_active_investigation', 'get_investigation_details', 'calculate_matrix', 'verify_claim'],
    evidenceRequired: true,
    calculationRequired: true,
    requiredEvidenceType: 'BOTH', // INTERNAL para matrices + EXTERNAL si pide web
    fallback: 'INSUFFICIENT_EVIDENCE',
    exampleQueries: [
      'verifica si el nivel de confianza de la investigación actual es correcto',
      'busca información confiable en la web para comprobar el valor actual',
      'valida que el investigador está en lo correcto'
    ]
  },
  VERIFY_FACTOR: {
    intent: 'VERIFY_FACTOR',
    label: 'Verificar factor específico',
    description: 'Verifica calibración, evidencia y ponderación de un factor (D-01, F-01...).',
    requiredTools: ['get_active_investigation', 'get_factor_evidence', 'audit_factor'],
    evidenceRequired: true,
    calculationRequired: 'depends', // si pregunta por peso/rating sí
    requiredEvidenceType: 'INTERNAL_EVIDENCE',
    fallback: 'INSUFFICIENT_EVIDENCE',
    exampleQueries: ['verifica D-01', 'audita F-03', '¿está bien calificado este factor?']
  },
  CALCULATE_MATRIX: {
    intent: 'CALCULATE_MATRIX',
    label: 'Calcular matriz',
    description: 'Calcula índices EFI/EFE/DAFO/CAME/QSPM. Requiere inputs válidos y cálculo determinista.',
    requiredTools: ['get_active_investigation', 'calculate_matrix'],
    evidenceRequired: false, // pero inputs deben existir
    calculationRequired: true,
    requiredEvidenceType: 'INTERNAL_EVIDENCE',
    fallback: 'REQUIRE_TOOL',
    exampleQueries: ['calcula EFI', 'dame el TAS QSPM', '¿cuál es el índice DAFO?']
  },
  SEARCH_WEB: {
    intent: 'SEARCH_WEB',
    label: 'Buscar en web',
    description: 'Busca información confiable en fuentes externas públicas.',
    requiredTools: ['web_research'],
    evidenceRequired: true,
    calculationRequired: false,
    requiredEvidenceType: 'EXTERNAL_EVIDENCE',
    fallback: 'INSUFFICIENT_EVIDENCE',
    exampleQueries: ['busca en la web', 'busca información confiable', 'encuentra fuentes externas']
  },
  COMPARE_SCENARIOS: {
    intent: 'COMPARE_SCENARIOS',
    label: 'Comparar escenarios / estrategias',
    description: 'Compara alternativas estratégicas. Requiere trazabilidad y QSPM.',
    requiredTools: ['get_active_investigation', 'compare_strategies', 'trace_strategy'],
    evidenceRequired: true,
    calculationRequired: 'depends',
    requiredEvidenceType: 'INTERNAL_EVIDENCE',
    fallback: 'DEGRADE_TO_INFERENCE',
    exampleQueries: ['compara estrategia A vs B', '¿cuál estrategia es mejor?', 'contrasta escenarios']
  },
  RECOMMEND: {
    intent: 'RECOMMEND',
    label: 'Recomendar',
    description: 'Recomienda estrategia o acción. Puede ser INFERENCE si no hay evidencia, pero debe marcarse como tal.',
    requiredTools: ['get_active_investigation'],
    evidenceRequired: false,
    calculationRequired: false,
    requiredEvidenceType: 'EITHER',
    fallback: 'DEGRADE_TO_INFERENCE',
    exampleQueries: ['recomienda una estrategia', '¿qué harías?', 'sugiere acciones CAME']
  },
  GENERAL_CHAT: {
    intent: 'GENERAL_CHAT',
    label: 'Chat general',
    description: 'Saludos, ayuda general, sin verificación factual.',
    requiredTools: [],
    evidenceRequired: false,
    calculationRequired: false,
    fallback: 'DEGRADE_TO_INFERENCE',
    exampleQueries: ['hola', 'cómo estás', 'qué puedes hacer']
  }
}

// Pre / Postconditions por tool (§34)
export interface ToolPrecondition {
  tool: string
  requires: string[] // qué debe existir antes
  description: string
}
export interface ToolPostcondition {
  tool: string
  successStatus: string[] // valores válidos de result.status
  requiresEvidence?: boolean // debe tener results.length > 0
  requiresCalculationEvent?: boolean
  fallback: string
}

export const TOOL_PRECONDITIONS: Record<string, ToolPrecondition> = {
  web_research: {
    tool: 'web_research',
    requires: ['query'],
    description: 'Requiere query. No requiere investigation_id, pero si verificación de investigación, debe haber llamado get_active_investigation antes.'
  },
  calculate_matrix: {
    tool: 'calculate_matrix',
    requires: ['investigation_id'],
    description: 'Requiere investigation_id válido del tenant.'
  },
  verify_claim: {
    tool: 'verify_claim',
    requires: ['claim', 'investigation_id'],
    description: 'Requiere claim + investigation_id.'
  }
}

export const TOOL_POSTCONDITIONS: Record<string, ToolPostcondition> = {
  web_research: {
    tool: 'web_research',
    successStatus: ['EXTERNAL_EVIDENCE'],
    requiresEvidence: true,
    fallback: 'EXTERNAL_EVIDENCE_UNAVAILABLE → INSUFFICIENT_EVIDENCE'
  },
  calculate_matrix: {
    tool: 'calculate_matrix',
    successStatus: ['success'],
    requiresCalculationEvent: true,
    fallback: 'REQUIRE_TOOL'
  },
  get_factor_evidence: {
    tool: 'get_factor_evidence',
    successStatus: ['success'],
    requiresEvidence: true,
    fallback: 'INSUFFICIENT_EVIDENCE'
  }
}

/**
 * Clasifica la intención del usuario a partir del texto.
 * Heurística conservadora: si duda, elige el intent más exigente (VERIFY_INVESTIGATION > VERIFY_DATA).
 */
export function classifyIntent(text: string): IntentType {
  const lower = (text || '').toLowerCase()

  // Combinación crítica: verifica + investigación + confianza/nivel → VERIFY_INVESTIGATION
  const hasVerify = /verifica|valid|comprueba|confianza|correcto|acertado|nivel de confianza/.test(lower)
  const hasInvestigation = /investigaci[oó]n|expediente|matriz|efi|efe|dafo|qspm|came/.test(lower)
  const hasWeb = /web|internet|externa|fuente confiable|busca en|informaci[oó]n confiable/.test(lower)
  const hasFactor = /(?:^|\b)(?:d|f|o|a)[- ]?\d{1,2}\b/.test(lower) || /factor/.test(lower)
  const hasCalculate = /calcula|índice|tas|ponderaci[oó]n|calificaci[oó]n/.test(lower)
  const hasCompare = /compara|contrasta|vs|versus|mejor.*estrategia|escenario/.test(lower)
  const hasRecommend = /recomiend|sugier|prop[oó]n|qu[eé] har[ií]as/.test(lower)

  if (hasVerify && hasInvestigation && hasWeb) return 'VERIFY_INVESTIGATION'
  if (hasVerify && hasInvestigation) return 'VERIFY_INVESTIGATION'
  if (hasWeb && (hasVerify || hasInvestigation)) return 'SEARCH_WEB' // si pide web explícito y no es verify investigation
  if (hasVerify && hasFactor) return 'VERIFY_FACTOR'
  if (hasVerify) return 'VERIFY_DATA'
  if (hasCalculate) return 'CALCULATE_MATRIX'
  if (hasCompare) return 'COMPARE_SCENARIOS'
  if (hasRecommend) return 'RECOMMEND'
  if (hasFactor) return 'VERIFY_FACTOR'

  return 'GENERAL_CHAT'
}

export function getRequiredToolsForIntent(intent: IntentType): string[] {
  return INTENT_REQUIREMENTS[intent]?.requiredTools ?? []
}

export function getRequirementForIntent(intent: IntentType): IntentRequirement {
  return INTENT_REQUIREMENTS[intent] ?? INTENT_REQUIREMENTS.GENERAL_CHAT
}
