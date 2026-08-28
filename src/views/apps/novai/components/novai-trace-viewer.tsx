'use client'

import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  BookOpen,
  Calculator,
  ShieldCheck,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Task, TaskTrigger, TaskContent, TaskItem } from '@/components/ai-elements/task'
import type { AgentTraceItem } from '../types'

interface NovaiTraceViewerProps {
  traces: AgentTraceItem[]
  className?: string
}

export function NovaiTraceViewer({ traces, className = '' }: NovaiTraceViewerProps) {
  if (!traces || traces.length === 0) return null

  const getCategoryIcon = (category: AgentTraceItem['category']) => {
    switch (category) {
      case 'investigation':
        return <Search className='size-3 text-primary' />
      case 'evidence':
        return <BookOpen className='size-3 text-chart-2' />
      case 'calculation':
        return <Calculator className='size-3 text-chart-2' />
      case 'audit':
        return <ShieldCheck className='size-3 text-chart-4' />
      case 'relation':
        return <LinkIcon className='size-3 text-chart-5' />
      case 'warning':
        return <AlertTriangle className='size-3 text-chart-1' />
      case 'validation':
      default:
        return <CheckCircle2 className='size-3 text-chart-2' />
    }
  }

  const getStatusIndicator = (status?: AgentTraceItem['status']) => {
    switch (status) {
      case 'running':
        return <Clock className='size-3 animate-spin text-chart-4 shrink-0' />
      case 'error':
        return <XCircle className='size-3 text-destructive shrink-0' />
      case 'warning':
        return <AlertTriangle className='size-3 text-chart-4 shrink-0' />
      case 'completed':
      default:
        return <CheckCircle2 className='size-3 text-chart-2 shrink-0' />
    }
  }

  const activeCount = traces.length
  const hasErrors = traces.some(t => t.status === 'error')
  const hasWarnings = traces.some(t => t.status === 'warning')

  return (
    <div className={`w-full my-2 not-prose ${className}`}>
      <Task defaultOpen={false} className='rounded-xl border border-border/80 bg-muted/20 p-2 text-xs transition-all'>
        <TaskTrigger
          title={`Traza de Trabajo (${activeCount} pasos verificados)`}
          className='w-full'
        >
          <div className='flex items-center justify-between gap-2 w-full cursor-pointer p-1 text-xs'>
            <div className='flex items-center gap-2 min-w-0'>
              <div className='p-1 rounded bg-primary/10 text-primary shrink-0'>
                <Sparkles className='size-3.5' />
              </div>
              <span className='font-semibold text-foreground text-xs truncate'>
                Traza de Trabajo ({activeCount} pasos verificados)
              </span>
              {hasErrors ? (
                <Badge variant='destructive' className='text-xs px-1.5 h-4'>Inconsistencia</Badge>
              ) : hasWarnings ? (
                <Badge variant='outline' className='text-xs px-1.5 h-4 border-chart-4/40 text-chart-4'>Avisos</Badge>
              ) : (
                <Badge variant='outline' className='text-xs px-1.5 h-4 border-chart-2/40 text-chart-2'>Verificado</Badge>
              )}
            </div>
          </div>
        </TaskTrigger>

        <TaskContent className='mt-2 space-y-1.5 border-primary/40 border-l-2 pl-3 ml-2'>
          {traces.map((trace) => (
            <TaskItem
              key={trace.id}
              className='flex items-start gap-2 text-xs py-1 px-1.5 rounded-md hover:bg-muted/30 transition-colors'
            >
              <div className='mt-0.5'>{getStatusIndicator(trace.status)}</div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1.5 flex-wrap'>
                  {getCategoryIcon(trace.category)}
                  <span className='font-semibold text-foreground text-xs'>{trace.title}</span>
                </div>
                {trace.description && (
                  <p className='text-xs text-muted-foreground mt-0.5 leading-snug'>
                    {trace.description}
                  </p>
                )}
              </div>
            </TaskItem>
          ))}
        </TaskContent>
      </Task>
    </div>
  )
}