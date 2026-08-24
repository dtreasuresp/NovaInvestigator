// Type Imports
import type {
  CameAction,
  CameCriteriaValues,
  CameType,
  Factor,
  FactorType,
  InvestigationState,
  QspmScores,
  Quadrant,
  Relationship,
  Strategy
} from '@/types/apps/investigator-types'

// Utils Imports
import {
  CAME_CRITERIA,
  EXTERNAL_FACTORS,
  INTERNAL_FACTORS,
  RELATION_STATUSES,
  createStrategies,
  getAllFactors,
  makeFactors,
  quadrantFor,
  relationStatusForStrength
} from './domain'

// ─── Generadores exclusivos del caso de estudio demostrativo (ETECSA) ────────

const demoGetRelationStrength = (internalFactor: Factor, externalFactor: Factor): number => {
  const quadrant = quadrantFor(internalFactor, externalFactor)
  const pair = `${internalFactor.id}:${externalFactor.id}`
  const noRelationPairs = new Set(['F-02:O-03', 'F-05:A-10', 'D-06:O-05', 'D-09:A-07'])

  if (noRelationPairs.has(pair)) return 0

  if (quadrant === 'DO') {
    if (internalFactor.id === 'D-08' && ['O-01', 'O-02', 'O-03'].includes(externalFactor.id)) return 3
    if (internalFactor.id === 'D-07' && ['O-01', 'O-03'].includes(externalFactor.id)) return 3

    return 2
  }

  if (quadrant === 'FO') {
    return ['F-01:O-01', 'F-03:O-02', 'F-04:O-01'].includes(pair) ? 2 : 1
  }

  if (quadrant === 'FA') {
    return ['F-01:A-06', 'F-03:A-08'].includes(pair) ? 2 : 1
  }

  return ['D-10:A-06', 'D-08:A-09'].includes(pair) ? 2 : 1
}

const demoRelationText = (internalFactor: Factor, externalFactor: Factor, strength: number): string => {
  if (strength === 0)
    return `El par ${internalFactor.id} + ${externalFactor.id} fue revisado y no presenta un vínculo directo en este escenario.`

  const verbs: Record<Quadrant, string> = {
    FO: 'permite aprovechar',
    DO: 'requiere corregir para aprovechar',
    FA: 'puede contener',
    DA: 'incrementa la exposición ante'
  }

  const quadrant = quadrantFor(internalFactor, externalFactor)!

  return `${internalFactor.name} ${verbs[quadrant]} ${externalFactor.name}; la relación se valora con fuerza ${strength}/3.`
}

const buildDemoRelationships = (state: { internal: Factor[]; external: Factor[] }): Relationship[] =>
  state.internal.flatMap(internalFactor =>
    state.external.map(externalFactor => {
      const strength = demoGetRelationStrength(internalFactor, externalFactor)

      return {
        id: `REL-${internalFactor.id}-${externalFactor.id}`,
        internalId: internalFactor.id,
        externalId: externalFactor.id,
        quadrant: quadrantFor(internalFactor, externalFactor),
        strength,
        status: relationStatusForStrength(strength),
        justification: demoRelationText(internalFactor, externalFactor, strength),
        evidence:
          strength === 0
            ? 'Revisión del diagnóstico; vínculo no identificado (simulado).'
            : 'Tesis ETECSA: revisión documental y entrevistas (simulado).',
        evaluator: 'Equipo metodológico',
        date: '2026-07-31'
      }
    })
  )

const demoStrategyForFactor = (factorId: string): string => {
  const mapping: Record<string, string> = {
    'F-01': 'EST-FO-01',
    'F-02': 'EST-FO-01',
    'F-03': 'EST-FO-01',
    'F-04': 'EST-FO-01',
    'F-05': 'EST-DO-03',
    'D-06': 'EST-DO-01',
    'D-07': 'EST-DO-02',
    'D-08': 'EST-DO-01',
    'D-09': 'EST-DO-03',
    'D-10': 'EST-DA-01',
    'O-01': 'EST-DO-01',
    'O-02': 'EST-DO-01',
    'O-03': 'EST-DO-03',
    'O-04': 'EST-DO-03',
    'O-05': 'EST-FO-01',
    'A-06': 'EST-DA-01',
    'A-07': 'EST-FA-01',
    'A-08': 'EST-FA-01',
    'A-09': 'EST-DA-01',
    'A-10': 'EST-DA-01'
  }

  return mapping[factorId] || 'EST-DO-01'
}

