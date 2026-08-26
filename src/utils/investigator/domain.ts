// Type Imports
import type {
  Analysis,
  CameAction,
  CameCriteriaValues,
  CameCriterion,
  CameEnrichedAction,
  CameResult,
  CameType,
  CrossCell,
  DafoResult,
  EfeResult,
  EfiResult,
  ExploratoryMatrix,
  ExploratoryRow,
  Factor,
  FactorGroup,
  FactorType,
  FactorWithScore,
  InvestigationState,
  Metadata,
  Quadrant,
  QuadrantSummary,
  QspmResult,
  QspmScores,
  QspmStrategyResult,
  Relationship,
  RelationsAnalysis,
  RelationStatusLabel,
  Severity,
  StageKey,
  StageStatusMap,
  Strategy,
  ValidationIssue,
  ValidationResult
} from '@/types/apps/investigator-types'

// ─── Constantes ──────────────────────────────────────────────────────────────

export const QUADRANTS: Quadrant[] = ['FO', 'DO', 'FA', 'DA']

export const INVESTIGATION_STATUSES: string[] = [
  'nueva',
  'borrador',
  'en análisis',
  'validada',
  'exportada',
  'cerrada'
]

export const RELATION_STATUSES: Record<string, RelationStatusLabel> = {
  pending: 'pendiente',
  none: 'sin relación',
  weak: 'débil',
  moderate: 'moderada',
  strong: 'fuerte'
}

export const ORIENTATIONS: Record<Quadrant, { name: string; subtitle: string; action: string }> = {
  FO: {
    name: 'Ofensiva',
    subtitle: 'crecimiento y expansión',
    action: 'Utilizar fortalezas para aprovechar oportunidades.'
  },
  DO: {
    name: 'Adaptativa',
    subtitle: 'reorientación y desarrollo',
    action: 'Corregir debilidades para aprovechar oportunidades.'
  },
  FA: {
    name: 'Defensiva',
    subtitle: 'protección y consolidación',
    action: 'Utilizar fortalezas para reducir amenazas.'
  },
  DA: {
    name: 'Supervivencia',
    subtitle: 'contención y continuidad',
    action: 'Reducir vulnerabilidades y exposición ante amenazas.'
  }
}

export const CAME_CRITERIA: CameCriterion[] = [
  { id: 'impacto', name: 'Impacto sobre el problema', weight: 0.2 },
  { id: 'urgencia', name: 'Urgencia', weight: 0.2 },
  { id: 'severidad', name: 'Severidad o evidencia', weight: 0.2 },
  { id: 'alignment', name: 'Alineación estratégica', weight: 0.2 },
  { id: 'feasibility', name: 'Factibilidad', weight: 0.2 }
]

// ─── Datos demo ───────────────────────────────────────────────────────

export const INTERNAL_FACTORS: [string, string, FactorType, number, number][] = [
  ['F-01', 'Voluntad de la alta dirección', 'F', 0.06, 4],
  ['F-02', 'Marco legal empresarial', 'F', 0.06, 3],
  ['F-03', 'Indicadores de gestión', 'F', 0.07, 3],
  ['F-04', 'Uso de herramientas', 'F', 0.06, 2],
  ['F-05', 'Profesionalidad de los cuadros', 'F', 0.1, 3],
  ['D-06', 'Procesos burocráticos', 'D', 0.1, 2],
  ['D-07', 'Falta de automatización de procesos', 'D', 0.14, 2],
  ['D-08', 'Falta de integración de procesos', 'D', 0.2, 1],
  ['D-09', 'Falta de evaluación del impacto de la capacitación', 'D', 0.1, 2],
  ['D-10', 'Fluctuación de cuadros y reservas', 'D', 0.11, 2]
]

export const EXTERNAL_FACTORS: [string, string, FactorType, number, number][] = [
  ['O-01', 'Transformación digital', 'O', 0.15, 3],
  ['O-02', 'Modernización del sector', 'O', 0.13, 3],
  ['O-03', 'Uso de la Inteligencia Artificial', 'O', 0.15, 2],
  ['O-04', 'Vínculo con la DCEG', 'O', 0.12, 3],
  ['O-05', 'Marco legal de país', 'O', 0.1, 3],
  ['A-06', 'Migración al extranjero', 'A', 0.07, 2],
  ['A-07', 'Bloqueo del gobierno de EE. UU.', 'A', 0.08, 2],
  ['A-08', 'Situación económica y financiera', 'A', 0.08, 2],
  ['A-09', 'Migración al sector privado', 'A', 0.07, 2],
  ['A-10', 'Inestabilidad energética', 'A', 0.05, 1]
]

