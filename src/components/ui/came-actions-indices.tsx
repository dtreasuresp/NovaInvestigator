'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CameType, CameEnrichedAction, CameAction } from '@/types/apps/investigator-types'

export type CameAnyAction = CameEnrichedAction | CameAction

export interface CameActionsIndicesProps {
  actions?: CameAnyAction[]
  byType?: Record<CameType, CameAnyAction[]> | Record<CameType, CameEnrichedAction[]> | Record<CameType, CameAction[]>
  title?: string
  subtitle?: string
  className?: string
}

const CAME_FULL_LABELS: Record<CameType, string> = {
  C: 'Medidas de Corrección (C · Debilidades)',
  A: 'Medidas de Afrontamiento (A · Amenazas)',
  M: 'Medidas de Mantenimiento (M · Fortalezas)',
  E: 'Medidas de Explotación (E · Oportunidades)'
}

export const CameActionsIndices = ({
  actions = [],
  byType,
  title = 'Plan de Acción CAME',
  subtitle,
  className
}: CameActionsIndicesProps) => {
  const totalActions = actions.length

  const computedByType: Record<CameType, CameAnyAction[]> = (byType as Record<CameType, CameAnyAction[]>) || {
    C: actions.filter(a => a.type === 'C'),
    A: actions.filter(a => a.type === 'A'),
    M: actions.filter(a => a.type === 'M'),
    E: actions.filter(a => a.type === 'E')
  }

  const dynamicSubtitle =
    subtitle ||
    `${totalActions} ${totalActions === 1 ? 'iniciativa' : 'iniciativas'} · multicriterio`

  return (
    <TooltipProvider delay={150}>
      <div
        className={cn(
          'rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5 flex-1 flex flex-col justify-between',
          className
        )}
      >
        <div className='space-y-0.5'>
          <h4 className='font-semibold text-sm text-foreground truncate'>{title}</h4>
          <p className='text-xs text-muted-foreground'>{dynamicSubtitle}</p>
        </div>

        <div className='space-y-2 pt-0.5'>
          {(['C', 'A', 'M', 'E'] as const).map(type => {
            const typeActions = computedByType[type] || []
            const count = typeActions.length
            const pct = totalActions > 0 ? (count / totalActions) * 100 : 0
            const label = CAME_FULL_LABELS[type]

            const priorityCounts = {
              critica: typeActions.filter(a => 'category' in a && a.category === 'critica').length,
              alta: typeActions.filter(a => 'category' in a && a.category === 'alta').length,
              media: typeActions.filter(a => 'category' in a && a.category === 'media').length,
              baja: typeActions.filter(a => 'category' in a && a.category === 'baja').length
            }

            return (
              <Tooltip key={type}>
                <TooltipTrigger className='w-full text-left'>
                  <div className='space-y-1.5 cursor-pointer rounded-lg p-1.5 -mx-1.5 hover:bg-muted/40 transition-colors select-none'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='font-medium text-foreground truncate'>{label}</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Progress value={pct} className='flex-1 h-2' />
                      <span className='w-10 text-right font-mono text-xs font-bold text-foreground shrink-0'>
                        {count}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side='top' align='center' className='p-3 min-w-52 shadow-xl border bg-popover text-popover-foreground rounded-xl'>
                  <div className='space-y-2 text-xs'>
                    <div className='border-b border-border/60 pb-1.5'>
                      <p className='font-bold text-foreground'>{label}</p>
                      <p className='text-[11px] text-muted-foreground font-normal'>
                        {count} {count === 1 ? 'iniciativa planificada' : 'iniciativas planificadas'}
                      </p>
                    </div>

                    <div className='space-y-1.5 pt-0.5'>
                      <div className='flex items-center justify-between gap-4'>
                        <span className='flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium text-[11px]'>
                          <span className='size-2 rounded-full bg-rose-500 shrink-0' /> Crítica
                        </span>
                        <span className='font-mono font-bold text-xs'>{priorityCounts.critica}</span>
                      </div>

                      <div className='flex items-center justify-between gap-4'>
                        <span className='flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]'>
                          <span className='size-2 rounded-full bg-amber-500 shrink-0' /> Alta
                        </span>
                        <span className='font-mono font-bold text-xs'>{priorityCounts.alta}</span>
                      </div>

                      <div className='flex items-center justify-between gap-4'>
                        <span className='flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium text-[11px]'>
                          <span className='size-2 rounded-full bg-sky-500 shrink-0' /> Media
                        </span>
                        <span className='font-mono font-bold text-xs'>{priorityCounts.media}</span>
                      </div>

                      <div className='flex items-center justify-between gap-4'>
                        <span className='flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]'>
                          <span className='size-2 rounded-full bg-muted-foreground/60 shrink-0' /> Baja
                        </span>
                        <span className='font-mono font-bold text-xs'>{priorityCounts.baja}</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default CameActionsIndices
