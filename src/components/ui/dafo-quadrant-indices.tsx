'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface DafoQuadrantIndicesProps {
  summary: Record<string, { index: number; [key: string]: any }> | Record<string, any>
  dominant?: string | null
  evaluatedCount?: number
  title?: string
  subtitle?: string
  className?: string
}

const QUADRANT_FULL_LABELS: Record<string, string> = {
  FO: 'Cruce Fortalezas × Oportunidades',
  DO: 'Cruce Debilidades × Oportunidades',
  FA: 'Cruce Fortalezas × Amenazas',
  DA: 'Cruce Debilidades × Amenazas'
}

export const DafoQuadrantIndices = ({
  summary,
  dominant,
  evaluatedCount = 0,
  title = 'Índices DAFO por Cuadrante',
  subtitle,
  className
}: DafoQuadrantIndicesProps) => {
  const dynamicSubtitle =
    subtitle ||
    `Aporte relativo (${evaluatedCount} ${evaluatedCount === 1 ? 'cruce calificado' : 'cruces calificados'})`

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5 flex-1 flex flex-col justify-between',
        className
      )}
    >
      <div className='space-y-0.5'>
        <h4 className='font-semibold text-sm text-foreground'>{title}</h4>
        <p className='text-xs text-muted-foreground'>{dynamicSubtitle}</p>
      </div>

      <div className='space-y-3 pt-1'>
        {Object.entries(summary).map(([quadrant, item]) => {
          const isDominant = dominant === quadrant
          const label = QUADRANT_FULL_LABELS[quadrant] || `Cruce ${quadrant}`

          return (
            <div key={quadrant} className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs'>
                <span
                  className={cn(
                    'font-medium truncate',
                    isDominant ? 'text-primary font-semibold' : 'text-foreground'
                  )}
                >
                  {label}
                </span>
                {isDominant && (
                  <Badge
                    variant='outline'
                    className='text-[9px] px-1 py-0 uppercase font-bold text-primary border-primary/30 shrink-0 ml-1.5'
                  >
                    Dominante
                  </Badge>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <Progress value={Math.min(100, item.index * 40)} className='flex-1 h-2' />
                <span className='w-10 text-right font-mono text-xs font-bold text-foreground shrink-0'>
                  {item.index.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DafoQuadrantIndices