export const STRATEGIES: Strategy[] = [
  {
    id: 'EST-DO-01',
    name: 'Integración formal de los procesos de cuadros y reservas',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Establecer un flujo común, responsabilidades y puntos de coordinación.',
    relatedFactors: ['D-08', 'O-01', 'O-02'],
    observations: ''
  },
  {
    id: 'EST-DO-02',
    name: 'Sistema digital de seguimiento del ciclo de cuadros y reservas',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Reducir la fragmentación y mejorar la trazabilidad de la información.',
    relatedFactors: ['D-07', 'D-08', 'O-01', 'O-03'],
    observations: ''
  },
  {
    id: 'EST-FA-01',
    name: 'Mecanismo permanente de coordinación interprocesos',
    quadrant: 'FA',
    orientation: 'defensiva',
    description: 'Asegurar la articulación institucional y el seguimiento de acuerdos.',
    relatedFactors: ['F-01', 'F-03', 'A-06', 'A-08'],
    observations: ''
  },
  {
    id: 'EST-DO-03',
    name: 'Programa de capacitación con evaluación de impacto',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Vincular capacitación, desempeño, resultados y necesidades reales del sistema.',
    relatedFactors: ['D-09', 'O-03', 'O-04'],
    observations: ''
  },
  {
    id: 'EST-DA-01',
    name: 'Plan de continuidad y retención de cuadros y reservas',
    quadrant: 'DA',
    orientation: 'supervivencia',
    description: 'Reducir la vulnerabilidad ante fluctuación y pérdida de capacidades.',
    relatedFactors: ['D-10', 'A-06', 'A-09'],
    observations: ''
  },
  {
    id: 'EST-FO-01',
    name: 'Fortalecimiento de indicadores de gestión e integración',
    quadrant: 'FO',
    orientation: 'ofensiva',
    description: 'Medir el funcionamiento del sistema y detectar fallas de coordinación.',
    relatedFactors: ['F-03', 'F-04', 'O-01', 'O-02'],
    observations: ''
  }
]

// ─── Helpers puros ───────────────────────────────────────────────────────────

export const makeFactors = (
  rows: [string, string, FactorType, number, number][],
  group: FactorGroup
): Factor[] =>
  rows.map(([id, name, type, weight, rating]) => ({
    id,
    name,
    type,
    group,
    weight,
    rating,
    description: '',
    evidence: ''
  }))

export const normalizeFactorWeights = (factors: Factor[]): Factor[] => {
  if (factors.length === 0) return factors

  const total = factors.reduce((sum, f) => sum + (Number(f.weight) || 0), 0)

  if (total <= 0) {
    const equalWeight = Math.floor((1 / factors.length) * 100) / 100
    const remainder = Math.round((1 - equalWeight * factors.length) * 100) / 100

    return factors.map((f, i) => ({
      ...f,
      weight: i === 0 ? Math.round((equalWeight + remainder) * 100) / 100 : equalWeight
    }))
  }

  const rawRounded = factors.map(f => ({
    ...f,
    weight: Math.round(((Number(f.weight) || 0) / total) * 100) / 100
  }))

  const roundedSum = rawRounded.reduce((sum, f) => sum + f.weight, 0)
  const diff = Math.round((1.0 - roundedSum) * 100) / 100

  if (diff !== 0 && rawRounded.length > 0) {
    let maxIdx = 0

    for (let i = 1; i < rawRounded.length; i++) {
      if (rawRounded[i].weight > rawRounded[maxIdx].weight) {
        maxIdx = i
      }
    }

    rawRounded[maxIdx].weight = Math.round((rawRounded[maxIdx].weight + diff) * 100) / 100
  }

  return rawRounded
}

export const getAllFactors = (state: { internal: Factor[]; external: Factor[] }): Factor[] => [
  ...state.internal,
  ...state.external
]

export const getFactor = (
  state: { internal: Factor[]; external: Factor[] },
  factorId: string
): Factor | undefined => getAllFactors(state).find(factor => factor.id === factorId)

export const quadrantFor = (
  internalFactor: Factor | undefined | null,
  externalFactor: Factor | undefined | null
): Quadrant | null => {
  if (!internalFactor || !externalFactor) return null

  return `${internalFactor.type}${externalFactor.type}` as Quadrant
}

export const createStrategies = (): Strategy[] =>
  STRATEGIES.map(strategy => ({
    ...strategy,
    relatedFactors: [...strategy.relatedFactors],
    observations: ''
  }))

export const relationStatusForStrength = (strength: number): RelationStatusLabel => {
  if (!Number.isInteger(strength)) return RELATION_STATUSES.pending

  return (
    {
      0: RELATION_STATUSES.none,
      1: RELATION_STATUSES.weak,
      2: RELATION_STATUSES.moderate,
      3: RELATION_STATUSES.strong
    } as Record<number, RelationStatusLabel>
  )[strength] || RELATION_STATUSES.pending
}

// ─── Relaciones DAFO ─────────────────────────────────────────────────────────

// ─── Relaciones DAFO Dinámicas ────────────────────────────────────────────────

