import type { NovaiContext } from '@/features/novai/schema'

export interface ToolInvocationItem {
  toolCallId: string
  toolName: string
  label?: string
  args: Record<string, unknown>
  state: 'call' | 'result'
  result?: unknown
  isError?: boolean
}

export interface AgentTraceItem {
  id: string
  category: 'investigation' | 'evidence' | 'audit' | 'calculation' | 'relation' | 'warning' | 'validation'
  title: string
  description: string
  status?: 'running' | 'completed' | 'warning' | 'error'
  timestamp?: string
}

export interface EvidenceItemData {
  factorCode?: string
  factorName?: string
  factorType?: 'D' | 'F' | 'O' | 'A' | 'strength' | 'weakness' | 'opportunity' | 'threat'
  snippet?: string
  source?: string
  documentName?: string
  page?: string | number
  date?: string
  confidence?: 'high' | 'medium' | 'low' | 'unverified' | number
  quality?: 'high' | 'medium' | 'low' | 'unverified'
  investigationId?: string
  url?: string
}

export interface AuditItemData {
  status: 'VALID' | 'WARNING' | 'INVALID'
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical'
  target: string
  title?: string
  message: string
  recommendation?: string
  contradictionWith?: string
  isSuspiciousZero?: boolean
  confidence?: number
}

export interface CalculationItemData {
  matrixType: 'efi' | 'efe' | 'dafo' | 'qspm' | 'came' | string
  total: number
  summary?: string
  formula?: string
  interpretation?: string
  factorsEvaluated?: number
  items?: Array<{
    code: string
    name: string
    weight: number
    rating: number
    weightedScore: number
  }>
  quadrants?: Record<string, number>
}

export interface SourceItemData {
  sourceType: 'internal' | 'external'
  name: string
  documentId?: string
  url?: string
  page?: string | number
  retrievedAt?: string
  factorCount?: number
  excerpt?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  error?: string
  reasoning?: string
  toolInvocations?: ToolInvocationItem[]
  agentTraces?: AgentTraceItem[]
  evidences?: EvidenceItemData[]
  audits?: AuditItemData[]
  calculations?: CalculationItemData[]
  sources?: SourceItemData[]
  citations?: Array<{ id: string; sourceId: string; claim: string; excerpt: string; location?: string }>
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cachedTokens?: number; reasoningTokens?: number; isEstimated?: boolean }
  model?: string
}

export interface ChatThread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  context: NovaiContext
  messages: ChatMessage[]
}
