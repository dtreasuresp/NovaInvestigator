/**
 * Compilación Ejecutable de la Base de Conocimiento Metodológica y Diagnóstico Estratégico.
 * Derivada del documento canónico: doc/plans/BASE_CONOCIMIENTO_METODOLOGIA_ESTRATEGICA_NOVAI.md
 * 
 * Utilizada por NovAi para razonamiento estratégico, auditoría crítica, anti-sycophancy y grounding.
 */

export interface MethodologyGuideline {
  topic: 'efi' | 'efe' | 'dafo' | 'qspm' | 'came' | 'general'
  summary: string
  rules: string[]
  antiSycophancyDirectives: string[]
}

export const STRATEGIC_METHODOLOGY_AXIOMS = {
  EFI: {
    name: 'Evaluación de Factores Internos (EFI)',
    scaleDescription: '1=Debilidad Mayor (Crítica), 2=Debilidad Menor, 3=Fortaleza Menor, 4=Fortaleza Mayor (Distintiva)',
    weightRule: 'La sumatoria de ponderaciones debe ser exactamente 1.00 (100%).',
    thresholdAverage: 2.50,
    interpretation: 'Puntuación < 2.50 indica debilidad interna; > 2.50 indica solidez interna.',
    rules: [
      'Las debilidades SOLO pueden recibir calificación 1 o 2. NUNCA 3 o 4.',
      'Las fortalezas SOLO pueden recibir calificación 3 o 4. NUNCA 1 o 2.',
      'El peso o ponderación refleja la importancia del factor en la industria, no dentro de la empresa.'
    ]
  },
  EFE: {
    name: 'Evaluación de Factores Externos (EFE)',
    scaleDescription: '1=Respuesta Deficiente, 2=Respuesta Regular/Promedio, 3=Respuesta Buena, 4=Respuesta Excelente/Superior',
    weightRule: 'La sumatoria de ponderaciones debe ser exactamente 1.00 (100%).',
    thresholdAverage: 2.50,
    interpretation: 'Puntuación < 2.50 indica que las estrategias no capitalizan oportunidades ni mitigan amenazas.',
    rules: [
      'La calificación (1-4) evalúa la eficacia de la respuesta actual de la empresa frente al entorno.',
      'Las oportunidades y amenazas provienen estrictamente del entorno macro (PESTEL) o micro (Porter), no de fallas internas.'
    ]
  },
  DAFO_CROSSINGS: {
    name: 'Matriz DAFO de Impacto Cruzado',
    scale: {
      0: 'Nula: No existe relación causal directa ni indirecta relevante.',
      1: 'Baja / Indirecta: Relación secundaria, tangencial o contingente.',
      2: 'Media / Moderada: Correlación e impacto tangible en el desempeño.',
      3: 'Alta / Directa y Crítica: Relación causal determinante y prioritaria.'
    },
    quadrants: {
      FO: {
        type: 'Ofensivo / Crecimiento (Maxi-Maxi)',
        focus: '¿Cómo esta Fortaleza permite explotar y apalancar esta Oportunidad?',
        rationale: 'Apalancamiento de competencias distintivas para capturar ventajas externas.'
      },
      DO: {
        type: 'Adaptativo / Reorientación (Mini-Maxi)',
        focus: '¿Cómo superar esta Debilidad para no perder esta Oportunidad?',
        rationale: 'Remediación interna requerida para habilitar la captura de oportunidades.'
      },
      FA: {
        type: 'Defensivo / Blindaje (Maxi-Mini)',
        focus: '¿Cómo esta Fortaleza sirve de escudo o neutralizador de esta Amenaza?',
        rationale: 'Uso de capacidades internas para amortiguar o repeler riesgos del entorno.'
      },
      DA: {
        type: 'Supervivencia / Contención (Mini-Mini)',
        focus: '¿En qué medida esta Debilidad amplifica la gravedad de esta Amenaza?',
        rationale: 'Vulnerabilidad crítica donde la amenaza golpea directamente en el punto débil.'
      }
    }
  },
  QSPM: {
    name: 'Matriz Cuantitativa de Planificación Estratégica (QSPM)',
    scale: '1=No atractiva, 2=Algo atractiva, 3=Razonablemente atractiva, 4=Altamente atractiva, 0/NA=No aplica',
    formula: 'TAS = Peso del factor * Calificación de Atractivo (AS). La suma de TAS determina la estrategia preferida.',
    rules: [
      'Si un factor afecta a una estrategia, debe evaluarse coherentemente para las alternativas comparadas.',
      'Las estrategias con mayor TAS total tienen mayor respaldo objetivo en el diagnóstico.'
    ]
  },
  CAME: {
    name: 'Marco de Acción CAME',
    pillars: {
      C: 'Corregir Debilidades (intervención directa en limitaciones internas)',
      A: 'Afrontar Amenazas (planes de contingencia y defensas activas)',
      M: 'Mantener Fortalezas (preservación e inversión en ventajas competitivas)',
      E: 'Explotar Oportunidades (iniciativas de expansión e innovación)'
    }
  }
} as const

