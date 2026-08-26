import { z } from 'zod'

import type { InvestigationState } from '@/types/apps/investigator-types'

// =============================================================================
// NovAi — Esquemas y Tipos Canónicos de la Plataforma de Inteligencia Artificial
// =============================================================================

export const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1)
})

export type AiMessage = z.infer<typeof aiMessageSchema>

export const novaiModeSchema = z.enum([
  'CHAT',
  'CONSULTANT',
  'ANALYST',
  'RESEARCHER',
  'DEVELOPER',
  'ARCHITECT',
  'OPERATOR'
])

export type NovaiMode = z.infer<typeof novaiModeSchema>

export const novaiContextSchema = z.discriminatedUnion('app', [
  z.object({
    app: z.literal('investigator'),
    mode: novaiModeSchema.optional(),
    investigationId: z.string().optional(),
    state: z.unknown().optional(),
    inventory: z
      .object({
        total: z.number().int().min(0),
        byStatus: z.record(z.string(), z.number().int().min(0)).optional(),
        recent: z
          .array(z.object({ id: z.string(), title: z.string(), status: z.string() }))
          .max(20)
          .optional()
      })
      .optional()
  }),
  z.object({
    app: z.literal('kanban'),
    mode: novaiModeSchema.optional(),
    boardId: z.string().optional(),
    columnId: z.string().optional(),
    taskId: z.string().optional()
  }),
  z.object({
    app: z.literal('general'),
    mode: novaiModeSchema.optional(),
    hint: z.string().optional()
  })
])

export type NovaiContext = z.infer<typeof novaiContextSchema>

export const novaiChatRequestSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
  context: novaiContextSchema.default({ app: 'general' }),
  conversationId: z.string().optional(),
  isFreeText: z.boolean().default(true),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type NovaiChatRequest = z.infer<typeof novaiChatRequestSchema>

export const novaiReportRequestSchema = z.object({
  context: novaiContextSchema,
  format: z.enum(['academic', 'executive', 'thesis']).default('academic'),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type NovaiReportRequest = z.infer<typeof novaiReportRequestSchema>

// Esquemas de compatibilidad legacy para rutas /api/investigations/ai/*
export const aiChatRequestSchema = z.object({
  messages: z.array(aiMessageSchema).min(1),
  promptId: z.string().optional(),
  investigationId: z.string().optional(),
  isFreeText: z.boolean().default(true),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type AiChatRequest = z.infer<typeof aiChatRequestSchema>

export const aiReportRequestSchema = z.object({
  investigationId: z.string().optional(),
  format: z.enum(['academic', 'executive', 'thesis']).default('academic'),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type AiReportRequest = z.infer<typeof aiReportRequestSchema>

export interface AiQuotaInfo {
  allowed: boolean
  canUseFreeText: boolean
  usageCount: number
  limitValue: number | null
  remaining: number | null
  dailyRemaining?: number | null
  dailyLimitValue?: number | null
  dailyConsumed?: number
  monthly?: { usageCount: number; limitValue: number | null; remaining: number | null }
  daily?: { remaining: number | null; limitValue: number | null; consumed: number }
}

export interface PredefinedPrompt {
  id: string
  category: 'diagnosis' | 'dafo' | 'weights' | 'came' | 'qspm'
  icon: string
  titleKey: string
  promptText: string
}

export const PREDEFINED_PROMPTS: readonly PredefinedPrompt[] = [
  {
    id: 'diag-balance',
    category: 'diagnosis',
    icon: 'Activity',
    titleKey: 'novai.aiPromptDiagBalance',
    promptText: 'Analiza el balance estratégico general entre mi evaluación interna (EFI) y externa (EFE), explicando mis principales vulnerabilidades y ventajas competitivas.'
  },
  {
    id: 'dafo-dominant',
    category: 'dafo',
    icon: 'Compass',
    titleKey: 'novai.aiPromptDafoDominant',
    promptText: 'Explica qué significa mi vector dominante DAFO y qué postura estratégica prescribe según la teoría de planificación estratégica (Fred David / DAFO).'
  },
  {
    id: 'weights-consistency',
    category: 'weights',
    icon: 'Scale',
    titleKey: 'novai.aiPromptWeightsConsistency',
    promptText: 'Evalúa la coherencia de las ponderaciones y calificaciones asignadas en los factores internos y externos. ¿Hay factores sobreestimados o subestimados?'
  },
  {
    id: 'came-critical',
    category: 'came',
    icon: 'ShieldAlert',
    titleKey: 'novai.aiPromptCameCritical',
    promptText: 'Revisa las debilidades críticas registradas e indica si las acciones CAME propuestas son suficientes para corregirlas o si faltan iniciativas de contingencia.'
  },
  {
    id: 'qspm-justification',
    category: 'qspm',
    icon: 'Award',
    titleKey: 'novai.aiPromptQspmJustification',
    promptText: 'Redacta una fundamentación cuantitativa para defender por qué la estrategia seleccionada en QSPM es la más atractiva frente a las demás alternativas.'
  }
] as const

// =============================================================================
// DAFO & QSPM AI Proposals Schemas (Structured Output)
// =============================================================================

export const dafoRelationshipEvaluationSchema = z.enum([
  'relacion',
  'sin_relacion_justificada',
  'requiere_evidencia'
])

export type DafoRelationshipEvaluation = z.infer<typeof dafoRelationshipEvaluationSchema>

export const dafoRelationshipItemSchema = z.object({
  internalId: z.string(),
  externalId: z.string(),
  quadrant: z.enum(['FO', 'DO', 'FA', 'DA']),
  strength: z.number().int().min(0).max(3).nullable(),
  evaluation: dafoRelationshipEvaluationSchema.optional(),
  justification: z.string().default(''),
  evidence: z.string().default(''),
  evaluator: z.string().default('')
})

export type DafoRelationshipItem = z.infer<typeof dafoRelationshipItemSchema>

export const dafoProposalRequestSchema = z.object({
  investigationId: z.string().optional(),
  state: z.custom<InvestigationState>(),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type DafoProposalRequest = z.infer<typeof dafoProposalRequestSchema>

export const dafoProposalResponseSchema = z.object({
  relationships: z.array(dafoRelationshipItemSchema),
  dominantQuadrantSuggested: z.enum(['FO', 'DO', 'FA', 'DA']).optional(),
  summary: z.string().optional()
})

export type DafoProposalResponse = z.infer<typeof dafoProposalResponseSchema>

export const qspmProposedStrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  quadrant: z.enum(['FO', 'DO', 'FA', 'DA']),
  description: z.string().default('')
})

export type QspmProposedStrategy = z.infer<typeof qspmProposedStrategySchema>

export const qspmProposalRequestSchema = z.object({
  investigationId: z.string().optional(),
  state: z.custom<InvestigationState>(),
  proposeStrategiesIfEmpty: z.boolean().default(true),
  locale: z.enum(['es', 'en', 'de', 'ko', 'pt']).default('es')
})

export type QspmProposalRequest = z.infer<typeof qspmProposalRequestSchema>

export const qspmProposalResponseSchema = z.object({
  qspmScores: z.record(z.string(), z.record(z.string(), z.number().int().min(1).max(4).nullable())),
  proposedStrategies: z.array(qspmProposedStrategySchema).optional(),
  rationale: z.string().optional()
})

export type QspmProposalResponse = z.infer<typeof qspmProposalResponseSchema>
