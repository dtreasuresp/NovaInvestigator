import type { SupabaseClient } from '@supabase/supabase-js'

import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { executeNovaiTool, getNovaiVercelTools, type ToolExecutionResult } from './tools'
import { NovaiMemoryEngine, type SaveMemoryParams } from './memory-engine'
import { logger } from '@/lib/logger'

export type ToolRiskLevel = 'low' | 'medium' | 'high'
export type ToolApprovalStatus = 'auto_approved' | 'user_approved' | 'rejected'

export interface ToolPolicyCheckResult {
  toolName: string
  riskLevel: ToolRiskLevel
  requiresApproval: boolean
  isAuthorized: boolean
  reason?: string
}

export class NovaiToolGateway {
  /**
   * Clasifica el nivel de riesgo de una herramienta según su impacto en el tenant.
   */
  static evaluateToolRisk(toolName: string): ToolRiskLevel {
    const highRiskTools = ['delete_investigation', 'delete_workspace_data', 'change_subscription_plan', 'refund_payment']
    const mediumRiskTools = ['record_strategic_memory', 'create_kanban_task', 'update_investigation_factor']

    if (highRiskTools.includes(toolName)) {
      return 'high'
    }

    if (mediumRiskTools.includes(toolName)) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Evalúa la política de autorización y riesgo antes de ejecutar la herramienta.
   */
  static checkPolicy(
    toolName: string,
    principal: InvestigationsPrincipal,
    isUserConfirmed = false
  ): ToolPolicyCheckResult {
    const riskLevel = this.evaluateToolRisk(toolName)

    if (riskLevel === 'high' && !isUserConfirmed) {
      return {
        toolName,
        riskLevel,
        requiresApproval: true,
        isAuthorized: false,
        reason: 'Esta acción tiene un nivel de riesgo ALTO y requiere confirmación explícita del usuario antes de ejecutarse.'
      }
    }

    return {
      toolName,
      riskLevel,
      requiresApproval: false,
      isAuthorized: true
    }
  }

  /**
   * Ejecuta la herramienta de forma gobernada, auditando el resultado.
   */
  static async executeGovernedTool(
    toolName: string,
    args: Record<string, unknown>,
    principal: InvestigationsPrincipal,
    options?: { isUserConfirmed?: boolean; runId?: string }
  ): Promise<ToolExecutionResult> {
    const policy = this.checkPolicy(toolName, principal, options?.isUserConfirmed)

    if (!policy.isAuthorized) {
      return {
        toolName,
        success: false,
        error: policy.reason || 'Acción denegada por política de seguridad del Tool Gateway.'
      }
    }

    const startTime = Date.now()

    try {
      // 1. Manejo de herramientas de memoria gobernada
      if (toolName === 'record_strategic_memory') {
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
          return { toolName, success: false, error: 'key y content son requeridos para registrar memoria estratégica.' }
        }

        const saved = await NovaiMemoryEngine.recordMemory(principal.client as unknown as SupabaseClient, memoryParams)

        return {
          toolName,
          success: Boolean(saved),
          data: saved
        }
      }

      // 2. Ejecutor estándar de tools de lectura y análisis
      const result = await executeNovaiTool(toolName, args, principal)

      // 3. Auditoría asíncrona no bloqueante
      this.recordAuditEventAsync(principal, {
        runId: options?.runId,
        action: `tool.${toolName}`,
        toolName,
        riskLevel: policy.riskLevel,
        approvalStatus: options?.isUserConfirmed ? 'user_approved' : 'auto_approved',
        payload: args,
        result: result.data || { error: result.error },
        durationMs: Date.now() - startTime
      })

      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      logger.error('Error in NovaiToolGateway execution', {
        action: 'novai.gateway.execute',
        details: { toolName, tenantId: principal.tenantId, errorMessage: errorMsg }
      })

      return { toolName, success: false, error: errorMsg }
    }
  }

  /**
   * Registro asíncrono del evento de auditoría en base de datos.
   */
  private static recordAuditEventAsync(
    principal: InvestigationsPrincipal,
    event: {
      runId?: string
      action: string
      toolName: string
      riskLevel: ToolRiskLevel
      approvalStatus: ToolApprovalStatus
      payload: unknown
      result: unknown
      durationMs: number
    }
  ) {
    Promise.resolve().then(async () => {
      try {
        const client = principal.client as unknown as SupabaseClient
        
        await client.from('novai_audit_events').insert({
          tenant_id: principal.tenantId,
          user_id: principal.userId,
          run_id: event.runId || null,
          action: event.action,
          tool_name: event.toolName,
          risk_level: event.riskLevel,
          approval_status: event.approvalStatus,
          payload: event.payload || {},
          result: event.result || {}
        })
      } catch (err) {
        logger.warn('Failed to record audit event in novai_audit_events', {
          action: 'novai.audit.record',
          details: { errorMessage: err instanceof Error ? err.message : String(err) }
        })
      }
    })
  }

  /**
   * Envuelve una función execute() de tool con la política del Gateway
   * y el registro asíncrono en `novai_audit_events`.
   *
   * Es el punto donde el Harness aplica enforcement (spec §38/§39):
   * ninguna tool llega al modelo sin pasar por aquí.
   */
  private static wrapGoverned(
    toolName: string,
    execute: (args: Record<string, unknown>) => Promise<unknown>,
    principal: InvestigationsPrincipal,
    options?: { runId?: string; isUserConfirmed?: boolean }
  ) {
    return async (args: Record<string, unknown>) => {
      const policy = this.checkPolicy(toolName, principal, options?.isUserConfirmed)

      if (!policy.isAuthorized) {
        return { error: policy.reason || 'Acción denegada por política de seguridad del Tool Gateway.' }
      }

      const startTime = Date.now()

      try {
        const result = await execute(args)

        // Auditoría asíncrona no bloqueante (best-effort; nunca rompe la respuesta)
        this.recordAuditEventAsync(principal, {
          runId: options?.runId,
          action: `tool.${toolName}`,
          toolName,
          riskLevel: policy.riskLevel,
          approvalStatus: options?.isUserConfirmed ? 'user_approved' : 'auto_approved',
          payload: args,
          result,
          durationMs: Date.now() - startTime
        })

        return result
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)

        logger.error('Governed Vercel tool execution failed', {
          action: 'novai.gateway.vercel_tool_error',
          details: { toolName, tenantId: principal.tenantId, errorMessage: errorMsg }
        })

        return { error: errorMsg }
      }
    }
  }

  /**
   * Adaptador gobernado de tools para Vercel AI SDK Core.
   *
   * Igual que `getNovaiVercelTools(principal)` pero cada tool pasa por
   * checkPolicy + registro de auditoría antes de ejecutarse.
   */
  static buildGovernedVercelTools(
    principal: InvestigationsPrincipal,
    options?: { runId?: string; isUserConfirmed?: boolean }
  ): Record<string, any> {
    const raw = getNovaiVercelTools(principal)
    const governed: Record<string, any> = {}

    for (const [name, vercelTool] of Object.entries(raw)) {
      const candidate = vercelTool as { execute?: (args: Record<string, unknown>) => Promise<unknown> }

      if (typeof candidate.execute !== 'function') {
        governed[name] = vercelTool
        continue
      }

      governed[name] = {
        ...candidate,
        execute: this.wrapGoverned(name, candidate.execute.bind(candidate), principal, options)
      }
    }

    return governed
  }
}