export const syncRelationships = (
  internal: Factor[],
  external: Factor[],
  existing: Relationship[] = []
): Relationship[] => {
  const existingMap = new Map<string, Relationship>()

  existing.forEach(rel => {
    existingMap.set(`${rel.internalId}:${rel.externalId}`, rel)
  })

  return internal.flatMap(internalFactor =>
    external.map(externalFactor => {
      const pairKey = `${internalFactor.id}:${externalFactor.id}`
      const existingRel = existingMap.get(pairKey)
      const quadrant = quadrantFor(internalFactor, externalFactor)

      if (existingRel) {
        return {
          ...existingRel,
          id: `REL-${internalFactor.id}-${externalFactor.id}`,
          internalId: internalFactor.id,
          externalId: externalFactor.id,
          quadrant
        }
      }

      return {
        id: `REL-${internalFactor.id}-${externalFactor.id}`,
        internalId: internalFactor.id,
        externalId: externalFactor.id,
        quadrant,
        strength: null,
        status: RELATION_STATUSES.pending,
        justification: '',
        evidence: '',
        evaluator: '',
        date: ''
      }
    })
  )
}

export const createRelationship = (
  state: { internal: Factor[]; external: Factor[] },
  internalId: string,
  externalId: string
): Relationship | null => {
  const internalFactor = state.internal.find(factor => factor.id === internalId)
  const externalFactor = state.external.find(factor => factor.id === externalId)

  if (!internalFactor || !externalFactor) return null

  return {
    id: `REL-${internalId}-${externalId}`,
    internalId,
    externalId,
    quadrant: quadrantFor(internalFactor, externalFactor),
    strength: null,
    status: RELATION_STATUSES.pending,
    justification: '',
    evidence: '',
    evaluator: '',
    date: ''
  }
}

// ─── Cálculos EFI / EFE ──────────────────────────────────────────────────────

export const calculateEfi = (internal: Factor[]): EfiResult => {
  const factors: FactorWithScore[] = internal.map(factor => ({
    ...factor,
    score: factor.weight * factor.rating
  }))

  return {
    total: factors.reduce((total, factor) => total + factor.score, 0),
    weightTotal: factors.reduce((total, factor) => total + factor.weight, 0),
    strengths: factors.filter(factor => factor.type === 'F'),
    weaknesses: factors.filter(factor => factor.type === 'D'),
    factors
  }
}

export const calculateEfe = (external: Factor[]): EfeResult => {
  const factors: FactorWithScore[] = external.map(factor => ({
    ...factor,
    score: factor.weight * factor.rating
  }))

  return {
    total: factors.reduce((total, factor) => total + factor.score, 0),
    weightTotal: factors.reduce((total, factor) => total + factor.weight, 0),
    opportunities: factors.filter(factor => factor.type === 'O'),
    threats: factors.filter(factor => factor.type === 'A'),
    factors
  }
}

// ─── Cálculos de relaciones ──────────────────────────────────────────────────

const emptyQuadrant = (): QuadrantSummary => ({
  index: 0,
  coverage: 0,
  evaluated: 0,
  available: 0,
  evaluatedWeight: 0,
  averageStrength: 0,
  potentialWeight: 0,
  contribution: 0,
  mainRelations: []
})

