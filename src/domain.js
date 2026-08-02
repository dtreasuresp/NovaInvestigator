export const QUADRANTS = ['FO', 'DO', 'FA', 'DA'];

export const INVESTIGATION_STATUSES = [
  'nueva',
  'borrador',
  'en análisis',
  'validada',
  'exportada',
  'cerrada'
];

export const RELATION_STATUSES = {
  pending: 'pendiente',
  none: 'sin relación',
  weak: 'débil',
  moderate: 'moderada',
  strong: 'fuerte'
};

export const ORIENTATIONS = {
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
};

export const CAME_CRITERIA = [
  { id: 'impacto', name: 'Impacto sobre el problema', weight: 0.2 },
  { id: 'urgencia', name: 'Urgencia', weight: 0.2 },
  { id: 'severidad', name: 'Severidad o evidencia', weight: 0.2 },
  { id: 'alignment', name: 'Alineación estratégica', weight: 0.2 },
  { id: 'feasibility', name: 'Factibilidad', weight: 0.2 }
];

const INTERNAL_FACTORS = [
  ['F-01', 'Voluntad de la alta dirección', 'F', 0.06, 4],
  ['F-02', 'Marco legal empresarial', 'F', 0.06, 3],
  ['F-03', 'Indicadores de gestión', 'F', 0.07, 3],
  ['F-04', 'Uso de herramientas', 'F', 0.06, 2],
  ['F-05', 'Profesionalidad de los cuadros', 'F', 0.10, 3],
  ['D-06', 'Procesos burocráticos', 'D', 0.10, 2],
  ['D-07', 'Falta de automatización de procesos', 'D', 0.14, 2],
  ['D-08', 'Falta de integración de procesos', 'D', 0.20, 1],
  ['D-09', 'Falta de evaluación del impacto de la capacitación', 'D', 0.10, 2],
  ['D-10', 'Fluctuación de cuadros y reservas', 'D', 0.11, 2]
];

const EXTERNAL_FACTORS = [
  ['O-01', 'Transformación digital', 'O', 0.15, 3],
  ['O-02', 'Modernización del sector', 'O', 0.13, 3],
  ['O-03', 'Uso de la Inteligencia Artificial', 'O', 0.15, 2],
  ['O-04', 'Vínculo con la DCEG', 'O', 0.12, 3],
  ['O-05', 'Marco legal de país', 'O', 0.10, 3],
  ['A-06', 'Migración al extranjero', 'A', 0.07, 2],
  ['A-07', 'Bloqueo del gobierno de EE. UU.', 'A', 0.08, 2],
  ['A-08', 'Situación económica y financiera', 'A', 0.08, 2],
  ['A-09', 'Migración al sector privado', 'A', 0.07, 2],
  ['A-10', 'Inestabilidad energética', 'A', 0.05, 1]
];

const STRATEGIES = [
  {
    id: 'EST-DO-01',
    name: 'Integración formal de los procesos de cuadros y reservas',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Establecer un flujo común, responsabilidades y puntos de coordinación.',
    relatedFactors: ['D-08', 'O-01', 'O-02']
  },
  {
    id: 'EST-DO-02',
    name: 'Sistema digital de seguimiento del ciclo de cuadros y reservas',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Reducir la fragmentación y mejorar la trazabilidad de la información.',
    relatedFactors: ['D-07', 'D-08', 'O-01', 'O-03']
  },
  {
    id: 'EST-FA-01',
    name: 'Mecanismo permanente de coordinación interprocesos',
    quadrant: 'FA',
    orientation: 'defensiva',
    description: 'Asegurar la articulación institucional y el seguimiento de acuerdos.',
    relatedFactors: ['F-01', 'F-03', 'A-06', 'A-08']
  },
  {
    id: 'EST-DO-03',
    name: 'Programa de capacitación con evaluación de impacto',
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: 'Vincular capacitación, desempeño, resultados y necesidades reales del sistema.',
    relatedFactors: ['D-09', 'O-03', 'O-04']
  },
  {
    id: 'EST-DA-01',
    name: 'Plan de continuidad y retención de cuadros y reservas',
    quadrant: 'DA',
    orientation: 'supervivencia',
    description: 'Reducir la vulnerabilidad ante fluctuación y pérdida de capacidades.',
    relatedFactors: ['D-10', 'A-06', 'A-09']
  },
  {
    id: 'EST-FO-01',
    name: 'Fortalecimiento de indicadores de gestión e integración',
    quadrant: 'FO',
    orientation: 'ofensiva',
    description: 'Medir el funcionamiento del sistema y detectar fallas de coordinación.',
    relatedFactors: ['F-03', 'F-04', 'O-01', 'O-02']
  }
];

