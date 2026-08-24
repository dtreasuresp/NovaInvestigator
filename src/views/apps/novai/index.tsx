'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { PanelLeft, RefreshCw } from 'lucide-react'
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
import type { ChatMessage, ChatThread } from './types'

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

  // 1. Load threads from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        const parsed = JSON.parse(raw) as ChatThread[]

        if (Array.isArray(parsed) && parsed.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación inicial desde localStorage (patrón preexistente)
          setThreads(parsed)
          setActiveThreadId(parsed[0].id)
          setContextApp(parsed[0].context.app)

          return
        }
      }
    } catch {
      // ignore corrupt storage
    }

    // Default first thread if empty
    const initialThread: ChatThread = {
      id: generateId(),
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: { app: 'general' },
      messages: []
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- thread inicial por defecto en primer mount (patrón preexistente)
    setThreads([initialThread])
    setActiveThreadId(initialThread.id)
  }, [])

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
  const handleNewThread = () => {
    if (isLoading) {
      abortControllerRef.current?.abort()
      setIsLoading(false)
    }

    const newThread: ChatThread = {
      id: generateId(),
      title: 'Nueva conversación',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: { app: contextApp },
      messages: []
    }

    const nextThreads = [newThread, ...threads]

    saveThreads(nextThreads)
    setActiveThreadId(newThread.id)
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
    }
  }

  const handleDeleteThread = (id: string) => {
    const remaining = threads.filter(t => t.id !== id)

    if (remaining.length === 0) {
      const fresh: ChatThread = {
        id: generateId(),
        title: 'Nueva conversación',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: { app: 'general' },
        messages: []
      }

      saveThreads([fresh])
      setActiveThreadId(fresh.id)
    } else {
      saveThreads(remaining)

      if (activeThreadId === id) {
        setActiveThreadId(remaining[0].id)
      }
    }

    toast.success('Conversación eliminada')
  }

  const handleRenameThread = (id: string, newTitle: string) => {
    const nextThreads = threads.map(t =>
      t.id === id ? { ...t, title: newTitle, updatedAt: new Date().toISOString() } : t
    )

    saveThreads(nextThreads)
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

    // Determine title if it's the first message
    const isFirstMessage = !activeThread || activeThread.messages.length === 0
    const autoTitle = isFirstMessage ? textToSend.slice(0, 35) + (textToSend.length > 35 ? '...' : '') : activeThread.title

    const updatedMessages = [...messages, userMessage, assistantPlaceholder]

    const updatedThread: ChatThread = {
      ...activeThread,
      title: autoTitle,
      updatedAt: new Date().toISOString(),
      context: { app: effectiveContext },
      messages: updatedMessages
    }

    const nextThreads = threads.map(t => (t.id === activeThread.id ? updatedThread : t))

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

              // Update the assistant message in current thread state immutably
              setThreads(prev =>
                prev.map(th => {
                  if (th.id !== activeThread.id) return th
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
          } catch {
            // ignore partial JSON parse errors
          }
        }
      }

      // Mark streaming done
      setThreads(prev => {
        const finalThreads = prev.map(th => {
          if (th.id !== activeThread.id) return th
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
      if (controller.signal.aborted) {
        // User aborted, close streaming cleanly
        setThreads(prev =>
          prev.map(th => {
            if (th.id !== activeThread.id) return th
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
          if (th.id !== activeThread.id) return th
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

    const nextThreads = threads.map(t => (t.id === activeThread.id ? updatedThread : t))
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
                  if (th.id !== activeThread.id) return th
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
          if (th.id !== activeThread.id) return th
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
          if (th.id !== activeThread.id) return th
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
