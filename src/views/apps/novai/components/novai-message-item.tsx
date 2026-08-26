'use client'

import { useState } from 'react'
import { Sparkles, User, Copy, Check, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions
} from '@/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput, type ToolPart } from '@/components/ai-elements/tool'
import type { ChatMessage, ToolInvocationItem, EvidenceItemData, AuditItemData, CalculationItemData } from '../types'
import { NovaiEvidenceCard } from './novai-evidence-card'
import { NovaiAuditCard } from './novai-audit-card'
import { NovaiCalculationCard } from './novai-calculation-card'
import { NovaiSourceCard } from './novai-source-card'
import { NovaiTraceViewer } from './novai-trace-viewer'

const TOOL_LABELS: Record<string, string> = {
  list_investigations: 'Listar Investigaciones',
  get_active_investigation: 'Determinar Investigación Activa',
  get_investigation_details: 'Consultar Expediente DAFO',
  get_investigations_stats: 'Estadísticas de Investigaciones',
  get_investigation_documents: 'Consultar Fuentes Documentales',
  search_evidence: 'Buscar Evidencia Indexada',
  get_factor_evidence: 'Consultar Evidencia de Factor',
  verify_claim: 'Verificar Afirmación / Hipótesis',
  audit_factor: 'Auditar Factor Metodológico',
  audit_relationship: 'Auditar Cruce DAFO',
  find_contradictions: 'Detectar Contradicciones Estratégicas',
  validate_methodology: 'Validar Metodología',
  calculate_matrix: 'Calcular Matrices',
  trace_strategy: 'Rastrear Linaje de Estrategia',
  compare_strategies: 'Comparar Estrategias',
  challenge_analysis: 'Cuestionar Diagnóstico (Red-Team)',
  list_kanban_tasks: 'Consultar Tareas Kanban',
  get_kanban_board_summary: 'Resumen Tablero Kanban',
  list_workspace_members_and_teams: 'Consultar Miembros y Equipos',
  get_tenant_billing_and_quota_info: 'Consultar Cuotas y Facturación',
  record_strategic_memory: 'Guardar Memoria Estratégica'
}

