import type { SupabaseClient } from '@supabase/supabase-js'
import type { NovaiMode } from './schema'
import { logger } from '@/lib/logger'

export interface NovaiConversationDTO {
  id: string
  tenantId: string
  workspaceId?: string | null
  userId: string
  title: string
  mode: NovaiMode
  appContext: string
  metadata: Record<string, unknown>
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface NovaiMessageDTO {
  id: string
  conversationId: string
  tenantId: string
  userId?: string | null
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  mode: NovaiMode
  model?: string | null
  toolCalls?: unknown
  tokenCount: number
  createdAt: string
}

interface NovaiConversationRow {
  id: string
  tenant_id: string
  workspace_id: string | null
  user_id: string
  title: string
  mode: string
  app_context: string
  metadata: Record<string, unknown> | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface NovaiMessageRow {
  id: string
  conversation_id: string
  tenant_id: string
  user_id: string | null
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  mode: string | null
  model: string | null
  tool_calls: unknown
  token_count: number | null
  created_at: string
}

export class NovaiConversationsRepository {
  /**
   * Lista las conversaciones del usuario en el tenant.
   */
  static async listConversations(
    client: SupabaseClient,
    params: { tenantId: string; userId: string; limit?: number }
  ): Promise<NovaiConversationDTO[]> {
    const { tenantId, userId, limit = 50 } = params

    try {
      const { data, error } = await client
        .from('novai_conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.warn('Error listing NovAi conversations', {
          action: 'novai.conversations.list',
          details: { tenantId, userId, errorMessage: error.message }
        })

        return []
      }