const makeFactors = (rows, group) => rows.map(([id, name, type, weight, rating]) => ({
  id,
  name,
  type,
  group,
  weight,
  rating,
  description: '',
  evidence: ''
}));

export const getAllFactors = state => [...state.internal, ...state.external];

export const getFactor = (state, factorId) => getAllFactors(state).find(factor => factor.id === factorId);

export const quadrantFor = (internalFactor, externalFactor) => {
  if (!internalFactor || !externalFactor) return null;
  return `${internalFactor.type}${externalFactor.type}`;
};

export const createStrategies = () => STRATEGIES.map(strategy => ({
  ...strategy,
  relatedFactors: [...strategy.relatedFactors],
  observations: ''
}));

const getRelationStrength = (internalFactor, externalFactor) => {
  const quadrant = quadrantFor(internalFactor, externalFactor);
  const pair = `${internalFactor.id}:${externalFactor.id}`;
  const noRelationPairs = new Set([
    'F-02:O-03',
    'F-05:A-10',
    'D-06:O-05',
    'D-09:A-07'
  ]);

  if (noRelationPairs.has(pair)) return 0;
  if (quadrant === 'DO') {
    if (internalFactor.id === 'D-08' && ['O-01', 'O-02', 'O-03'].includes(externalFactor.id)) return 3;
    if (internalFactor.id === 'D-07' && ['O-01', 'O-03'].includes(externalFactor.id)) return 3;
    return 2;
  }
  if (quadrant === 'FO') {
    return ['F-01:O-01', 'F-03:O-02', 'F-04:O-01'].includes(pair) ? 2 : 1;
  }
  if (quadrant === 'FA') {
    return ['F-01:A-06', 'F-03:A-08'].includes(pair) ? 2 : 1;
  }
  return ['D-10:A-06', 'D-08:A-09'].includes(pair) ? 2 : 1;
};

const relationText = (internalFactor, externalFactor, strength) => {
  if (strength === 0) return `El par ${internalFactor.id} + ${externalFactor.id} fue revisado y no presenta un vínculo directo en este escenario.`;
  const verbs = {
    FO: 'permite aprovechar',
    DO: 'requiere corregir para aprovechar',
    FA: 'puede contener',
    DA: 'incrementa la exposición ante'
  };
  const quadrant = quadrantFor(internalFactor, externalFactor);
  return `${internalFactor.name} ${verbs[quadrant]} ${externalFactor.name}; la relación se valora con fuerza ${strength}/3.`;
};

export const relationStatusForStrength = strength => {
  if (!Number.isInteger(strength)) return RELATION_STATUSES.pending;
  return {
    0: RELATION_STATUSES.none,
    1: RELATION_STATUSES.weak,
    2: RELATION_STATUSES.moderate,
    3: RELATION_STATUSES.strong
  }[strength] || RELATION_STATUSES.pending;
};

export const buildRelationships = state => state.internal.flatMap(internalFactor => state.external.map(externalFactor => {
  const strength = getRelationStrength(internalFactor, externalFactor);
  return {
    id: `REL-${internalFactor.id}-${externalFactor.id}`,
    internalId: internalFactor.id,
    externalId: externalFactor.id,
    quadrant: quadrantFor(internalFactor, externalFactor),
    strength,
    status: relationStatusForStrength(strength),
    justification: relationText(internalFactor, externalFactor, strength),
    evidence: strength === 0 ? 'Revisión del diagnóstico; vínculo no identificado (simulado).' : 'Tesis ETECSA: revisión documental y entrevistas (simulado).',
    evaluator: 'Equipo metodológico',
    date: '2026-07-31'
  };
}));

