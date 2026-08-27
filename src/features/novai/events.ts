/**
 * Protocolo Canónico de Eventos Normalizados de NovAi (Harness Architecture).
 * 
 * Desacopla la capa de UI y observabilidad de los formatos específicos de proveedores
 * (OpenAI, Groq, Gemini, OpenRouter, Cerebras, Pollinations, etc.).
 */

export type NovaiEventType =
  | 'step-start'
  | 'step-update'
  | 'step-complete'
  | 'tool-call'
  | 'tool-result'
  | 'evidence'
  | 'calculation'
  | 'audit'
  | 'warning'
  | 'source'
  | 'trace'
  | 'text-delta'
  | 'message-complete'
  | 'error'

export interface StepStartEvent {
  type: 'step-start'
  stepId: string
  name: string
  timestamp: string
}

export interface StepUpdateEvent {
  type: 'step-update'
  stepId: string
  status: 'running' | 'completed' | 'warning' | 'error'
  message?: string
}

export interface StepCompleteEvent {
  type: 'step-complete'
  stepId: string
  durationMs?: number
}

export interface ToolCallEvent {
  type: 'tool-call'
  id: string
  tool: string
  label?: string
  input: Record<string, unknown>
  timestamp?: string
}

export interface ToolResultEvent {
  type: 'tool-result'
  id: string
  tool: string
  label?: string
  result: unknown
  isError?: boolean
  durationMs?: number
}

export interface EvidenceEvent {
  type: 'evidence'
  evidenceId: string
  factorId?: string
  factorType?: 'strength' | 'weakness' | 'opportunity' | 'threat'
  title: string
  snippet: string
  source: string
  documentId?: string
  documentName?: string
  page?: number | string
  confidence?: number
  quality?: 'high' | 'medium' | 'low' | 'unverified'
  investigationId?: string
}

export interface CalculationEvent {
  type: 'calculation'
  matrixType: 'efi' | 'efe' | 'dafo' | 'qspm' | 'came'
  total: number
  summary: string
  formula?: string
  factorsEvaluated?: number
  interpretation?: string
  items?: Array<{
    code: string
    name: string
    weight: number
    rating: number
    weightedScore: number
  }>
  details?: Record<string, unknown>
}

export interface AuditFindingEvent {
  type: 'audit'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  status: 'VALID' | 'WARNING' | 'INVALID'
  target: string
  code: string
  message: string
  recommendation?: string
  contradictionWith?: string
}

export interface WarningEvent {
  type: 'warning'
  code: string
  message: string
  severity?: 'low' | 'medium' | 'high'
}

export interface SourceEvent {
  type: 'source'
  sourceType: 'internal' | 'external'
  name: string
  documentId?: string
  url?: string
  page?: string | number
  retrievedAt?: string
}

export interface AgentTraceEvent {
  type: 'trace'
  category: 'investigation' | 'evidence' | 'audit' | 'calculation' | 'relation' | 'warning' | 'validation'
  title: string
  description: string
  status?: 'running' | 'completed' | 'warning' | 'error'
  timestamp?: string
}

export interface TextDeltaEvent {
  type: 'text-delta'
  delta: string
}

export interface MessageCompleteEvent {
  type: 'message-complete'
  fullText: string
  durationMs?: number
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface ErrorEvent {
  type: 'error'
  error: string
  code?: string
}

export type NovaiEvent =
  | StepStartEvent
  | StepUpdateEvent
  | StepCompleteEvent
  | ToolCallEvent
  | ToolResultEvent
  | EvidenceEvent
  | CalculationEvent
  | AuditFindingEvent
  | WarningEvent
  | SourceEvent
  | AgentTraceEvent
  | TextDeltaEvent
  | MessageCompleteEvent
  | ErrorEvent

export interface NovaiEventHandler {
  (event: NovaiEvent): void | Promise<void>
}