function RenderStructuredToolResult({ invocation }: { invocation: ToolInvocationItem }) {
  const result = invocation.result as any
  if (!result || typeof result !== 'object') return null

  // 1. Single Factor Evidence (`get_factor_evidence`)
  if (invocation.toolName === 'get_factor_evidence' && result.factor) {
    const evData: EvidenceItemData = {
      factorCode: result.factor.code,
      factorName: result.factor.name,
      factorType: result.factor.type,
      snippet: result.factor.evidence || result.factor.description,
      source: 'Expediente de Factores DAFO',
      quality: result.factor.evidence ? 'high' : 'unverified'
    }
    return <NovaiEvidenceCard evidence={evData} />
  }

  // 2. Search Evidence list (`search_evidence`)
  if (invocation.toolName === 'search_evidence' && Array.isArray(result.results)) {
    return (
      <div className='space-y-1.5'>
        {result.results.slice(0, 3).map((item: any, idx: number) => (
          <NovaiEvidenceCard
            key={idx}
            evidence={{
              factorCode: item.factorCode,
              factorName: item.factorName,
              snippet: item.snippet,
              source: item.source,
              quality: 'medium'
            }}
          />
        ))}
        {result.results.length > 3 && (
          <p className='text-[10px] text-muted-foreground text-center'>
            + {result.results.length - 3} evidencias adicionales indexadas
          </p>
        )}
      </div>
    )
  }

  // 3. Audit Crossing / Relationship (`audit_relationship`)
  if (invocation.toolName === 'audit_relationship' && result.audit) {
    const isZero = result.audit.isSuspiciousZero
    const auditData: AuditItemData = {
      status: isZero ? 'WARNING' : 'VALID',
      severity: isZero ? 'medium' : 'info',
      target: result.crossing || 'Cruce DAFO',
      title: result.quadrant ? `Cuadrante ${result.quadrant}` : undefined,
      message: result.matrixState?.justification || result.audit.recommendation || 'Evaluación de causalidad del cruce',
      recommendation: result.audit.recommendation,
      isSuspiciousZero: isZero
    }
    return <NovaiAuditCard audit={auditData} />
  }

  // 4. Audit Factor (`audit_factor`)
  if (invocation.toolName === 'audit_factor' && result.audit) {
    const isValid = result.audit.isMethodologicallyValid
    const auditData: AuditItemData = {
      status: isValid ? 'VALID' : 'WARNING',
      severity: isValid ? 'info' : 'high',
      target: result.factor?.code || 'Factor',
      title: result.factor?.name,
      message: isValid
        ? 'El factor cumple con la escala de calificación y ponderación reglamentaria.'
        : `Se detectaron ${result.audit.criticalErrorsCount || 1} observaciones metodológicas en el factor.`,
      recommendation: result.audit.findings?.[0]?.recommendation
    }
    return <NovaiAuditCard audit={auditData} />
  }

  // 5. Contradictions List (`find_contradictions`)
  if (invocation.toolName === 'find_contradictions' && Array.isArray(result.contradictions)) {
    if (result.contradictions.length === 0) {
      return (
        <div className='rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
          <CheckCircle2 className='size-4 shrink-0' />
          <span>No se detectaron contradicciones matemáticas ni lógicas en la investigación.</span>
        </div>
      )
    }
    return (
      <div className='space-y-1.5'>
        {result.contradictions.slice(0, 2).map((c: any, idx: number) => (
          <NovaiAuditCard
            key={idx}
            audit={{
              status: 'WARNING',
              severity: c.severity || 'high',
              target: c.type || 'Inconsistencia',
              title: c.title,
              message: c.explanation,
              recommendation: c.recommendation
            }}
          />
        ))}
      </div>
    )
  }

  // 6. Matrix Calculation (`calculate_matrix`)
  if (invocation.toolName === 'calculate_matrix' && result.calculation) {
    const type = result.matrixType || 'EFI'
    let total = 0
    let items: any[] = []

    if (type === 'EFI' && result.calculation.efi) {
      total = result.calculation.efi.totalWeightedScore || 0
      items = (result.calculation.efi.factors || []).map((f: any) => ({
        code: f.code,
        name: f.name,
        weight: f.weight,
        rating: f.rating,
        weightedScore: f.weightedScore
      }))
    } else if (type === 'EFE' && result.calculation.efe) {
      total = result.calculation.efe.totalWeightedScore || 0
      items = (result.calculation.efe.factors || []).map((f: any) => ({
        code: f.code,
        name: f.name,
        weight: f.weight,
        rating: f.rating,
        weightedScore: f.weightedScore
      }))
    } else if (result.calculation.dafo) {
      total = result.calculation.dafo.totalScore || 0
    }

    return (
      <NovaiCalculationCard
        calculation={{
          matrixType: type,
          total,
          items
        }}
      />
    )
  }

  // 7. Investigation Documents (`get_investigation_documents`)
  if (invocation.toolName === 'get_investigation_documents' && Array.isArray(result.documents)) {
    return (
      <div className='space-y-1.5'>
        {result.documents.slice(0, 2).map((doc: any, idx: number) => (
          <NovaiSourceCard
            key={idx}
            source={{
              sourceType: 'internal',
              name: doc.name,
              factorCount: doc.factorCount,
              excerpt: doc.excerpt
            }}
          />
        ))}
      </div>
    )
  }

  return null
}

function ToolCard({ invocation }: { invocation: ToolInvocationItem }) {
  const label = invocation.label || TOOL_LABELS[invocation.toolName] || invocation.toolName
  const state: ToolPart['state'] = invocation.state === 'call'
    ? 'input-available'
    : invocation.isError
      ? 'output-error'
      : 'output-available'

  return (
    <Tool className='not-prose my-2 border-border/80 bg-muted/20 text-xs rounded-xl overflow-hidden'>
      <ToolHeader
        type='dynamic-tool'
        toolName={invocation.toolName}
        title={label}
        state={state}
        className='p-2.5 hover:bg-muted/40 transition-colors'
      />

      <ToolContent className='p-3 space-y-3'>
        {/* Render Structured Domain Result */}
        {invocation.state === 'result' && !invocation.isError && (
          <RenderStructuredToolResult invocation={invocation} />
        )}

        {/* AI Elements Tool Input & Output blocks */}
        {invocation.args && Object.keys(invocation.args).length > 0 && (
          <ToolInput input={invocation.args} />
        )}

        <ToolOutput
          output={invocation.result}
          errorText={invocation.isError ? (typeof invocation.result === 'string' ? invocation.result : 'Error ejecutando herramienta') : undefined}
        />
      </ToolContent>
    </Tool>
  )
}

interface NovaiMessageItemProps {
  message: ChatMessage
  isLast: boolean
  isLoading: boolean
  onRegenerate?: () => void
}