export const createRelationship = (state, internalId, externalId) => {
  const internalFactor = state.internal.find(factor => factor.id === internalId);
  const externalFactor = state.external.find(factor => factor.id === externalId);
  if (!internalFactor || !externalFactor) return null;
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
  };
};

export const calculateEfi = internal => {
  const factors = internal.map(factor => ({ ...factor, score: factor.weight * factor.rating }));
  return {
    total: factors.reduce((total, factor) => total + factor.score, 0),
    weightTotal: factors.reduce((total, factor) => total + factor.weight, 0),
    strengths: factors.filter(factor => factor.type === 'F'),
    weaknesses: factors.filter(factor => factor.type === 'D'),
    factors
  };
};

export const calculateEfe = external => {
  const factors = external.map(factor => ({ ...factor, score: factor.weight * factor.rating }));
  return {
    total: factors.reduce((total, factor) => total + factor.score, 0),
    weightTotal: factors.reduce((total, factor) => total + factor.weight, 0),
    opportunities: factors.filter(factor => factor.type === 'O'),
    threats: factors.filter(factor => factor.type === 'A'),
    factors
  };
};

const emptyQuadrant = () => ({
  index: 0,
  coverage: 0,
  evaluated: 0,
  available: 0,
  evaluatedWeight: 0,
  averageStrength: 0,
  potentialWeight: 0,
  contribution: 0,
  mainRelations: []
});

export const calculateRelations = (efi, efe, relationships) => {
  const factors = [...efi.factors, ...efe.factors];
  const factorById = new Map(factors.map(factor => [factor.id, factor]));
  const summary = Object.fromEntries(QUADRANTS.map(quadrant => [quadrant, emptyQuadrant()]));

  efi.factors.forEach(internalFactor => {
    efe.factors.forEach(externalFactor => {
      const quadrant = quadrantFor(internalFactor, externalFactor);
      const item = summary[quadrant];
      if (!item) return;
      item.available += 1;
      item.potentialWeight += internalFactor.weight * externalFactor.weight;
    });
  });

  relationships.forEach(relation => {
    const internalFactor = factorById.get(relation.internalId);
    const externalFactor = factorById.get(relation.externalId);
    const item = summary[relation.quadrant];
    if (!internalFactor || !externalFactor || !item || relation.status === RELATION_STATUSES.pending || relation.status === 'pending') return;
    if (!Number.isInteger(relation.strength) || relation.strength < 0 || relation.strength > 3) return;
    const pairWeight = internalFactor.weight * externalFactor.weight;
    item.evaluated += 1;
    item.evaluatedWeight += pairWeight;
    item.contribution += pairWeight * (relation.strength / 3);
    item.averageStrength += relation.strength;
    item.mainRelations.push({
      ...relation,
      internalName: internalFactor.name,
      externalName: externalFactor.name,
      contribution: pairWeight * (relation.strength / 3)
    });
  });

  QUADRANTS.forEach(quadrant => {
    const item = summary[quadrant];
    item.index = item.potentialWeight > 0 ? item.contribution / item.potentialWeight : 0;
    item.coverage = item.potentialWeight > 0 ? item.evaluatedWeight / item.potentialWeight : 0;
    item.averageStrength = item.evaluated > 0 ? item.averageStrength / item.evaluated : 0;
    item.mainRelations.sort((left, right) => right.contribution - left.contribution);
    item.mainRelations = item.mainRelations.slice(0, 3);
  });

  const ordered = QUADRANTS.map(quadrant => ({ quadrant, ...summary[quadrant] }))
    .sort((left, right) => right.index - left.index);
  const evaluatedCount = QUADRANTS.reduce((total, quadrant) => total + summary[quadrant].evaluated, 0);
  const dominant = evaluatedCount > 0 && ordered[0].index > 0 ? ordered[0] : null;
  const second = dominant ? ordered[1] : null;
  const difference = dominant ? (dominant.index - second.index) / dominant.index : 0;
  const warnings = [];
  let confidence = 'no concluyente';

  if (evaluatedCount === 0) {
    warnings.push('No hay relaciones DAFO evaluadas con fuerza válida.');
  } else if (!dominant) {
    warnings.push('Las relaciones evaluadas no aportan una orientación positiva.');
  } else {
    if (dominant.coverage < 0.4) warnings.push('La cobertura del cuadrante dominante es baja; la orientación es provisional.');
    if (difference < 0.1) warnings.push('La diferencia entre los dos primeros cuadrantes es menor que el umbral operativo del 10 %.');
    if (dominant.coverage >= 0.7 && difference >= 0.1) confidence = 'alta';
    else if (dominant.coverage >= 0.4 && difference >= 0.1) confidence = 'media';
    else confidence = 'baja';
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
  };
};

