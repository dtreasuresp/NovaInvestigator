'use client'

import { useState, useMemo } from 'react'
import { Sparkles, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Message, MessageContent, MessageResponse, MessageActions } from '@/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import type { ChatMessage } from '../types'
import { NovaiActivityTask } from './novai-activity-task'
import { NovaiSourcesGroup } from './novai-sources-group'
import { NovaiContextIndicator } from './novai-context-indicator'

interface NovaiMessageItemProps {
  message: ChatMessage
  isLast: boolean
  isLoading: boolean
  onRegenerate?: () => void
}

export function NovaiMessageItem({ message, isLast, isLoading, onRegenerate }: NovaiMessageItemProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // Estimar uso de tokens para Context indicator (fallback estimado si no hay usage real)
  const estimatedTokens = useMemo(() => {
    if (message.usage?.totalTokens) return { used: message.usage.totalTokens, max: 32768, isEstimated: !!message.usage.isEstimated }
    const chars = message.content.length + (message.reasoning?.length ?? 0) + JSON.stringify(message.toolInvocations ?? []).length
    const est = Math.ceil(chars / 3.2)
    return { used: est, max: 32768, isEstimated: true }
  }, [message.content, message.reasoning, message.toolInvocations, message.usage])

  const hasActivity = Boolean((message.agentTraces && message.agentTraces.length > 0) || (message.toolInvocations && message.toolInvocations.length > 0))
  const hasSources = Boolean((message.sources && message.sources.length > 0) || (message.evidences && message.evidences.length > 0))
  const hasReasoning = Boolean(message.reasoning && message.reasoning.trim().length > 0)

  if (isUser) {
    return (
      <Message from='user' className='max-w-3xl mx-auto w-full py-1'>
        <div className='flex items-start justify-end gap-2.5 w-full group'>
          <MessageContent className='max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-muted/80 dark:bg-muted px-4 py-2.5 text-sm text-foreground shadow-2xs border border-border/40'>
            <p className='whitespace-pre-wrap leading-relaxed'>{message.content}</p>
          </MessageContent>
        </div>
      </Message>
    )
  }

  return (
    <Message from='assistant' className='max-w-3xl mx-auto w-full py-3'>
      <div className='flex items-start gap-3 w-full group'>
        <div className='size-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0 mt-1 shadow-2xs' aria-hidden>
          <Sparkles className='size-4' />
        </div>

        <div className='flex-1 space-y-3 min-w-0'>
          {/* 1. Reasoning — observable, no CoT privado */}
          {hasReasoning && (
            <Reasoning isStreaming={!!message.isStreaming} className='mb-1'>
              <ReasoningTrigger>
                <span className='flex items-center gap-1.5 text-xs'>
                  <span aria-hidden>🧠</span>
                  <span>{message.isStreaming ? 'Analizando...' : 'Análisis completado'}</span>
                </span>
              </ReasoningTrigger>
              <ReasoningContent className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-xl border border-border/60'>
                {message.reasoning!}
              </ReasoningContent>
            </Reasoning>
          )}
          {isLoading && isLast && !hasReasoning && !hasActivity && !message.content && (
            <div className='flex items-center gap-2 text-xs text-muted-foreground py-1' role='status' aria-live='polite'>
              <RefreshCw className='size-3.5 animate-spin text-primary' aria-hidden />
              <span>Analizando solicitud...</span>
            </div>
          )}

          {/* 2. Activity · N pasos — single Task, estados reales */}
          {hasActivity && (
            <NovaiActivityTask traces={message.agentTraces} toolInvocations={message.toolInvocations} isStreaming={!!message.isStreaming} />
          )}

          {/* 3. Sources — agrupadas, no 10 tarjetas */}
          {hasSources && (
            <NovaiSourcesGroup sources={message.sources} evidences={message.evidences} />
          )}

          {/* 4. Response — elemento visual dominante */}
          <div className='text-sm leading-relaxed text-foreground prose prose-sm max-w-none prose-p:my-2 prose-headings:font-semibold'>
            {message.content ? (
              <MessageResponse className='[&>p]:my-3 [&>h3]:mt-6 [&>h3]:mb-3'>{message.content}</MessageResponse>
            ) : isLoading && isLast ? (
              <div className='flex items-center gap-2 text-xs text-muted-foreground py-2' role='status' aria-live='polite'>
                <RefreshCw className='size-3.5 animate-spin text-primary' aria-hidden />
                <span>Formulando respuesta...</span>
              </div>
            ) : null}
            {message.isStreaming && <span className='inline-block size-2 rounded-full bg-foreground animate-pulse ml-1 align-middle' aria-hidden />}
            {message.error && (
              <div className='mt-3 p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-start gap-2' role='alert'>
                <AlertCircle className='size-4 shrink-0 mt-0.5' aria-hidden />
                <span>{message.error}</span>
              </div>
            )}
          </div>

          {/* 5. Context + Actions — discreto, bajo demanda */}
          {!message.isStreaming && message.content && (
            <div className='flex items-center justify-between gap-2 pt-1 border-t border-border/30 mt-2'>
              <MessageActions className='opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity text-xs gap-1'>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='icon-xs'
                        variant='ghost'
                        onClick={handleCopy}
                        aria-label='Copiar respuesta'
                        className='size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted'
                      />
                    }
                  >
                    {copied ? <Check className='size-3 text-chart-2' aria-hidden /> : <Copy className='size-3' aria-hidden />}
                  </TooltipTrigger>
                  <TooltipContent><p>{copied ? 'Copiado' : 'Copiar respuesta'}</p></TooltipContent>
                </Tooltip>
                {isLast && onRegenerate && !isLoading && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size='icon-xs'
                          variant='ghost'
                          onClick={onRegenerate}
                          aria-label='Regenerar respuesta'
                          className='size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted'
                        />
                      }
                    >
                      <RefreshCw className='size-3' aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent><p>Regenerar respuesta</p></TooltipContent>
                  </Tooltip>
                )}
              </MessageActions>
              <NovaiContextIndicator
                usedTokens={message.usage?.totalTokens ?? estimatedTokens.used}
                maxTokens={32768}
                usage={message.usage ? { inputTokens: message.usage.promptTokens ?? 0, outputTokens: message.usage.completionTokens ?? 0, totalTokens: message.usage.totalTokens ?? 0, cachedInputTokens: message.usage.cachedTokens, reasoningTokens: message.usage.reasoningTokens } as never : undefined}
                modelId={message.model}
                estimatedUsed={estimatedTokens.used}
                estimatedMax={estimatedTokens.max}
              />
            </div>
          )}
          {message.isStreaming && (
            <div className='flex justify-end'>
              <NovaiContextIndicator usedTokens={estimatedTokens.used} maxTokens={estimatedTokens.max} estimatedUsed={estimatedTokens.used} estimatedMax={estimatedTokens.max} />
            </div>
          )}
        </div>
      </div>
    </Message>
  )
}