export const calculateRelations = (
  efi: EfiResult,
  efe: EfeResult,
  relationships: Relationship[]
): RelationsAnalysis => {
  const factors = [...efi.factors, ...efe.factors]
  const factorById = new Map(factors.map(factor => [factor.id, factor]))

  const summary = Object.fromEntries(
    QUADRANTS.map(quadrant => [quadrant, emptyQuadrant()])
  ) as Record<Quadrant, QuadrantSummary>

  efi.factors.forEach(internalFactor => {
    efe.factors.forEach(externalFactor => {
      const quadrant = quadrantFor(internalFactor, externalFactor)
      const item = quadrant ? summary[quadrant] : undefined

      if (!item) return
      item.available += 1
      item.potentialWeight += internalFactor.weight * externalFactor.weight
    })
  })

  relationships.forEach(relation => {
    const internalFactor = factorById.get(relation.internalId)
    const externalFactor = factorById.get(relation.externalId)
    const item = relation.quadrant ? summary[relation.quadrant as Quadrant] : undefined

    if (!internalFactor || !externalFactor || !item) return
    if (relation.status === RELATION_STATUSES.pending || relation.status === 'pending') return
    if (!Number.isInteger(relation.strength) || relation.strength == null || relation.strength < 0 || relation.strength > 3)
      return
    const pairWeight = internalFactor.weight * externalFactor.weight

    item.evaluated += 1
    item.evaluatedWeight += pairWeight
    item.contribution += pairWeight * (relation.strength / 3)
    item.averageStrength += relation.strength
    item.mainRelations.push({
      ...relation,
      internalName: internalFactor.name,
      externalName: externalFactor.name,
      contribution: pairWeight * (relation.strength / 3)
    })
  })

  QUADRANTS.forEach(quadrant => {
    const item = summary[quadrant]

    item.index = item.potentialWeight > 0 ? item.contribution / item.potentialWeight : 0
    item.coverage = item.potentialWeight > 0 ? item.evaluatedWeight / item.potentialWeight : 0
    item.averageStrength = item.evaluated > 0 ? item.averageStrength / item.evaluated : 0
    item.mainRelations.sort((left, right) => right.contribution - left.contribution)
    item.mainRelations = item.mainRelations.slice(0, 3)
  })

  const ordered = QUADRANTS.map(quadrant => ({ quadrant, ...summary[quadrant] })).sort(
    (left, right) => right.index - left.index
  )

  const evaluatedCount = QUADRANTS.reduce((total, quadrant) => total + summary[quadrant].evaluated, 0)
  const dominant = evaluatedCount > 0 && ordered[0].index > 0 ? ordered[0] : null
  const second = dominant ? ordered[1] : null
  const difference = dominant && second ? (dominant.index - second.index) / dominant.index : 0
  const warnings: string[] = []
  let confidence = 'no concluyente'

  if (evaluatedCount === 0) {
    warnings.push('No hay relaciones DAFO evaluadas con fuerza válida.')
  } else if (!dominant) {
    warnings.push('Las relaciones evaluadas no aportan una orientación positiva.')
  } else {
    if (dominant.coverage < 0.4) {
      warnings.push('La cobertura del cuadrante dominante es baja; la orientación es provisional.')
    }

    if (difference < 0.1 && second) {
      const dominantName = ORIENTATIONS[dominant.quadrant]?.name || dominant.quadrant
      const secondName = ORIENTATIONS[second.quadrant]?.name || second.quadrant
      const diffPercent = Math.round(difference * 100)

      warnings.push(
        `Empate técnico entre ${dominant.quadrant} (${dominantName}) y ${second.quadrant} (${secondName}) con una brecha de solo el ${diffPercent} % (< 10 %). Se recomienda formular una estrategia mixta o afinar las calificaciones DAFO.`
      )
    }
    if (dominant.coverage >= 0.7 && difference >= 0.1) confidence = 'alta'
    else if (dominant.coverage >= 0.4 && difference >= 0.1) confidence = 'media'
    else confidence = 'baja'
  }

  return {
    summary,
    ordered,
    dominant: dominant?.quadrant ?? null,
    second: second?.quadrant ?? null,
    difference,
    coverage: dominant?.coverage ?? 0,
    confidence,
    warnings,
    evaluatedCount
  }
}

// ─── Cálculos DAFO ───────────────────────────────────────────────────────────

const sumValues = (values: number[]): number => values.reduce((total, value) => total + value, 0)

const buildCrossCells = (
  internalFactor: FactorWithScore,
  externalFactors: FactorWithScore[]
): CrossCell[] =>
  externalFactors.map(externalFactor => ({
    factorId: externalFactor.id,
    factorName: externalFactor.name,
    value: internalFactor.score * externalFactor.score
  }))

const buildExploratoryRows = (
  internalFactors: FactorWithScore[],
  opportunities: FactorWithScore[],
  threats: FactorWithScore[]
): ExploratoryRow[] =>
  internalFactors.map(internalFactor => {
    const opportunityCells = buildCrossCells(internalFactor, opportunities)
    const threatCells = buildCrossCells(internalFactor, threats)
    const opportunityTotal = sumValues(opportunityCells.map(cell => cell.value))
    const threatTotal = sumValues(threatCells.map(cell => cell.value))

    return {
      factorId: internalFactor.id,
      factorName: internalFactor.name,
      type: internalFactor.type,
      weight: internalFactor.weight,
      score: internalFactor.score,
      opportunityCells,
      threatCells,
      opportunityTotal,
      threatTotal,
      total: opportunityTotal + threatTotal
    }
  })

const buildExploratoryMatrix = (efi: EfiResult, efe: EfeResult): ExploratoryMatrix => {
  const strengthRows = buildExploratoryRows(efi.strengths, efe.opportunities, efe.threats)
  const weaknessRows = buildExploratoryRows(efi.weaknesses, efe.opportunities, efe.threats)

  return {
    opportunities: efe.opportunities.map(factor => ({ id: factor.id, name: factor.name })),
    threats: efe.threats.map(factor => ({ id: factor.id, name: factor.name })),
    strengthRows,
    weaknessRows,
    subtotals: {
      FO: sumValues(strengthRows.map(row => row.opportunityTotal)),
      FA: sumValues(strengthRows.map(row => row.threatTotal)),
      DO: sumValues(weaknessRows.map(row => row.opportunityTotal)),
      DA: sumValues(weaknessRows.map(row => row.threatTotal))
    }
  }
}

export const calculateDafo = (
  efi: EfiResult,
  efe: EfeResult,
  relations: RelationsAnalysis
): DafoResult => {
  const calculateCross = (leftFactors: FactorWithScore[], rightFactors: FactorWithScore[]): number =>
    leftFactors.reduce(
      (total, leftFactor) =>
        total + rightFactors.reduce((subtotal, rightFactor) => subtotal + leftFactor.score * rightFactor.score, 0),
      0
    )

  return {
    FO: calculateCross(efi.strengths, efe.opportunities),
    DA: calculateCross(efi.weaknesses, efe.threats),
    DO: calculateCross(efi.weaknesses, efe.opportunities),
    FA: calculateCross(efi.strengths, efe.threats),
    matrix: buildExploratoryMatrix(efi, efe),
    relations
  }
}

