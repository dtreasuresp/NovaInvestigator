'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { PanelLeft, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/hooks/use-i18n'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { AiQuotaInfo, NovaiContext, NovaiMode } from '@/features/novai/schema'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from '@/components/ai-elements/conversation'
import { NovaiSidebar } from './components/novai-sidebar'
import { NovaiEmptyState } from './components/novai-empty-state'
import { NovaiMessageItem } from './components/novai-message-item'
import { NovaiComposer } from './components/novai-composer'
import type { ChatMessage, ChatThread, ToolInvocationItem, AgentTraceItem } from './types'

const STORAGE_KEY = 'novastore:novai_threads_v2'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

let inFlightQuotaPromise: Promise<AiQuotaInfo | null> | null = null
let cachedQuota: { data: AiQuotaInfo; timestamp: number } | null = null
const QUOTA_CACHE_TTL_MS = 5000

export async function fetchNovaiQuotaShared(force = false): Promise<AiQuotaInfo | null> {
  const now = Date.now()

  if (!force && cachedQuota && now - cachedQuota.timestamp < QUOTA_CACHE_TTL_MS) {
    return cachedQuota.data
  }

  if (inFlightQuotaPromise) {
    return inFlightQuotaPromise
  }

  inFlightQuotaPromise = (async () => {
    try {
      const res = await fetch('/api/novai/quota', { cache: 'no-store' })

      if (res.ok) {
        const data = (await res.json()) as AiQuotaInfo

        cachedQuota = { data, timestamp: Date.now() }

        return data
      }

      return null
    } catch {
      return null
    } finally {
      inFlightQuotaPromise = null
    }
  })()

  return inFlightQuotaPromise
}