export const CONSULTING_CRITICAL_DIRECTIVES = `
  Enfoque de Asesoría y Principios Profesionales:
  - Rol: Eres NovAi, Consultor y Asesor Senior de Dirección Estratégica en NovaStore ERP. Tu propósito es orientar a directivos y equipos en la toma de decisiones fundamentadas, combinando rigor metodológico, pensamiento analítico y visión de negocio.
  - Estilo y Tono: Comunícate con claridad ejecutiva, criterio constructivo y profesionalidad. Plantea tus argumentos con fundamentos de gestión empresarial, explicando las relaciones causa-efecto de manera didáctica y facilitando que la dirección evalúe sus propios riesgos y prioridades.
  - Aislamiento y Confidencialidad: Cada organización, empresa o expediente de investigación es estrictamente independiente y confidencial. Jamás vincules, mezcles ni asumas relaciones operativas entre empresas distintas a menos que el usuario solicite expresamente una comparación.
  - Fundamentación en Evidencias: Basa tus análisis en los datos reales del expediente cuando existan, o en principios generales de administración estratégica cuando se trate de consultas conceptuales. No inventes estudios, encuestas ni métricas ficticias.
  - Comunicación Limpia: Expresa tus conclusiones de forma directa y natural, sin citar nombres de funciones técnicas, reglas internas ni identificadores de base de datos. Si el usuario te agradece o saluda, responde con cordialidad ejecutiva y brevedad.
`

/**
 * Genera el marco metodológico de referencia para inyectar en el contexto de NovAi.
 */
export function getMethodologicalPrompt(): string {
  return `
  Marco Metodológico de Diagnóstico Estratégico:
  • Matriz de Evaluación de Factores Internos (EFI):
    - Ponderación de factores (suma = 1.00). Escala: 1 = Debilidad Mayor, 2 = Debilidad Menor, 3 = Fortaleza Menor, 4 = Fortaleza Mayor.
    - Puntuación media de referencia: 2.50 (Valores inferiores indican vulnerabilidad interna; superiores reflejan solidez interna).

  • Matriz de Evaluación de Factores Externos (EFE):
    - Ponderación de factores (suma = 1.00). Escala de respuesta estratégica: 1 = Deficiente, 2 = Regular, 3 = Buena, 4 = Excelente.
    - Puntuación media de referencia: 2.50 (Valores superiores indican que la organización responde eficazmente a las oportunidades y amenazas del entorno).

  • Matriz de Impacto Cruzado DAFO (Escala de fuerza: 0 = Nula, 1 = Baja, 2 = Media, 3 = Alta/Crítica):
    - Cuadrante FO (Ofensivo / Maxi-Maxi): ¿Cómo apalancar las Fortalezas internas para capturar las Oportunidades del entorno?
    - Cuadrante DO (Adaptativo / Mini-Maxi): ¿Cómo superar o mitigar las Debilidades internas para no desaprovechar las Oportunidades?
    - Cuadrante FA (Defensivo / Maxi-Mini): ¿Cómo utilizar las Fortalezas internas para neutralizar o amortiguar las Amenazas externas?
    - Cuadrante DA (Supervivencia / Mini-Mini): ¿En qué medida las Debilidades internas potencian la gravedad de las Amenazas del entorno?

• Matriz Cuantitativa de Planificación Estratégica (QSPM):
  - Puntuación de Atractivo (AS): 1 = No atractiva, 2 = Algo atractiva, 3 = Razonablemente atractiva, 4 = Altamente atractiva. Calificación Total de Atractivo (TAS) = Peso * AS.

• Marco de Acción CAME:
  - Corregir Debilidades | Afrontar Amenazas | Mantener Fortalezas | Explotar Oportunidades.

${CONSULTING_CRITICAL_DIRECTIVES}
`
}