      return ((data || []) as unknown as NovaiConversationRow[]).map(r => ({
        id: r.id,
        tenantId: r.tenant_id,
        workspaceId: r.workspace_id,
        userId: r.user_id,
        title: r.title,
        mode: r.mode as NovaiMode,
        appContext: r.app_context,
        metadata: r.metadata || {},
        isPinned: r.is_pinned,
        isArchived: r.is_archived,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    } catch (err) {
      logger.warn('Exception listing NovAi conversations', {
        action: 'novai.conversations.list',
        details: { tenantId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return []
    }
  }

  /**
   * Crea una nueva conversación.
   */
  static async createConversation(
    client: SupabaseClient,
    params: {
      tenantId: string
      workspaceId?: string | null
      userId: string
      title?: string
      mode?: NovaiMode
      appContext?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<NovaiConversationDTO | null> {
    const {
      tenantId,
      workspaceId,
      userId,
      title = 'Nueva conversación',
      mode = 'CHAT',
      appContext = 'general',
      metadata = {}
    } = params

    try {
      const { data, error } = await client
        .from('novai_conversations')
        .insert({
          tenant_id: tenantId,
          workspace_id: workspaceId || null,
          user_id: userId,
          title,
          mode,
          app_context: appContext,
          metadata
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating NovAi conversation', {
          action: 'novai.conversations.create',
          details: { tenantId, userId, errorMessage: error.message }
        })

        return null
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        workspaceId: data.workspace_id,
        userId: data.user_id,
        title: data.title,
        mode: data.mode as NovaiMode,
        appContext: data.app_context,
        metadata: data.metadata || {},
        isPinned: data.is_pinned,
        isArchived: data.is_archived,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (err) {
      logger.error('Exception creating NovAi conversation', {
        action: 'novai.conversations.create',
        details: { tenantId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return null
    }
  }

  /**
   * Obtiene los metadatos de una conversación validando pertenencia.
   */
  static async getConversation(
    client: SupabaseClient,
    params: { conversationId: string; tenantId: string; userId: string }
  ): Promise<NovaiConversationDTO | null> {
    const { conversationId, tenantId, userId } = params

    try {
      const { data, error } = await client
        .from('novai_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return null
      }

      const r = data as unknown as NovaiConversationRow

      return {
        id: r.id,
        tenantId: r.tenant_id,
        workspaceId: r.workspace_id,
        userId: r.user_id,
        title: r.title,
        mode: r.mode as NovaiMode,
        appContext: r.app_context,
        metadata: r.metadata || {},
        isPinned: r.is_pinned,
        isArchived: r.is_archived,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }
    } catch {
      return null
    }
  }

  /**
   * Carga el historial canónico ordenado de mensajes en formato AiMessage para el Agent Runtime.
   */
  static async loadCanonicalAiMessages(
    client: SupabaseClient,
    params: { conversationId: string; tenantId: string; userId: string; limit?: number }
  ): Promise<Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>> {
    const { conversationId, tenantId, userId, limit = 50 } = params

    try {
      // 1. Validar autorización de la conversación
      const conv = await this.getConversation(client, { conversationId, tenantId, userId })

      if (!conv) {
        return []
      }

      // 2. Cargar mensajes ordenados canónicamente por created_at asc
      const { data, error } = await client
        .from('novai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error || !data) {
        return []
      }

      return data.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content || ''
      }))
    } catch (err) {
      logger.error('Error loading canonical AI messages', {
        action: 'novai.messages.load_canonical',
        details: { conversationId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return []
    }
  }

  /**
   * Obtiene una conversación con sus mensajes ordenados.
   */
  static async getConversationWithMessages(
    client: SupabaseClient,
    params: { conversationId: string; tenantId: string; userId: string }
  ): Promise<{ conversation: NovaiConversationDTO; messages: NovaiMessageDTO[] } | null> {
    const { conversationId, tenantId, userId } = params

    try {
      const { data: conv, error: convError } = await client
        .from('novai_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single()

      if (convError || !conv) {
        return null
      }

      const { data: msgs, error: msgsError } = await client
        .from('novai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (msgsError) {
        logger.warn('Error fetching NovAi messages for conversation', {
          action: 'novai.messages.fetch',
          details: { conversationId, errorMessage: msgsError.message }
        })
      }

      return {
        conversation: {
          id: conv.id,
          tenantId: conv.tenant_id,
          workspaceId: conv.workspace_id,
          userId: conv.user_id,
          title: conv.title,
          mode: conv.mode as NovaiMode,
          appContext: conv.app_context,
          metadata: conv.metadata || {},
          isPinned: conv.is_pinned,
          isArchived: conv.is_archived,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at
        },
        messages: ((msgs || []) as unknown as NovaiMessageRow[]).map(m => ({
          id: m.id,
          conversationId: m.conversation_id,
          tenantId: m.tenant_id,
          userId: m.user_id,
          role: m.role,
          content: m.content,
          mode: (m.mode || 'CHAT') as NovaiMode,
          model: m.model,
          toolCalls: m.tool_calls,
          tokenCount: m.token_count || 0,
          createdAt: m.created_at
        }))
      }
    } catch (err) {
      logger.error('Exception getting NovAi conversation with messages', {
        action: 'novai.conversations.get',
        details: { conversationId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return null
    }
  }

  /**
   * Actualiza una conversación (título, modo, fijado, archivado).
   */
  static async updateConversation(
    client: SupabaseClient,
    params: {
      conversationId: string
      tenantId: string
      userId: string
      updates: Partial<{
        title: string
        mode: NovaiMode
        isPinned: boolean
        isArchived: boolean
        metadata: Record<string, unknown>
      }>
    }
  ): Promise<boolean> {
    const { conversationId, tenantId, userId, updates } = params

    try {
      const dbUpdates: Record<string, unknown> = {}
      
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.mode !== undefined) dbUpdates.mode = updates.mode
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived
      if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata

      const { error } = await client
        .from('novai_conversations')
        .update(dbUpdates)
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Elimina una conversación y sus mensajes en cascada.
   */
  static async deleteConversation(
    client: SupabaseClient,
    params: { conversationId: string; tenantId: string; userId: string }
  ): Promise<boolean> {
    const { conversationId, tenantId, userId } = params

    try {
      const { error } = await client
        .from('novai_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Añade un mensaje a la conversación.
   */
  static async appendMessage(
    client: SupabaseClient,
    params: {
      conversationId: string
      tenantId: string
      userId?: string | null
      role: 'user' | 'assistant' | 'system' | 'tool'
      content: string
      mode?: NovaiMode
      model?: string | null
      toolCalls?: unknown
      tokenCount?: number
    }
  ): Promise<NovaiMessageDTO | null> {
    const {
      conversationId,
      tenantId,
      userId,
      role,
      content,
      mode = 'CHAT',
      model,
      toolCalls,
      tokenCount = 0
    } = params

    try {
      // 1. Idempotencia y prevención de envíos dobles rápidos (< 3s)
      const { data: latestMsg } = await client
        .from('novai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestMsg && latestMsg.role === role && latestMsg.content === content) {
        const diffMs = Date.now() - new Date(latestMsg.created_at).getTime()

        if (diffMs < 3000) {
          return {
            id: latestMsg.id,
            conversationId: latestMsg.conversation_id,
            tenantId: latestMsg.tenant_id,
            userId: latestMsg.user_id,
            role: latestMsg.role,
            content: latestMsg.content,
            mode: (latestMsg.mode || 'CHAT') as NovaiMode,
            model: latestMsg.model,
            toolCalls: latestMsg.tool_calls,
            tokenCount: latestMsg.token_count || 0,
            createdAt: latestMsg.created_at
          }
        }
      }

      const { data, error } = await client
        .from('novai_messages')
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          user_id: userId || null,
          role,
          content,
          mode,
          model: model || null,
          tool_calls: toolCalls || null,
          token_count: tokenCount
        })
        .select()
        .single()

      if (error) {
        logger.error('Error appending NovAi message', {
          action: 'novai.messages.append',
          details: { conversationId, errorMessage: error.message }
        })

        return null
      }

      // Actualizar timestamp de la conversación
      await client
        .from('novai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)

      return {
        id: data.id,
        conversationId: data.conversation_id,
        tenantId: data.tenant_id,
        userId: data.user_id,
        role: data.role,
        content: data.content,
        mode: data.mode as NovaiMode,
        model: data.model,
        toolCalls: data.tool_calls,
        tokenCount: data.token_count || 0,
        createdAt: data.created_at
      }
    } catch (err) {
      logger.error('Exception appending NovAi message', {
        action: 'novai.messages.append',
        details: { conversationId, errorMessage: err instanceof Error ? err.message : String(err) }
      })

      return null
    }
  }
}