export default function NovAiView() {
  const { locale } = useI18n()
  const { user } = useCurrentUser()

  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingThreadMessages, setIsLoadingThreadMessages] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [quota, setQuota] = useState<AiQuotaInfo | null>(null)
  const [isLoadingQuota, setIsLoadingQuota] = useState(true)
  const [contextApp, setContextApp] = useState<NovaiContext['app']>('general')
  const [selectedMode, setSelectedMode] = useState<NovaiMode>('CHAT')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMessagesForThread = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/novai/conversations/${threadId}`, { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        if (data.messages && Array.isArray(data.messages)) {
          const mappedMsgs: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; created_at?: string; createdAt?: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.created_at || m.createdAt || new Date().toISOString()
          }))

          setThreads(prev =>
            prev.map(t => {
              if (t.id !== threadId) return t

              // Preserve rich trace and tool metadata if already present in active session
              if (t.messages && t.messages.length > 0) {
                const merged = mappedMsgs.map(newMsg => {
                  const existingMsg = t.messages.find(em => em.id === newMsg.id || (em.role === newMsg.role && em.content === newMsg.content))

                  if (existingMsg) {
                    return {
                      ...newMsg,
                      agentTraces: existingMsg.agentTraces,
                      toolInvocations: existingMsg.toolInvocations,
                      evidences: existingMsg.evidences,
                      audits: existingMsg.audits,
                      calculations: existingMsg.calculations,
                      sources: existingMsg.sources,
                      reasoning: existingMsg.reasoning
                    }
                  }

                  return newMsg
                })

                return { ...t, messages: merged }
              }

              return { ...t, messages: mappedMsgs }
            })
          )
        }
      }
    } catch {
      // network error
    } finally {
      setIsLoadingThreadMessages(false)
    }
  }, [])

  // 1. Load canonical conversations from Supabase on mount
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/novai/conversations', { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          const mapped: ChatThread[] = data.conversations.map((c: { id: string; title?: string; app_context?: string; appContext?: string; mode?: string; created_at?: string; createdAt?: string; updated_at?: string; updatedAt?: string }) => ({
            id: c.id,
            title: c.title || 'Nueva conversación',
            createdAt: c.created_at || c.createdAt || new Date().toISOString(),
            updatedAt: c.updated_at || c.updatedAt || new Date().toISOString(),
            context: { app: ((c.app_context || c.appContext || 'general') as NovaiContext['app']), mode: (c.mode || 'CHAT') as NovaiMode },
            messages: []
          }))

          setThreads(prev => {
            return mapped.map(m => {
              const existing = prev.find(p => p.id === m.id)

              return existing && existing.messages && existing.messages.length > 0
                ? { ...m, messages: existing.messages }
                : m
            })
          })

          setActiveThreadId(prevActive => {
            if (prevActive && mapped.some(m => m.id === prevActive)) {
              return prevActive
            }

            const savedId = typeof window !== 'undefined' ? localStorage.getItem('novastore:novai_active_id') : null
            const initialId = (savedId && mapped.some(m => m.id === savedId)) ? savedId : mapped[0].id
            const targetThread = mapped.find(m => m.id === initialId) || mapped[0]

            if (targetThread) {
              setContextApp(targetThread.context.app)
            }

            void fetchMessagesForThread(initialId)

            return initialId
          })

          return
        } else if (Array.isArray(data.conversations) && data.conversations.length === 0) {
          // Create initial canonical thread in DB
          const createRes = await fetch('/api/novai/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Nueva conversación', appContext: 'general', mode: 'CHAT' })
          })

          if (createRes.ok) {
            const createData = await createRes.json()

            if (createData.conversation) {
              const initT: ChatThread = {
                id: createData.conversation.id,
                title: createData.conversation.title || 'Nueva conversación',
                createdAt: createData.conversation.created_at || createData.conversation.createdAt || new Date().toISOString(),
                updatedAt: createData.conversation.updated_at || createData.conversation.updatedAt || new Date().toISOString(),
                context: { app: 'general', mode: 'CHAT' },
                messages: []
              }

              setThreads([initT])
              setActiveThreadId(initT.id)

              return
            }
          }
        }
      }
    } catch {
      // network error
    }
  }, [fetchMessagesForThread])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
    }

    void loadConversations()
  }, [loadConversations])

  // 2. Multi-pestaña: sincronización de eventos de conversaciones
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel('novastore:novai-conversations')

    channel.onmessage = (event: MessageEvent<{ action: string; conversationId?: string }>) => {
      if (event.data?.action === 'refresh') {
        void loadConversations()
      } else if (event.data?.action === 'message-added' && event.data.conversationId) {
        if (event.data.conversationId === activeThreadId && !isLoading) {
          void fetchMessagesForThread(event.data.conversationId)
        }
      }
    }

    return () => {
      channel.close()
    }
  }, [loadConversations, activeThreadId, isLoading, fetchMessagesForThread])

  // 3. Quota Refresh (con deduplicación en vuelo y caché de 5s para evitar ráfagas)
  const refreshQuota = useCallback(async (force = false) => {
    setIsLoadingQuota(true)

    try {
      const data = await fetchNovaiQuotaShared(force)

      if (data) {
        setQuota(data)

        try {
          // Propaga a otras pestañas (mismo canal que Investigator)
          const bc = new BroadcastChannel('novastore:ai-quota')

          bc.postMessage(data)
          bc.close()
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoadingQuota(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de cuota al montar (patrón preexistente)
    void refreshQuota()
  }, [refreshQuota])

  // Multi-pestaña: escucha BroadcastChannel de cuota (de Investigator + otras NovAi)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel('novastore:ai-quota')

    channel.onmessage = (event: MessageEvent<AiQuotaInfo>) => {
      if (event.data && typeof event.data === 'object' && 'allowed' in event.data) {
        setQuota(event.data as AiQuotaInfo)
        setIsLoadingQuota(false)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshQuota(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      channel.close()
    }
  }, [refreshQuota])

  // 4. Active Thread Resolution
  const activeThread = threads.find(t => t.id === activeThreadId) ?? threads[0]
  const messages = activeThread?.messages ?? []

  // Auto-scroll on new message or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Shortcut for New Chat (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        // eslint-disable-next-line react-hooks/immutability -- hoisting intencional del handler (patrón preexistente)
        handleNewThread()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [threads])

  // Thread Management Handlers
  const handleNewThread = async () => {
    if (isLoading) {
      abortControllerRef.current?.abort()
      setIsLoading(false)
    }

    try {
      const res = await fetch('/api/novai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nueva conversación',
          appContext: contextApp,
          mode: selectedMode
        })
      })

      if (res.ok) {
        const data = await res.json()

        if (data.conversation?.id) {
          const canonicalThread: ChatThread = {
            id: data.conversation.id,
            title: data.conversation.title || 'Nueva conversación',
            createdAt: data.conversation.created_at || data.conversation.createdAt || new Date().toISOString(),
            updatedAt: data.conversation.updated_at || data.conversation.updatedAt || new Date().toISOString(),
            context: { app: contextApp, mode: selectedMode },
            messages: []
          }

          setThreads(prev => [canonicalThread, ...prev])
          setActiveThreadId(canonicalThread.id)

          try {
            localStorage.setItem('novastore:novai_active_id', canonicalThread.id)
            const bc = new BroadcastChannel('novastore:novai-conversations')

            bc.postMessage({ action: 'refresh', conversationId: canonicalThread.id })
            bc.close()
          } catch {
            // ignore
          }
        }
      }
    } catch {
      toast.error('Error al crear nueva conversación')
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
    }
  }

  const handleSelectThread = (id: string) => {
    if (isLoading) {
      abortControllerRef.current?.abort()
      setIsLoading(false)
    }

    setActiveThreadId(id)

    try {
      localStorage.setItem('novastore:novai_active_id', id)
    } catch {
      // ignore
    }

    const selected = threads.find(t => t.id === id)

    if (selected) {
      setContextApp(selected.context.app)

      if (!selected.messages || selected.messages.length === 0) {
        setIsLoadingThreadMessages(true)
        void fetchMessagesForThread(id)
      } else {
        setIsLoadingThreadMessages(false)
      }
    } else {
      setIsLoadingThreadMessages(true)
      void fetchMessagesForThread(id)
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
    }
  }

  const handleDeleteThread = async (id: string) => {
    const remaining = threads.filter(t => t.id !== id)

    if (remaining.length === 0) {
      void handleNewThread()
    } else {
      setThreads(remaining)

      if (activeThreadId === id) {
        const nextActiveId = remaining[0].id

        setActiveThreadId(nextActiveId)
        void fetchMessagesForThread(nextActiveId)
      }
    }

    try {
      await fetch(`/api/novai/conversations/${id}`, { method: 'DELETE' })
      const bc = new BroadcastChannel('novastore:novai-conversations')

      bc.postMessage({ action: 'refresh' })
      bc.close()
    } catch {
      // ignore
    }

    toast.success('Conversación eliminada')
  }

  const handleRenameThread = async (id: string, newTitle: string) => {
    setThreads(prev =>
      prev.map(t =>
        t.id === id ? { ...t, title: newTitle, updatedAt: new Date().toISOString() } : t
      )
    )

    try {
      await fetch(`/api/novai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })
      const bc = new BroadcastChannel('novastore:novai-conversations')

      bc.postMessage({ action: 'refresh' })
      bc.close()
    } catch {
      // ignore
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      toast.info('Generación detenida')
    }
  }

  // Send Message Logic
  const handleSend = async (customPrompt?: string, targetContext?: NovaiContext['app']) => {
    const textToSend = (customPrompt || input).trim()

    if (!textToSend || isLoading) return

    const effectiveContext = targetContext || contextApp

    // Quota validation
    if (quota && !quota.allowed) {
      toast.error('NovAi no está habilitado para tu plan. Contacta al administrador.')

      return
    }

    if (quota && quota.limitValue !== null && quota.remaining !== null && quota.remaining <= 0) {
      toast.error('Has alcanzado el límite mensual de NovAi.')

      return
    }

    const dailyRem = quota?.dailyRemaining ?? quota?.daily?.remaining ?? null
    const dailyLim = quota?.dailyLimitValue ?? quota?.daily?.limitValue ?? null

    if (dailyLim !== null && dailyRem !== null && dailyRem <= 0) {
      toast.error('Has alcanzado el límite diario de NovAi. Se renueva en 24h.')

      return
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    }

    const assistantPlaceholder: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    }

    const currentThreadId = activeThread?.id || generateId()
    const isFirstMessage = !activeThread || !activeThread.messages || activeThread.messages.length === 0
    const autoTitle = isFirstMessage ? textToSend.slice(0, 35) + (textToSend.length > 35 ? '...' : '') : (activeThread?.title || 'Nueva conversación')

    const updatedMessages = [...messages, userMessage, assistantPlaceholder]

    const updatedThread: ChatThread = {
      id: currentThreadId,
      title: autoTitle,
      createdAt: activeThread?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: { app: effectiveContext, mode: selectedMode },
      messages: updatedMessages
    }

    const threadExists = threads.some(t => t && t.id === currentThreadId)
    const nextThreads = threadExists
      ? threads.map(t => (t && t.id === currentThreadId ? updatedThread : t))
      : [updatedThread, ...threads]

    setThreads(nextThreads)

    setInput('')
    setIsLoading(true)

    const controller = new AbortController()

    abortControllerRef.current = controller

    try {
      const contextPayload: NovaiContext = { app: effectiveContext, mode: selectedMode }

      const apiMessages = updatedMessages
        .filter(m => m.content || m.role === 'user')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/novai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          conversationId: currentThreadId,
          messages: apiMessages,
          context: contextPayload,
          isFreeText: true,
          locale
        })
      })

      if (isFirstMessage && currentThreadId) {
        void fetch(`/api/novai/conversations/${currentThreadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: autoTitle })
        })
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))

        throw new Error(errData.error || 'Error al conectar con NovAi.')
      }

      if (!response.body) throw new Error('Respuesta vacía.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''
      let accumulatedReasoning = ''
      let currentToolInvocations: ToolInvocationItem[] = []
      let currentTraces: AgentTraceItem[] = []
      let currentEvidences: any[] = []
      let currentAudits: any[] = []
      let currentCalculations: any[] = []
      let currentSources: any[] = []

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunkStr = decoder.decode(value, { stream: true })
        const lines = chunkStr.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))

            if (data.type === 'text-delta' || data.chunk || data.delta) {
              const chunk = data.delta || data.chunk || ''
              accumulatedText += chunk
            } else if (data.type === 'reasoning' || data.type === 'reasoning-delta') {
              const chunk = data.delta || data.chunk || data.reasoning || ''
              accumulatedReasoning += chunk
            } else if (data.type === 'trace') {
              const traceTitle = data.title || 'Operación de agente'
              const traceId = data.id || `tr-${traceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
              const existingIdx = currentTraces.findIndex(t => t.id === traceId || t.title === traceTitle)
              const traceItem: AgentTraceItem = {
                id: traceId,
                category: data.category || 'validation',
                title: traceTitle,
                description: data.description || '',
                status: data.status || 'completed',
                timestamp: data.timestamp || new Date().toISOString()
              }
              if (existingIdx >= 0) {
                currentTraces = currentTraces.map((t, idx) => idx === existingIdx ? traceItem : t)
              } else {
                currentTraces = [...currentTraces, traceItem]
              }
            } else if (data.type === 'evidence') {
              currentEvidences = [...currentEvidences, data]
            } else if (data.type === 'audit') {
              currentAudits = [...currentAudits, data]
            } else if (data.type === 'calculation') {
              currentCalculations = [...currentCalculations, data]
            } else if (data.type === 'source') {
              currentSources = [...currentSources, data]
            } else if (data.type === 'tool-call') {
              const callId = data.id || data.toolCallId || `tc-${Date.now()}`
              const toolName = data.tool || data.toolName
              const existingIdx = currentToolInvocations.findIndex(t => t.toolCallId === callId)
              const newInvocation: ToolInvocationItem = {
                toolCallId: callId,
                toolName,
                label: data.label,
                args: data.input || data.args || {},
                state: 'call'
              }
              if (existingIdx >= 0) {
                currentToolInvocations = currentToolInvocations.map((t, idx) => idx === existingIdx ? newInvocation : t)
              } else {
                currentToolInvocations = [...currentToolInvocations, newInvocation]
              }
            } else if (data.type === 'tool-result') {
              const callId = data.id || data.toolCallId
              currentToolInvocations = currentToolInvocations.map(t => {
                if (t.toolCallId === callId || t.toolName === data.tool) {
                  return {
                    ...t,
                    state: 'result',
                    result: data.result || data.output
                  }
                }

                return t
              })
            } else if (data.type === 'message-complete' || data.type === 'finish') {
              if (data.fullText) {
                accumulatedText = data.fullText
              }
            } else if (data.type === 'error' || data.error) {
              throw new Error(data.error || 'Error en streaming.')
            }

            // Update the assistant message in current thread state immutably
            setThreads(prev =>
              prev.map(th => {
                if (!th || th.id !== currentThreadId) return th
                const copyMsgs = [...th.messages]
                const lastIdx = copyMsgs.length - 1
                const last = copyMsgs[lastIdx]

                if (last && last.role === 'assistant') {
                  copyMsgs[lastIdx] = {
                    ...last,
                    content: accumulatedText,
                    reasoning: accumulatedReasoning || undefined,
                    toolInvocations: currentToolInvocations.length > 0 ? [...currentToolInvocations] : undefined,
                    agentTraces: currentTraces.length > 0 ? [...currentTraces] : undefined,
                    evidences: currentEvidences.length > 0 ? [...currentEvidences] : undefined,
                    audits: currentAudits.length > 0 ? [...currentAudits] : undefined,
                    calculations: currentCalculations.length > 0 ? [...currentCalculations] : undefined,
                    sources: currentSources.length > 0 ? [...currentSources] : undefined,
                    isStreaming: true
                  }
                }

                return { ...th, messages: copyMsgs }
              })
            )
          } catch {
            // ignore partial JSON parse errors
          }
        }
      }

      // Mark streaming done
      setThreads(prev => {
        const finalThreads = prev.map(th => {
          if (!th || th.id !== currentThreadId) return th
          const copyMsgs = [...th.messages]
          const lastIdx = copyMsgs.length - 1
          const last = copyMsgs[lastIdx]

          if (last && last.role === 'assistant') {
            copyMsgs[lastIdx] = {
              ...last,
              content: accumulatedText,
              reasoning: accumulatedReasoning || undefined,
              toolInvocations: currentToolInvocations.length > 0 ? [...currentToolInvocations] : undefined,
              agentTraces: currentTraces.length > 0 ? [...currentTraces] : undefined,
              evidences: currentEvidences.length > 0 ? [...currentEvidences] : undefined,
              audits: currentAudits.length > 0 ? [...currentAudits] : undefined,
              calculations: currentCalculations.length > 0 ? [...currentCalculations] : undefined,
              sources: currentSources.length > 0 ? [...currentSources] : undefined,
              isStreaming: false
            }
          }

          return { ...th, messages: copyMsgs }
        })

        try {
          const bc = new BroadcastChannel('novastore:novai-conversations')

          bc.postMessage({ action: 'message-added', conversationId: currentThreadId })
          bc.close()
        } catch {}

        return finalThreads
      })

      void refreshQuota()
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        // User aborted, close streaming cleanly
        setThreads(prev =>
          prev.map(th => {
            if (!th || th.id !== currentThreadId) return th
            const copyMsgs = [...th.messages]
            const lastIdx = copyMsgs.length - 1
            const last = copyMsgs[lastIdx]

            if (last && last.role === 'assistant') {
              copyMsgs[lastIdx] = {
                ...last,
                isStreaming: false
              }
            }

            return { ...th, messages: copyMsgs }
          })
        )

        return
      }

      const msg = err instanceof Error ? err.message : String(err)

      toast.error(msg)

      setThreads(prev => {
        const updatedWithErr = prev.map(th => {
          if (!th || th.id !== currentThreadId) return th
          const copyMsgs = [...th.messages]
          const lastIdx = copyMsgs.length - 1
          const last = copyMsgs[lastIdx]

          if (last && last.role === 'assistant') {
            copyMsgs[lastIdx] = {
              ...last,
              isStreaming: false,
              ...(last.content ? {} : { error: msg })
            }
          }

          return { ...th, messages: copyMsgs }
        })

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWithErr))
        } catch {}

        return updatedWithErr
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleRegenerate = async () => {
    if (isLoading || !activeThread || messages.length === 0) return

    const currentThreadId = activeThread.id

    // Find the last assistant message index
    const lastAssistantIdx = [...messages].map((m, idx) => ({ role: m.role, idx })).reverse().find(m => m.role === 'assistant')?.idx

    if (lastAssistantIdx === undefined) return

    // Find the user message before this assistant message
    const lastUserMsg = [...messages.slice(0, lastAssistantIdx)].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    // Validate quota before regenerating
    if (quota && !quota.allowed) {
      toast.error('NovAi no está habilitado para tu plan. Contacta al administrador.')

      return
    }

    if (quota && quota.limitValue !== null && quota.remaining !== null && quota.remaining <= 0) {
      toast.error('Has alcanzado el límite mensual de NovAi.')

      return
    }

    const dailyRem = quota?.dailyRemaining ?? quota?.daily?.remaining ?? null
    const dailyLim = quota?.dailyLimitValue ?? quota?.daily?.limitValue ?? null

    if (dailyLim !== null && dailyRem !== null && dailyRem <= 0) {
      toast.error('Has alcanzado el límite diario de NovAi. Se renueva en 24h.')

      return
    }

    // Keep history up to the user message, and place an empty assistant placeholder in-place
    const baseMessages = messages.slice(0, lastAssistantIdx)

    const assistantPlaceholder: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    }

    const updatedMessages = [...baseMessages, assistantPlaceholder]

    const updatedThread: ChatThread = {
      ...activeThread,
      updatedAt: new Date().toISOString(),
      messages: updatedMessages
    }

    const nextThreads = threads.map(t => (t && t.id === currentThreadId ? updatedThread : t))

    setThreads(nextThreads)
    setIsLoading(true)

    const controller = new AbortController()

    abortControllerRef.current = controller

    try {
      const contextPayload: NovaiContext = { app: contextApp, mode: selectedMode }

      const apiMessages = baseMessages
        .filter(m => m.content || m.role === 'user')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/novai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          conversationId: currentThreadId,
          messages: apiMessages,
          context: contextPayload,
          isFreeText: true,
          locale
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))

        throw new Error(errData.error || 'Error al conectar con NovAi.')
      }

      if (!response.body) throw new Error('Respuesta vacía.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunkStr = decoder.decode(value, { stream: true })
        const lines = chunkStr.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))

            if (data.chunk) {
              accumulatedText += data.chunk

              setThreads(prev =>
                prev.map(th => {
                  if (!th || th.id !== currentThreadId) return th
                  const copyMsgs = [...th.messages]
                  const lastIdx = copyMsgs.length - 1
                  const last = copyMsgs[lastIdx]

                  if (last && last.role === 'assistant') {
                    copyMsgs[lastIdx] = {
                      ...last,
                      content: accumulatedText,
                      isStreaming: true
                    }
                  }

                  return { ...th, messages: copyMsgs }
                })
              )
            } else if (data.error) {
              throw new Error(data.error)
            }
          } catch {}
        }
      }

      // Mark streaming done
      setThreads(prev => {
        const finalThreads = prev.map(th => {
          if (!th || th.id !== currentThreadId) return th
          const copyMsgs = [...th.messages]
          const lastIdx = copyMsgs.length - 1
          const last = copyMsgs[lastIdx]

          if (last && last.role === 'assistant') {
            copyMsgs[lastIdx] = {
              ...last,
              content: accumulatedText,
              isStreaming: false
            }
          }

          return { ...th, messages: copyMsgs }
        })

        try {
          const bc = new BroadcastChannel('novastore:novai-conversations')

          bc.postMessage({ action: 'message-added', conversationId: currentThreadId })
          bc.close()
        } catch {}

        return finalThreads
      })

      void refreshQuota()
    } catch (err: unknown) {
      if (controller.signal.aborted) return

      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)

      setThreads(prev => {
        const updatedWithErr = prev.map(th => {
          if (!th || th.id !== currentThreadId) return th
          const copyMsgs = [...th.messages]
          const lastIdx = copyMsgs.length - 1
          const last = copyMsgs[lastIdx]

          if (last && last.role === 'assistant') {
            copyMsgs[lastIdx] = {
              ...last,
              isStreaming: false,
              ...(last.content ? {} : { error: msg })
            }
          }

          return { ...th, messages: copyMsgs }
        })

        return updatedWithErr
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className='flex size-full overflow-hidden bg-background relative'>
      {/* 1. Sub-sidebar de Chats (Adosado a la izquierda) */}
      <NovaiSidebar
        threads={threads}
        activeThreadId={activeThread?.id ?? null}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        quota={quota}
        isLoadingQuota={isLoadingQuota}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* 2. Área Principal de Chat (Máximo espacio central) */}
      <main className='flex flex-1 flex-col overflow-hidden bg-background/50 relative min-w-0'>
        {/* Top Header Bar (ChatGPT style for Desktop & Mobile) */}
        <div className='flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-background/80 backdrop-blur-md shrink-0 z-10'>
          <div className='flex items-center gap-2 min-w-0'>
            {isSidebarCollapsed && (
              <Button
                size='icon'
                variant='ghost'
                onClick={() => setIsSidebarCollapsed(false)}
                className='size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0'
                aria-label='Abrir historial'
              >
                <PanelLeft className='size-4' />
              </Button>
            )}
            <div className='flex items-center gap-2 min-w-0'>
              <span className='font-bold text-sm tracking-tight text-foreground'>NovAi</span>
              <Badge variant='outline' className='text-[10px] px-2 py-0.5 font-medium rounded-full border-border/60 text-muted-foreground shrink-0'>
                {selectedMode}
              </Badge>
            </div>
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <Button
              size='sm'
              variant='ghost'
              onClick={handleNewThread}
              className='h-8 gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted'
              aria-label='Nuevo chat'
            >
              <Plus className='size-3.5' />
              <span className='hidden sm:inline'>Nuevo chat</span>
            </Button>
          </div>
        </div>

        {/* Messages Stream or Empty State with AI Elements Conversation */}
        {isLoadingThreadMessages ? (
          <div className='flex flex-1 items-center justify-center p-8 text-center'>
            <div className='flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/30 px-4 py-2.5 rounded-xl border border-border/40'>
              <RefreshCw className='size-3.5 animate-spin text-primary' />
              <span>Cargando conversación...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
            <NovaiEmptyState
              userName={user?.fullName || user?.email?.split('@')[0]}
              currentContext={contextApp}
              onSelectPrompt={(prompt, ctx) => {
                setContextApp(ctx)
                void handleSend(prompt, ctx)
              }}
            />
        ) : (
          <Conversation>
            <ConversationContent>
              {messages.map((msg, i) => (
                <NovaiMessageItem
                  key={msg.id}
                  message={msg}
                  isLast={i === messages.length - 1}
                  isLoading={isLoading}
                  onRegenerate={handleRegenerate}
                />
              ))}
              <div ref={messagesEndRef} />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* 3. Sticky Bottom Composer (Inmóvil en la parte inferior) */}
        <div className='sticky bottom-0 z-20 w-full bg-background/80 backdrop-blur-xl border-t border-border/40 pb-2 pt-1.5 shrink-0'>
          <NovaiComposer
            input={input}
            setInput={setInput}
            onSend={() => void handleSend()}
            onStop={handleStop}
            isLoading={isLoading}
            quota={quota}
            contextApp={contextApp}
            setContextApp={setContextApp}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
          />
        </div>
      </main>
    </div>
  )
}