const demoCameCopyFor = (
  factor: Factor,
  type: CameType
): { objective: string; action: string; indicator: string; target: string } => {
  const copy: Record<CameType, { objective: string; action: string; indicator: string; target: string }> = {
    C: {
      objective: `Reducir el efecto de ${factor.name.toLowerCase()} en el sistema.`,
      action:
        factor.id === 'D-08'
          ? 'Diseñar y aprobar el mapa integrado de procesos de cuadros y reservas.'
          : `Diseñar medidas para corregir ${factor.name.toLowerCase()}.`,
      indicator:
        factor.id === 'D-08'
          ? 'Procesos con mapa, responsable y punto de coordinación'
          : `Avance de medidas para ${factor.id}`,
      target: factor.id === 'D-08' ? '100 % de procesos críticos documentados' : 'Plan de mejora aprobado y monitoreado'
    },
    A: {
      objective: `Disminuir la exposición institucional ante ${factor.name.toLowerCase()}.`,
      action: `Definir medidas de contingencia para afrontar ${factor.name.toLowerCase()}.`,
      indicator: `Nivel de preparación ante ${factor.id}`,
      target: 'Protocolo de respuesta validado'
    },
    M: {
      objective: `Consolidar la capacidad asociada a ${factor.name.toLowerCase()}.`,
      action: `Mantener y distribuir la capacidad asociada a ${factor.name.toLowerCase()}.`,
      indicator: `Cumplimiento del plan de mantenimiento de ${factor.id}`,
      target: 'Cumplimiento superior al 90 %'
    },
    E: {
      objective: `Aprovechar el potencial de ${factor.name.toLowerCase()}.`,
      action: `Diseñar proyectos para capitalizar ${factor.name.toLowerCase()}.`,
      indicator: `Iniciativas implementadas sobre ${factor.id}`,
      target: '100 % de iniciativas del período ejecutadas'
    }
  }

  return copy[type]
}

const demoCameCriteriaFor = (factor: Factor, strategyId: string): CameCriteriaValues => {
  const importance = factor.weight >= 0.15 ? 5 : factor.weight >= 0.1 ? 4 : 3
  const urgency = factor.type === 'D' || factor.type === 'A' ? 4 : 3
  const severity = factor.type === 'D' && factor.rating === 1 ? 5 : factor.type === 'A' ? 4 : 3
  const alignment = strategyId === 'EST-DO-01' || strategyId === 'EST-DO-02' ? 5 : 4
  const feasibility = factor.type === 'D' ? 4 : 3

  return { impact: importance, urgency, severity, alignment, feasibility }
}

const buildDemoCameActions = (factors: Factor[]): CameAction[] =>
  factors.map(factor => {
    const type = (({ D: 'C', A: 'A', F: 'M', O: 'E' } as Record<FactorType, CameType>)[factor.type] || 'C') as CameType
    const strategyId = demoStrategyForFactor(factor.id)
    const copy = demoCameCopyFor(factor, type)

    return {
      id: `ACC-${factor.id}`,
      type,
      factorId: factor.id,
      factor: factor.name,
      strategyId,
      problem: factor.name,
      objective: copy.objective,
      action: copy.action,
      responsible: type === 'C' ? 'Dirección de Cuadros y Reservas' : 'Equipo de planificación estratégica',
      participants: 'Cuadros de procesos, RR. HH. y dirección de la unidad',
      resources: ['tiempo de trabajo', 'información de procesos', 'herramienta de seguimiento'],
      startDate: '2026-08-01',
      endDate: '2026-12-20',
      indicator: copy.indicator,
      baseline: factor.id === 'D-08' ? 'Procesos sin mapa integrado' : 'Diagnóstico inicial disponible',
      target: copy.target,
      frequency: 'Mensual',
      status: 'propuesta' as CameAction['status'],
      criteria: demoCameCriteriaFor(factor, strategyId),
      justification: `Acción derivada del factor ${factor.id} y vinculada con ${strategyId}. Ficha demostrativa pendiente de validación institucional.`,
      observations: 'Escenario demostrativo simulado para revisar la trazabilidad del método.'
    }
  })

