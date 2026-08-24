import type { Analysis, InvestigationState, Strategy } from '@/types/apps/investigator-types'
import { formatNumber, formatPercent, ORIENTATIONS } from './domain'

interface LocalizedReportParams {
  state: InvestigationState
  analysis: Analysis
  selectedStrategy?: Strategy
  locale?: string
}

export function buildLocalizedAcademicReport({
  state,
  analysis,
  selectedStrategy,
  locale = 'es'
}: LocalizedReportParams): string {
  const efiVal = analysis.efi.total
  const efeVal = analysis.efe.total

  const efiCategory = efiVal >= 3.0 ? 'strong' : efiVal >= 2.0 ? 'average' : 'weak'
  const efeCategory = efeVal >= 3.0 ? 'high' : efeVal >= 2.0 ? 'medium' : 'low'

  const org = state.metadata.organization || (
    locale === 'en' ? 'the organization' :
    locale === 'de' ? 'die Organisation' :
    locale === 'ko' ? '해당 조직' :
    locale === 'pt' ? 'a organização' : 'la organización'
  )
  const unit = state.metadata.unit ? ` (${state.metadata.unit})` : ''
  const dom = analysis.relations.dominant || 'DO'
  const domName = ORIENTATIONS[dom]?.name || 'Adaptativa'
  const stratName = selectedStrategy?.name || (
    locale === 'en' ? 'Selected Strategy' :
    locale === 'de' ? 'Ausgewählte Strategie' :
    locale === 'ko' ? '선정된 전략' :
    locale === 'pt' ? 'Estratégia Selecionada' : 'Estrategia seleccionada'
  )
  const topCame = analysis.came.actions.filter(a => a.category === 'critica' || a.category === 'alta')

  // IE Cell calculation
  let cell = 'V'
  if (efeCategory === 'high') {
    cell = efiCategory === 'strong' ? 'I' : efiCategory === 'average' ? 'II' : 'III'
  } else if (efeCategory === 'medium') {
    cell = efiCategory === 'strong' ? 'IV' : efiCategory === 'average' ? 'V' : 'VI'
  } else {
    cell = efiCategory === 'strong' ? 'VII' : efiCategory === 'average' ? 'VIII' : 'IX'
  }

  // Localized prescription
  const IE_PRESCRIPTIONS: Record<string, Record<string, string>> = {
    es: {
      I: 'Crecer y construir (Penetración intensiva)',
      II: 'Crecer y construir (Desarrollo de mercado)',
      III: 'Retener y mantener (Desarrollo de producto)',
      IV: 'Crecer y construir (Integración hacia adelante)',
      V: 'Retener y mantener (Penetración y desarrollo)',
      VI: 'Cosechar o desinvertir (Reducción selectiva)',
      VII: 'Retener y mantener (Diversificación concéntrica)',
      VIII: 'Cosechar o desinvertir (Reducción de costos)',
      IX: 'Cosechar o liquidar (Desinversión rápida)'
    },
    en: {
      I: 'Grow and build (Intensive market penetration)',
      II: 'Grow and build (Market development)',
      III: 'Hold and maintain (Product development)',
      IV: 'Grow and build (Forward integration)',
      V: 'Hold and maintain (Market penetration & development)',
      VI: 'Harvest or divest (Selective reduction)',
      VII: 'Hold and maintain (Concentric diversification)',
      VIII: 'Harvest or divest (Cost retrenchment)',
      IX: 'Harvest or liquidate (Rapid divestment)'
    },
    de: {
      I: 'Wachsen und aufbauen (Intensive Marktdurchdringung)',
      II: 'Wachsen und aufbauen (Marktentwicklung)',
      III: 'Halten und pflegen (Produktentwicklung)',
      IV: 'Wachsen und aufbauen (Vorwärtsintegration)',
      V: 'Halten und pflegen (Marktdurchdringung & Entwicklung)',
      VI: 'Ernten oder veräußern (Selektiver Rückzug)',
      VII: 'Halten und pflegen (Konzentrische Diversifikation)',
      VIII: 'Ernten oder veräußern (Kostenreduktion)',
      IX: 'Ernten oder liquidieren (Schnelle Deinvestition)'
    },
    ko: {
      I: '성장 및 구축 (집중적 시장 침투)',
      II: '성장 및 구축 (시장 개발)',
      III: '유지 및 보존 (제품 개발)',
      IV: '성장 및 구축 (전방 통합)',
      V: '유지 및 보존 (시장 침투 및 개발)',
      VI: '수확 또는 철수 (선별적 축소)',
      VII: '유지 및 보존 (동심적 다각화)',
      VIII: '수확 또는 철수 (비용 절감)',
      IX: '수확 또는 청산 (신속한 투자 회수)'
    },
    pt: {
      I: 'Crescer e construir (Penetração intensiva de mercado)',
      II: 'Crescer e construir (Desenvolvimento de mercado)',
      III: 'Reter e manter (Desenvolvimento de produto)',
      IV: 'Crescer e construir (Integração para a frente)',
      V: 'Reter e manter (Penetração e desenvolvimento)',
      VI: 'Colher ou desinvestir (Redução seletiva)',
      VII: 'Reter e manter (Diversificação concêntrica)',
      VIII: 'Colher ou desinvestir (Redução de custos)',
      IX: 'Colher ou liquidar (Desinvestimento rápido)'
    }
  }

  const prescription = IE_PRESCRIPTIONS[locale]?.[cell] || IE_PRESCRIPTIONS.es[cell]

  if (locale === 'en') {
    return `STRATEGIC ASSESSMENT AND EXECUTIVE METHODOLOGICAL SUMMARY

1. Comprehensive Strategic Diagnosis:
The analysis of the strategic position for ${org}${unit} yielded an Internal Factor Evaluation (IFE) index of ${formatNumber(efiVal)} and an External Factor Evaluation (EFE) index of ${formatNumber(efeVal)}. ${
      efiVal < 2.5
        ? 'The internal balance reveals operational vulnerability where weaknesses outweigh organizational strengths.'
        : 'The internal position denotes solid operational strength and effective utilization of key competencies.'
    } ${
      efeVal < 2.5
        ? 'In the external environment, threats represent a significant risk requiring immediate mitigation measures.'
        : 'The external environment presents favorable opportunities for sustainable expansion and consolidation.'
    }

2. Matrix Quadrants and Dominant Vector:
Based on the evaluation of ${analysis.relations.evaluatedCount} SWOT cross-impact relationships, a dominant strategic orientation of type ${dom} (${domName}) was determined with an exploratory index of ${formatNumber(analysis.relations.summary[dom]?.index ?? 0)} and a coverage of ${formatPercent(analysis.relations.coverage)}. In the Internal-External Matrix (IE Matrix), the entity is positioned in Quadrant ${cell}, prescribing a guideline of "${prescription}".

3. Quantitative Strategic Planning (QSPM - David):
The Quantitative Strategic Planning Matrix validated as the most attractive alternative ${selectedStrategy?.id || 'the primary alternative'} ("${stratName}") with an accumulated TAS of ${formatNumber(analysis.qspm.results[0]?.totalTas || 0)}, grounded in its capacity to mitigate critical weaknesses while capitalizing on external opportunities.

4. Operational Action Plan (CAME):
To operationalize the selected strategy, ${analysis.came.actions.length} actionable initiatives were structured and prioritized under the continuous multicriteria model. Notably, ${topCame.length} critical and high-priority actions focus on structural correction and institutional risk assurance.`
  }

  if (locale === 'de') {
    return `STRATEGISCHES GUTACHTEN UND METHODISCHE ZUSAMMENFASSUNG

1. Umfassende strategische Diagnose:
Die Analyse der strategischen Position für ${org}${unit} ergab einen Index der internen Faktoren (IFE) von ${formatNumber(efiVal)} und einen Index der externen Faktoren (EFE) von ${formatNumber(efeVal)}. ${
      efiVal < 2.5
        ? 'Das interne Gleichgewicht zeigt eine operative Verwundbarkeit, bei der die Schwächen die Stärken überwiegen.'
        : 'Die interne Position belegt operative Stärke und wirksame Nutzung von Kernkompetenzen.'
    } ${
      efeVal < 2.5
        ? 'Im externen Umfeld stellen Bedrohungen ein kritisches Risiko dar, das sofortige Gegenmaßnahmen erfordert.'
        : 'Das Umfeld bietet vorteilhafte Chancen für nachhaltiges Wachstum und Konsolidierung.'
    }

2. Matrix-Quadranten und Dominanzvektor:
Aus der Bewertung von ${analysis.relations.evaluatedCount} SWOT-Beziehungen ergab sich eine dominante strategische Ausrichtung vom Typ ${dom} (${domName}) mit einem Index von ${formatNumber(analysis.relations.summary[dom]?.index ?? 0)} und einer Abdeckung von ${formatPercent(analysis.relations.coverage)}. In der Intern-Extern-Matrix (IE Matrix) befindet sich die Organisation in Quadrant ${cell} mit der Vorgabe «${prescription}».

3. Quantitative Strategieauswahl (QSPM):
Die quantitative strategische Planungsmatrix bestätigte als attraktivste Alternative ${selectedStrategy?.id || 'die Hauptalternative'} («${stratName}») mit einem kumulierten TAS von ${formatNumber(analysis.qspm.results[0]?.totalTas || 0)}.

4. Operativer CAME-Aktionsplan:
Zur Umsetzung der gewählten Strategie wurden ${analysis.came.actions.length} operative Maßnahmen priorisiert, davon ${topCame.length} mit kritischer und hoher Priorität.`
  }

  if (locale === 'ko') {
    return `전략적 진단 및 방법론적 총괄 보고서

1. 종합 전략 진단:
${org}${unit}의 전략적 포지션 분석 결과, 내부 요인 평가(EFI) 지수는 ${formatNumber(efiVal)}, 외부 요인 평가(EFE) 지수는 ${formatNumber(efeVal)}로 산출되었습니다. ${
      efiVal < 2.5
        ? '내부 역량 균형은 약점이 조직의 강점을 초과하여 운영상 취약성이 존재하는 상태를 나타냅니다.'
        : '내부 포지션은 핵심 강점의 우수한 활용과 안정적인 운영 건전성을 보여줍니다.'
    } ${
      efeVal < 2.5
        ? '외부 환경 측면에서는 주요 위협 요인이 즉각적인 리스크 완화 조치를 요구하고 있습니다.'
        : '외부 환경은 지속 가능한 성장과 경쟁력 강화를 위한 유리한 기회를 제공하고 있습니다.'
    }

2. 매트릭스 사분면 및 지배적 벡터:
총 ${analysis.relations.evaluatedCount}개의 DAFO 교차 영향도 평가를 바탕으로 도출된 지배적 전략 방향은 ${dom} (${domName}) 유형이며, 탐색 지수는 ${formatNumber(analysis.relations.summary[dom]?.index ?? 0)}, 평가 커버리지는 ${formatPercent(analysis.relations.coverage)}입니다. 내부-외부 매트릭스(IE Matrix)에서 조직은 제${cell}사분면에 위치하며, 권고 지침은 «${prescription}»입니다.

3. 정량적 전략 기획 (QSPM - David):
정량적 전략 기획 매트rik스(QSPM) 분석 결과, 총 매력도 점수(TAS) ${formatNumber(analysis.qspm.results[0]?.totalTas || 0)}점을 획득한 ${selectedStrategy?.id || '주요 대안'} («${stratName}»)이 최적의 대안으로 검증되었습니다.

4. CAME 실행 계획 및 과제 배분:
선정된 전략을 실행하기 위해 다기준 평가 모델에 따라 총 ${analysis.came.actions.length}개의 실행 과제가 체계화되었으며, 이 중 ${topCame.length}개의 핵심/고우선순위 과제가 구조적 약점 보완 및 목표 달성을 위해 집중 배치되었습니다.`
  }

  if (locale === 'pt') {
    return `PARECER ESTRATÉGICO E RESUMO METODOLÓGICO EXECUTIVO

1. Diagnóstico Estratégico Integral:
A análise da posição estratégica para ${org}${unit} resultou em um Índice de Avaliação de Fatores Internos (EFI) de ${formatNumber(efiVal)} e um Índice de Avaliação de Fatores Externos (EFE) de ${formatNumber(efeVal)}. ${
      efiVal < 2.5
        ? 'O balanço interno revela vulnerabilidade operacional, onde as fraquezas superam os pontos fortes organizacionais.'
        : 'A posição interna denota solidez operacional e aproveitamento eficaz de competências essenciais.'
    } ${
      efeVal < 2.5
        ? 'No ambiente externo, as ameaças representam um risco significativo que exige medidas imediatas de mitigação.'
        : 'O ambiente apresenta oportunidades favoráveis para crescimento e consolidação sustentável.'
    }

2. Matriz de Quadrantes e Vetor de Posicionamento:
A partir da avaliação de ${analysis.relations.evaluatedCount} cruzamentos SWOT, determinou-se uma orientação estratégica dominante do tipo ${dom} (${domName}) com índice de ${formatNumber(analysis.relations.summary[dom]?.index ?? 0)} e cobertura de ${formatPercent(analysis.relations.coverage)}. Na Matriz Interna-Externa (IE Matrix), a organização localiza-se no Quadrante ${cell}, prescrevendo a diretriz «${prescription}».

3. Seleção Estratégica Quantitativa (QSPM - David):
A Matriz QSPM validou como alternativa de maior atratividade ${selectedStrategy?.id || 'a alternativa principal'} («${stratName}») com TAS acumulado de ${formatNumber(analysis.qspm.results[0]?.totalTas || 0)}.

4. Plano de Ação CAME e Priorização:
Para a instrumentalização da estratégia selecionada, estruturaram-se ${analysis.came.actions.length} ações operacionais sob o modelo multicritério contínuo, destacando-se ${topCame.length} ações de prioridade crítica e alta.`
  }

  // Default: Spanish
  return `DICTAMEN ESTRATÉGICO Y RESUMEN METODOLÓGICO EJECUTIVO

1. Diagnóstico Estratégico Integral:
El análisis de la posición estratégica para ${org}${unit} arrojó un Índice de Evaluación de Factores Internos (EFI) de ${formatNumber(efiVal)} y un Índice de Evaluación de Factores Externos (EFE) de ${formatNumber(efeVal)}. ${
    efiVal < 2.5
      ? 'El balance interno revela una posición de vulnerabilidad operativa donde las debilidades superan a las fortalezas organizacionales.'
      : 'La posición interna denota solidez operativa y aprovechamiento de fortalezas clave.'
  } ${
    efeVal < 2.5
      ? 'En el plano externo, las amenazas del entorno representan un riesgo significativo que exige medidas de mitigación inmediatas.'
      : 'El entorno presenta oportunidades favorables para el crecimiento y la consolidación.'
  }

2. Matriz Cuadrantes y Vector de Posicionamiento:
A partir de la evaluación de ${analysis.relations.evaluatedCount} relaciones de cruce DAFO, se determinó una orientación estratégica dominante de tipo ${dom} (${domName}) con un índice exploratorio de ${formatNumber(analysis.relations.summary[dom]?.index ?? 0)} y una cobertura del ${formatPercent(analysis.relations.coverage)}. En la Matriz de Posicionamiento Interno-Externo (IE Matrix), la entidad se ubica en el Cuadrante ${cell}, lo que prescribe una directriz de «${prescription}».

3. Selección Estratégica Cuantitativa (QSPM - David):
La Matriz Cuantitativa de Planificación Estratégica validó como alternativa de mayor atractivo a ${selectedStrategy?.id || 'la alternativa principal'} («${stratName}») con un TAS acumulado de ${formatNumber(analysis.qspm.results[0]?.totalTas || 0)}, fundamentada en su capacidad de mitigar las debilidades críticas aprovechando las oportunidades del entorno.

4. Plan Operativo y Priorización CAME:
Para la instrumentalización de la estrategia seleccionada, se estructuraron ${analysis.came.actions.length} acciones operativas priorizadas bajo el modelo multicriterio continuo. Destacan ${topCame.length} acciones de prioridad crítica y alta orientadas a la corrección estructural y al aseguramiento de resultados institucionales.`
}
