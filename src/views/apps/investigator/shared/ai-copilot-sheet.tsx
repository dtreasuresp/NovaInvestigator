'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import {
  Sparkles,
  Send,
  Lock,
  Bot,
  User,
  Activity,
  Compass,
  Scale,
  ShieldAlert,
  Award,
  RefreshCw,
  ChevronDown,
  Zap
} from 'lucide-react'


import { toast } from 'sonner'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit
} from '@/components/ai-elements/prompt-input'

import {
  Suggestions,
  Suggestion
} from '@/components/ai-elements/suggestion'

import { useOptionalInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'
import { PREDEFINED_PROMPTS, type AiMessage, type AiQuotaInfo } from '@/features/novai/schema'
import { MarkdownRenderer } from '@/views/apps/novai/components/markdown-renderer'


const PROMPT_ICONS: Record<string, typeof Activity> = {
  Activity,
  Compass,
  Scale,
  ShieldAlert,
  Award
}

const NOVAI_THREADS_KEY = 'novastore:novai_threads_v2'
const SHEET_THREAD_ID = 'novastore:investigator-sheet-thread'

function generateSheetId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadSheetMessagesFromNovai(): AiMessage[] | null {
  try {
    const raw = localStorage.getItem(NOVAI_THREADS_KEY)

    if (!raw) return null

    const threads = JSON.parse(raw) as Array<{
      id: string
      context?: { app?: string }
      messages?: Array<{ role: string; content: string }>
    }>

    if (!Array.isArray(threads) || threads.length === 0) return null

    // Prioridad: hilo dedicado del sheet; fallback: último hilo investigator
    const dedicated = threads.find(t => t.id === SHEET_THREAD_ID)
    const target = dedicated ?? [...threads].reverse().find(t => t.context?.app === 'investigator')

    if (!target || !Array.isArray(target.messages) || target.messages.length === 0) return null

    return target.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as AiMessage['role'], content: String(m.content ?? '') }))
      .filter(m => m.content.length > 0 || m.role === 'assistant')
  } catch {
    return null
  }
}

function persistSheetMessagesToNovai(aiMessages: AiMessage[]) {
  try {
    const raw = localStorage.getItem(NOVAI_THREADS_KEY)

    const threads: Array<{
      id: string
      title: string
      createdAt: string
      updatedAt: string
      context: { app: string }
      messages: Array<{ id: string; role: string; content: string; timestamp: string }>
    }> = raw ? (JSON.parse(raw) as typeof threads) : []

    const now = new Date().toISOString()

    const chatMessages = aiMessages.map(m => ({
      id: generateSheetId(),
      role: m.role,
      content: m.content,
      timestamp: now
    }))

    const idx = threads.findIndex(t => t.id === SHEET_THREAD_ID)
    const title = aiMessages.find(m => m.role === 'user')?.content.slice(0, 35) ?? 'Sheet Investigador'

    if (idx === -1) {
      threads.unshift({
        id: SHEET_THREAD_ID,
        title: title + (title.length >= 35 ? '...' : ''),
        createdAt: now,
        updatedAt: now,
        context: { app: 'investigator' },
        messages: chatMessages
      })
    } else {
      threads[idx] = {
        ...threads[idx],
        updatedAt: now,
        messages: chatMessages
      }

      // mueve al frente para que NovAi lo vea arriba
      const [moved] = threads.splice(idx, 1)

      threads.unshift(moved)
    }

    localStorage.setItem(NOVAI_THREADS_KEY, JSON.stringify(threads))
  } catch {
    // ignore storage quota
  }
}

interface AiCopilotSheetProps {
  floating?: boolean
}