export function NovaiMessageItem({ message, isLast, isLoading, onRegenerate }: NovaiMessageItemProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (isUser) {
    return (
      <Message from='user' className='max-w-3xl mx-auto w-full'>
        <div className='flex items-start justify-end gap-3 w-full group'>
          <MessageContent className='max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-primary px-4 py-3 text-sm text-primary-foreground shadow-xs'>
            <p className='whitespace-pre-wrap leading-relaxed'>{message.content}</p>
          </MessageContent>
          <div className='size-8 rounded-full bg-muted border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 shadow-2xs'>
            <User className='size-4' />
          </div>
        </div>
      </Message>
    )
  }

  return (
    <Message from='assistant' className='max-w-3xl mx-auto w-full animate-in fade-in duration-300'>
      <div className='flex items-start gap-3.5 w-full group'>
        {/* NovAi Stylized Avatar */}
        <div className='relative size-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md border border-white/20 mt-0.5'>
          <Sparkles className='size-4 animate-pulse' />
        </div>

        <div className='flex-1 space-y-2.5 min-w-0'>
          {/* Message Header */}
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-foreground'>NovAi</span>
            <span className='text-[10px] font-mono text-muted-foreground'>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* 1. Agent Work Trace using AI Elements Task */}
          {message.agentTraces && message.agentTraces.length > 0 && (
            <NovaiTraceViewer traces={message.agentTraces} />
          )}

          {/* 2. Structured Domain Cards from SSE (if any direct card events) */}
          {message.evidences && message.evidences.length > 0 && (
            <div className='space-y-1.5'>
              {message.evidences.map((ev, i) => (
                <NovaiEvidenceCard key={i} evidence={ev} />
              ))}
            </div>
          )}

          {message.audits && message.audits.length > 0 && (
            <div className='space-y-1.5'>
              {message.audits.map((aud, i) => (
                <NovaiAuditCard key={i} audit={aud} />
              ))}
            </div>
          )}

          {message.calculations && message.calculations.length > 0 && (
            <div className='space-y-1.5'>
              {message.calculations.map((calc, i) => (
                <NovaiCalculationCard key={i} calculation={calc} />
              ))}
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className='space-y-1.5'>
              {message.sources.map((src, i) => (
                <NovaiSourceCard key={i} source={src} />
              ))}
            </div>
          )}

          {/* 3. Tool Invocations Blocks using AI Elements Tool */}
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className='space-y-1.5'>
              {message.toolInvocations.map(inv => (
                <ToolCard key={inv.toolCallId} invocation={inv} />
              ))}
            </div>
          )}

          {/* 4. Model Reasoning / Thinking Trace (if any) */}
          {message.reasoning && (
            <Reasoning isStreaming={message.isStreaming} className='mb-2'>
              <ReasoningTrigger />
              <ReasoningContent className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/60'>
                {message.reasoning}
              </ReasoningContent>
            </Reasoning>
          )}

          {/* 5. Message Body with AI Elements MessageResponse */}
          <MessageContent className='rounded-2xl rounded-tl-xs border border-border/70 bg-card/80 px-4 py-3.5 shadow-2xs backdrop-blur-xs'>
            {message.content ? (
              <MessageResponse>{message.content}</MessageResponse>
            ) : isLoading && isLast && (!message.toolInvocations || message.toolInvocations.length === 0) ? (
              <div className='flex items-center gap-2 text-xs text-muted-foreground py-1'>
                <RefreshCw className='size-3.5 animate-spin text-primary' />
                <span>NovAi está formulando la respuesta...</span>
              </div>
            ) : null}

            {/* Streaming Cursor */}
            {message.isStreaming && (
              <span className='inline-block size-2 rounded-full bg-primary animate-ping ml-1' />
            )}

            {/* Error notice */}
            {message.error && (
              <div className='mt-2.5 p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2'>
                <AlertCircle className='size-4 shrink-0' />
                <span>{message.error}</span>
              </div>
            )}
          </MessageContent>

          {/* Assistant Actions Toolbar using AI Elements MessageActions */}
          {!message.isStreaming && message.content && (
            <MessageActions className='opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size='icon-xs'
                      variant='ghost'
                      onClick={handleCopy}
                      aria-label='Copiar respuesta'
                      className='text-muted-foreground hover:text-foreground'
                    />
                  }
                >
                  {copied ? <Check className='size-3 text-emerald-500' /> : <Copy className='size-3' />}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copiado' : 'Copiar respuesta'}</p>
                </TooltipContent>
              </Tooltip>

              {isLast && onRegenerate && !isLoading && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='icon-xs'
                        variant='ghost'
                        onClick={onRegenerate}
                        aria-label='Regenerar respuesta'
                        className='text-muted-foreground hover:text-foreground'
                      />
                    }
                  >
                    <RefreshCw className='size-3' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Regenerar respuesta</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </MessageActions>
          )}
        </div>
      </div>
    </Message>
  )
}
