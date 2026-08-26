import { z } from 'zod'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'

export type ToolRiskLevel = 'read-only' | 'low' | 'medium' | 'high'

export interface ToolMetadata {
  name: string
  label?: string
  displayName?: string
  description: string
  category: 'investigations' | 'evidence' | 'methodology' | 'kanban' | 'organization' | 'billing' | 'memory' | 'platform'
  riskLevel: ToolRiskLevel
  scope?: 'investigation' | 'tenant' | 'workspace' | 'global'
}

export interface ToolExecutionResult<T = unknown> {
  toolName: string
  success: boolean
  data?: T
  result?: T
  error?: string
}

export interface NovaiModularTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TResult = unknown> {
  metadata: ToolMetadata
  schema: TSchema
  openAiDeclaration?: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  toOpenAiDeclaration?: () => {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  execute: (args: z.infer<TSchema>, principal: InvestigationsPrincipal) => Promise<ToolExecutionResult<TResult>>
  toVercelTool?: (principal: InvestigationsPrincipal) => any
  toVercelAiTool?: (principal: InvestigationsPrincipal) => any
}
