import type { SupabaseClient } from '@supabase/supabase-js'

import { logger } from '@/lib/logger'

export type MemoryScope = 'user' | 'workspace' | 'strategic'
export type MemoryStatus = 'active' | 'archived' | 'deprecated'

export interface NovaiMemory {
  id: string
  tenantId: string
  workspaceId?: string | null
  userId?: string | null
  scope: MemoryScope
  category: string
  key: string
  content: string
  confidence: number
  status: MemoryStatus
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface NovaiMemoryRow {
  id: string
  tenant_id: string
  workspace_id: string | null
  user_id: string | null
  scope: MemoryScope
  category: string
  key: string
  content: string
  confidence: number | string
  status: MemoryStatus
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SaveMemoryParams {
  tenantId: string
  workspaceId?: string | null
  userId?: string | null
  scope: MemoryScope
  category?: string
  key: string
  content: string
  confidence?: number
  metadata?: Record<string, unknown>
}

/**
 * NovAi Memory Engine:
 * Gestiona los 4 niveles de memoria (Conversación, Usuario, Workspace y Memoria Estratégica)
 * garantizando aislamiento multi-tenant estricto.
 */
export class NovaiMemoryEngine {
  /**
   * Recupera memorias activas relevantes para inyectar en el contexto del agente.
   */
  static async getActiveMemories(
    client: SupabaseClient,
    params: {
      tenantId: string
      workspaceId?: string | null
      userId?: string | null
      scopes?: MemoryScope[]
      limit?: number
    }
  ): Promise<NovaiMemory[]> {
    const { tenantId, workspaceId, userId, scopes = ['workspace', 'strategic'], limit = 15 } = params

    try {
      let query = client
        .from('novai_memories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .in('scope', scopes)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (workspaceId) {
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        logger.warn('Error fetching active NovAi memories', {
          action: 'novai.memory.fetch',
          details: { tenantId, errorMessage: error.message }
        })

        return []
      }

      return ((data || []) as unknown as NovaiMemoryRow[]).map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        scope: row.scope,
        category: row.category,
        key: row.key,
        content: row.content,
        confidence: Number(row.confidence),
        status: row.status,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } catch (err) {
      logger.warn('Exception fetching NovAi memories', {
        action: 'novai.memory.fetch',
        details: { tenantId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return []
    }
  }

  /**
   * Registra o actualiza una memoria en el sistema.
   */
  static async recordMemory(
    client: SupabaseClient,
    params: SaveMemoryParams
  ): Promise<NovaiMemory | null> {
    const {
      tenantId,
      workspaceId,
      userId,
      scope,
      category = 'general',
      key,
      content,
      confidence = 1.0,
      metadata = {}
    } = params

    try {
      const payload = {
        tenant_id: tenantId,
        workspace_id: workspaceId || null,
        user_id: userId || null,
        scope,
        category,
        key,
        content,
        confidence,
        status: 'active',
        metadata
      }

      const { data, error } = await client
        .from('novai_memories')
        .upsert(payload, { onConflict: 'tenant_id, scope, key' })
        .select()
        .single()

      if (error) {
        logger.warn('Error saving NovAi memory', {
          action: 'novai.memory.save',
          details: { tenantId, key, errorMessage: error.message }
        })

        return null
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        workspaceId: data.workspace_id,
        userId: data.user_id,
        scope: data.scope,
        category: data.category,
        key: data.key,
        content: data.content,
        confidence: Number(data.confidence),
        status: data.status,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (err) {
      logger.warn('Exception saving NovAi memory', {
        action: 'novai.memory.save',
        details: { tenantId, key, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return null
    }
  }

  /**
   * Formatea las memorias recuperadas en un bloque de contexto estructurado.
   */
  static formatMemoriesForPrompt(memories: NovaiMemory[]): string {
    if (memories.length === 0) {
      return ''
    }

    const strategicMemories = memories.filter(m => m.scope === 'strategic')
    const workspaceMemories = memories.filter(m => m.scope === 'workspace')
    const userMemories = memories.filter(m => m.scope === 'user')

    const sections: string[] = []

    if (strategicMemories.length > 0) {
      sections.push(`• MEMORIA ESTRATÉGICA Y DECISIONES PREVIAS:
${strategicMemories.map(m => `  - [${m.key}] ${m.content} (Confianza: ${Math.round(m.confidence * 100)}%)`).join('\n')}`)
    }

    if (workspaceMemories.length > 0) {
      sections.push(`• CONTEXTO Y ACUERDOS DEL WORKSPACE:
${workspaceMemories.map(m => `  - [${m.category.toUpperCase()}] ${m.key}: ${m.content}`).join('\n')}`)
    }

    if (userMemories.length > 0) {
      sections.push(`• PREFERENCIAS DEL USUARIO:
${userMemories.map(m => `  - ${m.key}: ${m.content}`).join('\n')}`)
    }

    return `
=== MEMORIA PERSISTENTE DE NOVASTORE (GOBERNADA) ===
IMPORTANTE: Respeta las decisiones estratégicas y configuraciones previas registradas. No propongas alternativas que contradigan decisiones activas sin una justificación de cambio explícita.

${sections.join('\n\n')}
`
  }
}
