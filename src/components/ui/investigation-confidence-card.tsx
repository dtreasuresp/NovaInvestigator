'use client'

import * as React from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Sliders,
  Compass,
  FileCheck2
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { RelationsAnalysis, InvestigationState, ValidationResult } from '@/types/apps/investigator-types'
import { ORIENTATIONS } from '@/utils/investigator/domain'

export interface InvestigationConfidenceCardProps {
  analysis: {
    relations: RelationsAnalysis
  }
  state: InvestigationState
  validation: ValidationResult
  onOpenAiReport?: () => void
  className?: string
}

export function InvestigationConfidenceCard({
  analysis,
  state,
  validation,
  onOpenAiReport,
  className
}: InvestigationConfidenceCardProps) {
  const { relations } = analysis
  const { confidence, coverage, difference, dominant, second } = relations

  // 1. Calculate numerical confidence score (0 - 100)
  const confidenceScore = React.useMemo(() => {
    if (relations.evaluatedCount === 0 || !dominant) return 15

    let score = 30 // Base

    // Coverage factor (up to 35 pts)
    score += Math.min(35, Math.round(coverage * 35))

    // Difference / Vector clarity factor (up to 20 pts)
    if (difference >= 0.2) score += 20
    else if (difference >= 0.1) score += 12
    else score += 5 // Ambivalent

    // Validation factor (up to 15 pts)
    if (validation.valid) score += 15
    else if (validation.errors === 0) score += 8

    return Math.min(100, Math.max(10, score))
  }, [relations.evaluatedCount, dominant, coverage, difference, validation.valid, validation.errors])

  // 2. CAME coverage check (critical weaknesses and threats covered by actions)
  const cameCoverage = React.useMemo(() => {
    const internal = Array.isArray(state.internal) ? state.internal : []
    const external = Array.isArray(state.external) ? state.external : []
    const cameActions = Array.isArray(state.cameActions) ? state.cameActions : []

    const criticalWeaknesses = internal.filter(f => f.type === 'D' && Number(f.rating) <= 2)
    const severeThreats = external.filter(f => f.type === 'A' && Number(f.rating) <= 2)
    const totalCritical = criticalWeaknesses.length + severeThreats.length

    if (totalCritical === 0) return { covered: 0, total: 0, percentage: 100, unmitigatedCount: 0 }

    // Count factors mentioned or linked in actions
    const actionFactorIds = new Set<string>()
    cameActions.forEach(a => {
      if (a.factorId) actionFactorIds.add(a.factorId)
    })

    let coveredCount = 0
    criticalWeaknesses.forEach(w => {
      if (actionFactorIds.has(w.id) || cameActions.some(a => a.action?.toLowerCase().includes(w.name.toLowerCase()))) {
        coveredCount++
      }
    })
    severeThreats.forEach(t => {
      if (actionFactorIds.has(t.id) || cameActions.some(a => a.action?.toLowerCase().includes(t.name.toLowerCase()))) {
        coveredCount++
      }
    })

    const percentage = Math.round((coveredCount / totalCritical) * 100)
    return {
      covered: coveredCount,
      total: totalCritical,
      percentage,
      unmitigatedCount: totalCritical - coveredCount
    }
  }, [state.internal, state.external, state.cameActions])

  // 3. Status configuration
  const isHigh = confidence === 'alta'
  const isMedium = confidence === 'media'
  const isAmbivalent = difference < 0.1 && Boolean(second)

  const dominantName = dominant ? (ORIENTATIONS[dominant]?.name ?? dominant) : '—'
  const secondName = second ? (ORIENTATIONS[second]?.name ?? second) : '—'

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3'>
        <div className='flex items-center gap-2.5'>
          <div
            className={cn(
              'size-8 rounded-xl flex items-center justify-center border shadow-xs',
              isHigh && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              isMedium && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
              !isHigh && !isMedium && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            )}
          >
            {isHigh ? (
              <ShieldCheck className='size-4' />
            ) : isMedium ? (
              <AlertTriangle className='size-4' />
            ) : (
              <AlertCircle className='size-4' />
            )}
          </div>
          <div>
            <h4 className='font-semibold text-sm text-foreground tracking-tight'>Nivel de Confianza Metodológica</h4>
            <p className='text-xs text-muted-foreground'>Auditoría cuantitativa de solidez, cobertura y consistencia</p>
          </div>
        </div>

        <Badge
          variant={isHigh ? 'secondary' : isMedium ? 'outline' : 'destructive'}
          className={cn(
            'px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
            isHigh && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            isMedium && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          )}
        >
          {isHigh ? 'Confianza Alta' : isMedium ? 'Confianza Media' : 'Confianza Baja'}
        </Badge>
      </div>

      {/* Main Score & Diagnosis Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
        {/* Metric Gauge Box */}
        <div className='flex flex-col items-center justify-center p-3.5 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1.5'>
          <div className='relative flex items-center justify-center'>
            <span
              className={cn(
                'text-3xl font-extrabold tracking-tight font-mono',
                isHigh && 'text-emerald-600 dark:text-emerald-400',
                isMedium && 'text-amber-600 dark:text-amber-400',
                !isHigh && !isMedium && 'text-rose-600 dark:text-rose-400'
              )}
            >
              {confidenceScore} %
            </span>
          </div>
          <Progress
            value={confidenceScore}
            className={cn(
              'h-1.5 w-28',
              isHigh && '[&>div]:bg-emerald-500',
              isMedium && '[&>div]:bg-amber-500',
              !isHigh && !isMedium && '[&>div]:bg-rose-500'
            )}
          />
          <span className='text-[10px] text-muted-foreground font-medium'>
            {isHigh
              ? 'Conclusión robusta y concluyente'
              : isMedium
                ? 'Se sugiere formular Estrategia Mixta'
                : 'Requiere completar relaciones DAFO'}
          </span>
        </div>

        {/* 4 Pillars Summary */}
        <div className='md:col-span-2 grid grid-cols-2 gap-3 text-xs'>
          {/* Pillar 1: Cobertura DAFO */}
          <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1'>
                <Compass className='size-3 text-primary' /> Cobertura DAFO
              </span>
              <span className='font-mono font-bold'>{Math.round(coverage * 100)} %</span>
            </div>
            <Progress value={Math.round(coverage * 100)} className='h-1' />
            <p className='text-[10px] text-muted-foreground truncate'>
              {relations.evaluatedCount} relaciones evaluadas
            </p>
          </div>

          {/* Pillar 2: Nitidez de Vector */}
          <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1'>
                <Sliders className='size-3 text-primary' /> Nitidez Vector
              </span>
              <span className={cn('font-mono font-bold', isAmbivalent ? 'text-amber-600 dark:text-amber-400' : '')}>
                {Math.round(difference * 100)} % brecha
              </span>
            </div>
            <Progress value={Math.min(100, Math.round(difference * 100 * 2.5))} className='h-1' />
            <p className='text-[10px] text-muted-foreground truncate'>
              {isAmbivalent ? `Empate ${dominant} vs ${second}` : `Vector dominante claro (${dominant})`}
            </p>
          </div>

          {/* Pillar 3: Balance EFI/EFE */}
          <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1'>
                <CheckCircle2 className='size-3 text-emerald-500' /> Matrices EFI / EFE
              </span>
              <span className='font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                {validation.errors === 0 ? 'Válido' : `${validation.errors} err`}
              </span>
            </div>
            <p className='text-[10px] text-muted-foreground truncate'>
              {state.internal?.length || 0} int · {state.external?.length || 0} ext
            </p>
          </div>

          {/* Pillar 4: Mitigación CAME */}
          <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1'>
                <FileCheck2 className='size-3 text-primary' /> Mitigación CAME
              </span>
              <span className='font-mono font-bold'>{cameCoverage.percentage} %</span>
            </div>
            <p className='text-[10px] text-muted-foreground truncate'>
              {cameCoverage.unmitigatedCount === 0
                ? 'Todos los riesgos cubiertos'
                : `${cameCoverage.unmitigatedCount} riesgos sin acción`}
            </p>
          </div>
        </div>
      </div>

      {/* Ambiguity or Warning Alert Message if any */}
      {isAmbivalent && (
        <div className='flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed'>
          <AlertTriangle className='size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
          <div>
            <span className='font-semibold'>Orientación Estratégica Híbrida Recomendada:</span>{' '}
            La diferencia entre {dominant} ({dominantName}) y {second} ({secondName}) es de solo el{' '}
            {Math.round(difference * 100)} % (&lt; 10 %). Se aconseja combinar acciones ofensivas/adaptativas con
            medidas preventivas de contención.
          </div>
        </div>
      )}

      {/* Action footer */}
      {onOpenAiReport && (
        <div className='flex items-center justify-between pt-1'>
          <p className='text-[11px] text-muted-foreground'>
            NovAi puede auditar la coherencia total de tus acciones CAME frente a estos factores.
          </p>
          <button
            type='button'
            onClick={onOpenAiReport}
            className='inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline shrink-0'
          >
            <Sparkles className='size-3.5' />
            <span>Auditar con NovAi</span>
          </button>
        </div>
      )}
    </div>
  )
}
