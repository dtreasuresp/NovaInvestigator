'use client'

import { useState } from 'react'
import { Calculator, ChevronDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import type { CalculationItemData } from '../types'

interface NovaiCalculationCardProps {
  calculation: CalculationItemData
  className?: string
}

export function NovaiCalculationCard({ calculation, className = '' }: NovaiCalculationCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const matrixType = (calculation.matrixType || 'EFI').toUpperCase()

  const getMatrixBadgeColor = () => {
    switch (matrixType) {
      case 'EFI':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'EFE':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
      case 'DAFO':
      case 'SWOT':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      case 'QSPM':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'CAME':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getInterpretationText = () => {
    if (calculation.interpretation) return calculation.interpretation
    if (matrixType === 'EFI') {
      return calculation.total >= 2.5
        ? 'Posición interna sólida (por encima del promedio ponderado 2.50).'
        : 'Posición interna vulnerable (por debajo del promedio ponderado 2.50).'
    }
    if (matrixType === 'EFE') {
      return calculation.total >= 2.5
        ? 'Aprovechamiento eficaz de oportunidades y respuesta a amenazas.'
        : 'Vulnerabilidad ante el entorno externo o respuesta insuficiente.'
    }
    return calculation.summary || 'Cálculo matemático determinista validado.'
  }

  return (
    <div className={`rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-2xs space-y-2.5 my-2 backdrop-blur-xs transition-all hover:border-primary/40 ${className}`}>
      {/* Header with Matrix Type, Total and Formula */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='p-1 rounded bg-primary/10 text-primary'>
            <Calculator className='size-3.5' />
          </div>
          <Badge variant='outline' className={`font-mono font-bold text-xs px-2 py-0.5 ${getMatrixBadgeColor()}`}>
            Matriz {matrixType}
          </Badge>
          <span className='text-xs text-muted-foreground font-mono'>
            {calculation.formula || 'Peso × Calificación = Total'}
          </span>
        </div>

        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-semibold text-muted-foreground'>Resultado:</span>
          <Badge className='text-xs font-mono font-bold px-2 py-0.5 bg-primary text-primary-foreground'>
            {typeof calculation.total === 'number' ? calculation.total.toFixed(2) : calculation.total}
          </Badge>
        </div>
      </div>

      {/* Strategic Interpretation summary */}
      <div className='rounded-lg bg-muted/40 p-2.5 text-xs text-foreground/90 flex items-start gap-2 border-l-2 border-primary'>
        <TrendingUp className='size-3.5 text-primary shrink-0 mt-0.5' />
        <p className='leading-relaxed'>{getInterpretationText()}</p>
      </div>

      {/* Detailed calculation items breakdown if available */}
      {calculation.items && calculation.items.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
          <CollapsibleTrigger className='flex items-center justify-between w-full h-7 text-[11px] text-muted-foreground hover:text-foreground px-2 rounded-md hover:bg-muted/40 transition-colors'>
            <span>Ver desglose de factores evaluados ({calculation.items.length})</span>
            <ChevronDown className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>

          <CollapsibleContent className='pt-2 space-y-1.5'>
            <div className='rounded-lg border border-border/60 overflow-hidden text-[11px]'>
              <table className='w-full text-left'>
                <thead className='bg-muted/60 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border/60'>
                  <tr>
                    <th className='p-1.5 pl-2.5'>Factor</th>
                    <th className='p-1.5 text-right'>Peso</th>
                    <th className='p-1.5 text-right'>Calif.</th>
                    <th className='p-1.5 text-right pr-2.5'>Ponderado</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/40 font-mono'>
                  {calculation.items.map((it, idx) => (
                    <tr key={it.code || idx} className='hover:bg-muted/30'>
                      <td className='p-1.5 pl-2.5 font-sans font-medium text-foreground truncate max-w-[140px]'>
                        <span className='font-mono text-primary mr-1'>{it.code}</span>
                        <span>{it.name}</span>
                      </td>
                      <td className='p-1.5 text-right text-muted-foreground'>{it.weight.toFixed(2)}</td>
                      <td className='p-1.5 text-right text-muted-foreground'>{it.rating}</td>
                      <td className='p-1.5 text-right pr-2.5 font-bold text-foreground'>{it.weightedScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
