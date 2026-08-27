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

export default function NovAiView() {
  const { locale } = useI18n()
  const { user } = useCurrentUser()

  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
          const mappedMsgs: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.created_at
          }))

          setThreads(prev =>
            prev.map(t => (t.id === threadId ? { ...t, messages: mappedMsgs } : t))
          )
        }
      }
    } catch {
      // fallback
    }
  }, [])

  // 1. Load threads from DB on mount (with localStorage fallback) and collapse sidebar on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
    }

    let isMounted = true

    const loadConversations = async () => {
      try {
        const res = await fetch('/api/novai/conversations', { cache: 'no-store' })

        if (res.ok) {
          const data = await res.json()

          if (Array.isArray(data.conversations) && data.conversations.length > 0) {
            const mapped: ChatThread[] = data.conversations.map((c: { id: string; title?: string; app_context?: string; mode?: string; created_at: string; updated_at: string }) => ({
              id: c.id,
              title: c.title || 'Nueva conversación',
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              context: { app: (c.app_context || 'general') as NovaiContext['app'], mode: (c.mode || 'CHAT') as NovaiMode },
              messages: []
            }))

            if (isMounted) {
              setThreads(mapped)
              setActiveThreadId(mapped[0].id)
              setContextApp(mapped[0].context.app)
              void fetchMessagesForThread(mapped[0].id)

              return
            }
          } else if (Array.isArray(data.conversations) && data.conversations.length === 0) {
            // Create first thread in DB
            const createRes = await fetch('/api/novai/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'Nueva conversación', appContext: 'general', mode: 'CHAT' })
            })

            if (createRes.ok) {
              const createData = await createRes.json()

              if (createData.conversation && isMounted) {
                const initT: ChatThread = {
                  id: createData.conversation.id,
                  title: createData.conversation.title || 'Nueva conversación',
                  createdAt: createData.conversation.created_at,
                  updatedAt: createData.conversation.updated_at,
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
        // network error fallback
      }

      // Fallback to localStorage if API unavailable
      try {
        const raw = localStorage.getItem(STORAGE_KEY)

        if (raw) {
          const parsed = JSON.parse(raw) as ChatThread[]

          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setThreads(parsed)
            setActiveThreadId(parsed[0].id)
            setContextApp(parsed[0].context.app)

            return
          }
        }
      } catch {
        // ignore
      }

      if (isMounted) {
        const initialThread: ChatThread = {
          id: generateId(),
          title: 'Nueva conversación',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          context: { app: 'general' },
          messages: []
        }

        setThreads([initialThread])
        setActiveThreadId(initialThread.id)
      }
    }

    void loadConversations()

    return () => {
      isMounted = false
    }
  }, [fetchMessagesForThread])

  // 2. Persist threads to localStorage on changes
  const saveThreads = useCallback((newThreads: ChatThread[]) => {
    setThreads(newThreads)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newThreads))
    } catch {
      // ignore storage quota errors
    }
  }, [])

  // 3. Quota Refresh
  const refreshQuota = useCallback(async () => {
    setIsLoadingQuota(true)

    try {
      const res = await fetch('/api/novai/quota', { cache: 'no-store' })

      if (res.ok) {
        const data = (await res.json()) as AiQuotaInfo

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
    } catch {
      // ignore
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
        void refreshQuota()
      }
    }

    const handleFocus = () => void refreshQuota()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
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

    const tempId = generateId()

    const newThread: ChatThread = {
      id: tempId,
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: { app: contextApp },
      messages: []
    }

    const nextThreads = [newThread, ...threads]

    saveThreads(nextThreads)
    setActiveThreadId(tempId)

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true)
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
          const realId = data.conversation.id

          setThreads(prev =>
            prev.map(t => (t.id === tempId ? { ...t, id: realId } : t))
          )
          setActiveThreadId(realId)
        }
      }
    } catch {
      // local fallback active
    }
  }

  const handleSelectThread = (id: string) => {
    if (isLoading) {
      abortControllerRef.current?.abort()
      setIsLoading(false)
    }

    setActiveThreadId(id)
    const selected = threads.find(t => t.id === id)

    if (selected) {
      setContextApp(selected.context.app)

      if (!selected.messages || selected.messages.length === 0) {
        void fetchMessagesForThread(id)
      }
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
      saveThreads(remaining)

      if (activeThreadId === id) {
        setActiveThreadId(remaining[0].id)
        void fetchMessagesForThread(remaining[0].id)
      }
    }

    try {
      await fetch(`/api/novai/conversations/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }

    toast.success('Conversación eliminada')
  }

  const handleRenameThread = async (id: string, newTitle: string) => {
    const nextThreads = threads.map(t =>
      t.id === id ? { ...t, title: newTitle, updatedAt: new Date().toISOString() } : t
    )

    saveThreads(nextThreads)

    try {
      await fetch(`/api/novai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })
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

    if (!activeThreadId) {
      setActiveThreadId(currentThreadId)
    }

    saveThreads(nextThreads)

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
            } else if (data.type === 'trace') {
              const traceItem: AgentTraceItem = {
                id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                category: data.category || 'validation',
                title: data.title || 'Operación de agente',
                description: data.description || '',
                status: data.status || 'completed',
                timestamp: data.timestamp || new Date().toISOString()
              }
              currentTraces = [...currentTraces, traceItem]
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalThreads))
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

    saveThreads(nextThreads)
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalThreads))
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
        {/* Mobile Header Bar (ChatGPT style) */}
        <div className='flex md:hidden items-center justify-between px-3 py-2 border-b border-border/40 bg-background/90 backdrop-blur-md shrink-0 z-10'>
          <div className='flex items-center gap-2 min-w-0'>
            <Button
              size='icon'
              variant='ghost'
              onClick={() => setIsSidebarCollapsed(false)}
              className='size-8 rounded-lg text-foreground hover:bg-muted shrink-0'
              aria-label='Abrir historial'
            >
              <PanelLeft className='size-4' />
            </Button>
            <div className='flex items-center gap-1.5 min-w-0'>
              <span className='font-bold text-xs tracking-tight truncate'>NovAi</span>
              <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-normal shrink-0'>
                {selectedMode}
              </Badge>
            </div>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <Button
              size='icon'
              variant='ghost'
              onClick={handleNewThread}
              className='size-8 rounded-lg text-foreground hover:bg-muted'
              aria-label='Nuevo chat'
            >
              <Plus className='size-4' />
            </Button>
          </div>
        </div>

        {/* Messages Stream or Empty State with AI Elements Conversation */}
        {messages.length === 0 ? (
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
