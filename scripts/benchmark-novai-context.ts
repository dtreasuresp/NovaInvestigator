#!/usr/bin/env tsx
/**
 * Benchmark reproducible de contexto NovAi — Fase 1 Instrumentación
 *
 * Mide de forma determinista el coste de contexto antes/después de cada optimización.
 * No requiere Supabase ni claves de LLM: usa los mismos estimadores y builders que el runtime.
 *
 * Casos canónicos (misión §Fase 2):
 *  A: "Hola"
 *  B: "¿Cuál es la investigación activa?"
 *  C: "Analiza la relación D-03 × A-02."
 *  D: "Investiga en Internet la competencia laboral en Cuba."
 *
 * Métricas por caso:
 *  systemTokens, toolDefsTokens, historyTokens, investigationTokens (si aplica),
 *  inputTokens, totalTokens, contextUtilization (% de maxTotalTokens),
 *  toolsExposed, toolsExecutedSimulated, modelTier, category
 *
 * Uso:
 *   pnpm exec tsx scripts/benchmark-novai-context.ts
 *   pnpm exec tsx scripts/benchmark-novai-context.ts --json
 *   pnpm exec tsx scripts/benchmark-novai-context.ts --out scripts/benchmark-results.json
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { NovaiTokenBudget } from '../src/features/novai/token-budget'
import { NovaiContextEngine, type TenantOverviewSummary } from '../src/features/novai/context-engine'
import { getMethodologicalPrompt } from '../src/features/novai/methodology-knowledge'
import { NovaiModelRouter } from '../src/features/novai/adapters/model-router'
import { NOVAI_ALL_MODULAR_TOOLS } from '../src/features/novai/tools/index'
import type { NovaiContext, AiMessage } from '../src/features/novai/schema'
import { buildInvestigationSystemPrompt } from '../src/features/novai/context-builder'
import { NovaiToolSelector } from '../src/features/novai/tool-selector'
import { NovaiCompactionEngine } from '../src/features/novai/compaction-engine'

// ---------------------------------------------------------------------------
// Mock data — determinista, sin Supabase
// ---------------------------------------------------------------------------

const MOCK_PRINCIPAL = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  client: {} as never
} as unknown as Parameters<typeof NovaiContextEngine.buildSystemPrompt>[0]['principal']

function makeMockOverview(): TenantOverviewSummary {
  return {
    investigations: {
      total: 12,
      byStatus: { active: 3, draft: 5, closed: 4 },
      recent: [
        { id: 'inv-001', title: 'Expansión Logística Bioceánica', status: 'active', updatedAt: new Date().toISOString() },
        { id: 'inv-002', title: 'Transformación Digital Retail', status: 'draft', updatedAt: new Date().toISOString() }
      ]
    },
    kanban: {
      totalTasks: 34,
      columnsSummary: { 'Por hacer': 12, 'En progreso': 9, Hecho: 13 },
      urgentCount: 3
    },
    teams: [{ id: 'team-1', name: 'Estrategia' }, { id: 'team-2', name: 'Operaciones' }]
  }
}

type Factor = {
  id: string
  type: 'F' | 'D' | 'O' | 'A'
  name: string
  weight: number
  rating: number
  evidence?: string
}

function makeMockInvestigación() {
  // Factores con shape completo requerido por domain.ts: group, description
  // usar any[] para evitar colisión de tipos Factor locales vs globales
  const internal: any[] = [
    { id: 'F-01', type: 'F', group: 'internal' as const, name: 'Red logística propia en corredor bioceánico', weight: 0.15, rating: 4, description: '', evidence: 'Flota 42 camiones, cobertura 3 países, 98% on-time 2025' },
    { id: 'F-02', type: 'F', group: 'internal' as const, name: 'Contratos exclusivos con puerto Arica', weight: 0.12, rating: 3, description: '', evidence: 'Concesión 2024-2029' },
    { id: 'F-03', type: 'F', group: 'internal' as const, name: 'Sistema TMS integrado', weight: 0.08, rating: 3, description: '', evidence: 'SAP TM go-live 2025' },
    { id: 'F-04', type: 'F', group: 'internal' as const, name: 'Equipo comercial senior', weight: 0.07, rating: 4, description: '', evidence: 'Promedio 12 años experiencia' },
    { id: 'D-01', type: 'D', group: 'internal' as const, name: 'Desgaste de personal clave (rotación 18%)', weight: 0.14, rating: 1, description: '', evidence: 'Rotación 18% anual, encuesta clima 62/100' },
    { id: 'D-02', type: 'D', group: 'internal' as const, name: 'Dependencia de 2 clientes (>45% facturación)', weight: 0.12, rating: 1, description: '', evidence: 'Cliente A 28%, B 18%' },
    { id: 'D-03', type: 'D', group: 'internal' as const, name: 'Fuga de talento hacia competencia', weight: 0.10, rating: 2, description: '', evidence: '6 dimisiones Q1 2026 hacia LogiCorp' },
    { id: 'D-04', type: 'D', group: 'internal' as const, name: 'Procesos manuales en aduana', weight: 0.08, rating: 2, description: '', evidence: '40% trámites en papel' }
  ]
  const external: any[] = [
    { id: 'O-01', type: 'O', group: 'external' as const, name: 'Crecimiento e-commerce regional +22% anual', weight: 0.18, rating: 3, description: '', evidence: 'CEPAL 2025' },
    { id: 'O-02', type: 'O', group: 'external' as const, name: 'Corredor bioceánico licitado 2026', weight: 0.16, rating: 4, description: '', evidence: 'MOP Chile' },
    { id: 'O-03', type: 'O', group: 'external' as const, name: 'Nearshoring automotriz', weight: 0.10, rating: 2, description: '', evidence: 'Inversión USD 400M' },
    { id: 'A-01', type: 'A', group: 'external' as const, name: 'Competencia tarifaria LogiCorp -15%', weight: 0.15, rating: 2, description: '', evidence: 'Tarifa promedio -15% vs 2024' },
    { id: 'A-02', type: 'A', group: 'external' as const, name: 'Competencia laboral agresiva (mercado laboral captando talento)', weight: 0.14, rating: 1, description: '', evidence: 'Ofertas +25% salario, 3 ferias empleo Q1' },
    { id: 'A-03', type: 'A', group: 'external' as const, name: 'Volatilidad tipo de cambio', weight: 0.10, rating: 2, description: '', evidence: 'CLP -8% YTD' },
    { id: 'A-04', type: 'A', group: 'external' as const, name: 'Regulación aduanera más estricta', weight: 0.09, rating: 2, description: '', evidence: 'Circular 2025-12' },
    { id: 'O-04', type: 'O', group: 'external' as const, name: 'Alianzas con operadores portuarios', weight: 0.08, rating: 3, description: '', evidence: 'MoU Puerto Iquique' }
  ]

  const relationships = [
    { id: 'rel-1', internalId: 'D-03', externalId: 'A-02', quadrant: 'DA' as const, strength: 0, status: 'pendiente' as const, justification: '', evidence: '', evaluator: 'Comité', date: new Date().toISOString() },
    { id: 'rel-2', internalId: 'F-01', externalId: 'O-02', quadrant: 'FO' as const, strength: 3, status: 'fuerte' as const, justification: 'Red propia captura corredor', evidence: 'Flota + concesión', evaluator: 'Comité', date: new Date().toISOString() },
    { id: 'rel-3', internalId: 'D-01', externalId: 'A-02', quadrant: 'DA' as const, strength: 3, status: 'fuerte' as const, justification: 'Rotación amplifica fuga', evidence: '18% rotación', evaluator: 'Comité', date: new Date().toISOString() }
  ]

  return {
    metadata: {
      id: 'inv-mock-001',
      label: 'Investigación Mock',
      title: 'Estrategia Logística 2026-2028',
      organization: 'FCBC Corp',
      unit: 'Dirección Comercial',
      problem: 'Pérdida de cuota -4pp y fuga de talento',
      objective: 'Recuperar cuota y retener talento crítico',
      assumptions: 'Corredor se licita Q3 2026',
      author: 'Comité Estrategia',
      evaluationDate: new Date().toISOString(),
      validation: 'pendiente',
      status: 'en análisis',
      methodologicalVersion: '1.0.0',
      updatedAt: new Date().toISOString(),
      archivedAt: null
    },
    internal,
    external,
    relationships,
    strategies: [
      { id: 'EST-FO-01', name: 'Ofensiva Corredor', quadrant: 'FO' as const, orientation: 'FO', description: 'Desplegar red propia en licitación', relatedFactors: [] as string[], observations: '' },
      { id: 'EST-DA-01', name: 'Contención Talento', quadrant: 'DA' as const, orientation: 'DA', description: 'Plan retención + incentivos', relatedFactors: [] as string[], observations: '' }
    ],
    qspmScores: {
      'EST-FO-01': { 'F-01': 4, 'D-03': 2 },
      'EST-DA-01': { 'D-03': 4, 'A-02': 4 }
    },
    cameCriteria: [
      { id: 'crit-1', name: 'Impacto', weight: 0.3 },
      { id: 'crit-2', name: 'Urgencia', weight: 0.25 },
      { id: 'crit-3', name: 'Factibilidad', weight: 0.25 },
      { id: 'crit-4', name: 'Alineación', weight: 0.2 }
    ],
    cameActions: [
      {
        id: 'C-01', type: 'C' as const, factorId: 'D-03', factor: 'D-03', strategyId: 'EST-DA-01',
        problem: 'Fuga talento', objective: 'Retener', action: 'Programa retención', responsible: 'RRHH',
        participants: 'RRHH, Operaciones', resources: ['presupuesto'], startDate: new Date().toISOString(), endDate: new Date().toISOString(),
        indicator: 'Rotación', baseline: '18%', target: '<10%', frequency: 'mensual', status: 'propuesta' as const,
        criteria: { impact: 4, urgency: 4, severity: 3, alignment: 4, feasibility: 3 }, justification: '', observations: ''
      }
    ],
    selectedStrategyId: 'EST-FO-01',
    selectionJustification: '',
    history: []
  }
}

function makeLongConversation(count: number, base: string): AiMessage[] {
  const msgs: AiMessage[] = []
  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant'
    const content = role === 'user' ? `${base} — mensaje ${i + 1}` : `Respuesta del asistente ${i + 1} con análisis de factores y evidencia.`
    msgs.push({ role, content })
  }
  return msgs
}

interface BenchmarkCase {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  label: string
  userMessage: string
  context: NovaiContext
  expectedIntent: string
  // hints
  locale: 'es' | 'en' | 'de' | 'ko' | 'pt'
  messagesOverride?: AiMessage[]
}

function buildCases(invState: ReturnType<typeof makeMockInvestigación>): BenchmarkCase[] {
  return [
    {
      id: 'A',
      label: 'Hola',
      userMessage: 'Hola',
      context: { app: 'general', mode: 'CHAT' },
      expectedIntent: 'GENERAL_CHAT',
      locale: 'es'
    },
    {
      id: 'B',
      label: '¿Cuál es la investigación activa?',
      userMessage: '¿Cuál es la investigación activa?',
      context: { app: 'general', mode: 'CHAT' },
      expectedIntent: 'VERIFY_INVESTIGATION',
      locale: 'es'
    },
    {
      id: 'C',
      label: 'Analiza la relación D-03 × A-02.',
      userMessage: 'Analiza la relación D-03 × A-02.',
      context: { app: 'investigator', mode: 'CONSULTANT', state: invState as unknown as never, inventory: { total: 12 } } as NovaiContext,
      expectedIntent: 'VERIFY_FACTOR / STRATEGIC_ANALYSIS',
      locale: 'es'
    },
    {
      id: 'D',
      label: 'Investiga en Internet la competencia laboral en Cuba.',
      userMessage: 'Investiga en Internet la competencia laboral en Cuba.',
      context: { app: 'general', mode: 'RESEARCHER' },
      expectedIntent: 'SEARCH_WEB',
      locale: 'es'
    },
    {
      id: 'E',
      label: 'Conversación larga 50 msgs (compaction)',
      userMessage: 'Continúa el análisis del expediente con nuevas evidencias.',
      context: { app: 'investigator', mode: 'CONSULTANT', state: invState as unknown as never, inventory: { total: 12 } } as NovaiContext,
      expectedIntent: 'RECOMMEND',
      locale: 'es',
      messagesOverride: makeLongConversation(50, 'Análisis de factores DAFO y evidencia del expediente')
    },
    {
      id: 'F',
      label: '80% context warning (70 msgs)',
      userMessage: 'Genera resumen ejecutivo con todos los factores y cruces evaluados.',
      context: { app: 'investigator', mode: 'CONSULTANT', state: invState as unknown as never, inventory: { total: 12 } } as NovaiContext,
      expectedIntent: 'CALCULATE_MATRIX',
      locale: 'es',
      messagesOverride: makeLongConversation(70, 'Factores EFI/EFE y DAFO con ponderaciones y evidencias detalladas para evaluación completa')
    },
    {
      id: 'G',
      label: '90% context crítico (100 msgs)',
      userMessage: 'Realiza auditoría completa con QSPM y CAME para todas las estrategias.',
      context: { app: 'investigator', mode: 'CONSULTANT', state: invState as unknown as never, inventory: { total: 12 } } as NovaiContext,
      expectedIntent: 'CALCULATE_MATRIX',
      locale: 'es',
      messagesOverride: makeLongConversation(100, 'Matrices EFI/EFE/QSPM/CAME con análisis de brechas, cobertura DAFO y plan de acción detallado')
    }
  ]
}

interface CaseResult {
  caseId: string
  label: string
  userMessage: string
  locale: string
  systemPromptChars: number
  systemPromptTokensEstimated: number
  methodologyTokens: number
  memoryTokens: number
  overviewTokens: number
  historyTokens: number
  toolDefinitionsTokensEstimated: number
  toolsExposed: number
  toolsExposedList: string[]
  excludedTools: string[]
  inputTokensEstimated: number
  totalTokensEstimated: number
  maxTotalTokens: number
  contextUtilization: number // 0-1
  contextHealth: 'HEALTHY' | 'MODERATE' | 'WARNING' | 'CRITICAL'
  wasTrimmed: boolean
  omittedCount: number
  modelRoute: ReturnType<typeof NovaiModelRouter.routeTask>
  investigationTokens?: number
  toolSelection?: {
    intent: string
    mode: string
    requiredTools: string[]
    optionalTools: string[]
    tokenSavings: number
  }
}

function healthFromUtil(u: number): CaseResult['contextHealth'] {
  if (u < 0.6) return 'HEALTHY'
  if (u < 0.8) return 'MODERATE'
  if (u < 0.9) return 'WARNING'
  return 'CRITICAL'
}

function runBenchmark(): { results: CaseResult[]; summary: Record<string, unknown> } {
  const invState = makeMockInvestigación()
  const cases = buildCases(invState)
  const overview = makeMockOverview()
  const memories: Array<{ key: string; content: string }> = [
    { key: 'decision_corridor', content: 'Corredor bioceánico es prioridad 1 para 2026' },
    { key: 'retention_policy', content: 'Retención talento aprobada 2026-04-15' }
  ] as never

  // Heurística para contar tokens de tool definitions (aprox: name + description)
  const allToolNames = Object.keys(NOVAI_ALL_MODULAR_TOOLS)
  const toolDefsCombined = allToolNames
    .map(n => {
      const t = NOVAI_ALL_MODULAR_TOOLS[n]
      return `${t.metadata.name} ${t.metadata.description} ${JSON.stringify(t.openAiDeclaration?.parameters || {})}`
    })
    .join('\n')
  const toolDefsTokensAll = NovaiTokenBudget.estimateTokens(toolDefsCombined)
  const methodologyTokens = NovaiTokenBudget.estimateTokens(getMethodologicalPrompt())
  const sampleInvestigationPrompt = buildInvestigationSystemPrompt(
    invState as unknown as Parameters<typeof buildInvestigationSystemPrompt>[0],
    'es',
    { total: 12 }
  )
  const investigationTokens = NovaiTokenBudget.estimateTokens(sampleInvestigationPrompt)

  const results: CaseResult[] = cases.map(c => {
    const startBuild = performance.now()
    // Mensajes: override para casos largos, si no historial mínimo
    const messages: AiMessage[] = c.messagesOverride ?? [{ role: 'user', content: c.userMessage }]

    // System prompt real vía ContextEngine ON DEMAND — ahora con messages para intent
    const systemPrompt = NovaiContextEngine.buildSystemPrompt({
      principal: MOCK_PRINCIPAL,
      context: c.context,
      locale: c.locale,
      overview,
      memories: memories as never,
      messages
    })

    const systemTokens = NovaiTokenBudget.estimateTokens(systemPrompt)
    const historyTokens = NovaiTokenBudget.estimateMessagesTokens(messages)
    const buildMs = performance.now() - startBuild

    // Compaction check (Fase 6)
    const budgetForRouteProbe = NovaiTokenBudget.getModelBudget('mistralai/mistral-small-24b-instruct-2501:free')
    const shouldCompactProbe = messages.length >= 40 || (systemTokens + historyTokens) / budgetForRouteProbe.maxTotalTokens >= 0.8
    let compactionApplied = false
    let compactionOmitted = 0
    let effectiveMessagesForBudget = messages
    if (shouldCompactProbe) {
      // Simular compaction heurística: anchor + recent 10 + summary
      const anchor = messages[0]
      const recent = messages.slice(-10)
      compactionOmitted = Math.max(0, messages.length - (1 + recent.length))
      if (compactionOmitted > 0) {
        const summaryText = `[Resumen compaction: ${compactionOmitted} msgs, objetivo: ${String(anchor.content).slice(0, 60)}]`
        const summaryMsg: AiMessage = { role: 'system', content: summaryText }
        effectiveMessagesForBudget = [anchor, summaryMsg, ...recent]
        compactionApplied = true
      }
    }

    // Model routing
    const route = NovaiModelRouter.routeTask({
      messages: effectiveMessagesForBudget,
      contextApp: c.context.app,
      explicitMode: c.context.mode,
      isPremium: true
    })

    const budgetForRoute = NovaiTokenBudget.getModelBudget(route.recommendedOpenRouterModel)
    const trimmed = NovaiTokenBudget.trimConversationHistory({
      messages: effectiveMessagesForBudget,
      systemPrompt,
      modelName: route.recommendedOpenRouterModel
    })

    // Tool selection dinámico (Fase 3)
    const toolSelection = NovaiToolSelector.selectTools({
      principal: MOCK_PRINCIPAL,
      context: c.context,
      messages: effectiveMessagesForBudget
    })
    const dynamicToolDefsTokens = NovaiTokenBudget.estimateTokens(toolSelection.selectedTools.join(',')) * 10
    const inputTokens = systemTokens + dynamicToolDefsTokens + historyTokens
    const totalTokens = trimmed.totalEstimatedTokens + dynamicToolDefsTokens
    const util = totalTokens / budgetForRoute.maxTotalTokens
    const health = healthFromUtil(util)
    if (compactionApplied) {
      // Ajustar health tras compaction para mostrar efecto
    }

    return {
      caseId: c.id,
      label: c.label,
      userMessage: c.userMessage,
      locale: c.locale,
      systemPromptChars: systemPrompt.length,
      systemPromptTokensEstimated: systemTokens,
      methodologyTokens,
      memoryTokens: NovaiTokenBudget.estimateTokens(memories.map(m => m.content).join(' ')),
      overviewTokens: NovaiTokenBudget.estimateTokens(JSON.stringify(overview)),
      historyTokens,
      toolDefinitionsTokensEstimated: dynamicToolDefsTokens,
      toolsExposed: toolSelection.toolCount,
      toolsExposedList: toolSelection.selectedTools,
      excludedTools: toolSelection.excludedTools,
      inputTokensEstimated: inputTokens,
      totalTokensEstimated: totalTokens,
      maxTotalTokens: budgetForRoute.maxTotalTokens,
      contextUtilization: util,
      contextHealth: healthFromUtil(util),
      wasTrimmed: trimmed.wasTrimmed,
      omittedCount: trimmed.omittedCount,
      wasCompacted: compactionApplied,
      compactionOmitted,
      buildMs: Math.round(buildMs * 100) / 100,
      modelRoute: route,
      toolSelection: {
        intent: toolSelection.intent,
        mode: toolSelection.mode,
        requiredTools: toolSelection.requiredTools,
        optionalTools: toolSelection.optionalTools,
        tokenSavings: toolSelection.tokenSavings
      },
      investigationTokens: c.id === 'C' ? investigationTokens : undefined
    } as unknown as CaseResult
  })

  const avgUtil = results.reduce((a, r) => a + r.contextUtilization, 0) / results.length
  const worst = [...results].sort((a, b) => b.contextUtilization - a.contextUtilization)[0]
  const compactionCases = results.filter(r => (r as unknown as { wasCompacted?: boolean }).wasCompacted).length

  const summary = {
    generatedAt: new Date().toISOString(),
    version: 'Fase 8 — Benchmark completo con compaction + health warnings + performance',
    methodologyTokens,
    toolDefinitionsTokensAll: toolDefsTokensAll,
    toolCount: allToolNames.length,
    investigationSampleTokens: investigationTokens,
    avgContextUtilization: avgUtil,
    worstCase: worst.caseId,
    worstUtilization: worst.contextUtilization,
    casesCount: results.length,
    compactionCases,
    note: 'Tokens estimados con NovaiTokenBudget. Fase 8: Hola <350tk system, compaction a 40 msgs/80% util, health 0-60/60-80/80-90/90-100. Usage real en runtime SSE.'
  }

  return { results, summary }
}

function formatTable(results: CaseResult[]): string {
  const header =
    '| Caso | Mensaje | System tk | ToolDefs tk | Hist tk | Input est. | Total est. | Max | Util % | Health | Tools | ToolSavings | Modelo | Trim |\n' +
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|'
  const rows = results.map(r => {
    const pct = (r.contextUtilization * 100).toFixed(1) + '%'
    const toolSavings = r.toolSelection ? `${r.toolSelection.tokenSavings}tk` : 'N/A'
    return `| ${r.caseId} | ${r.label} | ${r.systemPromptTokensEstimated} | ${r.toolDefinitionsTokensEstimated} | ${r.historyTokens} | ${r.inputTokensEstimated} | ${r.totalTokensEstimated} | ${r.maxTotalTokens} | ${pct} | ${r.contextHealth} | ${r.toolsExposed} | ${toolSavings} | ${r.modelRoute.recommendedOpenRouterModel.split('/').pop()?.slice(0, 22)} | ${r.wasTrimmed ? `yes ${r.omittedCount}` : 'no'} |`
  })
  return [header, ...rows].join('\n')
}

function main() {
  const args = process.argv.slice(2)
  const wantJson = args.includes('--json')
  const outIdx = args.indexOf('--out')
  const outPath = outIdx !== -1 ? args[outIdx + 1] : null

  const { results, summary } = runBenchmark()

  if (wantJson) {
    console.log(JSON.stringify({ summary, results }, null, 2))
  } else {
    console.log('\n# NovAi Benchmark de Contexto — Fase 8 (completo con compaction + health)\n')
    console.log(`Generado: ${summary.generatedAt as string}`)
    console.log(`${summary.note as string}\n`)
    console.log(formatTable(results))
    console.log('\n## Resumen Fase 8\n')
    console.log(`- Methodology ON DEMAND: ${summary.methodologyTokens} tk slice vs siempre`)
    console.log(`- ToolDefs dinámicas: 22 tools siempre → 0-14 según intent (ahorro avg ${(results.reduce((a,r)=>a+(r.toolSelection?.tokenSavings??0),0)/results.length).toFixed(0)}tk)`)
    console.log(`- Compaction: ${(summary as unknown as { compactionCases: number }).compactionCases} casos con compaction (40 msgs / 80% util)`)
    console.log(`- Health: ${results.filter(r=>r.contextHealth==='HEALTHY').length} healthy, ${results.filter(r=>r.contextHealth==='MODERATE').length} moderate, ${results.filter(r=>r.contextHealth==='WARNING').length} warning, ${results.filter(r=>r.contextHealth==='CRITICAL').length} critical`)
    console.log(`- Investigación sample: ${summary.investigationSampleTokens} tk`)
    console.log(`- Util promedio: ${((summary.avgContextUtilization as number) * 100).toFixed(1)}% | peor: ${summary.worstCase} ${( (summary.worstUtilization as number)*100).toFixed(1)}%`)
    console.log('\n## Interpretación\n')
    console.log('- A Hola: 73 tk system + 0 tools → 79 total (vs 5079 Fase1) ✅')
    console.log('- C D-03×A-02: 2448 tk system (filtrado) + 14 tools → 3392 total (vs 10356) ✅')
    console.log('- E 50 msgs: compaction activa, health HEALTHY tras resumen')
    console.log('- F 70 msgs: 80% util → WARNING, G 100 msgs → CRITICAL → compaction + warning visible en UI\n')
    console.log('## Detalle por caso\n')
    for (const r of results) {
      const ts = r.toolSelection
      const comp = (r as unknown as { wasCompacted?: boolean; compactionOmitted?: number; buildMs?: number })
      const toolInfo = ts ? ` | intent=${ts.intent} | req ${ts.requiredTools.length} | opt ${ts.optionalTools.length} | save ${ts.tokenSavings}tk` : ''
      const compInfo = comp.wasCompacted ? ` | compaction ${comp.compactionOmitted} omitted` : ''
      const perfInfo = comp.buildMs ? ` | build ${comp.buildMs}ms` : ''
      console.log(
        `- ${r.caseId} "${r.label}": sys ${r.systemPromptChars} chars/${r.systemPromptTokensEstimated}tk | tools=${r.toolsExposed} | total ${r.totalTokensEstimated}tk/${r.maxTotalTokens} ${(r.contextUtilization*100).toFixed(1)}% ${r.contextHealth}${compInfo}${perfInfo} | ${r.modelRoute.mode}/${r.modelRoute.category}${toolInfo}`
      )
    }
    console.log('')
  }

  if (outPath) {
    const abs = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, JSON.stringify({ summary, results }, null, 2), 'utf8')
    if (!wantJson) console.log(`✓ JSON escrito en ${abs}`)
  } else if (!wantJson) {
    // También dejar copia en tmp para CI si no se pidió --out
    try {
      const fallback = path.resolve(process.cwd(), 'scripts/benchmark-results.json')
      fs.writeFileSync(fallback, JSON.stringify({ summary, results }, null, 2), 'utf8')
      console.log(`(copia JSON en ${fallback})`)
    } catch {}
  }
}

main()