const sumValues = values => values.reduce((total, value) => total + value, 0);

const buildCrossCells = (internalFactor, externalFactors) => externalFactors.map(externalFactor => ({
  factorId: externalFactor.id,
  factorName: externalFactor.name,
  value: internalFactor.score * externalFactor.score
}));

const buildExploratoryRows = (internalFactors, opportunities, threats) => internalFactors.map(internalFactor => {
  const opportunityCells = buildCrossCells(internalFactor, opportunities);
  const threatCells = buildCrossCells(internalFactor, threats);
  const opportunityTotal = sumValues(opportunityCells.map(cell => cell.value));
  const threatTotal = sumValues(threatCells.map(cell => cell.value));
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
  };
});

const buildExploratoryMatrix = (efi, efe) => {
  const strengthRows = buildExploratoryRows(efi.strengths, efe.opportunities, efe.threats);
  const weaknessRows = buildExploratoryRows(efi.weaknesses, efe.opportunities, efe.threats);
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
  };
};

export const calculateDafo = (efi, efe, relations) => {
  const calculateCross = (leftFactors, rightFactors) => leftFactors.reduce(
    (total, leftFactor) => total + rightFactors.reduce((subtotal, rightFactor) => subtotal + leftFactor.score * rightFactor.score, 0),
    0
  );
  return {
    FO: calculateCross(efi.strengths, efe.opportunities),
    FA: calculateCross(efi.strengths, efe.threats),
    DO: calculateCross(efi.weaknesses, efe.opportunities),
    DA: calculateCross(efi.weaknesses, efe.threats),
    matrix: buildExploratoryMatrix(efi, efe),
    relations
  };
};

const attractivenessFor = (strategy, factor) => {
  const related = strategy.relatedFactors.includes(factor.id);
  const internalOrOpportunity = ['D', 'O'].includes(factor.type);
  const defensiveFamily = ['F', 'A'].includes(factor.type);

  if (strategy.id === 'EST-DO-01') {
    if (related) return 4;
    return internalOrOpportunity ? 3 : 1;
  }
  if (strategy.id === 'EST-DO-02') {
    if (factor.id === 'D-08') return 4;
    if (related) return 3;
    return internalOrOpportunity ? 2 : 1;
  }
  if (strategy.id === 'EST-DO-03') {
    if (related) return 3;
    return internalOrOpportunity ? 2 : 1;
  }
  if (strategy.id === 'EST-FA-01') {
    if (related) return 4;
    return defensiveFamily ? 3 : 1;
  }
  if (strategy.id === 'EST-DA-01') {
    if (related) return 4;
    return ['D', 'A'].includes(factor.type) ? 3 : 2;
  }
  if (related) return 4;
  return ['F', 'O'].includes(factor.type) ? 3 : 2;
};

