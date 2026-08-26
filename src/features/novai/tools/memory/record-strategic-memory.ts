import { z } from 'zod'
import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { NovaiMemoryEngine, type SaveMemoryParams } from '../../memory-engine'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const recordStrategicMemorySchema = z.object({
  key: z.string().min(1).describe('Clave identificadora del aprendizaje o hecho estratégico.'),
  content: z.string().min(1).describe('Contenido descriptivo del hecho o directriz a memorizar.'),
  scope: z.enum(['user', 'workspace', 'strategic']).optional().describe('Alcance de la memoria (por defecto: strategic).'),
  category: z.string().optional().describe('Categoría temática (diagnóstico, finanzas, mercado, etc.).'),
  workspace_id: z.string().optional().describe('ID del workspace si aplica.'),
  confidence: z.number().min(0).max(1).optional().describe('Grado de certeza (0.0 a 1.0, por defecto 1.0).')
})

export type RecordStrategicMemoryInput = z.infer<typeof recordStrategicMemorySchema>

export async function executeRecordStrategicMemory(
  args: RecordStrategicMemoryInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const rawScope = String(args.scope || 'strategic')
    const validScope = (['user', 'workspace', 'strategic'].includes(rawScope) ? rawScope : 'strategic') as SaveMemoryParams['scope']

    const memoryParams: SaveMemoryParams = {
      tenantId: principal.tenantId,
      workspaceId: typeof args.workspace_id === 'string' ? args.workspace_id : null,
      userId: principal.userId,
      scope: validScope,
      category: typeof args.category === 'string' ? args.category : 'general',
      key: String(args.key || '').trim(),
      content: String(args.content || '').trim(),
      confidence: typeof args.confidence === 'number' ? args.confidence : 1.0
    }

    if (!memoryParams.key || !memoryParams.content) {
      return {
        toolName: 'record_strategic_memory',
        success: false,
        error: 'key y content son requeridos para registrar memoria estratégica.'
      }
    }

    const saved = await NovaiMemoryEngine.recordMemory(
      principal.client as unknown as SupabaseClient,
      memoryParams
    )

    return {
      toolName: 'record_strategic_memory',
      success: Boolean(saved),
      data: saved
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    return {
      toolName: 'record_strategic_memory',
      success: false,
      error: `Error registrando memoria estratégica: ${errorMsg}`
    }
  }
}

export const recordStrategicMemoryTool: NovaiModularTool<typeof recordStrategicMemorySchema> = {
  metadata: {
    name: 'record_strategic_memory',
    label: 'Memorizar Hecho Estratégico',
    description: 'Registra un aprendizaje estratégico, hecho clave o directriz del negocio en la memoria persistente del workspace.',
    category: 'memory',
    riskLevel: 'medium'
  },
  schema: recordStrategicMemorySchema,
  openAiDeclaration: {
    name: 'record_strategic_memory',
    description: 'Registra un aprendizaje estratégico, hecho clave o directriz del negocio en la memoria persistente del workspace.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clave identificadora.' },
        content: { type: 'string', description: 'Contenido del hecho.' },
        scope: { type: 'string', enum: ['user', 'workspace', 'strategic'], description: 'Alcance.' },
        category: { type: 'string', description: 'Categoría.' },
        confidence: { type: 'number', description: 'Grado de confianza.' }
      },
      required: ['key', 'content']
    }
  },
  execute: executeRecordStrategicMemory,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Registra un aprendizaje estratégico o hecho clave en la memoria persistente del workspace.',
      inputSchema: recordStrategicMemorySchema,
      execute: async (args: RecordStrategicMemoryInput) => {
        const res = await executeRecordStrategicMemory(args, principal)
        
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