const demoAttractivenessFor = (strategy: Strategy, factor: Factor): number => {
  const related = strategy.relatedFactors.includes(factor.id)
  const internalOrOpportunity = ['D', 'O'].includes(factor.type)
  const defensiveFamily = ['F', 'A'].includes(factor.type)

  if (strategy.id === 'EST-DO-01') {
    if (related) return 4

    return internalOrOpportunity ? 3 : 1
  }

  if (strategy.id === 'EST-DO-02') {
    if (factor.id === 'D-08') return 4
    if (related) return 3

    return internalOrOpportunity ? 2 : 1
  }

  if (strategy.id === 'EST-DO-03') {
    if (related) return 3

    return internalOrOpportunity ? 2 : 1
  }

  if (strategy.id === 'EST-FA-01') {
    if (related) return 4

    return defensiveFamily ? 3 : 1
  }

  if (strategy.id === 'EST-DA-01') {
    if (related) return 4

    return ['D', 'A'].includes(factor.type) ? 3 : 2
  }

  if (related) return 4

  return ['F', 'O'].includes(factor.type) ? 3 : 2
}

const buildDemoQspmScores = (strategies: Strategy[], factors: Factor[]): QspmScores =>
  Object.fromEntries(
    strategies.map(strategy => [
      strategy.id,
      Object.fromEntries(factors.map(factor => [factor.id, demoAttractivenessFor(strategy, factor)]))
    ])
  )

// ─── Creación de estados ─────────────────────────────────────────────────────

export const createDemoState = (): InvestigationState => {
  const internal = makeFactors(INTERNAL_FACTORS, 'internal')
  const external = makeFactors(EXTERNAL_FACTORS, 'external')
  const strategies = createStrategies()

  const baseState: InvestigationState = {
    metadata: {
      id: 'ETECSA-DEMO-01',
      label: 'demostrativo-simulado',
      organization: 'ETECSA',
      unit: 'Sistema de Trabajo con los Cuadros y sus Reservas',
      title: 'Interrelación de los procesos de cuadros y reservas',
      author: 'Equipo metodológico',
      evaluationDate: '2026-07-31',
      validation: 'borrador',
      status: 'borrador',
      problem: 'La falta de integración limita la coordinación y el seguimiento del sistema.',
      objective:
        'Analizar la interrelación de los procesos de cuadros y reservas para proponer acciones de mejora.',
      assumptions: 'Escenario demostrativo con evidencia simulada para revisar el flujo metodológico.',
      methodologicalVersion: '2.0',
      updatedAt: '2026-07-31T00:00:00.000Z',
      archivedAt: null
    },
    internal,
    external,
    relationships: [],
    strategies,
    qspmScores: {},
    selectedStrategyId: 'EST-FO-01',
    selectionJustification:
      'Se selecciona la alternativa que alcanza la mayor TAS ponderada por el equipo complementario y se documenta como decisión inicial del escenario demostrativo.',
    cameCriteria: CAME_CRITERIA.map(criterion => ({ ...criterion })),
    cameActions: [],
    history: []
  }

  baseState.relationships = buildDemoRelationships(baseState)
  baseState.qspmScores = buildDemoQspmScores(strategies, getAllFactors(baseState))
  baseState.cameActions = buildDemoCameActions(getAllFactors(baseState))

  return baseState
}

export const createBlankState = (customId?: string): InvestigationState => ({
  metadata: {
    id: customId ?? 'INV-000000',
    label: 'nueva-investigacion',
    organization: '',
    unit: '',
    title: 'Nueva investigación estratégica',
    author: '',
    evaluationDate: new Date().toISOString().slice(0, 10),
    validation: 'borrador',
    status: 'nueva',
    problem: '',
    objective: '',
    assumptions: '',
    methodologicalVersion: '2.0',
    updatedAt: new Date().toISOString(),
    archivedAt: null
  },
  internal: [],
  external: [],
  relationships: [],
  strategies: [],
  qspmScores: {},
  selectedStrategyId: null,
  selectionJustification: '',
  cameCriteria: CAME_CRITERIA.map(criterion => ({ ...criterion })),
  cameActions: [],
  history: []
})