export const buildQspmScores = (strategies, factors) => Object.fromEntries(
  strategies.map(strategy => [
    strategy.id,
    Object.fromEntries(factors.map(factor => [factor.id, attractivenessFor(strategy, factor)]))
  ])
);

export const calculateQspm = (strategies, factors, scores) => {
  const weightedFactors = factors.filter(factor => factor.weight > 0);
  const weightTotal = weightedFactors.reduce((total, factor) => total + factor.weight, 0);
  const hasWeightedFactors = weightedFactors.length > 0 && weightTotal > 0;
  const normalizedWeights = Object.fromEntries(weightedFactors.map(factor => [
    factor.id,
    weightTotal > 0 ? factor.weight / weightTotal : 0
  ]));
  const results = strategies.map(strategy => {
    const strategyScores = scores[strategy.id] || {};
    const evaluated = weightedFactors.filter(factor => Number.isInteger(strategyScores[factor.id]) && strategyScores[factor.id] >= 1 && strategyScores[factor.id] <= 4);
    const totalTas = evaluated.reduce((total, factor) => total + normalizedWeights[factor.id] * strategyScores[factor.id], 0);
    return {
      strategyId: strategy.id,
      name: strategy.name,
      quadrant: strategy.quadrant,
      totalTas,
      evaluated: evaluated.length,
      pending: weightedFactors.length - evaluated.length,
      complete: hasWeightedFactors && evaluated.length === weightedFactors.length
    };
  }).sort((left, right) => right.totalTas - left.totalTas);
  const warnings = [];
  if (!hasWeightedFactors) warnings.push('La QSPM necesita al menos un factor con peso para poder evaluarse.');
  const topDifference = results.length > 1 ? results[0].totalTas - results[1].totalTas : 0;
  const tie = hasWeightedFactors && results.length > 1 && Math.abs(topDifference) < 0.001;
  if (hasWeightedFactors && results.some(result => !result.complete)) warnings.push('La QSPM tiene factores sin puntuar; la selección es provisional.');
  if (tie) warnings.push('Existe un empate entre las primeras alternativas.');
  return {
    factors: weightedFactors,
    normalizedWeights,
    results,
    warnings,
    winner: hasWeightedFactors ? results[0]?.strategyId || null : null,
    topDifference,
    tie
  };
};

const cameTypeFor = factor => ({ D: 'C', A: 'A', F: 'M', O: 'E' })[factor.type] || 'C';

const strategyForFactor = factorId => {
  const mapping = {
    'F-01': 'EST-FO-01', 'F-02': 'EST-FO-01', 'F-03': 'EST-FO-01', 'F-04': 'EST-FO-01', 'F-05': 'EST-DO-03',
    'D-06': 'EST-DO-01', 'D-07': 'EST-DO-02', 'D-08': 'EST-DO-01', 'D-09': 'EST-DO-03', 'D-10': 'EST-DA-01',
    'O-01': 'EST-DO-01', 'O-02': 'EST-DO-01', 'O-03': 'EST-DO-03', 'O-04': 'EST-DO-03', 'O-05': 'EST-FO-01',
    'A-06': 'EST-DA-01', 'A-07': 'EST-FA-01', 'A-08': 'EST-FA-01', 'A-09': 'EST-DA-01', 'A-10': 'EST-DA-01'
  };
  return mapping[factorId] || 'EST-DO-01';
};

const cameCopyFor = (factor, type) => {
  const copy = {
    C: {
      objective: `Reducir el efecto de ${factor.name.toLowerCase()} en el sistema.`,
      action: factor.id === 'D-08' ? 'Diseñar y aprobar el mapa integrado de procesos de cuadros y reservas.' : `Diseñar medidas para corregir ${factor.name.toLowerCase()}.`,
      indicator: factor.id === 'D-08' ? 'Procesos con mapa, responsable y punto de coordinación' : `Avance de medidas para ${factor.id}`,
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
      action: `Mantener y transferir la capacidad asociada a ${factor.name.toLowerCase()}.`,
      indicator: `Cumplimiento del plan de mantenimiento de ${factor.id}`,
      target: 'Cumplimiento superior al 90 %'
    },
    E: {
      objective: `Convertir ${factor.name.toLowerCase()} en una capacidad aplicada al sistema.`,
      action: `Diseñar iniciativas para explotar ${factor.name.toLowerCase()}.`,
      indicator: `Iniciativas activas asociadas a ${factor.id}`,
      target: 'Al menos una iniciativa aplicada y evaluada'
    }
  };
  return copy[type];
};