export type GenericFactorType = 'F' | 'D' | 'O' | 'A' | 'strength' | 'weakness' | 'opportunity' | 'threat'

export function isWeaknessType(type: GenericFactorType): boolean {
  return type === 'D' || type === 'weakness'
}

export function isStrengthType(type: GenericFactorType): boolean {
  return type === 'F' || type === 'strength'
}

export function isOpportunityType(type: GenericFactorType): boolean {
  return type === 'O' || type === 'opportunity'
}

export function isThreatType(type: GenericFactorType): boolean {
  return type === 'A' || type === 'threat'
}

/**
 * Validador determinista de consistencia en cruces DAFO.
 */
export function auditDafoCrossing(
  factorInternal: { name: string; type: GenericFactorType; rating: number; weight: number },
  factorExternal: { name: string; type: GenericFactorType; rating: number; weight: number },
  currentScore: number
): {
  suggestedMinScore: number
  isSuspiciousZero: boolean
  auditRationale: string
} {
  const isWeakness = isWeaknessType(factorInternal.type)
  const isThreat = isThreatType(factorExternal.type)
  const isStrength = isStrengthType(factorInternal.type)
  const isOpportunity = isOpportunityType(factorExternal.type)

  // Caso DA crítico: Debilidad Mayor (rating 1) y Amenaza con peso relevante
  if (isWeakness && isThreat) {
    const textInternal = factorInternal.name.toLowerCase()
    const textExternal = factorExternal.name.toLowerCase()

    // Detectar solapamiento semántico básico (ej. personal, talento, rotación, desgaste vs competencia, mercado, clientes, costos)
    const talentKeywords = ['personal', 'trabajador', 'empleado', 'desgaste', 'talento', 'rotación', 'salario', 'capacit']
    const talentMarketKeywords = ['competencia', 'mercado laboral', 'fuga', 'oferta', 'salario', 'contrat']

    const matchesTalentInternal = talentKeywords.some(kw => textInternal.includes(kw))
    const matchesTalentExternal = talentMarketKeywords.some(kw => textExternal.includes(kw))

    if (matchesTalentInternal && matchesTalentExternal) {
      return {
        suggestedMinScore: 2,
        isSuspiciousZero: currentScore === 0,
        auditRationale: `Inconsistencia crítica detectada: El cruce DA entre "${factorInternal.name}" y "${factorExternal.name}" comparte el dominio de capital humano y competencia laboral. Una debilidad de desgaste/fuga ante un mercado competidor no puede ser de fuerza 0 sin un blindaje documentado. Sugerido: 2 (Media) o 3 (Alta).`
      }
    }
  }

  // Caso FO de apalancamiento: Fortaleza Mayor (rating 4) y Oportunidad relevante
  if (isStrength && isOpportunity && factorInternal.rating === 4 && factorExternal.weight >= 0.15) {
    if (currentScore === 0) {
      return {
        suggestedMinScore: 2,
        isSuspiciousZero: true,
        auditRationale: `Posible subestimación en cuadrante FO: La fortaleza distintiva "${factorInternal.name}" (Calificación 4) frente a la oportunidad estratégica "${factorExternal.name}" tiene potencial de apalancamiento directo. Evaluar fuerza 2 o 3.`
      }
    }
  }

  return {
    suggestedMinScore: currentScore,
    isSuspiciousZero: false,
    auditRationale: `Evaluación de cruce consistente con los axiomas metodológicos.`
  }
}
