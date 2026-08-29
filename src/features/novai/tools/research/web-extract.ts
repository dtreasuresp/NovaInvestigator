import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { logger } from '@/lib/logger'
import type { NovaiModularTool, ToolExecutionResult } from '../types'
import { NovaiEvidenceRepository } from '../../evidence-repository'

export const webExtractSchema = z.object({
  urls: z
    .array(z.string().url('Debe ser una URL válida (ej: https://example.com/articulo)'))
    .min(1, 'Especifique al menos una URL')
    .max(3, 'Máximo 3 URLs por extracción')
    .describe('Lista de 1 a 3 URLs de las cuales extraer el contenido completo y limpio en markdown para análisis profundo.'),
  query_context: z
    .string()
    .optional()
    .describe('Pregunta o hipótesis específica para enfocar la lectura en los puntos de interés.'),
  investigation_id: z
    .string()
    .optional()
    .describe('ID opcional de investigación para anclar la trazabilidad.')
})

export type WebExtractInput = z.infer<typeof webExtractSchema>

export interface ExtractedPage {
  source: 'EXTERNAL_EVIDENCE'
  url: string
  title: string
  content: string
  rawContentLength: number
  isTruncated: boolean
  publishedDate?: string | null
  retrievedAt: string
  provider: 'tavily'
}

const EXTRACT_TIMEOUT_MS = 10000
const MAX_CONTENT_CHARS_PER_PAGE = 6000 // ~1.500 tokens por página para proteger el context budget