const cameCriteriaFor = (factor, strategyId) => {
  const importance = factor.weight >= 0.14 ? 5 : factor.weight >= 0.1 ? 4 : 3;
  const urgency = ['D', 'A', 'O'].includes(factor.type) ? Math.max(1, 5 - factor.rating) : 3;
  const severity = ['D', 'A'].includes(factor.type) ? Math.max(1, 5 - factor.rating) : 3;
  const alignment = strategyId === 'EST-DO-01' || strategyId === 'EST-DO-02' ? 5 : 4;
  const feasibility = factor.type === 'D' ? 4 : 3;
  return { impact: importance, urgency, severity, alignment, feasibility };
};

export const buildCameActions = (factors, strategies) => factors.map(factor => {
  const type = cameTypeFor(factor);
  const strategyId = strategyForFactor(factor.id);
  const copy = cameCopyFor(factor, type);
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
    status: 'propuesta',
    criteria: cameCriteriaFor(factor, strategyId),
    justification: `Acción derivada del factor ${factor.id} y vinculada con ${strategyId}. Ficha demostrativa pendiente de validación institucional.`,
    observations: 'Escenario demostrativo simulado para revisar la trazabilidad del método.'
  };
});

export const calculateCame = (actions, criteria) => {
  const totalWeights = criteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0);
  const enriched = actions.map(action => {
    const priority = totalWeights <= 0 ? 0 : criteria.reduce((total, criterion) => {
      const value = Math.max(0, Math.min(5, Number(action.criteria?.[criterion.id]) || 0));
      return total + (Number(criterion.weight || 0) / totalWeights) * (value / 5);
    }, 0);
    const category = priority >= 0.75 ? 'critica' : priority >= 0.5 ? 'alta' : priority >= 0.25 ? 'media' : 'baja';
    return { ...action, priority, category };
  });
  const warnings = [];
  if (criteria.some(criterion => criterion.weight < 0 || criterion.weight > 1)) warnings.push('Cada peso CAME debe estar entre 0 y 1.');
  if (Math.abs(totalWeights - 1) > 0.001) warnings.push(`Los pesos CAME suman ${totalWeights.toFixed(2)}; deben sumar 1.00.`);
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
  };
};

export const calculateAnalysis = state => {
  const efi = calculateEfi(state.internal);
  const efe = calculateEfe(state.external);
  const relationAnalysis = calculateRelations(efi, efe, state.relationships);
  const dafo = calculateDafo(efi, efe, relationAnalysis);
  const qspm = calculateQspm(state.strategies, getAllFactors({ ...state, internal: efi.factors, external: efe.factors }), state.qspmScores);
  const came = calculateCame(state.cameActions, state.cameCriteria);
  return { efi, efe, dafo, relations: relationAnalysis, qspm, came };
};