// ─── Cálculos QSPM ───────────────────────────────────────────────────────────

export const calculateQspm = (
  strategies: Strategy[],
  factors: Factor[],
  scores: QspmScores
): QspmResult => {
  const weightedFactors = factors.filter(factor => factor.weight > 0)
  const weightTotal = weightedFactors.reduce((total, factor) => total + factor.weight, 0)
  const hasWeightedFactors = weightedFactors.length > 0 && weightTotal > 0

  const normalizedWeights: Record<string, number> = Object.fromEntries(
    weightedFactors.map(factor => [factor.id, weightTotal > 0 ? factor.weight / weightTotal : 0])
  )

  const results: QspmStrategyResult[] = strategies
    .map(strategy => {
      const strategyScores = scores[strategy.id] || {}

      const evaluated = weightedFactors.filter(factor => {
        const score = strategyScores[factor.id]

        return Number.isInteger(score) && score != null && score >= 1 && score <= 4
      })

      const internalTas = evaluated
        .filter(factor => factor.group === 'internal')
        .reduce(
          (total, factor) => total + normalizedWeights[factor.id] * (strategyScores[factor.id] as number),
          0
        )

      const externalTas = evaluated
        .filter(factor => factor.group === 'external')
        .reduce(
          (total, factor) => total + normalizedWeights[factor.id] * (strategyScores[factor.id] as number),
          0
        )

      const totalTas = evaluated.reduce(
        (total, factor) => total + normalizedWeights[factor.id] * (strategyScores[factor.id] as number),
        0
      )

      return {
        strategyId: strategy.id,
        name: strategy.name,
        quadrant: strategy.quadrant,
        totalTas,
        internalTas,
        externalTas,
        evaluated: evaluated.length,
        pending: weightedFactors.length - evaluated.length,
        complete: hasWeightedFactors && evaluated.length === weightedFactors.length
      }
    })
    .sort((left, right) => right.totalTas - left.totalTas)

  const warnings: string[] = []

  if (!hasWeightedFactors)
    warnings.push('La QSPM necesita al menos un factor con peso para poder evaluarse.')
  const topDifference = results.length > 1 ? results[0].totalTas - results[1].totalTas : 0
  const tie = hasWeightedFactors && results.length > 1 && Math.abs(topDifference) < 0.001

  if (hasWeightedFactors && results.some(result => !result.complete))
    warnings.push('La QSPM tiene factores sin puntuar; la selección es provisional.')
  if (tie) warnings.push('Existe un empate entre las primeras alternativas.')

  return {
    factors: weightedFactors.map(f => ({ ...f, normalizedWeight: normalizedWeights[f.id] })),
    normalizedWeights,
    results,
    warnings,
    winner: hasWeightedFactors ? results[0]?.strategyId || null : null,
    topDifference,
    tie
  }
}

// ─── Cálculos CAME Dinámicos ───────────────────────────────────────────────────

export const cameTypeFor = (factor: Factor): CameType =>
  (({ D: 'C', A: 'A', F: 'M', O: 'E' } as Record<FactorType, CameType>)[factor.type] || 'C')

