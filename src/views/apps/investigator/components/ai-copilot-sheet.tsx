'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Lock,
  Bot,
  User,
  Activity,
  Compass,
  Scale,
  ShieldAlert,
  Award,
  RefreshCw,
  Zap,
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

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
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { CodeBlock } from '@/components/ai-elements/code-block'

import { useOptionalInvestigatorAnalysis, fetchInvestigatorAiQuotaShared } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'
import { PREDEFINED_PROMPTS, type AiQuotaInfo } from '@/features/novai/schema'
import type { ToolInvocationItem } from '@/views/apps/novai/types'

const PROMPT_ICONS: Record<string, typeof Activity> = {
  Activity,
  Compass,
  Scale,
  ShieldAlert,
  Award
}

const TOOL_LABELS: Record<string, string> = {
  list_investigations: 'Listar Investigaciones',
  get_investigation_details: 'Consultar Expediente DAFO',
  get_investigations_stats: 'Estadísticas de Investigaciones',
  list_kanban_tasks: 'Consultar Tareas Kanban',
  get_kanban_board_summary: 'Resumen Tablero Kanban',
  list_workspace_members_and_teams: 'Consultar Miembros y Equipos',
  get_tenant_billing_and_quota_info: 'Consultar Cuotas y Facturación',
  record_strategic_memory: 'Guardar Memoria Estratégica'
}

