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
  - Regla de Oro — Verificabilidad (§50): Si no puedes demostrar de dónde salió un dato con ToolResultEvent/SourceEvent/CalculationEvent, no puedes presentarlo como dato calculado/verificado. Usa la escala: FACT (tool-result directo) / EVIDENCE (fuente verificada) / CALCULATION (motor determinista) / INFERENCE (derivada) / HYPOTHESIS (no demostrada) / INSUFFICIENT_EVIDENCE (sin evidencia). Nunca conviertas silenciosamente INFERENCE→FACT ni LLM_ESTIMATION→CALCULATION.
  - Prohibición Anti-Retrospectiva (§15): Nunca fabriques dimensiones, pesos o fórmulas para justificar un score previo (ej. 0.68-0.74, 0.8625, 0.787±0.14). Si una herramienta necesaria no está disponible o retornó cero resultados, declara INSUFFICIENT_EVIDENCE, no improvises.
  - Números: El LLM no es autoridad matemática. Toda métrica EFI/EFE/DAFO/QSPM/TAS, porcentaje, índice, ranking o intervalo debe provenir de motor determinista (calculateAnalysis) con CalculationEvent. No uses lenguaje estadístico formal (intervalo 95%, desviación) sin tamaño muestral y fórmula registrada.
  - Comunicación Limpia: Expresa tus conclusiones de forma directa y natural, sin citar nombres de funciones técnicas, reglas internas ni identificadores de base de datos. Si el usuario te agradece o saluda, responde con cordialidad ejecutiva y brevedad.
`

/**
 * Genera el marco metodológico de referencia para inyectar en el contexto de NovAi.
 * @deprecated Para Fase 2 usar getMethodologySlice(topic) — este mantiene compatibilidad legacy.
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

// =============================================================================
// Fase 2 — Methodology ON DEMAND (slices modulares)
// Solo inyectar lo relevante para el intent. Reduce Hola de ~1300tk a ~150tk.
// =============================================================================

export type MethodologyTopic = 'efi' | 'efe' | 'dafo' | 'qspm' | 'came' | 'general' | null

const CORE_IDENTITY_PROMPT: Record<string, string> = {
  es: 'Eres NovAi, asistente inteligente y consultor estratégico de NovaStore ERP. Responde de forma ejecutiva, precisa y profesional.',
  en: 'You are NovAi, NovaStore ERP intelligent assistant and strategic consultant. Answer executive, precise and professional.',
  de: 'Du bist NovAi, intelligenter Assistent und strategischer Berater von NovaStore ERP.',
  ko: '당신은 NovaStore ERP의 지능형 어시스턴트이자 전략 컨설턴트인 NovAi입니다.',
  pt: 'Você é o NovAi, assistente inteligente e consultor estratégico do NovaStore ERP.'
}

export function getCorePrompt(locale: string = 'es'): string {
  const lang = CORE_IDENTITY_PROMPT[locale] || CORE_IDENTITY_PROMPT.es
  const langInstruction =
    locale === 'en'
      ? 'You MUST answer strictly in English.'
      : locale === 'de'
        ? 'Antworten Sie UNBEDINGT auf Deutsch.'
        : locale === 'ko'
          ? '반드시 한국어로만 답변하십시오.'
          : locale === 'pt'
            ? 'Responda OBRIGATORIAMENTE em Português.'
            : 'Responde OBLIGATORIAMENTE en Español.'

  return `${lang} ${langInstruction}`
}

export function getMethodologySlice(topic: MethodologyTopic): string {
  if (!topic) return ''

  switch (topic) {
    case 'efi':
      return `EFI (Factores Internos): Ponderación suma=1.00. Escala 1=Debilidad Mayor,2=Debilidad Menor,3=Fortaleza Menor,4=Fortaleza Mayor. Umbral 2.50. Debilidades solo 1-2, fortalezas solo 3-4.`
    case 'efe':
      return `EFE (Factores Externos): Ponderación suma=1.00. Escala respuesta 1=Deficiente,2=Regular,3=Buena,4=Excelente. Umbral 2.50. Oportunidades/amenazas son del entorno (PESTEL/Porter), no internas.`
    case 'dafo':
      return `DAFO Cruces: Fuerza 0=Nula,1=Baja,2=Media,3=Alta/Crítica. Cuadrantes FO(Ofensivo), DO(Adaptativo), FA(Defensivo), DA(Supervivencia). Axioma DA: debilidad+amenaza mismo dominio no puede ser 0 sin blindaje.`
    case 'qspm':
      return `QSPM: AS 1=No atractiva,2=Algo,3=Razonablemente,4=Altamente (0=No aplica). TAS=Peso×AS, mayor TAS = más respaldo.`
    case 'came':
      return `CAME: Corregir Debilidades | Afrontar Amenazas | Mantener Fortalezas | Explotar Oportunidades.`
    case 'general':
      return getMethodologicalPrompt().slice(0, 800) // fallback compacto si se pide general pero filtrado
    default:
      return ''
  }
}

/**
 * Detecta el topic metodológico relevante a partir del texto del usuario.
 * Heurística pura (Fase 2), interfaz preparada para híbrido LLM cheap en Fase 4.
 */
export function detectMethodologyTopic(text: string): MethodologyTopic {
  const lower = (text || '').toLowerCase()
  const has = (re: RegExp) => re.test(lower)

  // Prioridad: si pide varios, elige el más específico; si pide metodología general, retorna null para inyectar solo core + relevante
  if (has(/qspm|tas\s*=|attractiveness|puntaje.*atractivo/)) return 'qspm'
  if (has(/\bcame\b|corregir.*debilidad|afrontar.*amenaza/)) return 'came'
  if (has(/dafo|foda|cruce.*×|cruce.*x|quadrant|fo\s|do\s|fa\s|da\s|fuerza\s*[0-3]/)) return 'dafo'
  if (has(/\befe\b|factores.*externos|efe.*ponderaci/)) return 'efe'
  if (has(/\befi\b|factores.*internos|efi.*ponderaci/)) return 'efi'
  // Si menciona metodología pero sin especificar, no inyectar todo: retornar null (Context Manager decidirá minimal + tool)
  if (has(/metodolog|fred david|porter|pestel/)) return null
  return null
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
