import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getInvestigationById } from '@/lib/investigations/repository'
import { calculateAnalysis } from '@/utils/investigator/domain'
import type { InvestigationState } from '@/types/apps/investigator-types'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const calculateMatrixSchema = z.object({
  investigation_id: z.string().min(1).describe('El ID único (UUID) de la investigación a calcular.'),
  matrix_type: z.enum(['ALL', 'EFI', 'EFE', 'DAFO', 'CAME', 'QSPM']).optional().default('ALL').describe('La matriz o sección específica cuyos cálculos matemáticos se desean consultar.')
})

export type CalculateMatrixInput = z.infer<typeof calculateMatrixSchema>

export async function executeCalculateMatrix(
  args: CalculateMatrixInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const id = String(args.investigation_id || '').trim()
    const matrixType = args.matrix_type || 'ALL'

    if (!id) {
      return { toolName: 'calculate_matrix', success: false, error: 'investigation_id es requerido' }
    }

    const row = await getInvestigationById(principal.client, principal.tenantId, id)

    if (!row) {
      return {
        toolName: 'calculate_matrix',
        success: false,
        error: `No se encontró la investigación con ID ${id} o no tienes permisos de acceso (ReBAC/RLS).`
      }
    }

    const state = row.state as unknown as InvestigationState
    const calculated = calculateAnalysis(state)

    let responseData: unknown = null

    switch (matrixType) {
      case 'EFI':
        responseData = {
          totalIndex: calculated.efi.total,
          interpretation: calculated.efi.total >= 2.5 ? 'Posición interna fuerte' : 'Posición interna débil',
          weightsSum: calculated.efi.weightTotal,
          factors: calculated.efi.factors.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            weight: f.weight,
            rating: f.rating,
            score: f.score
          }))
        }
        break

      case 'EFE':
        responseData = {
          totalIndex: calculated.efe.total,
          interpretation: calculated.efe.total >= 2.5 ? 'Aprovechamiento externo favorable' : 'Vulnerabilidad ante el entorno',
          weightsSum: calculated.efe.weightTotal,
          factors: calculated.efe.factors.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            weight: f.weight,
            rating: f.rating,
            score: f.score
          }))
        }
        break

      case 'DAFO':
        responseData = {
          dominantQuadrant: calculated.relations.dominant,
          quadrantSummaries: calculated.relations.summary,
          internalVsExternalPosition: {
            efi: calculated.efi.total,
            efe: calculated.efe.total
          },
          totalCrossingsEvaluated: calculated.relations.evaluatedCount
        }
        break

      case 'CAME':
        responseData = {
          actionsCount: (calculated.came?.actions || []).length,
          actions: calculated.came?.actions || []
        }
        break

      case 'QSPM':
        responseData = {
          qspm: calculated.qspm,
          interpretation: calculated.qspm.winner
            ? `Estrategia preferente: ${calculated.qspm.winner} (TAS ${calculated.qspm.results[0]?.totalTas?.toFixed(3) ?? 'N/A'})`
            : 'QSPM sin evaluación completa — faltan factores o puntuaciones AS',
          formula: 'TAS = weight_normalized * AS (Attractiveness Score 1-4)',
          weightsSum: 1.0,
          factorsCount: calculated.qspm.factors.length,
          strategiesCount: calculated.qspm.results.length
        }
        break

      case 'ALL':
      default:
        responseData = {
          efi: {
            total: calculated.efi.total,
            weightsSum: calculated.efi.weightTotal,
            factorsCount: calculated.efi.factors.length
          },
          efe: {
            total: calculated.efe.total,
            weightsSum: calculated.efe.weightTotal,
            factorsCount: calculated.efe.factors.length
          },
          dafo: {
            dominantQuadrant: calculated.relations.dominant,
            quadrants: calculated.relations.summary
          },
          came: {
            totalActions: (calculated.came?.actions || []).length
          },
          qspm: {
            totalStrategies: calculated.qspm.results.length,
            winner: calculated.qspm.winner,
            topDifference: calculated.qspm.topDifference,
            tie: calculated.qspm.tie,
            warnings: calculated.qspm.warnings,
            resultsSummary: calculated.qspm.results.map(r => ({
              strategyId: r.strategyId,
              totalTas: r.totalTas,
              evaluated: r.evaluated,
              pending: r.pending,
              complete: r.complete
            }))
          }
        }
        break
    }

    return {
      toolName: 'calculate_matrix',
      success: true,
      result: {
        investigationId: row.id,
        investigationTitle: row.title,
        matrixType,
        calculation: responseData
      }
    }
  } catch (err) {
    return {
      toolName: 'calculate_matrix',
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const calculateMatrixTool: NovaiModularTool = {
  metadata: {
    name: 'calculate_matrix',
    displayName: 'Ejecutar Cálculos de Matrices',
    description:
      'Calcula deterministamente los índices y distribuciones matemáticas oficiales (EFI, EFE, cruces DAFO, cuadrante dominante, CAME y QSPM con TAS) reutilizando el motor analítico del sistema.',
    category: 'methodology',
    riskLevel: 'read-only',
    scope: 'investigation'
  },
  schema: calculateMatrixSchema,
  execute: executeCalculateMatrix,
  openAiDeclaration: {
    name: 'calculate_matrix',
    description:
      'Calcula deterministamente los índices y distribuciones matemáticas oficiales (EFI, EFE, cruces DAFO, cuadrante dominante, CAME y QSPM con TAS) reutilizando el motor analítico del sistema.',
    parameters: {
      type: 'object',
      properties: {
        investigation_id: { type: 'string', description: 'El ID único (UUID) de la investigación.' },
        matrix_type: { type: 'string', enum: ['ALL', 'EFI', 'EFE', 'DAFO', 'CAME', 'QSPM'], description: 'Tipo de matriz a calcular.' }
      },
      required: ['investigation_id']
    }
  },
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description:
        'Calcula deterministamente los índices y distribuciones matemáticas oficiales (EFI, EFE, cruces DAFO, cuadrante dominante, CAME y QSPM con TAS) reutilizando el motor analítico del sistema.',
      inputSchema: calculateMatrixSchema,
      execute: async (args: CalculateMatrixInput) => {
        const res = await executeCalculateMatrix(args, principal)
        if (!res.success) throw new Error(res.error || 'calculate_matrix failed')
        return res.result
      }
    })
}