export const generateDraftCameActions = (state: InvestigationState): CameAction[] => {
  const allFactors = getAllFactors(state).filter(f => f.name && f.name.trim() !== '')
  const factorsToProcess = allFactors.length > 0 ? allFactors : getAllFactors(state)

  const defaultObjectives: Record<CameType, (name: string) => string> = {
    C: name => `Reducir y corregir el impacto de ${name} en los procesos clave.`,
    A: name => `Disminuir la exposición y riesgo ante ${name}.`,
    M: name => `Consolidar y sostener la capacidad asociada a ${name}.`,
    E: name => `Aprovechar y capitalizar el potencial de ${name}.`
  }

  const defaultActions: Record<CameType, (name: string) => string> = {
    C: name => `Diseñar e implementar medidas de mejora operativa para corregir ${name}.`,
    A: name => `Establecer protocolos de contingencia y control para afrontar ${name}.`,
    M: name => `Asegurar recursos y directrices para mantener ${name}.`,
    E: name => `Desarrollar proyectos e iniciativas para explotar ${name}.`
  }

  const defaultIndicators: Record<CameType, (id: string) => string> = {
    C: id => `Porcentaje de avance en medidas correctivas de ${id}`,
    A: id => `Nivel de mitigación y cobertura ante ${id}`,
    M: id => `Grado de cumplimiento de estándares de ${id}`,
    E: id => `Tasa de aprovechamiento de iniciativas para ${id}`
  }

  const defaultTargets: Record<CameType, string> = {
    C: '100 % de medidas correctivas implementadas',
    A: 'Protocolo de respuesta validado y operativo',
    M: 'Cumplimiento y disponibilidad superior al 90 %',
    E: 'Iniciativas estratégicas ejecutadas en el período'
  }

  return factorsToProcess.map(factor => {
    const type = cameTypeFor(factor)
    const factorLabel = factor.name ? factor.name.trim() : `Factor ${factor.id}`
    const strategyId = state.selectedStrategyId || state.strategies[0]?.id || ''
    const objective = defaultObjectives[type](factorLabel)
    const action = defaultActions[type](factorLabel)
    const indicator = defaultIndicators[type](factor.id)
    const target = defaultTargets[type]

    const importance = factor.weight >= 0.14 ? 5 : factor.weight >= 0.1 ? 4 : 3
    const urgency = factor.type === 'D' || factor.type === 'A' ? Math.max(1, 5 - factor.rating) : 3
    const severity = factor.type === 'D' || factor.type === 'A' ? Math.max(1, 5 - factor.rating) : 3
    const alignment = 4
    const feasibility = 4
    const criteria: CameCriteriaValues = { impact: importance, urgency, severity, alignment, feasibility }

    return {
      id: `ACC-${factor.id}`,
      type,
      factorId: factor.id,
      factor: factorLabel,
      strategyId,
      problem: factor.description || factorLabel,
      objective,
      action,
      responsible: type === 'C' ? 'Dirección Operativa / Responsable de Proceso' : 'Comité de Dirección Estratégica',
      participants: 'Líderes de proceso, especialistas y equipo ejecutor',
      resources: ['Tiempo de trabajo', 'Información de procesos', 'Herramientas digitales'],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      indicator,
      baseline: '0 %',
      target,
      frequency: 'Mensual',
      status: 'propuesta' as CameAction['status'],
      criteria,
      justification: `Acción derivada de ${factorLabel} (${factor.id}) articulada con ${strategyId || 'el plan estratégico'}.`,
      observations: ''
    }
  })
}

export const calculateCame = (actions: CameAction[], criteria: CameCriterion[]): CameResult => {
  const totalWeights = criteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0)

  const enriched: CameEnrichedAction[] = actions.map(action => {
    const priority =
      totalWeights <= 0
        ? 0
        : criteria.reduce((total, criterion) => {
            const value = Math.max(
              0,
              Math.min(5, Number(action.criteria?.[criterion.id as keyof CameCriteriaValues]) || 0)
            )

            return total + (Number(criterion.weight || 0) / totalWeights) * (value / 5)
          }, 0)

    const category = priority >= 0.75 ? 'critica' : priority >= 0.5 ? 'alta' : priority >= 0.25 ? 'media' : 'baja'

    return { ...action, priority, category }
  })

  const warnings: string[] = []

  if (criteria.some(criterion => criterion.weight < 0 || criterion.weight > 1))
    warnings.push('Cada peso CAME debe estar entre 0 y 1.')
  if (Math.abs(totalWeights - 1) > 0.001)
    warnings.push(`Los pesos CAME suman ${totalWeights.toFixed(2)}; deben sumar 1.00.`)

  return {
    actions: enriched,
    byType: {
      C: enriched.filter(action => action.type === 'C'),
      A: enriched.filter(action => action.type === 'A'),
      M: enriched.filter(action => action.type === 'M'),
      E: enriched.filter(action => action.type === 'E')
    },
    warnings,
    valid: warnings.length === 0,
    weightTotal: totalWeights
  }
}

// ─── Análisis global ─────────────────────────────────────────────────────────

export const calculateAnalysis = (state: InvestigationState): Analysis => {
  const efi = calculateEfi(state.internal)
  const efe = calculateEfe(state.external)
  const relationAnalysis = calculateRelations(efi, efe, state.relationships)
  const dafo = calculateDafo(efi, efe, relationAnalysis)

  const qspm = calculateQspm(
    state.strategies,
    getAllFactors({ ...state, internal: efi.factors, external: efe.factors }),
    state.qspmScores
  )

  const came = calculateCame(state.cameActions, state.cameCriteria)

  return { efi, efe, dafo, relations: relationAnalysis, qspm, came }
}

// ─── Validación ──────────────────────────────────────────────────────────────

