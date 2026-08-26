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
  FileCheck2,
  Layers
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  onAuditCame?: () => void
  onJustifyMixedStrategy?: () => void
  className?: string
}

export function InvestigationConfidenceCard({
  analysis,
  state,
  validation,
  onAuditCame,
  onJustifyMixedStrategy,
  className
}: InvestigationConfidenceCardProps) {
  const { relations } = analysis
  const { confidence, coverage, difference, dominant, second } = relations

  const dominantName = dominant ? (ORIENTATIONS[dominant]?.name ?? dominant) : '—'
  const secondName = second ? (ORIENTATIONS[second]?.name ?? second) : '—'

  // 1. Calculate numerical confidence score (0 - 100)
  const confidenceScore = React.useMemo(() => {
    if (relations.evaluatedCount === 0 || !dominant) return 15

    let score = 25 // Base

    // Coverage factor (up to 40 pts)
    score += Math.min(40, Math.round(coverage * 40))

    // Difference / Vector clarity factor (up to 20 pts)
    if (difference >= 0.2) score += 20
    else if (difference >= 0.1) score += 15
    else score += 8 // Paridad / Empate técnico con datos

    // Validation factor (up to 15 pts)
    if (validation.valid) score += 15
    else if (validation.errors === 0) score += 10

    return Math.min(100, Math.max(10, score))
  }, [relations.evaluatedCount, dominant, coverage, difference, validation.valid, validation.errors])

  // 2. Status & Color Hierarchy Resolution
  const isAmbivalent = difference < 0.1 && Boolean(second)
  const isHigh = confidenceScore >= 70 && !isAmbivalent && coverage >= 0.65
  const isMedium = (confidenceScore >= 40 || isAmbivalent) && coverage >= 0.35 && !isHigh
  const isLow = !isHigh && !isMedium

  const statusLabel = isHigh
    ? 'Confianza Alta'
    : isMedium
      ? 'Confianza Media (Estrategia Mixta)'
      : 'Confianza Baja (Incompleta)'

  // 3. CAME coverage check
  const cameCoverage = React.useMemo(() => {
    const internal = Array.isArray(state.internal) ? state.internal : []
    const external = Array.isArray(state.external) ? state.external : []
    const cameActions = Array.isArray(state.cameActions) ? state.cameActions : []

    const criticalWeaknesses = internal.filter(f => f.type === 'D' && Number(f.rating) <= 2)
    const severeThreats = external.filter(f => f.type === 'A' && Number(f.rating) <= 2)
    const totalCritical = criticalWeaknesses.length + severeThreats.length

    if (totalCritical === 0) return { covered: 0, total: 0, percentage: 100, unmitigatedCount: 0 }

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

  // SVG Radial Gauge parameters
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (confidenceScore / 100) * circumference

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
              isLow && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
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
          {statusLabel}
        </Badge>
      </div>

      {/* Main Grid: Radial Gauge on Left, 4 Pillars on Right */}
      <div className='grid grid-cols-1 md:grid-cols-12 gap-5 items-center'>
        {/* Radial Gauge Box (4 cols) */}
        <div className='md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-muted/20 border border-border/50 text-center space-y-2'>
          <div className='relative flex items-center justify-center size-28'>
            <svg className='size-full -rotate-90' viewBox='0 0 96 96'>
              {/* Background Circle */}
              <circle
                cx='48'
                cy='48'
                r={radius}
                className='stroke-muted/40'
                strokeWidth='7'
                fill='none'
              />
              {/* Progress Circle */}
              <circle
                cx='48'
                cy='48'
                r={radius}
                className={cn(
                  'transition-all duration-700 ease-out',
                  isHigh && 'stroke-emerald-500',
                  isMedium && 'stroke-amber-500',
                  isLow && 'stroke-rose-500'
                )}
                strokeWidth='7'
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap='round'
                fill='none'
              />
            </svg>
            <div className='absolute flex flex-col items-center justify-center'>
              <span
                className={cn(
                  'text-2xl font-extrabold font-mono tracking-tight leading-none',
                  isHigh && 'text-emerald-600 dark:text-emerald-400',
                  isMedium && 'text-amber-600 dark:text-amber-400',
                  isLow && 'text-rose-600 dark:text-rose-400'
                )}
              >
                {confidenceScore}%
              </span>
              <span className='text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5'>
                {isHigh ? 'Alta' : isMedium ? 'Media' : 'Baja'}
              </span>
            </div>
          </div>

          <p className='text-[11px] text-muted-foreground leading-tight px-1 font-medium'>
            {isHigh
              ? 'Conclusión robusta y vector directo'
              : isMedium
                ? 'Se recomienda formular Estrategia Mixta'
                : 'Muestra DAFO incompleta o provisional'}
          </p>
        </div>

        {/* 4 Pillars Summary (8 cols) */}
        <div className='md:col-span-8 grid grid-cols-2 gap-3 text-xs'>
          {/* Pillar 1: Cobertura DAFO */}
          <div className='space-y-1.5 p-2.5 rounded-xl bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1.5'>
                <Compass className='size-3.5 text-primary' /> Cobertura DAFO
              </span>
              <span className='font-mono font-bold'>{Math.round(coverage * 100)} %</span>
            </div>
            <Progress value={Math.round(coverage * 100)} className='h-1' />
            <p className='text-[10px] text-muted-foreground truncate'>
              {relations.evaluatedCount} relaciones evaluadas
            </p>
          </div>

          {/* Pillar 2: Nitidez de Vector */}
          <div className='space-y-1.5 p-2.5 rounded-xl bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1.5'>
                <Sliders className='size-3.5 text-primary' /> Nitidez Vector
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
          <div className='space-y-1.5 p-2.5 rounded-xl bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1.5'>
                <CheckCircle2 className='size-3.5 text-emerald-500' /> Matrices EFI / EFE
              </span>
              <span className='font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                {validation.errors === 0 ? 'Válido' : `${validation.errors} err`}
              </span>
            </div>
            <p className='text-[10px] text-muted-foreground truncate'>
              {state.internal?.length || 0} int · {state.external?.length || 0} ext (Σ=1.00)
            </p>
          </div>

          {/* Pillar 4: Mitigación CAME */}
          <div className='space-y-1.5 p-2.5 rounded-xl bg-background/60 border border-border/40'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium flex items-center gap-1.5'>
                <FileCheck2 className='size-3.5 text-primary' /> Mitigación CAME
              </span>
              <span className='font-mono font-bold'>{cameCoverage.percentage} %</span>
            </div>
            <Progress value={cameCoverage.percentage} className='h-1' />
            <p className='text-[10px] text-muted-foreground truncate'>
              {cameCoverage.unmitigatedCount === 0
                ? 'Todos los riesgos cubiertos'
                : `${cameCoverage.unmitigatedCount} riesgos sin acción`}
            </p>
          </div>
        </div>
      </div>

      {/* Ambiguity or Mixed Strategy Strategic Banner */}
      {isAmbivalent && (
        <div className='flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed'>
          <Layers className='size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400' />
          <div className='space-y-1'>
            <p className='font-semibold text-foreground'>
              Dictamen: Estrategia Mixta Recomendada ({dominant} × {second})
            </p>
            <p className='text-muted-foreground'>
              La paridad cuantitativa entre {dominant} ({dominantName}) y {second} ({secondName}) con una brecha de solo el{' '}
              {Math.round(difference * 100)} % indica que la organización no debe optar por una postura única pura, sino
              adoptar un enfoque dual: aprovechar oportunidades emergentes mientras se blindan las vulnerabilidades y amenazas activas.
            </p>
          </div>
        </div>
      )}

      {/* Action Footer with AI Buttons */}
      <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40'>
        <p className='text-[11px] text-muted-foreground'>
          NovAi puede analizar la solidez de tu expediente y generar la fundamentación ejecutiva.
        </p>
        <div className='flex flex-wrap items-center gap-2'>
          {onJustifyMixedStrategy && isAmbivalent && (
            <Button
              size='sm'
              variant='outline'
              onClick={onJustifyMixedStrategy}
              className='h-8 text-xs gap-1.5'
            >
              <Sparkles className='size-3.5 text-amber-500' />
              <span>Justificar Estrategia Mixta con NovAi</span>
            </Button>
          )}

          {onAuditCame && (
            <Button
              size='sm'
              variant='default'
              onClick={onAuditCame}
              className='h-8 text-xs gap-1.5'
            >
              <Sparkles className='size-3.5' />
              <span>Auditar Cobertura CAME con NovAi</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
