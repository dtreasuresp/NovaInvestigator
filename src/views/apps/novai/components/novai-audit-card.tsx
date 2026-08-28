'use client'

import { AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AuditItemData } from '../types'

interface NovaiAuditCardProps {
  audit: AuditItemData
  className?: string
}

export function NovaiAuditCard({ audit, className = '' }: NovaiAuditCardProps) {
  const status = audit.status || 'WARNING'
  const severity = (audit.severity || (status === 'INVALID' ? 'critical' : status === 'WARNING' ? 'medium' : 'info')).toLowerCase()

  const getStatusBadge = () => {
    switch (status) {
      case 'VALID':
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-chart-2/40 text-chart-2 bg-chart-2/10 font-bold'>
            <CheckCircle2 className='size-3' />
            <span>VÁLIDO</span>
          </Badge>
        )
      case 'INVALID':
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-destructive/40 text-destructive bg-destructive/10 font-bold'>
            <XCircle className='size-3' />
            <span>NO VÁLIDO</span>
          </Badge>
        )
      case 'WARNING':
      default:
        return (
          <Badge variant='outline' className='h-5 text-xs gap-1 border-chart-4/40 text-chart-4 bg-chart-4/10 font-bold'>
            <AlertTriangle className='size-3' />
            <span>ADVERTENCIA</span>
          </Badge>
        )
    }
  }

  const getSeverityBadge = () => {
    switch (severity) {
      case 'critical':
        return <Badge variant='destructive' className='text-xs uppercase tracking-wider px-1.5 h-4'>Crítico</Badge>
      case 'high':
        return <Badge className='text-xs uppercase tracking-wider px-1.5 h-4 bg-chart-1 hover:bg-chart-1 text-white'>Alto</Badge>
      case 'medium':
        return <Badge variant='secondary' className='text-xs uppercase tracking-wider px-1.5 h-4 bg-chart-4/20 text-chart-4'>Medio</Badge>
      case 'low':
        return <Badge variant='secondary' className='text-xs uppercase tracking-wider px-1.5 h-4 bg-chart-2/15 text-chart-2'>Bajo</Badge>
      case 'info':
      default:
        return <Badge variant='outline' className='text-xs uppercase tracking-wider px-1.5 h-4 text-muted-foreground'>Info</Badge>
    }
  }

  const getCardBorder = () => {
    if (status === 'INVALID' || severity === 'critical') return 'border-destructive/40 bg-destructive/5'
    if (status === 'WARNING' || severity === 'high' || severity === 'medium') return 'border-chart-4/40 bg-chart-4/5'
    return 'border-chart-2/30 bg-chart-2/5'
  }

  return (
    <div className={`rounded-xl border ${getCardBorder()} p-3.5 shadow-2xs space-y-2.5 my-2 transition-all ${className}`}>
      {/* Header with Status, Target and Severity */}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 min-w-0'>
          {getStatusBadge()}
          <span className='font-mono font-bold text-xs text-foreground tracking-wide'>
            {audit.target}
          </span>
          {audit.title && (
            <span className='text-xs text-muted-foreground font-medium truncate'>
              · {audit.title}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1.5'>
          {getSeverityBadge()}
        </div>
      </div>

      {/* Audit message */}
      <div className='text-xs text-foreground/90 leading-relaxed'>
        <p>{audit.message}</p>
      </div>

      {/* Contradiction callout if any */}
      {audit.contradictionWith && (
        <div className='rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive flex items-start gap-1.5'>
          <ShieldAlert className='size-3.5 shrink-0 mt-0.5' />
          <div>
            <span className='font-semibold'>Inconsistencia detectada con: </span>
            <span>{audit.contradictionWith}</span>
          </div>
        </div>
      )}

      {/* Zero Suspicious Callout */}
      {audit.isSuspiciousZero && (
        <div className='rounded-lg bg-chart-4/10 border border-chart-4/20 p-2 text-xs text-chart-4 flex items-start gap-1.5'>
          <Info className='size-3.5 shrink-0 mt-0.5' />
          <span>Calificación cero (0) sospechosa: los factores presentan relevancia semántica pero carecen de justificación de impacto nulo.</span>
        </div>
      )}

      {/* Recommendation */}
      {audit.recommendation && (
        <div className='rounded-lg bg-muted/50 p-2.5 border border-border/60 text-xs space-y-1 text-muted-foreground'>
          <div className='flex items-center gap-1 text-primary font-semibold uppercase tracking-wider text-xs'>
            <Sparkles className='size-3' />
            <span>Recomendación Metodológica</span>
          </div>
          <div className='flex items-start gap-1.5 text-foreground/85'>
            <ArrowRight className='size-3 text-primary shrink-0 mt-0.5' />
            <p>{audit.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}