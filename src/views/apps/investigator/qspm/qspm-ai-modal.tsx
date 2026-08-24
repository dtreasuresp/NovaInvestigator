'use client'

import { useEffect, useState } from 'react'
import type { InvestigationState, Strategy } from '@/types/apps/investigator-types'
import type { QspmProposalResponse } from '@/features/novai/schema'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Star } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { toast } from 'sonner'

interface QspmAiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: InvestigationState
  onApply: (scores: Record<string, Record<string, number | null>>, strategies?: Strategy[]) => void
  isReadOnly?: boolean
}

export function QspmAiModal({
  open,
  onOpenChange,
  state,
  onApply,
  isReadOnly
}: QspmAiModalProps) {
  const { t, locale } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<QspmProposalResponse | null>(null)

  const fetchProposal = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/novai/investigator/propose-qspm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: state.metadata?.id,
          state,
          proposeStrategiesIfEmpty: true,
          locale
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Error al generar la propuesta QSPM con NovAi.')
      }

      const data: QspmProposalResponse = await response.json()
      setProposal(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al consultar a NovAi.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && !proposal && !isLoading) {
      void fetchProposal()
    }
  }, [open])

  const handleApply = () => {
    if (!proposal || isReadOnly) return

    let convertedStrategies: Strategy[] | undefined

    if (proposal.proposedStrategies && proposal.proposedStrategies.length > 0) {
      convertedStrategies = proposal.proposedStrategies.map(s => ({
        id: s.id,
        name: s.name,
        quadrant: s.quadrant,
        orientation: '',
        description: s.description,
        relatedFactors: [],
        observations: ''
      }))
    }

    onApply(proposal.qspmScores, convertedStrategies)
    toast.success(t('investigator.qspmAiAppliedToast') || 'Matriz QSPM actualizada con la propuesta de NovAi.')
    onOpenChange(false)
  }

  const allFactors = [...(state.internal || []), ...(state.external || [])]
  const factorMap = new Map(allFactors.map(f => [f.id, f]))

  // Strategies to display: existing + proposed
  const strategiesList = [
    ...state.strategies,
    ...(proposal?.proposedStrategies || []).filter(
      ps => !state.strategies.some(s => s.id === ps.id)
    )
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[85vh] flex flex-col'>
        <DialogHeader className='border-b pb-3'>
          <DialogTitle className='flex items-center gap-2 text-base font-semibold'>
            <Sparkles className='w-4 h-4 text-primary animate-pulse' />
            {t('investigator.qspmAiModalTitle') || 'Propuesta de Atractivo Cuantitativo (QSPM)'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {t('investigator.qspmAiModalDesc') ||
              'NovAi ha evaluado las calificaciones de atractivo (AS 1 a 4) según la metodología de Fred David.'}
          </DialogDescription>
        </DialogHeader>

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1'>
          {isLoading && (
            <div className='space-y-4 py-8 text-center'>
              <div className='flex justify-center items-center gap-2 text-primary font-medium'>
                <RefreshCw className='w-4 h-4 animate-spin' />
                <span>{t('investigator.aiGenerating') || 'Evaluando alternativas estratégicas y calculando atractivos AS...'}</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'>
                <Skeleton className='h-28 w-full rounded-xl' />
                <Skeleton className='h-28 w-full rounded-xl' />
              </div>
              <Skeleton className='h-40 w-full rounded-xl' />
            </div>
          )}

          {error && (
            <div className='p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-2 text-center'>
              <div className='flex items-center justify-center gap-2 font-medium'>
                <AlertTriangle className='w-4 h-4' />
                <span>No se pudo generar la propuesta QSPM</span>
              </div>
              <p className='text-xs text-muted-foreground'>{error}</p>
              <Button size='sm' variant='outline' onClick={() => void fetchProposal()} className='mt-2'>
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && proposal && (
            <>
              {/* Rationale banner */}
              {proposal.rationale && (
                <div className='bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs leading-relaxed text-foreground'>
                  <span className='font-semibold text-primary block mb-1'>📊 Fundamentación Metodológica:</span>
                  {proposal.rationale}
                </div>
              )}

              {/* Proposed Strategies Banner (if any) */}
              {proposal.proposedStrategies && proposal.proposedStrategies.length > 0 && (
                <div className='space-y-2'>
                  <span className='font-semibold text-xs text-foreground block'>
                    ✨ Alternativas Estratégicas Formuladas por NovAi ({proposal.proposedStrategies.length}):
                  </span>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                    {proposal.proposedStrategies.map(strat => (
                      <div key={strat.id} className='border rounded-lg p-2.5 bg-muted/30 space-y-1'>
                        <div className='flex items-center justify-between'>
                          <span className='font-mono font-bold text-xs text-primary'>{strat.id}</span>
                          <Badge variant='outline' className='text-[10px]'>{strat.quadrant}</Badge>
                        </div>
                        <h5 className='font-semibold text-[11px] text-foreground'>{strat.name}</h5>
                        {strat.description && (
                          <p className='text-[10px] text-muted-foreground line-clamp-2'>{strat.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matrix Scores Summary */}
              <div className='space-y-2'>
                <span className='font-semibold text-xs text-foreground block'>
                  Resumen de Puntuaciones AS por Alternativa:
                </span>
                <div className='space-y-2'>
                  {strategiesList.map(strat => {
                    const scores = proposal.qspmScores[strat.id] || {}
                    const scoredCount = Object.values(scores).filter(v => v !== null && v !== undefined && v > 0).length

                    return (
                      <div key={strat.id} className='border rounded-lg p-2.5 bg-card space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-bold text-xs text-primary'>{strat.id}</span>
                            <span className='font-medium text-xs text-foreground'>{strat.name}</span>
                          </div>
                          <Badge variant='outline' className='text-[10px] gap-1'>
                            <Star className='w-3 h-3 text-amber-500 fill-amber-500' />
                            {scoredCount} / {allFactors.length} evaluados
                          </Badge>
                        </div>

                        {/* Factor scores tags preview */}
                        <div className='flex flex-wrap gap-1 pt-1'>
                          {allFactors.slice(0, 10).map(f => {
                            const score = scores[f.id]
                            if (!score) return null
                            return (
                              <span
                                key={f.id}
                                className='text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono'
                                title={`${f.id}: ${f.name} (AS: ${score})`}
                              >
                                {f.id}: <strong>{score}★</strong>
                              </span>
                            )
                          })}
                          {allFactors.length > 10 && (
                            <span className='text-[10px] text-muted-foreground self-center'>
                              +{allFactors.length - 10} más
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className='border-t pt-3 flex items-center justify-between sm:justify-between gap-2 flex-wrap'>
          <Button variant='ghost' size='sm' onClick={() => onOpenChange(false)} className='text-xs'>
            {t('common.cancel')}
          </Button>

          {!isReadOnly && proposal && (
            <Button
              variant='default'
              size='sm'
              className='text-xs gap-1.5'
              onClick={handleApply}
            >
              <CheckCircle2 className='w-3.5 h-3.5' />
              {t('investigator.applyQspmScores') || 'Aplicar calificaciones a la matriz'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
