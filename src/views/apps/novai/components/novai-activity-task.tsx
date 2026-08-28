'use client'

import { CheckCircle2, Clock, XCircle, AlertTriangle, Search, BookOpen, Calculator, ShieldCheck, Link as LinkIcon, Sparkles, ChevronDownIcon } from 'lucide-react'
import { Task, TaskTrigger, TaskContent, TaskItem } from '@/components/ai-elements/task'
import { Badge } from '@/components/ui/badge'
import type { AgentTraceItem, ToolInvocationItem } from '../types'

interface NovaiActivityTaskProps {
  traces?: AgentTraceItem[]
  toolInvocations?: ToolInvocationItem[]
  isStreaming?: boolean
  className?: string
}

function getCategoryIcon(category: AgentTraceItem['category']) {
  switch (category) {
    case 'investigation': return <Search className='size-3 text-primary' />
    case 'evidence': return <BookOpen className='size-3 text-chart-2' />
    case 'calculation': return <Calculator className='size-3 text-chart-2' />
    case 'audit': return <ShieldCheck className='size-3 text-chart-4' />
    case 'relation': return <LinkIcon className='size-3 text-chart-5' />
    case 'warning': return <AlertTriangle className='size-3 text-chart-1' />
    default: return <CheckCircle2 className='size-3 text-chart-2' />
  }
}

function getStatusIndicator(status?: AgentTraceItem['status']) {
  switch (status) {
    case 'running': return <Clock className='size-3 animate-spin text-chart-4 shrink-0' />
    case 'error': return <XCircle className='size-3 text-destructive shrink-0' />
    case 'warning': return <AlertTriangle className='size-3 text-chart-4 shrink-0' />
    default: return <CheckCircle2 className='size-3 text-chart-2 shrink-0' />
  }
}

export function NovaiActivityTask({ traces, toolInvocations, isStreaming, className = '' }: NovaiActivityTaskProps) {
  const traceSteps = traces ?? []
  const toolSteps = toolInvocations ?? []

  // Consolidar en pasos de actividad: prefer traces (semantic), fallback a tools
  const hasTraces = traceSteps.length > 0
  const steps = hasTraces ? traceSteps : toolSteps.map(t => ({
    id: t.toolCallId,
    category: 'validation' as const,
    title: t.label || t.toolName,
    description: t.state === 'call' ? 'Ejecutando...' : t.isError ? 'Error en ejecución' : 'Completado',
    status: t.state === 'call' ? 'running' as const : t.isError ? 'error' as const : 'completed' as const,
    timestamp: undefined
  }))

  if (steps.length === 0) return null

  const total = steps.length
  const completed = steps.filter(s => s.status === 'completed').length
  const hasErrors = steps.some(s => s.status === 'error')
  const hasWarnings = steps.some(s => s.status === 'warning')
  const isRunning = isStreaming || steps.some(s => s.status === 'running')

  return (
    <div className={`w-full my-2 not-prose ${className}`}>
      <Task defaultOpen={false} className='rounded-xl border border-border/60 bg-muted/20 p-2 text-xs transition-all hover:border-border'>
        <TaskTrigger title={`Actividad · ${total} pasos`} className='w-full' aria-label={`Actividad con ${total} pasos, ${completed} completados`}>
          <div className='flex items-center justify-between gap-2 w-full cursor-pointer p-1 text-xs'>
            <div className='flex items-center gap-2 min-w-0'>
              <span className='text-xs'>⚙️</span>
              <span className='font-semibold text-foreground text-xs truncate'>
                Actividad · {total} pasos
              </span>
              {isRunning ? (
                <Badge variant='outline' className='text-xs px-1.5 h-4 border-chart-4/40 text-chart-4 animate-pulse'>En curso</Badge>
              ) : hasErrors ? (
                <Badge variant='destructive' className='text-xs px-1.5 h-4'>Error</Badge>
              ) : hasWarnings ? (
                <Badge variant='outline' className='text-xs px-1.5 h-4 border-chart-4/40 text-chart-4'>Avisos</Badge>
              ) : (
                <Badge variant='outline' className='text-xs px-1.5 h-4 border-chart-2/40 text-chart-2'>Completado</Badge>
              )}
            </div>
            <ChevronDownIcon className='size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180' aria-hidden />
          </div>
        </TaskTrigger>
        <TaskContent className='mt-2 space-y-1'>
          {steps.map((step) => (
            <TaskItem key={step.id} className='flex items-start gap-2 text-xs py-1 px-1.5 rounded-md hover:bg-muted/30 transition-colors'>
              <span className='mt-0.5' aria-hidden>{getStatusIndicator(step.status)}</span>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1.5 flex-wrap'>
                  <span aria-hidden>{getCategoryIcon((step as AgentTraceItem).category ?? 'validation')}</span>
                  <span className='font-medium text-foreground text-xs'>{step.title}</span>
                </div>
                {step.description && (
                  <p className='text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2'>{step.description}</p>
                )}
              </div>
            </TaskItem>
          ))}
          {!isRunning && (
            <p className='text-xs text-muted-foreground/70 pt-1'>Actividad observable del runtime — no narrativa del modelo.</p>
          )}
        </TaskContent>
      </Task>
    </div>
  )
}