export const validateInvestigation = (
  state: InvestigationState,
  analysis: Analysis = calculateAnalysis(state)
): ValidationResult => {
  const issues: ValidationIssue[] = []

  const byStage: Record<StageKey, ValidationIssue[]> = {
    context: [],
    summary: [],
    efi: [],
    efe: [],
    dafo: [],
    qspm: [],
    came: []
  }

  const addIssue = (stage: StageKey, id: string, message: string, severity: Severity = 'warning') => {
    const issue: ValidationIssue = { id, stage, message, severity }

    issues.push(issue)
    byStage[stage].push(issue)
  }

  const metadata = state.metadata || {}

  const requiredMetadata: [keyof Metadata, string][] = [
    ['title', 'Título de la investigación'],
    ['organization', 'Organización'],
    ['unit', 'Unidad analizada'],
    ['problem', 'Problema central'],
    ['objective', 'Objetivo general'],
    ['author', 'Autor o equipo'],
    ['evaluationDate', 'Fecha de evaluación']
  ]

  requiredMetadata.forEach(([field, label]) => {
    if (!String((metadata as unknown as Record<string, string>)[field] || '').trim())
      addIssue('context', `metadata-${String(field)}`, `Falta completar: ${label}.`)
  })

  const validateFactors = (factors: Factor[], stage: StageKey, label: string) => {
    const weightTotal = factors.reduce((total, factor) => total + Number(factor.weight || 0), 0)

    if (Math.abs(weightTotal - 1) > 0.001) {
      addIssue(
        stage,
        `${stage}-weights`,
        `${label}: los pesos suman ${weightTotal.toFixed(2)}; deben sumar 1.00.`,
        weightTotal === 0 ? 'warning' : 'error'
      )
    }

    factors.forEach(factor => {
      const weight = Number(factor.weight)
      const rating = Number(factor.rating)

      if (!String(factor.name || '').trim()) addIssue(stage, `${factor.id}-name`, `${factor.id}: falta describir el factor.`)
      if (!Number.isFinite(weight) || weight < 0 || weight > 1)
        addIssue(stage, `${factor.id}-weight-range`, `${factor.id}: la ponderación debe estar entre 0 y 1.`, 'error')
      if (!Number.isInteger(rating) || rating < 1 || rating > 4)
        addIssue(stage, `${factor.id}-rating-range`, `${factor.id}: la calificación debe estar entre 1 y 4.`, 'error')
      if (!String(factor.evidence || '').trim())
        addIssue(stage, `${factor.id}-evidence`, `${factor.id}: falta registrar evidencia o fuente.`)
    })
  }

  validateFactors(state.internal || [], 'efi', 'EFI')
  validateFactors(state.external || [], 'efe', 'EFE')

  const expectedRelations = (state.internal?.length || 0) * (state.external?.length || 0)
  const evaluatedRelations = analysis.relations.evaluatedCount
  const missingRelations = Math.max(0, expectedRelations - evaluatedRelations)

  if (expectedRelations > 0 && evaluatedRelations === 0) {
    addIssue('dafo', 'relations-empty', 'No hay relaciones DAFO evaluadas con fuerza y evidencia.')
  } else if (missingRelations > 0) {
    addIssue('dafo', 'relations-pending', `Quedan ${missingRelations} relaciones DAFO sin calificar o en estado pendiente.`)
  }

  if (analysis.relations.warnings.length > 0) {
    analysis.relations.warnings.forEach((warning, index) => addIssue('dafo', `orientation-${index}`, warning))
  }

  if (!state.strategies?.length) addIssue('qspm', 'strategies-empty', 'Añada al menos una alternativa estratégica.', 'error')
  state.strategies?.forEach(strategy => {
    if (!String(strategy.name || '').trim())
      addIssue('qspm', `${strategy.id}-name`, `${strategy.id}: falta el nombre de la alternativa.`)
    if (!String(strategy.description || '').trim())
      addIssue('qspm', `${strategy.id}-description`, `${strategy.id}: falta la descripción de la alternativa.`)
  })

  if (analysis.qspm.factors.length > 0 && analysis.qspm.results.some(result => !result.complete)) {
    addIssue('qspm', 'qspm-incomplete', 'La QSPM tiene alternativas con factores sin puntuar.')
  }

  if (!state.selectedStrategyId) addIssue('qspm', 'selection-empty', 'No hay una alternativa seleccionada manualmente.')
  if (state.selectedStrategyId && !String(state.selectionJustification || '').trim())
    addIssue('qspm', 'selection-justification', 'La alternativa seleccionada necesita una justificación.')

  const cameCriteria = state.cameCriteria || []
  const criteriaWeight = cameCriteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0)

  if (cameCriteria.some(criterion => Number(criterion.weight) < 0 || Number(criterion.weight) > 1))
    addIssue('came', 'criteria-range', 'Cada peso CAME debe estar entre 0 y 1.', 'error')
  if (Math.abs(criteriaWeight - 1) > 0.001)
    addIssue(
      'came',
      'criteria-total',
      `Los pesos CAME suman ${criteriaWeight.toFixed(2)}; deben sumar 1.00.`,
      'error'
    )
  if (!state.cameActions?.length) addIssue('came', 'actions-empty', 'No hay fichas CAME generadas para validar.')
  state.cameActions?.forEach(action => {
    if (!String(action.action || '').trim()) addIssue('came', `${action.id}-action`, `${action.id}: falta la acción.`)
    if (!String(action.responsible || '').trim())
      addIssue('came', `${action.id}-responsible`, `${action.id}: falta el responsable.`)
    if (!String(action.indicator || '').trim())
      addIssue('came', `${action.id}-indicator`, `${action.id}: falta el indicador.`)
    if (!String(action.baseline || '').trim()) addIssue('came', `${action.id}-baseline`, `${action.id}: falta la línea base.`)
    if (!String(action.target || '').trim()) addIssue('came', `${action.id}-target`, `${action.id}: falta la meta.`)
    if (!String(action.startDate || '').trim() || !String(action.endDate || '').trim())
      addIssue('came', `${action.id}-dates`, `${action.id}: complete las fechas de inicio y fin.`)
    if (action.startDate && action.endDate && action.startDate > action.endDate)
      addIssue(
        'came',
        `${action.id}-date-order`,
        `${action.id}: la fecha de inicio no puede superar la fecha de fin.`,
        'error'
      )
    if (!['propuesta', 'en curso', 'completada', 'pausada'].includes(action.status))
      addIssue('came', `${action.id}-status`, `${action.id}: el estado operativo no es válido.`, 'error')
  })

  const stageStatus = Object.fromEntries(
    Object.entries(byStage).map(([stage, stageIssues]) => [
      stage,
      stageIssues.some(issue => issue.severity === 'error') ? 'error' : stageIssues.length ? 'warning' : 'ready'
    ])
  ) as StageStatusMap

  const errors = issues.filter(issue => issue.severity === 'error').length
  const warnings = issues.length - errors

  return {
    issues,
    byStage,
    stageStatus,
    errors,
    warnings,
    valid: errors === 0,
    complete: issues.length === 0
  }
}

