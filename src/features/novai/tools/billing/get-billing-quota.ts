import { z } from 'zod'
import { tool } from 'ai'
import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import { getAiQuotaInfo } from '../../service'
import type { NovaiModularTool, ToolExecutionResult } from '../types'

export const getBillingQuotaSchema = z.object({})

export type GetBillingQuotaInput = z.infer<typeof getBillingQuotaSchema>

export async function executeGetBillingQuota(
  _args: GetBillingQuotaInput,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  try {
    const quota = await getAiQuotaInfo(principal)

    return {
      toolName: 'get_tenant_billing_and_quota_info',
      success: true,
      data: {
        isAllowed: quota.allowed,
        canUseFreeText: quota.canUseFreeText,
        monthlyLimit: quota.limitValue,
        monthlyRemaining: quota.remaining,
        dailyLimit: quota.dailyLimitValue,
        dailyRemaining: quota.dailyRemaining
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      toolName: 'get_tenant_billing_and_quota_info',
      success: false,
      error: `Error consultando cuotas comerciales: ${errorMsg}`
    }
  }
}

export const getBillingQuotaTool: NovaiModularTool<typeof getBillingQuotaSchema> = {
  metadata: {
    name: 'get_tenant_billing_and_quota_info',
    label: 'Cuotas y Facturación',
    description: 'Obtiene información sobre el plan contratado, módulos habilitados comercialmente y estado de cuotas de IA (mensual y diaria).',
    category: 'billing',
    riskLevel: 'low'
  },
  schema: getBillingQuotaSchema,
  openAiDeclaration: {
    name: 'get_tenant_billing_and_quota_info',
    description: 'Obtiene información sobre el plan contratado, módulos habilitados comercialmente y estado de cuotas de IA (mensual y diaria).',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  execute: executeGetBillingQuota,
  toVercelTool: (principal: InvestigationsPrincipal) =>
    tool({
      description: 'Obtiene información sobre el plan contratado, módulos habilitados y estado de cuotas de IA.',
      inputSchema: getBillingQuotaSchema,
      execute: async () => {
        const res = await executeGetBillingQuota({}, principal)
        return res.data !== undefined ? res.data : { error: res.error }
      }
    })
}