export const validateInvestigation = (state, analysis = calculateAnalysis(state)) => {
  const issues = [];
  const byStage = Object.fromEntries(['context', 'efi', 'efe', 'dafo', 'qspm', 'came'].map(stage => [stage, []]));
  const addIssue = (stage, id, message, severity = 'warning') => {
    const issue = { id, stage, message, severity };
    issues.push(issue);
    byStage[stage].push(issue);
  };
  const metadata = state.metadata || {};
  const requiredMetadata = [
    ['title', 'Título de la investigación'],
    ['organization', 'Organización'],
    ['unit', 'Unidad analizada'],
    ['problem', 'Problema central'],
    ['objective', 'Objetivo general'],
    ['author', 'Autor o equipo'],
    ['evaluationDate', 'Fecha de evaluación']
  ];

  requiredMetadata.forEach(([field, label]) => {
    if (!String(metadata[field] || '').trim()) addIssue('context', `metadata-${field}`, `Falta completar: ${label}.`);
  });

  const validateFactors = (factors, stage, label) => {
    const weightTotal = factors.reduce((total, factor) => total + Number(factor.weight || 0), 0);
    if (Math.abs(weightTotal - 1) > 0.001) {
      addIssue(stage, `${stage}-weights`, `${label}: los pesos suman ${weightTotal.toFixed(2)}; deben sumar 1.00.`, weightTotal === 0 ? 'warning' : 'error');
    }
    factors.forEach(factor => {
      const weight = Number(factor.weight);
      const rating = Number(factor.rating);
      if (!String(factor.name || '').trim()) addIssue(stage, `${factor.id}-name`, `${factor.id}: falta describir el factor.`);
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) addIssue(stage, `${factor.id}-weight-range`, `${factor.id}: la ponderación debe estar entre 0 y 1.`, 'error');
      if (!Number.isInteger(rating) || rating < 1 || rating > 4) addIssue(stage, `${factor.id}-rating-range`, `${factor.id}: la calificación debe estar entre 1 y 4.`, 'error');
      if (!String(factor.evidence || '').trim()) addIssue(stage, `${factor.id}-evidence`, `${factor.id}: falta registrar evidencia o fuente.`);
    });
  };

  validateFactors(state.internal || [], 'efi', 'EFI');
  validateFactors(state.external || [], 'efe', 'EFE');

  const expectedRelations = (state.internal?.length || 0) * (state.external?.length || 0);
  const evaluatedRelations = analysis.relations.evaluatedCount;
  if (expectedRelations > 0 && evaluatedRelations < expectedRelations) {
    addIssue('dafo', 'relations-pending', `Quedan ${expectedRelations - evaluatedRelations} relaciones sin evaluar.`);
  }
  if (expectedRelations > 0 && evaluatedRelations === 0) {
    addIssue('dafo', 'relations-empty', 'No hay relaciones DAFO evaluadas con fuerza y evidencia.');
  }
  if (analysis.relations.warnings.length > 0) {
    analysis.relations.warnings.forEach((warning, index) => addIssue('dafo', `orientation-${index}`, warning));
  }

  const qspmFactors = analysis.qspm.factors.length;
  if (!state.strategies?.length) addIssue('qspm', 'strategies-empty', 'Añada al menos una alternativa estratégica.', 'error');
  state.strategies?.forEach(strategy => {
    if (!String(strategy.name || '').trim()) addIssue('qspm', `${strategy.id}-name`, `${strategy.id}: falta el nombre de la alternativa.`);
    if (!String(strategy.description || '').trim()) addIssue('qspm', `${strategy.id}-description`, `${strategy.id}: falta la descripción de la alternativa.`);
  });
  if (qspmFactors > 0 && analysis.qspm.results.some(result => !result.complete)) {
    addIssue('qspm', 'qspm-incomplete', 'La QSPM tiene alternativas con factores sin puntuar.');
  }
  if (!state.selectedStrategyId) addIssue('qspm', 'selection-empty', 'No hay una alternativa seleccionada manualmente.');
  if (state.selectedStrategyId && !String(state.selectionJustification || '').trim()) addIssue('qspm', 'selection-justification', 'La alternativa seleccionada necesita una justificación.');

  const cameCriteria = state.cameCriteria || [];
  const criteriaWeight = cameCriteria.reduce((total, criterion) => total + Number(criterion.weight || 0), 0);
  if (cameCriteria.some(criterion => Number(criterion.weight) < 0 || Number(criterion.weight) > 1)) addIssue('came', 'criteria-range', 'Cada peso CAME debe estar entre 0 y 1.', 'error');
  if (Math.abs(criteriaWeight - 1) > 0.001) addIssue('came', 'criteria-total', `Los pesos CAME suman ${criteriaWeight.toFixed(2)}; deben sumar 1.00.`, 'error');
  if (!state.cameActions?.length) addIssue('came', 'actions-empty', 'No hay fichas CAME generadas para validar.');
  state.cameActions?.forEach(action => {
    if (!String(action.action || '').trim()) addIssue('came', `${action.id}-action`, `${action.id}: falta la acción.`);
    if (!String(action.responsible || '').trim()) addIssue('came', `${action.id}-responsible`, `${action.id}: falta el responsable.`);
    if (!String(action.indicator || '').trim()) addIssue('came', `${action.id}-indicator`, `${action.id}: falta el indicador.`);
    if (!String(action.baseline || '').trim()) addIssue('came', `${action.id}-baseline`, `${action.id}: falta la línea base.`);
    if (!String(action.target || '').trim()) addIssue('came', `${action.id}-target`, `${action.id}: falta la meta.`);
    if (!String(action.startDate || '').trim() || !String(action.endDate || '').trim()) addIssue('came', `${action.id}-dates`, `${action.id}: complete las fechas de inicio y fin.`);
    if (action.startDate && action.endDate && action.startDate > action.endDate) addIssue('came', `${action.id}-date-order`, `${action.id}: la fecha de inicio no puede superar la fecha de fin.`, 'error');
    if (!['propuesta', 'en curso', 'completada', 'pausada'].includes(action.status)) addIssue('came', `${action.id}-status`, `${action.id}: el estado operativo no es válido.`, 'error');
  });

  const stageStatus = Object.fromEntries(Object.entries(byStage).map(([stage, stageIssues]) => [
    stage,
    stageIssues.some(issue => issue.severity === 'error') ? 'error' : stageIssues.length ? 'warning' : 'ready'
  ]));
  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.length - errors;
  return {
    issues,
    byStage,
    stageStatus,
    errors,
    warnings,
    valid: errors === 0,
    complete: issues.length === 0
  };
};