async function callTavilyExtract(urls: string[], apiKey: string): Promise<ExtractedPage[]> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        urls,
        include_images: false,
        extract_depth: 'basic'
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Tavily Extract ${res.status}: ${txt.slice(0, 300)}`)
    }

    const json = (await res.json()) as {
      results?: Array<{ url?: string; raw_content?: string; title?: string; published_date?: string }>
      failed_results?: Array<{ url?: string; error?: string }>
    }

    const now = new Date().toISOString()
    const extracted: ExtractedPage[] = []

    for (const item of json.results || []) {
      const rawText = String(item.raw_content || '').trim()
      const rawLength = rawText.length
      const isTruncated = rawLength > MAX_CONTENT_CHARS_PER_PAGE

      const trimmedContent = isTruncated
        ? rawText.slice(0, MAX_CONTENT_CHARS_PER_PAGE) + '\n\n[... contenido restante truncado para optimización del presupuesto de tokens ...]'
        : rawText

      extracted.push({
        source: 'EXTERNAL_EVIDENCE',
        url: String(item.url || ''),
        title: String(item.title || item.url || 'Documento Web Extraído'),
        content: trimmedContent || 'No se pudo extraer texto legible de la página.',
        rawContentLength: rawLength,
        isTruncated,
        publishedDate: item.published_date || null,
        retrievedAt: now,
        provider: 'tavily'
      })
    }

    return extracted
  } finally {
    clearTimeout(tid)
  }
}

export async function executeWebExtract(
  args: WebExtractInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  const urls = Array.isArray(args.urls) ? args.urls.filter(u => typeof u === 'string' && u.startsWith('http')) : []

  if (urls.length === 0) {
    return { toolName: 'web_extract', success: false, error: 'Debe especificar al menos una URL válida para extraer.' }
  }

  const tavilyKey = process.env.TAVILY_API_KEY?.trim() || ''

  if (!tavilyKey) {
    logger.info('web_extract degraded — no TAVILY_API_KEY configured', {
      action: 'novai.web_extract.degraded',
      details: { tenantId: principal.tenantId, userId: principal.userId, urlCount: urls.length }
    })

    return {
      toolName: 'web_extract',
      success: true,
      result: {
        status: 'EXTERNAL_RESEARCH_DISABLED',
        providerUsed: null,
        message: 'Extracción web deshabilitada: configure TAVILY_API_KEY para habilitar lectura profunda de URLs.',
        source: 'EXTERNAL_EVIDENCE',
        results: [],
        retrievedAt: new Date().toISOString()
      }
    }
  }

  try {
    const extractedPages = await callTavilyExtract(urls, tavilyKey)

    logger.info('web_extract executed', {
      action: 'novai.web_extract.executed',
      details: {
        tenantId: principal.tenantId,
        userId: principal.userId,
        urlCount: urls.length,
        extractedCount: extractedPages.length
      }
    })

    // Persistencia opcional en novai_evidence cuando se provee investigation_id
    if (args.investigation_id && principal.client && extractedPages.length > 0) {
      await NovaiEvidenceRepository.batchCreateEvidence(
        principal.client,
        principal.tenantId,
        extractedPages.map(p => ({
          tenantId: principal.tenantId,
          investigationId: args.investigation_id,
          sourceId: p.url,
          sourceType: 'web_source',
          claim: p.title,
          excerpt: p.content.slice(0, 1000),
          location: p.url,
          confidence: 1.0,
          epistemic: 'FACT',
          retrievedAt: p.retrievedAt
        }))
      ).catch(err => {
        logger.warn('Failed to persist web_extract evidence', {
          action: 'novai.web_extract.persist_error',
          details: { error: err instanceof Error ? err.message : String(err) }
        })
      })
    }

    return {
      toolName: 'web_extract',
      success: true,
      result: {
        status: 'EXTERNAL_EVIDENCE',
        providerUsed: 'tavily',
        source: 'EXTERNAL_EVIDENCE',
        results: extractedPages,
        totalExtracted: extractedPages.length,
        retrievedAt: new Date().toISOString(),
        note: 'Contenido completo extraído para verificación profunda. No invente datos ausentes en el texto extraído.'
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isTimeout = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')

    logger.warn('web_extract provider error', {
      action: 'novai.web_extract.provider_error',
      details: { tenantId: principal.tenantId, error: msg.slice(0, 500) }
    })

    return {
      toolName: 'web_extract',
      success: true,
      result: {
        status: isTimeout ? 'EXTERNAL_RESEARCH_TIMEOUT' : 'EXTERNAL_RESEARCH_ERROR',
        providerUsed: null,
        source: 'EXTERNAL_EVIDENCE',
        results: [],
        error: msg.slice(0, 500),
        retrievedAt: new Date().toISOString(),
        message: isTimeout
          ? `Extracción web expiró tras ${EXTRACT_TIMEOUT_MS}ms — reintente con menos URLs.`
          : `Extracción web falló: ${msg.slice(0, 200)}`
      }
    }
  }
}

export const webExtractTool: NovaiModularTool = {
  metadata: {
    name: 'web_extract',
    displayName: 'Extracción Profunda de URLs',
    description:
      'Extrae el contenido completo y limpio en formato markdown de 1 a 3 URLs externas para análisis profundo, verificación de hipótesis y citas precisas sin depender de simples snippets.',
    category: 'platform',
    riskLevel: 'read-only',
    scope: 'tenant'
  },
  schema: webExtractSchema,
  execute: executeWebExtract,
  openAiDeclaration: {
    name: 'web_extract',
    description:
      'Extrae el contenido completo y limpio en formato markdown de 1 a 3 URLs externas para análisis profundo y citas fundamentadas.',
    parameters: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de 1 a 3 URLs a extraer.'
        },
        query_context: {
          type: 'string',
          description: 'Contexto o pregunta específica para enfocar la lectura.'
        },
        investigation_id: {
          type: 'string',
          description: 'ID opcional de investigación.'
        }
      },
      required: ['urls']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Extrae el contenido completo en markdown de 1 a 3 URLs externas para análisis profundo y citas fundamentadas. Requiere TAVILY_API_KEY.',
      inputSchema: webExtractSchema,
      execute: async (args: WebExtractInput) => {
        const res = await executeWebExtract(args, principal)
        if (!res.success) throw new Error(res.error || 'web_extract failed')
        return res.result
      }
    })
}
