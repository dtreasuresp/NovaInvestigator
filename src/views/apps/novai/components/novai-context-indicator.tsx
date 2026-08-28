'use client'

import type { LanguageModelUsage } from 'ai'

import { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage } from '@/components/ai-elements/context'

interface NovaiContextIndicatorProps {
  usedTokens?: number
  maxTokens?: number
  usage?: LanguageModelUsage
  modelId?: string
  className?: string
  
  // estimated fallback when provider doesn't report usage
  estimatedUsed?: number
  estimatedMax?: number
}

export function NovaiContextIndicator({ usedTokens, maxTokens, usage, modelId, className = '', estimatedUsed, estimatedMax }: NovaiContextIndicatorProps) {
  const hasRealUsage = typeof usedTokens === 'number' && typeof maxTokens === 'number' && maxTokens > 0
  const hasEstimated = typeof estimatedUsed === 'number' && typeof estimatedMax === 'number'

  if (!hasRealUsage && !hasEstimated) return null

  const displayUsed = hasRealUsage ? usedTokens! : estimatedUsed!
  const displayMax = hasRealUsage ? maxTokens! : estimatedMax!

  const rawUsage = usage as unknown as { inputTokens?: number; outputTokens?: number; totalTokens?: number; promptTokens?: number; completionTokens?: number; reasoningTokens?: number; cachedInputTokens?: number } | undefined
  
  const displayUsage = (rawUsage ? {
    inputTokens: rawUsage.inputTokens ?? rawUsage.promptTokens,
    outputTokens: rawUsage.outputTokens ?? rawUsage.completionTokens,
    totalTokens: rawUsage.totalTokens,
    cachedInputTokens: rawUsage.cachedInputTokens,
    reasoningTokens: rawUsage.reasoningTokens,
  } : hasEstimated ? { 
    inputTokens: Math.round(displayUsed * 0.7), 
    outputTokens: Math.round(displayUsed * 0.3), 
    totalTokens: displayUsed 
  } : undefined) as unknown as LanguageModelUsage | undefined

  return (
    <div className={className}>
      <Context usedTokens={displayUsed} maxTokens={displayMax} usage={displayUsage} modelId={modelId}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
            <ContextCacheUsage />
          </ContextContentBody>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    </div>
  )
}