export const createDemoState = () => {
  const internal = makeFactors(INTERNAL_FACTORS, 'internal');
  const external = makeFactors(EXTERNAL_FACTORS, 'external');
  const strategies = createStrategies();
  const baseState = {
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
      objective: 'Analizar la interrelación de los procesos de cuadros y reservas para proponer acciones de mejora.',
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
    selectedStrategyId: 'EST-DO-01',
    selectionJustification: 'Se selecciona EST-DO-01 porque ataca la debilidad crítica D-08 y crea las condiciones para aprovechar O-01 y O-02.',
    cameCriteria: CAME_CRITERIA.map(criterion => ({ ...criterion })),
    cameActions: [],
    history: []
  };
  baseState.relationships = buildRelationships(baseState);
  baseState.qspmScores = buildQspmScores(strategies, getAllFactors(baseState));
  baseState.cameActions = buildCameActions(getAllFactors(baseState), strategies);
  return baseState;
};

export const createBlankState = () => {
  const state = createDemoState();
  const strategies = state.strategies.map((strategy, index) => ({
    ...strategy,
    name: `Alternativa ${String(index + 1).padStart(2, '0')}`,
    description: '',
    relatedFactors: []
  }));
  return {
    ...state,
    metadata: {
      ...state.metadata,
      id: `INV-${Date.now().toString().slice(-6)}`,
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
      updatedAt: new Date().toISOString()
    },
    internal: state.internal.map(factor => ({ ...factor, name: '', weight: 0, rating: 1, description: '', evidence: '' })),
    external: state.external.map(factor => ({ ...factor, name: '', weight: 0, rating: 1, description: '', evidence: '' })),
    relationships: [],
    strategies,
    qspmScores: {},
    selectedStrategyId: null,
    selectionJustification: '',
    cameActions: [],
    history: []
  };
};

export const formatNumber = value => Number(value || 0).toFixed(2);
export const formatPercent = value => `${Math.round(Number(value || 0) * 100)} %`;
