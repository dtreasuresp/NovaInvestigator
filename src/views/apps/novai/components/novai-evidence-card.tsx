'use client'

import { FileText, ExternalLink, ShieldCheck, AlertTriangle, BookOpen, Quote } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { EvidenceItemData } from '../types'

interface NovaiEvidenceCardProps {
  evidence: EvidenceItemData
  className?: string
}

export function NovaiEvidenceCard({ evidence, className = '' }: NovaiEvidenceCardProps) {
  const factorType = (evidence.factorType || evidence.factorCode?.charAt(0) || 'D').toUpperCase()

  const getFactorBadgeStyle = () => {
    switch (factorType) {
      case 'D':
      case 'WEAKNESS':
        return 'bg-chart-4/10 text-chart-4 border-chart-4/30'
      case 'F':
      case 'STRENGTH':
        return 'bg-chart-2/10 text-chart-2 border-chart-2/30'
      case 'O':
      case 'OPPORTUNITY':
        return 'bg-chart-2/10 text-chart-2 border-chart-2/30'
      case 'A':
      case 'THREAT':
        return 'bg-chart-5/10 text-chart-5 border-chart-5/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getQualityBadge = () => {
    const q = typeof evidence.quality === 'string' ? evidence.quality : typeof evidence.confidence === 'string' ? evidence.confidence : 'medium'
    switch (q.toLowerCase()) {
      case 'high':
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-chart-2/30 text-chart-2 bg-chart-2/5 font-normal'>
            <ShieldCheck className='size-2.5' />
            <span>Evidencia Alta</span>
          </Badge>
        )
      case 'medium':
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-chart-2/30 text-chart-2 bg-chart-2/5 font-normal'>
            <ShieldCheck className='size-2.5' />
            <span>Evidencia Media</span>
          </Badge>
        )
      case 'low':
      case 'unverified':
      default:
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-chart-4/30 text-chart-4 bg-chart-4/5 font-normal'>
            <AlertTriangle className='size-2.5' />
            <span>Por Verificar</span>
          </Badge>
        )
    }
  }

  return (
    <div className={`rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-2xs backdrop-blur-xs space-y-2.5 my-2 transition-all hover:border-primary/40 ${className}`}>
      {/* Header with Factor Code, Name and Quality */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 min-w-0'>
          {evidence.factorCode && (
            <Badge variant='outline' className={`font-mono font-bold text-xs px-2 py-0.5 ${getFactorBadgeStyle()}`}>
              {evidence.factorCode}
            </Badge>
          )}
          {evidence.factorName && (
            <span className='font-semibold text-xs text-foreground truncate max-w-[200px] sm:max-w-[280px]'>
              {evidence.factorName}
            </span>
          )}
        </div>
        <div>{getQualityBadge()}</div>
      </div>

      {/* Snippet / Quote text */}
      {evidence.snippet && (
        <div className='rounded-lg bg-muted/40 p-2.5 border-l-2 border-primary/60 text-xs text-muted-foreground leading-relaxed flex items-start gap-2'>
          <Quote className='size-3.5 text-primary/60 shrink-0 mt-0.5' />
          <p className='italic text-foreground/90'>{evidence.snippet}</p>
        </div>
      )}

      {/* Source Metadata & Footer */}
      <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50 flex-wrap'>
        <div className='flex items-center gap-1.5 truncate'>
          <BookOpen className='size-3 text-muted-foreground shrink-0' />
          <span className='truncate font-medium text-foreground/80'>
            {evidence.documentName || evidence.source || 'Expediente de Investigación'}
          </span>
          {evidence.page && (
            <span className='text-muted-foreground/80 shrink-0'>· Pág. {evidence.page}</span>
          )}
        </div>

        {evidence.url ? (
          <Button
            size='xs'
            variant='ghost'
            render={
              <a href={evidence.url} target='_blank' rel='noopener noreferrer'>
                <span>Abrir Fuente</span>
                <ExternalLink className='size-2.5' />
              </a>
            }
            className='h-6 text-xs gap-1 text-primary hover:text-primary px-1.5'
          />
        ) : (
          <div className='flex items-center gap-1 text-xs text-muted-foreground/70'>
            <FileText className='size-3' />
            <span>Fuente Interna</span>
          </div>
        )}
      </div>
    </div>
  )
}