// ─── Formateo ────────────────────────────────────────────────────────────────

export const formatNumber = (value: number | undefined | null): string => Number(value || 0).toFixed(2)

export const formatPercent = (value: number | undefined | null): string =>
  `${Math.round(Number(value || 0) * 100)} %`

// ─── CRUD de factores ────────────────────────────────────────────────────────

export const createNewFactor = (factors: Factor[], type: FactorType): Factor => {
  const existingNumbers = factors
    .filter(f => f.type === type)
    .map(f => parseInt(f.id.split('-')[1]))
    .filter(n => !isNaN(n))

  const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  const id = `${type}-${String(nextNum).padStart(2, '0')}`

  return {
    id,
    name: '',
    type,
    group: type === 'F' || type === 'D' ? 'internal' : 'external',
    weight: 0,
    rating: 1,
    description: '',
    evidence: ''
  }
}

export const removeFactor = (state: InvestigationState, factorId: string): InvestigationState => {
  const isInternal = state.internal.some(f => f.id === factorId)
  const group: FactorGroup = isInternal ? 'internal' : 'external'

  return {
    ...state,
    [group]: state[group].filter(f => f.id !== factorId),
    relationships: state.relationships.filter(r => r.internalId !== factorId && r.externalId !== factorId)
  }
}

export const reorderFactor = <T extends Factor>(
  factors: T[],
  factorId: string,
  direction: 'up' | 'down'
): T[] => {
  const idx = factors.findIndex(f => f.id === factorId)

  if (idx < 0) return factors
  const newIdx = direction === 'up' ? idx - 1 : idx + 1

  if (newIdx < 0 || newIdx >= factors.length) return factors

  const copy = [...factors]

  ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]

  return copy
}

export const changeFactorType = (factor: Factor, newType: FactorType): Factor => ({
  ...factor,
  type: newType,
  group: newType === 'F' || newType === 'D' ? 'internal' : 'external'
})

// ─── CRUD de estrategias ─────────────────────────────────────────────────────

export const createNewStrategy = (strategies: Strategy[]): Strategy => {
  const num = strategies.length + 1

  return {
    id: `EST-${String(num).padStart(2, '0')}`,
    name: `Alternativa ${String(num).padStart(2, '0')}`,
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: '',
    relatedFactors: [],
    observations: ''
  }
}

export const removeStrategy = (state: InvestigationState, strategyId: string): InvestigationState => ({
  ...state,
  strategies: state.strategies.filter(s => s.id !== strategyId),
  selectedStrategyId: state.selectedStrategyId === strategyId ? null : state.selectedStrategyId,
  qspmScores: Object.fromEntries(Object.entries(state.qspmScores).filter(([key]) => key !== strategyId))
})

// ─── CRUD de acciones CAME ───────────────────────────────────────────────────

export const createNewCameAction = (factorId: string): CameAction => ({
  id: `ACC-${factorId}-${Date.now().toString(36).slice(-4)}`,
  type: 'C',
  factorId,
  factor: '',
  strategyId: '',
  problem: '',
  objective: '',
  action: '',
  responsible: '',
  participants: '',
  resources: [],
  startDate: '',
  endDate: '',
  indicator: '',
  baseline: '',
  target: '',
  frequency: 'Mensual',
  status: 'propuesta',
  criteria: { impact: 3, urgency: 3, severity: 3, alignment: 3, feasibility: 3 },
  justification: '',
  observations: ''
})

export const removeCameAction = (state: InvestigationState, actionId: string): InvestigationState => ({
  ...state,
  cameActions: state.cameActions.filter(a => a.id !== actionId)
})