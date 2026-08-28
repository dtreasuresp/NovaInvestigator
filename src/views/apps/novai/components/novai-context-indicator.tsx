'use client'

import { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage } from '@/components/ai-elements/context'
import type { LanguageModelUsage } from 'ai'

interface NovaiContextIndicatorProps {
  usedTokens?: number
  maxTokens?: number
  usage?: LanguageModelUsage & { cachedInputTokens?: number; reasoningTokens?: number }
  modelId?: string
  className?: string
  // estimated fallback when provider doesn't report usage
  estimatedUsed?: number
  estimatedMax?: number
}

function getHealthLevel(pct: number): { label: string; color: string } {
  if (pct < 0.6) return { label: 'Saludable', color: 'text-chart-2' }
  if (pct < 0.8) return { label: 'Moderado', color: 'text-chart-4' }
  if (pct < 0.9) return { label: 'Atención', color: 'text-chart-1' }
  return { label: 'Crítico', color: 'text-destructive' }
}

export function NovaiContextIndicator({ usedTokens, maxTokens, usage, modelId, className = '', estimatedUsed, estimatedMax }: NovaiContextIndicatorProps) {
  const hasRealUsage = typeof usedTokens === 'number' && typeof maxTokens === 'number' && maxTokens > 0
  const hasEstimated = typeof estimatedUsed === 'number' && typeof estimatedMax === 'number'

  if (!hasRealUsage && !hasEstimated) return null

  const displayUsed = hasRealUsage ? usedTokens! : estimatedUsed!
  const displayMax = hasRealUsage ? maxTokens! : estimatedMax!
  const rawUsage = usage as unknown as { inputTokens?: number; outputTokens?: number; totalTokens?: number; promptTokens?: number; completionTokens?: number; reasoningTokens?: number; cachedInputTokens?: number } | undefined
  const displayUsage: LanguageModelUsage | undefined = rawUsage ? {
    inputTokens: rawUsage.inputTokens ?? rawUsage.promptTokens,
    outputTokens: rawUsage.outputTokens ?? rawUsage.completionTokens,
    totalTokens: rawUsage.totalTokens,
    reasoningTokens: rawUsage.reasoningTokens,
    cachedInputTokens: rawUsage.cachedInputTokens,
  } as unknown as LanguageModelUsage : hasEstimated ? { inputTokens: Math.round(displayUsed * 0.7), outputTokens: Math.round(displayUsed * 0.3), totalTokens: displayUsed } as unknown as LanguageModelUsage : undefined

  const pct = displayUsed / displayMax
  const health = getHealthLevel(pct)
  const isEstimated = !hasRealUsage

  return (
    <div className={className}>
      <Context usedTokens={displayUsed} maxTokens={displayMax} usage={displayUsage} modelId={modelId} >
      <ContextTrigger
        aria-label={`Contexto ${Math.round(pct * 100)}% ${health.label}${isEstimated ? ' estimado' : ''}`}
        className='h-6 px-2 gap-1.5 text-xs rounded-full border border-border/60 bg-background hover:bg-muted text-muted-foreground'
      >
        <span className={`font-medium ${health.color}`}>Contexto {Math.round(pct * 100)}%</span>
        {isEstimated && <span className='text-xs opacity-60'>(est.)</span>}
      </ContextTrigger>
      <ContextContent className='w-72'>
        <ContextContentHeader />
        <ContextContentBody className='space-y-1.5'>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
          <div className='flex items-center justify-between text-xs pt-2 border-t border-border/40'>
            <span className='text-muted-foreground'>Estado</span>
            <span className={`font-medium ${health.color}`}>{health.label}</span>
          </div>
          {isEstimated && <p className='text-xs text-muted-foreground/70'>Estimación heurística — el proveedor no reportó uso real.</p>}
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
    </div>
  )
}
