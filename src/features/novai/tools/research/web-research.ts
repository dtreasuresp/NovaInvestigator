import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { logger } from '@/lib/logger'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const webResearchSchema = z.object({
  query: z.string().min(1).describe('Consulta o hipótesis a verificar con fuentes externas públicas (ej: "mercado logístico bioceánico 2026", "competencia portuaria tarifas").'),
  top_k: z.number().int().min(1).max(10).optional().default(5).describe('Número máximo de fuentes externas a recuperar (1-10, default 5).'),
  investigation_id: z.string().optional().describe('ID opcional de investigación para anclar trazabilidad del tenant (no afecta búsqueda externa).')
})

export type WebResearchInput = z.infer<typeof webResearchSchema>

interface ExternalSource {
  source: 'EXTERNAL_EVIDENCE'
  title: string
  url: string
  snippet: string
  publicationDate?: string | null
  retrievedAt: string
  provider: 'tavily' | 'brave' | 'serper'
  relevanceScore?: number | null // Tavily/Brave ranking — NO es credibility (§7)
  // @deprecated — alias para compatibilidad, no usar como credibilidad
  credibilityScore?: number | null
  score?: number | null
}

const FETCH_TIMEOUT_MS = 8000

async function callTavily(query: string, topK: number, apiKey: string): Promise<ExternalSource[]> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: topK,
        include_answer: false,
        include_raw_content: false
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Tavily ${res.status}: ${txt.slice(0, 300)}`)
    }

    const json = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string; score?: number; published_date?: string }>
      answer?: string
    }

    const now = new Date().toISOString()

    return (json.results || []).slice(0, topK).map(r => ({
      source: 'EXTERNAL_EVIDENCE' as const,
      title: String(r.title || 'Fuente externa'),
      url: String(r.url || ''),
      snippet: String(r.content || '').slice(0, 600),
      publicationDate: r.published_date || null,
      retrievedAt: now,
      provider: 'tavily' as const,
      relevanceScore: typeof r.score === 'number' ? r.score : null,
      credibilityScore: typeof r.score === 'number' ? r.score : null, // deprecated alias, NO es credibilidad (§7)
      score: typeof r.score === 'number' ? r.score : null
    }))
  } finally {
    clearTimeout(tid)
  }
}

async function callBrave(query: string, topK: number, apiKey: string): Promise<ExternalSource[]> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${topK}&text_decorations=false&spellcheck=false`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey
      },
      signal: controller.signal
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Brave ${res.status}: ${txt.slice(0, 300)}`)
    }

    const json = (await res.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string; age?: string; extra_snippets?: string[] }> }
      results?: Array<{ title?: string; url?: string; description?: string }>
    }

    const raw = json.web?.results || (json as unknown as { results?: unknown[] }).results as Array<Record<string, unknown>> | undefined || []
    const now = new Date().toISOString()

    return (raw as Array<{ title?: string; url?: string; description?: string; age?: string }>).slice(0, topK).map(r => ({
      source: 'EXTERNAL_EVIDENCE' as const,
      title: String(r.title || 'Fuente externa'),
      url: String(r.url || ''),
      snippet: String(r.description || '').slice(0, 600),
      publicationDate: (r.age as string) || null,
      retrievedAt: now,
      provider: 'brave' as const,
      credibilityScore: null,
      score: null
    }))
  } finally {
    clearTimeout(tid)
  }
}

export async function executeWebResearch(
  args: WebResearchInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  const query = String(args.query || '').trim()
  const topK = Math.min(10, Math.max(1, Number(args.top_k ?? 5) || 5))

  if (!query) {
    return { toolName: 'web_research', success: false, error: 'query es requerido' }
  }

  // Resolución de proveedor externo — degradación explícita si no hay keys (§23, §29)
  const tavilyKey = process.env.TAVILY_API_KEY?.trim() || ''
  const braveKey = (process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || '').trim()
  const serperKey = process.env.SERPER_API_KEY?.trim() || ''

  // Preferencia: Tavily > Brave > Serper (no implementado aún)
  const hasExternalProvider = Boolean(tavilyKey || braveKey)

  if (!hasExternalProvider) {
    // No inventar datos — retornar degradación trazable que el Agent debe comunicar
    logger.info('web_research degraded — no external provider configured', {
      action: 'novai.web_research.degraded',
      details: { tenantId: principal.tenantId, userId: principal.userId, queryLength: query.length }
    })

    return {
      toolName: 'web_research',
      success: true,
      result: {
        query,
        status: 'EXTERNAL_RESEARCH_DISABLED',
        providerUsed: null,
        message: 'Búsqueda externa deshabilitada: configure TAVILY_API_KEY o BRAVE_SEARCH_API_KEY para habilitar EXTERNAL_EVIDENCE. No se mezcló evidencia interna.',
        source: 'EXTERNAL_EVIDENCE',
        results: [],
        retrievedAt: new Date().toISOString(),
        internalEvidenceNote: 'La evidencia interna debe consultarse con search_evidence / get_factor_evidence (INTERNAL_EVIDENCE).'
      }
    }
  }

  // Tenant isolation: la búsqueda externa no accede a datos del tenant,
  // pero auditamos tenantId para trazabilidad multi-tenant (§38)
  try {
    let externalResults: ExternalSource[] = []
    let providerUsed: 'tavily' | 'brave' = tavilyKey ? 'tavily' : 'brave'

    if (tavilyKey) {
      try {
        externalResults = await callTavily(query, topK, tavilyKey)
      } catch (tavilyErr) {
        logger.warn('Tavily failed, falling back to Brave if available', {
          action: 'novai.web_research.tavily_fallback',
          details: { tenantId: principal.tenantId, error: tavilyErr instanceof Error ? tavilyErr.message : String(tavilyErr) }
        })

        if (braveKey) {
          providerUsed = 'brave'
          externalResults = await callBrave(query, topK, braveKey)
        } else {
          throw tavilyErr
        }
      }
    } else if (braveKey) {
      externalResults = await callBrave(query, topK, braveKey)
    } else if (serperKey) {
      // Placeholder para futura extensión Serper — degradación explícita por ahora
      return {
        toolName: 'web_research',
        success: true,
        result: {
          query,
          status: 'EXTERNAL_RESEARCH_DISABLED',
          providerUsed: null,
          message: 'SERPER_API_KEY configurada pero provider Serper aún no implementado. Configure TAVILY_API_KEY o BRAVE_SEARCH_API_KEY.',
          results: [],
          retrievedAt: new Date().toISOString()
        }
      }
    }

    logger.info('web_research executed', {
      action: 'novai.web_research.executed',
      details: {
        tenantId: principal.tenantId,
        userId: principal.userId,
        providerUsed,
        queryLength: query.length,
        resultsCount: externalResults.length
      }
    })

    return {
      toolName: 'web_research',
      success: true,
      result: {
        query,
        status: 'EXTERNAL_EVIDENCE',
        providerUsed,
        source: 'EXTERNAL_EVIDENCE',
        results: externalResults,
        retrievedAt: new Date().toISOString(),
        totalResults: externalResults.length,
        relevanceNote: 'Tavily/Brave score = relevance ranking, NO credibilidad (§7). Para credibilidad cualitativa, vea publicationDate, fuente y corroboración; no existe metodología cuantitativa versionada de credibilidad en el sistema.',
        credibilityNote: 'DEPRECATED: No usar score como credibilidad. Ver relevanceScore y metadata de fuente. Para métrica de credibilidad se requerirá metodología versionada con pesos y CalculationEvent.',
        internalEvidenceNote: 'Para evidencia interna del expediente use search_evidence / get_factor_evidence. Fuente externa que confirma contexto general NO valida automáticamente un factor interno (ej. "reforma existe" ≠ "D-01=1.0 validado") — requiere vínculo de evidencia explícito.'
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Timeout vs provider error — error estructurado para que el Agent no alucine
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')

    logger.warn('web_research provider error', {
      action: 'novai.web_research.provider_error',
      details: { tenantId: principal.tenantId, error: msg.slice(0, 500) }
    })

    return {
      toolName: 'web_research',
      success: true,
      result: {
        query,
        status: isTimeout ? 'EXTERNAL_RESEARCH_TIMEOUT' : 'EXTERNAL_RESEARCH_ERROR',
        providerUsed: null,
        source: 'EXTERNAL_EVIDENCE',
        results: [],
        error: msg.slice(0, 800),
        retrievedAt: new Date().toISOString(),
        message: isTimeout
          ? `Búsqueda externa expiró tras ${FETCH_TIMEOUT_MS}ms — reintente con query más específica.`
          : `Búsqueda externa falló: ${msg.slice(0, 200)}`
      }
    }
  }
}

export const webResearchTool: NovaiModularTool = {
  metadata: {
    name: 'web_research',
    displayName: 'Búsqueda Web Externa',
    description:
      'Busca fuentes públicas externas (EXTERNAL_EVIDENCE) complementarias al expediente interno. Distingue explícitamente entre INTERNAL_EVIDENCE (search_evidence) y EXTERNAL_EVIDENCE. RelevanceScore (Tavily) NO es credibilidad — no existe metodología cuantitativa versionada de credibilidad. Requiere TAVILY_API_KEY o BRAVE_SEARCH_API_KEY; si no hay keys, degrada a EXTERNAL_RESEARCH_DISABLED sin inventar datos.',
    category: 'platform',
    riskLevel: 'read-only',
    scope: 'tenant'
  },
  schema: webResearchSchema,
  execute: executeWebResearch,
  openAiDeclaration: {
    name: 'web_research',
    description:
      'Busca fuentes públicas externas (EXTERNAL_EVIDENCE) complementarias al expediente interno. Distingue explícitamente entre INTERNAL_EVIDENCE y EXTERNAL_EVIDENCE. Requiere TAVILY_API_KEY o BRAVE_SEARCH_API_KEY.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta para búsqueda externa.' },
        top_k: { type: 'number', description: 'Número de fuentes externas a recuperar (1-10).' },
        investigation_id: { type: 'string', description: 'ID opcional de investigación para trazabilidad.' }
      },
      required: ['query']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Busca fuentes públicas externas (EXTERNAL_EVIDENCE). Distingue explícitamente de INTERNAL_EVIDENCE. Requiere TAVILY_API_KEY o BRAVE_SEARCH_API_KEY.',
      inputSchema: webResearchSchema,
      execute: async (args: WebResearchInput) => {
        const res = await executeWebResearch(args, principal)
        return res.result !== undefined ? res.result : { error: res.error }
      }
    })
}