export function AiCopilotSheet({ floating = true }: AiCopilotSheetProps) {
  const { t, locale } = useI18n()
  const investigatorCtx = useOptionalInvestigatorAnalysis()
  
  const [localQuota, setLocalQuota] = useState<AiQuotaInfo | null>(null)
  const [isLoadingLocalQuota, setIsLoadingLocalQuota] = useState<boolean>(true)

  const aiQuota = investigatorCtx?.aiQuota ?? localQuota
  const isLoadingAiQuota = investigatorCtx ? investigatorCtx.isLoadingAiQuota : isLoadingLocalQuota

  const refreshAiQuota = useCallback(async () => {
    if (investigatorCtx) {
      await investigatorCtx.refreshAiQuota()

      return
    }

    setIsLoadingLocalQuota(true)

    try {
      const res = await fetch('/api/novai/quota', { cache: 'no-store' })

      if (res.ok) {
        const data = (await res.json()) as AiQuotaInfo

        setLocalQuota(data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLocalQuota(false)
    }
  }, [investigatorCtx])

  const [open, setOpen] = useState(false)

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content: t('novai.aiWelcomeMessage') || '¡Hola! Soy tu Copiloto Estratégico NovaStore. Puedo analizar tu diagnóstico EFI/EFE, explicarte el vector DAFO, validar la coherencia de tus ponderaciones o ayudarte a formular acciones CAME. ¿En qué te gustaría profundizar hoy?'
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const persistTimerRef = useRef<number | null>(null)
  const messagesRef = useRef<AiMessage[]>(messages)
  messagesRef.current = messages

  // Hidrata historia compartida con NovAi al montar el componente
  useEffect(() => {
    const hydrated = loadSheetMessagesFromNovai()

    if (hydrated && hydrated.length > 0) {
      setMessages(hydrated)
    }
  }, [])

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  // Storage event cross-tab sync (solo cuando el usuario no está en medio de una respuesta activa)
  useEffect(() => {


    const handleStorage = (e: StorageEvent) => {
      if (e.key !== NOVAI_THREADS_KEY || isLoading) return
      const hydrated = loadSheetMessagesFromNovai()

      if (hydrated && hydrated.length > 0) {
        setMessages(hydrated)
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => window.removeEventListener('storage', handleStorage)
  }, [isLoading])

  // Persiste cada cambio de mensajes al storage compartido (debounce 400ms) usando messagesRef
  useEffect(() => {
    if (messages.length <= 1 && messages[0]?.content.includes('Copiloto Estratégico')) {
      // Evita persistir el saludo inicial vacío como historia real
      return
    }

    if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current)
    persistTimerRef.current = window.setTimeout(() => {
      persistSheetMessagesToNovai(messagesRef.current)
    }, 400)

    return () => {
      if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current)
    }
  }, [messages])

  // Update initial message when language changes if user hasn't started conversing
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{
          role: 'assistant',
          content: t('novai.aiWelcomeMessage') || '¡Hola! Soy tu Copiloto Estratégico NovaStore. Puedo analizar tu diagnóstico EFI/EFE, explicarte el vector DAFO, validar la coherencia de tus ponderaciones o ayudarte a formular acciones CAME. ¿En qué te gustaría profundizar hoy?'
        }]
      }

      return prev
    })
  }, [locale, t])

  // Refresca cuota de IA en segundo plano al abrir el sheet (sin machacar mensajes)
  useEffect(() => {
    if (open) {
      void refreshAiQuota()
    }
  }, [open, refreshAiQuota])


  const handleSendMessage = async (customPrompt?: string, isFree = true) => {
    const textToSend = customPrompt || input.trim()

    if (!textToSend || isLoading) return

    if (isFree && aiQuota && !aiQuota.canUseFreeText) {
      toast.error(t('novai.aiFreePlanNotice') || 'El chat libre está disponible en planes Superiores. Selecciona una de las consultas predefinidas.')

      return
    }

    if (aiQuota && aiQuota.limitValue !== null && aiQuota.remaining !== null && aiQuota.remaining <= 0) {
      toast.error(t('novai.aiQuotaExhaustedDesc') || 'Has alcanzado el límite mensual de consultas de tu plan.')

      return
    }

    // Policy diaria §11 — tope 24h por tenant
    const dailyRem = aiQuota?.dailyRemaining ?? aiQuota?.daily?.remaining ?? null
    const dailyLim = aiQuota?.dailyLimitValue ?? aiQuota?.daily?.limitValue ?? null

    if (dailyLim !== null && dailyRem !== null && dailyRem <= 0) {
      toast.error('Has alcanzado el límite diario de consultas IA. Se renueva en 24 horas.')

      return
    }

    const newMessages: AiMessage[] = [
      ...messages,
      { role: 'user', content: textToSend }
    ]

    setMessages([...newMessages, { role: 'assistant', content: '' }])
    if (!customPrompt) setInput('')
    setIsLoading(true)

    // Phase 1 inventario: si es pregunta de conteo, pre-carga inventario tenant-scoped para NovAi
    let inventoryPayload: { total: number, byStatus?: Record<string, number>, recent?: { id: string, title: string, status: string }[] } | undefined
    const isCountQuery = /cu[áa]ntas|cuantas|cu[áa]nta hay|cuantas hay|listar|investigaciones.*tenemos|show investigations/i.test(textToSend)

    if (isCountQuery) {
      try {
        const invRes = await fetch('/api/investigations?page=1&pageSize=5&includeArchived=false', { cache: 'no-store' })

        if (invRes.ok) {
          const invData = await invRes.json() as { total: number, items: { id: string, title: string, status: string }[] }
          const byStatus: Record<string, number> = {}

          for (const it of invData.items) byStatus[it.status] = (byStatus[it.status] || 0) + 1
          inventoryPayload = { total: invData.total, byStatus, recent: invData.items.slice(0, 5).map(r => ({ id: r.id, title: r.title, status: r.status })) }
        }
      } catch {
        // ignore, backend fallback lo intentará también
      }
    }

    try {
      const isInvestigator = Boolean(investigatorCtx?.state?.internal)
      const url = isInvestigator ? '/api/investigations/ai/chat' : '/api/novai/chat'

      const bodyPayload = isInvestigator
        ? {
            messages: newMessages,
            isFreeText: isFree,
            locale,
            state: investigatorCtx?.state,
            ...(inventoryPayload ? { inventory: inventoryPayload } : {})
          }
        : inventoryPayload
          ? {
              messages: newMessages,
              isFreeText: isFree,
              locale,
              context: { app: 'investigator' as const, inventory: inventoryPayload }
            }
          : {
              messages: newMessages,
              isFreeText: isFree,
              locale,
              context: { app: 'general' }
            }

      const controller = new AbortController()
      abortControllerRef.current = controller

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      })


      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))

        throw new Error(errData.error || 'Error al conectar con el Copiloto de IA.')
      }

      if (!response.body) {
        throw new Error('Respuesta vacía del servidor.')
      }

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
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1

                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: accumulatedText
                  }
                }

                return updated
              })
            } else if (data.error) {
              throw new Error(data.error)
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }

      void refreshAiQuota()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'Error en la respuesta de la IA.')
      toast.error(msg)
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1

        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && !updated[lastIdx].content) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `⚠️ No se pudo procesar la consulta: ${msg}`
          }
        }

        return updated
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          floating ? (
            <button
              type='button'
              className='fixed right-4 bottom-4 sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 z-50 group inline-flex h-10 items-center justify-center overflow-hidden rounded-full p-[2px] font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl focus:outline-none cursor-pointer'
            >
              {/* 1. Ambient Glow */}
              <span className='absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 opacity-70 blur-md group-hover:opacity-100 transition duration-500 animate-aurora-glow' />

              {/* 2. Rotating Multicolor Conic Gradient Border */}
              <span className='absolute inset-[-1000%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,#f43f5e_0%,#a855f7_25%,#00f2fe_50%,#10b981_75%,#f43f5e_100%)]' />

              {/* 3. Glassmorphic Inner Body */}
              <span className='relative inline-flex h-full w-full items-center justify-center rounded-full bg-background/95 dark:bg-card/95 px-4 py-2 text-xs font-semibold backdrop-blur-3xl text-foreground gap-2.5 z-10 border border-white/10 dark:border-white/5'>
                <Sparkles className='size-4 text-purple-500 dark:text-purple-400 animate-pulse shrink-0' />
                <span className='tracking-wide'>{t('novai.aiCopilot') || 'Copiloto IA'}</span>
                {aiQuota && (
                  <span className='inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'>
                    {!aiQuota.allowed
                      ? '0'
                      : aiQuota.limitValue === null
                        ? (t('novai.aiUnlimitedQueries') || '∞')
                        : `${aiQuota.remaining ?? 0}`}
                  </span>
                )}
              </span>
            </button>
          ) : (
            <Button
              size='sm'
              variant='outline'
              className='gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-medium text-xs shadow-xs transition-all'
            >
              <Sparkles className='size-3.5 text-primary animate-pulse' />
              <span>{t('novai.aiCopilot') || 'Copiloto IA'}</span>
              {aiQuota && (
                <Badge variant={!aiQuota.allowed ? 'destructive' : 'secondary'} className='h-4.5 px-1.5 text-[10px] font-mono'>
                  {!aiQuota.allowed ? '0' : (aiQuota.remaining !== null ? aiQuota.remaining : '∞')}
                </Badge>
              )}
            </Button>
          )
        }
      />

      <SheetContent side='right' className='sm:max-w-md w-full flex flex-col p-0 gap-0'>
        <SheetHeader className='p-4 border-b space-y-1 shrink-0 pr-10'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-lg bg-primary/10 text-primary'>
              <Sparkles className='size-4' />
            </div>
            <SheetTitle className='text-sm font-bold'>
              {t('novai.aiCopilotTitle') || 'Copiloto Estratégico IA'}
            </SheetTitle>
          </div>
          <SheetDescription className='text-xs'>
            {t('novai.aiCopilotDesc') || 'Asesoría metodológica en tiempo real basada en tu investigación activa.'}
          </SheetDescription>
        </SheetHeader>

        {/* Banner if AI module is not allowed */}
        {aiQuota && !aiQuota.allowed && (
          <div className='m-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1'>
            <p className='font-semibold flex items-center gap-1.5'>
              <ShieldAlert className='size-3.5' />
              <span>Módulo NovAi no habilitado</span>
            </p>
            <p className='text-[11px] opacity-90'>
              Tu plan actual no incluye el módulo de NovAi. Para usarlo actualiza tu plan.
            </p>
          </div>
        )}

        {/* Quick Predefined Prompt Chips (Fluid Horizontal Carousel) */}
        <div className='p-3 border-b bg-muted/20 shrink-0 space-y-1.5 overflow-hidden'>
          <p className='text-[11px] font-medium text-muted-foreground'>
            {t('novai.aiSuggestedPrompts') || 'Consultas rápidas sugeridas:'}
          </p>
          <div className='overflow-x-auto no-scrollbar scroll-smooth -mx-3 px-3 py-0.5'>
            <Suggestions className='flex flex-nowrap gap-2 w-max'>
              {PREDEFINED_PROMPTS.map(p => {
                const IconComponent = PROMPT_ICONS[p.icon] || Activity

                return (
                  <Suggestion
                    key={p.id}
                    disabled={isLoading || (aiQuota !== null && (!aiQuota.allowed || (aiQuota.remaining !== null && aiQuota.remaining <= 0)))}
                    onClick={() => handleSendMessage(p.promptText, false)}
                    suggestion={t(p.titleKey) || p.promptText}
                    className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-background border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all shadow-2xs whitespace-nowrap cursor-pointer h-auto'
                  >
                    <IconComponent className='size-3 text-primary shrink-0' />
                    <span>{t(p.titleKey) || p.promptText}</span>
                  </Suggestion>
                )
              })}
            </Suggestions>
          </div>
        </div>

        {/* Chat Messages List with Conversation */}
        <Conversation className='flex-1 p-0 overflow-y-auto min-h-0'>
          <ConversationContent className='p-4 space-y-4 text-xs'>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'

              return (
                <Message
                  key={i}
                  from={isUser ? 'user' : 'assistant'}
                  className='gap-2.5'
                >
                  <div className={`flex gap-2.5 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className='size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                        <Bot className='size-3.5' />
                      </div>
                    )}
                    <MessageContent
                      className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                        isUser
                          ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs whitespace-pre-wrap'
                          : 'bg-muted/50 border text-foreground rounded-tl-xs overflow-hidden'
                      }`}
                    >
                      {isUser ? (
                        msg.content
                      ) : msg.content ? (
                        <MessageResponse>{msg.content}</MessageResponse>
                      ) : isLoading && i === messages.length - 1 ? (
                        <span className='flex items-center gap-1.5 text-muted-foreground'>
                          <RefreshCw className='size-3 animate-spin' />
                          {t('novai.aiThinking') || 'Pensando y analizando expediente...'}
                        </span>
                      ) : null}
                    </MessageContent>
                    {isUser && (
                      <div className='size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground'>
                        <User className='size-3.5' />
                      </div>
                    )}
                  </div>
                </Message>
              )
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Footer / Input Area with Quota Indicator inside PromptInputFooter */}
        <div className='p-3 border-t bg-background shrink-0 space-y-2 relative'>
          {aiQuota && !aiQuota.allowed ? (
            <div className='p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 flex items-center gap-2 text-xs text-destructive'>
              <Lock className='size-4 shrink-0' />
              <span>
                {t('novai.aiModuleDisabledNotice') || 'El Copiloto IA no está incluido en este plan.'}
              </span>
            </div>
          ) : aiQuota && !aiQuota.canUseFreeText ? (
            <div className='p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300'>
              <Lock className='size-4 shrink-0 text-amber-600' />
              <span>
                {t('novai.aiFreePlanNotice') || 'El chat libre está disponible en planes superiores. Puedes usar los prompts sugeridos de arriba.'}
              </span>
            </div>
          ) : (
            <PromptInput
              onSubmit={(_msg, _evt) => {
                void handleSendMessage()
              }}
              className='rounded-xl border border-border/80 bg-muted/20 shadow-xs'
            >
              <PromptInputTextarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t('novai.aiInputPlaceholder') || 'Pregunta algo sobre tu diagnóstico estratégico...'}
                className='min-h-12 max-h-32 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:outline-none'
              />
              <PromptInputFooter className='flex items-center justify-between p-2 gap-2'>
                {aiQuota && (
                  <Badge
                    variant={!aiQuota.allowed || aiQuota.remaining === 0 ? 'destructive' : 'secondary'}
                    className='h-6 px-2 text-[10px] font-mono gap-1 shrink-0'
                  >
                    <Zap className='size-2.5 text-amber-500' />
                    <span>
                      {!aiQuota.allowed
                        ? (t('novai.aiNotAllowed') || 'Sin IA')
                        : aiQuota.limitValue === null
                          ? (t('novai.aiUnlimitedQueries') || 'Ilimitado')
                          : `${aiQuota.remaining ?? 0}/${aiQuota.limitValue}`}
                    </span>
                  </Badge>
                )}
                <div className='flex items-center gap-1.5 ml-auto'>
                  <PromptInputSubmit
                    status={isLoading ? 'streaming' : 'ready'}
                    onStop={handleStop}
                    disabled={!input.trim() || isLoading || (aiQuota !== null && (!aiQuota.allowed || (aiQuota.remaining !== null && aiQuota.remaining <= 0)))}
                  />
                </div>

              </PromptInputFooter>
            </PromptInput>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