function SheetToolCard({ invocation }: { invocation: ToolInvocationItem }) {
  const label = TOOL_LABELS[invocation.toolName] || invocation.toolName
  const isExecuting = invocation.state === 'call'
  const isCompleted = invocation.state === 'result' && !invocation.isError
  const isError = invocation.isError

  return (
    <Collapsible className='group w-full rounded-lg border border-border/80 bg-muted/30 text-xs overflow-hidden mb-2 transition-all'>
      <CollapsibleTrigger className='flex w-full items-center justify-between gap-2 p-2 hover:bg-muted/50 transition-colors text-left'>
        <div className='flex items-center gap-1.5 min-w-0'>
          <div className='p-1 rounded bg-primary/10 text-primary shrink-0'>
            <Wrench className='size-3' />
          </div>
          <span className='font-medium text-foreground truncate text-[11px]'>{label}</span>
          {isExecuting && (
            <Badge variant='secondary' className='h-4.5 px-1.5 text-[9px] gap-1 shrink-0 font-normal'>
              <Clock className='size-2.5 animate-spin text-amber-500' />
              <span>Ejecutando</span>
            </Badge>
          )}
          {isCompleted && (
            <Badge variant='outline' className='h-4.5 px-1.5 text-[9px] gap-1 shrink-0 font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'>
              <CheckCircle2 className='size-2.5' />
              <span>Completado</span>
            </Badge>
          )}
          {isError && (
            <Badge variant='destructive' className='h-4.5 px-1.5 text-[9px] gap-1 shrink-0 font-normal'>
              <XCircle className='size-2.5' />
              <span>Error</span>
            </Badge>
          )}
        </div>
        <ChevronDown className='size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0' />
      </CollapsibleTrigger>

      <CollapsibleContent className='border-t border-border/60 p-2.5 bg-background/50 space-y-2 text-[10px]'>
        {invocation.args && Object.keys(invocation.args).length > 0 && (
          <div className='space-y-1'>
            <p className='font-semibold text-muted-foreground uppercase tracking-wider text-[9px]'>Parámetros</p>
            <div className='rounded bg-muted/40 p-1.5 overflow-x-auto max-h-28 text-muted-foreground'>
              <CodeBlock code={JSON.stringify(invocation.args, null, 2)} language='json' />
            </div>
          </div>
        )}

        {invocation.result !== undefined && (
          <div className='space-y-1'>
            <p className='font-semibold text-muted-foreground uppercase tracking-wider text-[9px]'>Resultado</p>
            <div className='rounded bg-muted/40 p-1.5 overflow-x-auto max-h-36'>
              <CodeBlock code={JSON.stringify(invocation.result, null, 2)} language='json' />
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export interface SheetChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  reasoning?: string
  toolInvocations?: ToolInvocationItem[]
}

const NOVAI_THREADS_KEY = 'novastore:novai_threads_v2'
const SHEET_THREAD_ID = 'novastore:investigator-sheet-thread'

interface AiCopilotSheetProps {
  floating?: boolean
}

export function AiCopilotSheet({ floating = true }: AiCopilotSheetProps) {
  const { t, locale } = useI18n()
  const investigatorCtx = useOptionalInvestigatorAnalysis()

  const [localQuota, setLocalQuota] = useState<AiQuotaInfo | null>(null)
  const [isLoadingLocalQuota, setIsLoadingLocalQuota] = useState<boolean>(true)
  const [conversationDbId, setConversationDbId] = useState<string | null>(null)

  const aiQuota = investigatorCtx?.aiQuota ?? localQuota
  const isLoadingAiQuota = investigatorCtx ? investigatorCtx.isLoadingAiQuota : isLoadingLocalQuota

  const refreshAiQuota = useCallback(async () => {
    if (investigatorCtx) {
      await investigatorCtx.refreshAiQuota()
      return
    }

    setIsLoadingLocalQuota(true)
    try {
      const data = await fetchInvestigatorAiQuotaShared()
      if (data) {
        setLocalQuota(data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLocalQuota(false)
    }
  }, [investigatorCtx])

  const [open, setOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const [messages, setMessages] = useState<SheetChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('novai.aiWelcomeMessage') || '¡Hola! Soy tu Copiloto Estratégico NovaResearch. Puedo analizar tu diagnóstico EFI/EFE, explicarte el vector DAFO, validar la coherencia de tus ponderaciones o ayudarte a formular acciones CAME. ¿En qué te gustaría profundizar hoy?'
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Sincronización con base de datos al abrir el panel (lazy loading bajo demanda)
  useEffect(() => {
    if (!open) return

    let isMounted = true

    const initThread = async () => {
      try {
        const res = await fetch('/api/novai/conversations', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.conversations) && data.conversations.length > 0) {
            const investigatorConv = data.conversations.find((c: { app_context?: string }) => c.app_context === 'investigator') || data.conversations[0]
            if (investigatorConv?.id && isMounted) {
              setConversationDbId(investigatorConv.id)

              // Fetch messages
              const msgRes = await fetch(`/api/novai/conversations/${investigatorConv.id}`, { cache: 'no-store' })
              if (msgRes.ok) {
                const msgData = await msgRes.json()
                if (Array.isArray(msgData.messages) && msgData.messages.length > 0) {
                  const mapped = msgData.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
                    id: m.id,
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: m.created_at
                  }))
                  setMessages(mapped)
                  setShowSuggestions(false)
                  return
                }
              }
            }
          }
        }
      } catch {
        // fallback to localStorage
      }

      // Fallback a localStorage
      try {
        const raw = localStorage.getItem(NOVAI_THREADS_KEY)
        if (raw && isMounted) {
          const threads = JSON.parse(raw)
          const dedicated = threads.find((t: { id: string }) => t.id === SHEET_THREAD_ID)
          if (dedicated && Array.isArray(dedicated.messages) && dedicated.messages.length > 0) {
            setMessages(dedicated.messages)
            setShowSuggestions(false)
          }
        }
      } catch {
        // ignore
      }
    }

    void initThread()

    return () => {
      isMounted = false
    }
  }, [open])

  // Refresca cuota al abrir el sheet
  useEffect(() => {
    if (open) {
      void refreshAiQuota()
    }
  }, [open, refreshAiQuota])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  const handleSendMessage = async (customPrompt?: string, isFree = true) => {
    const textToSend = customPrompt || input.trim()
    if (!textToSend || isLoading) return

    // Oculta sugerencias al enviar
    setShowSuggestions(false)

    if (isFree && aiQuota && !aiQuota.canUseFreeText) {
      toast.error(t('novai.aiFreePlanNotice') || 'El chat libre está disponible en planes Superiores. Selecciona una de las consultas predefinidas.')
      return
    }

    if (aiQuota && aiQuota.limitValue !== null && aiQuota.remaining !== null && aiQuota.remaining <= 0) {
      toast.error(t('novai.aiQuotaExhaustedDesc') || 'Has alcanzado el límite mensual de consultas de tu plan.')
      return
    }

    const dailyRem = aiQuota?.dailyRemaining ?? aiQuota?.daily?.remaining ?? null
    const dailyLim = aiQuota?.dailyLimitValue ?? aiQuota?.daily?.limitValue ?? null

    if (dailyLim !== null && dailyRem !== null && dailyRem <= 0) {
      toast.error('Has alcanzado el límite diario de consultas IA. Se renueva en 24 horas.')
      return
    }

    const userMsg: SheetChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    }

    const assistantMsg: SheetChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...messages, userMsg, assistantMsg]
    setMessages(updatedMessages)
    if (!customPrompt) setInput('')
    setIsLoading(true)

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const apiMessages = updatedMessages
        .filter(m => m.content || m.role === 'user')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/novai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationDbId || undefined,
          messages: apiMessages,
          isFreeText: isFree,
          locale,
          context: {
            app: 'investigator',
            mode: 'CONSULTANT'
          }
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al conectar con el Copiloto de IA.')
      }

      if (!response.body) throw new Error('Respuesta vacía.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''
      let accumulatedReasoning = ''
      let currentToolInvocations: ToolInvocationItem[] = []

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
            } else if (data.type === 'reasoning') {
              accumulatedReasoning += data.textDelta || ''
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
              if (existingIdx === -1) {
                currentToolInvocations = [...currentToolInvocations, newInvocation]
              } else {
                currentToolInvocations = currentToolInvocations.map((t, idx) => idx === existingIdx ? newInvocation : t)
              }
            } else if (data.type === 'tool-result') {
              const callId = data.id || data.toolCallId
              const toolName = data.tool || data.toolName
              currentToolInvocations = currentToolInvocations.map(t => {
                if ((callId && t.toolCallId === callId) || (toolName && t.toolName === toolName)) {
                  return {
                    ...t,
                    state: 'result',
                    result: data.result,
                    isError: data.isError
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

            setMessages(prev => {
              const copy = [...prev]
              const lastIdx = copy.length - 1
              if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                copy[lastIdx] = {
                  ...copy[lastIdx],
                  content: accumulatedText,
                  reasoning: accumulatedReasoning || undefined,
                  toolInvocations: currentToolInvocations.length > 0 ? [...currentToolInvocations] : undefined
                }
              }
              return copy
            })
          } catch {
            // ignore partial JSON parse error
          }
        }
      }

      void refreshAiQuota()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'Error en la respuesta.')
      toast.error(msg)
      setMessages(prev => {
        const copy = [...prev]
        const lastIdx = copy.length - 1
        if (lastIdx >= 0 && copy[lastIdx].role === 'assistant' && !copy[lastIdx].content) {
          copy[lastIdx] = {
            ...copy[lastIdx],
            content: `⚠️ Error al procesar: ${msg}`
          }
        }
        return copy
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          floating ? (
            <Button
              className='fixed right-4 bottom-4 sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 z-50 shadow-2xl rounded-full gap-2 px-4 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border border-white/20 transition-all hover:scale-105 active:scale-95'
              aria-label={t('novai.openAiCopilot') || 'Abrir Copiloto IA'}
            >
              <div className='relative flex items-center justify-center'>
                <Sparkles className='size-5 animate-pulse' />
                <span className='absolute -top-1 -right-1 flex size-2'>
                  <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                  <span className='relative inline-flex rounded-full size-2 bg-emerald-500'></span>
                </span>
              </div>
              <span className='font-semibold text-sm'>NovAi Copilot</span>
              {aiQuota && (
                <Badge
                  variant='secondary'
                  className='ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 hover:bg-white/30 text-white border-0'
                >
                  {!aiQuota.allowed ? '0' : (aiQuota.remaining !== null ? aiQuota.remaining : '∞')}
                </Badge>
              )}
            </Button>
          ) : (
            <Button
              variant='outline'
              size='sm'
              className='gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary'
              aria-label={t('novai.openAiCopilot') || 'Abrir Copiloto IA'}
            >
              <Sparkles className='size-3.5 animate-pulse' />
              <span className='text-xs font-semibold'>NovAi</span>
              {aiQuota && (
                <Badge
                  variant={!aiQuota.allowed || aiQuota.remaining === 0 ? 'destructive' : 'secondary'}
                  className='text-[9px] px-1 py-0 h-4 font-mono'
                >
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
            {t('novai.aiCopilotDesc')}
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

        {/* Chat Messages List with Conversation */}
        <Conversation className='flex-1 p-0 overflow-y-auto min-h-0'>
          <ConversationContent className='p-4 space-y-4 text-xs'>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'

              return (
                <Message
                  key={msg.id || i}
                  from={isUser ? 'user' : 'assistant'}
                  className='gap-2.5'
                >
                  <div className={`flex gap-2.5 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className='size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5'>
                        <Bot className='size-3.5' />
                      </div>
                    )}
                    <div className='flex flex-col gap-1.5 max-w-[85%]'>
                      {/* Tool Invocations */}
                      {!isUser && msg.toolInvocations && msg.toolInvocations.length > 0 && (
                        <div className='space-y-1'>
                          {msg.toolInvocations.map(inv => (
                            <SheetToolCard key={inv.toolCallId} invocation={inv} />
                          ))}
                        </div>
                      )}

                      {/* Reasoning Trace */}
                      {!isUser && msg.reasoning && (
                        <Reasoning className='mb-1'>
                          <ReasoningTrigger />
                          <ReasoningContent className='text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-2.5 rounded border'>
                            {msg.reasoning}
                          </ReasoningContent>
                        </Reasoning>
                      )}

                      {/* Message Content */}
                      <MessageContent
                        className={`rounded-xl p-3 leading-relaxed ${
                          isUser
                            ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs whitespace-pre-wrap'
                            : 'bg-muted/50 border text-foreground rounded-tl-xs overflow-hidden'
                        }`}
                      >
                        {isUser ? (
                          msg.content
                        ) : msg.content ? (
                          <MessageResponse>{msg.content}</MessageResponse>
                        ) : isLoading && i === messages.length - 1 && (!msg.toolInvocations || msg.toolInvocations.length === 0) ? (
                          <span className='flex items-center gap-1.5 text-muted-foreground'>
                            <RefreshCw className='size-3 animate-spin text-primary' />
                            {t('novai.aiThinking') || 'Pensando y analizando expediente...'}
                          </span>
                        ) : null}
                      </MessageContent>
                    </div>
                    {isUser && (
                      <div className='size-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground'>
                        <User className='size-3.5' />
                      </div>
                    )}
                  </div>
                </Message>
              )
            })}

            {/* 2. Floating Suggestions Inside Chat Flow (Disappears upon interaction) */}
            {showSuggestions && (
              <div className='my-3 pt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                <p className='text-[11px] font-medium text-muted-foreground'>
                  {t('novai.aiSuggestedPrompts') || 'Consultas rápidas sugeridas:'}
                </p>
                <Suggestions className='flex flex-wrap gap-1.5'>
                  {PREDEFINED_PROMPTS.map(p => {
                    const IconComponent = PROMPT_ICONS[p.icon] || Activity

                    return (
                      <Suggestion
                        key={p.id}
                        disabled={isLoading || (aiQuota !== null && (!aiQuota.allowed || (aiQuota.remaining !== null && aiQuota.remaining <= 0)))}
                        onClick={() => {
                          setShowSuggestions(false)
                          void handleSendMessage(p.promptText, false)
                        }}
                        suggestion={t(p.titleKey) || p.promptText}
                        className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-background border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all shadow-2xs cursor-pointer h-auto text-left'
                      >
                        <IconComponent className='size-3 text-primary shrink-0' />
                        <span>{t(p.titleKey) || p.promptText}</span>
                      </Suggestion>
                    )
                  })}
                </Suggestions>
              </div>
            )}
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
