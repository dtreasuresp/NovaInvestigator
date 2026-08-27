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

interface BenchmarkCase {
  id: 'A' | 'B' | 'C' | 'D'
  label: string
  userMessage: string
  context: NovaiContext
  expectedIntent: string
  // hints
  locale: 'es' | 'en' | 'de' | 'ko' | 'pt'
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
  inputTokensEstimated: number
  totalTokensEstimated: number
  maxTotalTokens: number
  contextUtilization: number // 0-1
  contextHealth: 'HEALTHY' | 'MODERATE' | 'WARNING' | 'CRITICAL'
  wasTrimmed: boolean
  omittedCount: number
  modelRoute: ReturnType<typeof NovaiModelRouter.routeTask>
  investigationTokens?: number
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
    // Construir mensajes para este caso (historial mínimo: solo el mensaje del usuario)
    const messages: AiMessage[] = [{ role: 'user', content: c.userMessage }]

    // System prompt real vía ContextEngine (mismo que agent-runtime)
    const systemPrompt = NovaiContextEngine.buildSystemPrompt({
      principal: MOCK_PRINCIPAL,
      context: c.context,
      locale: c.locale,
      overview,
      memories: memories as never
    })

    const systemTokens = NovaiTokenBudget.estimateTokens(systemPrompt)
    const historyTokens = NovaiTokenBudget.estimateMessagesTokens(messages)

    // Model routing
    const route = NovaiModelRouter.routeTask({
      messages,
      contextApp: c.context.app,
      explicitMode: c.context.mode,
      isPremium: true
    })

    const budgetForRoute = NovaiTokenBudget.getModelBudget(route.recommendedOpenRouterModel)
    const trimmed = NovaiTokenBudget.trimConversationHistory({
      messages,
      systemPrompt,
      modelName: route.recommendedOpenRouterModel
    })

    // Tools expuestos: hoy siempre 22 (Fase 1 baseline). Fase 3 lo hará dinámico.
    const toolsExposed = allToolNames.length
    const inputTokens = systemTokens + toolDefsTokensAll + historyTokens
    const totalTokens = trimmed.totalEstimatedTokens + toolDefsTokensAll
    const util = totalTokens / budgetForRoute.maxTotalTokens

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
      toolDefinitionsTokensEstimated: toolDefsTokensAll,
      toolsExposed,
      toolsExposedList: allToolNames,
      inputTokensEstimated: inputTokens,
      totalTokensEstimated: totalTokens,
      maxTotalTokens: budgetForRoute.maxTotalTokens,
      contextUtilization: util,
      contextHealth: healthFromUtil(util),
      wasTrimmed: trimmed.wasTrimmed,
      omittedCount: trimmed.omittedCount,
      modelRoute: route,
      investigationTokens: c.id === 'C' ? investigationTokens : undefined
    }
  })

  const avgUtil = results.reduce((a, r) => a + r.contextUtilization, 0) / results.length
  const worst = [...results].sort((a, b) => b.contextUtilization - a.contextUtilization)[0]

  const summary = {
    generatedAt: new Date().toISOString(),
    version: 'Fase 1 baseline (antes de Context Manager / Dynamic Tools)',
    methodologyTokens,
    toolDefinitionsTokensAll: toolDefsTokensAll,
    toolCount: allToolNames.length,
    investigationSampleTokens: investigationTokens,
    avgContextUtilization: avgUtil,
    worstCase: worst.caseId,
    worstUtilization: worst.contextUtilization,
    casesCount: results.length,
    note: 'Todos los tokens son estimados con NovaiTokenBudget.estimateTokens (max len/3.2, words*1.35). Usage real se captura en runtime SSE y se persiste en novai_agent_runs.'
  }

  return { results, summary }
}

function formatTable(results: CaseResult[]): string {
  const header =
    '| Caso | Mensaje | System tk | ToolDefs tk | Hist tk | Input est. | Total est. | Max | Util % | Health | Tools | Modelo | Trim |\n' +
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|'
  const rows = results.map(r => {
    const pct = (r.contextUtilization * 100).toFixed(1) + '%'
    return `| ${r.caseId} | ${r.label} | ${r.systemPromptTokensEstimated} | ${r.toolDefinitionsTokensEstimated} | ${r.historyTokens} | ${r.inputTokensEstimated} | ${r.totalTokensEstimated} | ${r.maxTotalTokens} | ${pct} | ${r.contextHealth} | ${r.toolsExposed} | ${r.modelRoute.recommendedOpenRouterModel.split('/').pop()?.slice(0, 22)} | ${r.wasTrimmed ? `yes ${r.omittedCount}` : 'no'} |`
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
    console.log('\n# NovAi Benchmark de Contexto — Fase 1 (baseline)\n')
    console.log(`Generado: ${summary.generatedAt as string}`)
    console.log(`${summary.note as string}\n`)
    console.log(formatTable(results))
    console.log('\n## Resumen\n')
    console.log(`- Methodology slice: ${summary.methodologyTokens} tk (inyectado SIEMPRE en Fase 1)`)
    console.log(`- Tool definitions (22 tools): ${summary.toolDefinitionsTokensAll} tk (expuestas SIEMPRE en Fase 1)`)
    console.log(`- Investigación sample (8F+8E): ${summary.investigationSampleTokens} tk (solo caso C)`)
    console.log(`- Utilización promedio: ${((summary.avgContextUtilization as number) * 100).toFixed(1)}%`)
    console.log(`- Peor caso: ${summary.worstCase} con ${((summary.worstUtilization as number) * 100).toFixed(1)}%`)
    console.log('\n## Interpretación Fase 1\n')
    console.log('- Caso A "Hola" debería estar <350 tk system; hoy paga ~1k+ metodología + 22 tools → objetivo Fase 2: -85%')
    console.log('- Caso C "D-03×A-02" paga investigación completa + metodología + 22 tools → objetivo Fase 2: slice selectivo + tools dinámicas')
    console.log('- Fase 2 (Context Manager) y Fase 3 (Dynamic Tools) medirán de nuevo con este mismo script para validar ganancia real.\n')
    console.log('## Detalle por caso (JSON resumido)\n')
    for (const r of results) {
      console.log(
        `- ${r.caseId} "${r.label}": system ${r.systemPromptChars} chars / ${r.systemPromptTokensEstimated} tk | tools ${r.toolsExposed} | input ${r.inputTokensEstimated} tk | util ${(r.contextUtilization * 100).toFixed(1)}% ${r.contextHealth} | model ${r.modelRoute.mode}/${r.modelRoute.category} → ${r.modelRoute.recommendedOpenRouterModel}`
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
