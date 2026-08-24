'use client'

import { useEffect, useState } from 'react'
import type { InvestigationState, Quadrant } from '@/types/apps/investigator-types'
import type { DafoProposalResponse, DafoRelationshipItem } from '@/features/novai/schema'
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
import { Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { toast } from 'sonner'

const STRENGTH_STYLES: Record<string, { label: string; className: string }> = {
  'null': { label: 'Pendiente', className: 'bg-muted text-muted-foreground' },
  0: { label: '0 · Sin relación', className: 'bg-muted text-muted-foreground' },
  1: { label: '1 · Débil', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  2: { label: '2 · Moderada', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  3: { label: '3 · Fuerte', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }
}

interface DafoAiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: InvestigationState
  onApply: (relationships: DafoRelationshipItem[], mode: 'missing_only' | 'overwrite_all') => void
  isReadOnly?: boolean
}

export function DafoAiModal({
  open,
  onOpenChange,
  state,
  onApply,
  isReadOnly
}: DafoAiModalProps) {
  const { t, locale } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<DafoProposalResponse | null>(null)
  const [activeQuadrantTab, setActiveQuadrantTab] = useState<string>('all')

  const fetchProposal = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/investigator/propose-dafo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: state.metadata?.id,
          state,
          locale
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Error al generar la propuesta DAFO con NovAi.')
      }

      const data: DafoProposalResponse = await response.json()
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

  const handleApply = (mode: 'missing_only' | 'overwrite_all') => {
    if (!proposal || isReadOnly) return
    onApply(proposal.relationships, mode)
    toast.success(t('investigator.dafoAiAppliedToast') || 'Cruces DAFO actualizados con la propuesta de NovAi.')
    onOpenChange(false)
  }

  const factorMap = new Map([...state.internal, ...state.external].map(f => [f.id, f]))

  const displayedRelationships = (proposal?.relationships || []).filter(rel => {
    if (activeQuadrantTab === 'all') return true
    return rel.quadrant === activeQuadrantTab
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[85vh] flex flex-col'>
        <DialogHeader className='border-b pb-3'>
          <DialogTitle className='flex items-center gap-2 text-base font-semibold'>
            <Sparkles className='w-4 h-4 text-primary animate-pulse' />
            {t('investigator.dafoAiModalTitle') || 'Propuesta Inteligente de Cruces DAFO'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {t('investigator.dafoAiModalDesc') ||
              'NovAi ha evaluado las relaciones estratégicas causa-efecto entre tus factores EFI y EFE con rigor metodológico.'}
          </DialogDescription>
        </DialogHeader>

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1'>
          {isLoading && (
            <div className='space-y-4 py-8 text-center'>
              <div className='flex justify-center items-center gap-2 text-primary font-medium'>
                <RefreshCw className='w-4 h-4 animate-spin' />
                <span>{t('investigator.aiGenerating') || 'Analizando factores y generando propuesta estratégica...'}</span>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-24 w-full rounded-xl' />
                ))}
              </div>
              <Skeleton className='h-48 w-full rounded-xl' />
            </div>
          )}

          {error && (
            <div className='p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-2 text-center'>
              <div className='flex items-center justify-center gap-2 font-medium'>
                <AlertTriangle className='w-4 h-4' />
                <span>No se pudo generar la propuesta</span>
              </div>
              <p className='text-xs text-muted-foreground'>{error}</p>
              <Button size='sm' variant='outline' onClick={() => void fetchProposal()} className='mt-2'>
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && proposal && (
            <>
              {/* Summary banner */}
              {proposal.summary && (
                <div className='bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs leading-relaxed text-foreground'>
                  <span className='font-semibold text-primary block mb-1'>💡 Dictamen Metodológico de Cruces:</span>
                  {proposal.summary}
                </div>
              )}

              {/* Quadrant Filters */}
              <div className='flex items-center gap-1.5 border-b pb-2 text-xs flex-wrap'>
                <span className='text-muted-foreground mr-1 font-medium'>Cuadrante:</span>
                {['all', 'FO', 'DO', 'FA', 'DA'].map(quad => (
                  <Button
                    key={quad}
                    size='sm'
                    variant={activeQuadrantTab === quad ? 'default' : 'outline'}
                    className='h-6 text-[11px] px-2.5 rounded-md'
                    onClick={() => setActiveQuadrantTab(quad)}
                  >
                    {quad === 'all' ? `Todos (${proposal.relationships.length})` : quad}
                  </Button>
                ))}
              </div>

              {/* Relationships Preview Grid */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1'>
                {displayedRelationships.map(rel => {
                  const internal = factorMap.get(rel.internalId)
                  const external = factorMap.get(rel.externalId)
                  const strengthKey = rel.strength === null ? 'null' : rel.strength.toString()
                  const style = STRENGTH_STYLES[strengthKey] || STRENGTH_STYLES['0']

                  return (
                    <div
                      key={`${rel.internalId}-${rel.externalId}`}
                      className='border rounded-lg p-2.5 bg-card space-y-1.5 hover:border-primary/40 transition-colors'
                    >
                      <div className='flex items-center justify-between gap-1'>
                        <span className='font-mono font-bold text-xs text-primary'>
                          {rel.internalId} × {rel.externalId}
                        </span>
                        <Badge variant='outline' className={`text-[10px] px-1.5 py-0 ${style.className}`}>
                          {style.label}
                        </Badge>
                      </div>

                      <div className='space-y-0.5'>
                        <p className='font-medium text-foreground text-[11px] truncate'>
                          {internal?.name || rel.internalId}
                        </p>
                        <p className='text-muted-foreground text-[11px] truncate'>
                          {external?.name || rel.externalId}
                        </p>
                      </div>

                      {rel.justification && (
                        <p className='text-[10px] text-muted-foreground/90 italic line-clamp-2 pt-1 border-t'>
                          {rel.justification}
                        </p>
                      )}

                      {rel.evidence && (
                        <p className='text-[9px] text-muted-foreground truncate'>
                          📄 Evidencia: {rel.evidence}
                        </p>
                      )}
                    </div>
                  )
                })}
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
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='text-xs gap-1.5'
                onClick={() => handleApply('missing_only')}
              >
                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                {t('investigator.applyMissingOnly') || 'Completar cruces pendientes'}
              </Button>
              <Button
                variant='default'
                size='sm'
                className='text-xs'
                onClick={() => handleApply('overwrite_all')}
              >
                {t('investigator.applyOverwriteAll') || 'Sobrescribir todos'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
