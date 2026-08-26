import type { InvestigationsPrincipal } from '@/lib/investigations/access'
import type { ToolExecutionResult, NovaiModularTool } from './types'

// 1. Investigations & Evidence Tools
import { listInvestigationsTool } from './investigations/list-investigations'
import { getActiveInvestigationTool } from './investigations/get-active-investigation'
import { getInvestigationDetailsTool } from './investigations/get-investigation-details'
import { getInvestigationsStatsTool } from './investigations/get-investigations-stats'
import { getInvestigationDocumentsTool } from './investigations/get-investigation-documents'
import { searchEvidenceTool } from './investigations/search-evidence'
import { getFactorEvidenceTool } from './investigations/get-factor-evidence'
import { verifyClaimTool } from './investigations/verify-claim'

// 2. Methodology & Audit Tools
import { auditFactorTool } from './methodology/audit-factor'
import { auditRelationshipTool } from './methodology/audit-relationship'
import { findContradictionsTool } from './methodology/find-contradictions'
import { validateMethodologyTool } from './methodology/validate-methodology'
import { calculateMatrixTool } from './methodology/calculate-matrix'

// 3. Strategy & Red-Team Tools
import { traceStrategyTool } from './strategy/trace-strategy'
import { compareStrategiesTool } from './strategy/compare-strategies'
import { challengeAnalysisTool } from './strategy/challenge-analysis'

// 4. Platform & Operations Tools
import { listKanbanTasksTool } from './kanban/list-kanban-tasks'
import { getKanbanBoardSummaryTool } from './kanban/get-kanban-board-summary'
import { listWorkspaceMembersTool } from './organization/list-workspace-members'
import { getBillingQuotaTool } from './billing/get-billing-quota'
import { recordStrategicMemoryTool } from './memory/record-strategic-memory'

export * from './types'
export { listInvestigationsTool } from './investigations/list-investigations'
export { getActiveInvestigationTool } from './investigations/get-active-investigation'
export { getInvestigationDetailsTool } from './investigations/get-investigation-details'
export { getInvestigationsStatsTool } from './investigations/get-investigations-stats'
export { getInvestigationDocumentsTool } from './investigations/get-investigation-documents'
export { searchEvidenceTool } from './investigations/search-evidence'
export { getFactorEvidenceTool } from './investigations/get-factor-evidence'
export { verifyClaimTool } from './investigations/verify-claim'

export { auditFactorTool } from './methodology/audit-factor'
export { auditRelationshipTool } from './methodology/audit-relationship'
export { findContradictionsTool } from './methodology/find-contradictions'
export { validateMethodologyTool } from './methodology/validate-methodology'
export { calculateMatrixTool } from './methodology/calculate-matrix'

export { traceStrategyTool } from './strategy/trace-strategy'
export { compareStrategiesTool } from './strategy/compare-strategies'
export { challengeAnalysisTool } from './strategy/challenge-analysis'

export { listKanbanTasksTool } from './kanban/list-kanban-tasks'
export { getKanbanBoardSummaryTool } from './kanban/get-kanban-board-summary'
export { listWorkspaceMembersTool } from './organization/list-workspace-members'
export { getBillingQuotaTool } from './billing/get-billing-quota'
export { recordStrategicMemoryTool } from './memory/record-strategic-memory'

/**
 * Catálogo maestro de todas las herramientas modulares registradas de NovAi.
 */
export const NOVAI_ALL_MODULAR_TOOLS: Record<string, NovaiModularTool> = {
  // Expediente & Evidencia
  list_investigations: listInvestigationsTool as unknown as NovaiModularTool,
  get_active_investigation: getActiveInvestigationTool as unknown as NovaiModularTool,
  get_investigation_details: getInvestigationDetailsTool as unknown as NovaiModularTool,
  get_investigations_stats: getInvestigationsStatsTool as unknown as NovaiModularTool,
  get_investigation_documents: getInvestigationDocumentsTool as unknown as NovaiModularTool,
  search_evidence: searchEvidenceTool as unknown as NovaiModularTool,
  get_factor_evidence: getFactorEvidenceTool as unknown as NovaiModularTool,
  verify_claim: verifyClaimTool as unknown as NovaiModularTool,

  // Metodología & Auditoría
  audit_factor: auditFactorTool as unknown as NovaiModularTool,
  audit_relationship: auditRelationshipTool as unknown as NovaiModularTool,
  find_contradictions: findContradictionsTool as unknown as NovaiModularTool,
  validate_methodology: validateMethodologyTool as unknown as NovaiModularTool,
  calculate_matrix: calculateMatrixTool as unknown as NovaiModularTool,

  // Estrategia & Red-Team
  trace_strategy: traceStrategyTool as unknown as NovaiModularTool,
  compare_strategies: compareStrategiesTool as unknown as NovaiModularTool,
  challenge_analysis: challengeAnalysisTool as unknown as NovaiModularTool,

  // Plataforma & Tareas
  list_kanban_tasks: listKanbanTasksTool as unknown as NovaiModularTool,
  get_kanban_board_summary: getKanbanBoardSummaryTool as unknown as NovaiModularTool,
  list_workspace_members_and_teams: listWorkspaceMembersTool as unknown as NovaiModularTool,
  get_tenant_billing_and_quota_info: getBillingQuotaTool as unknown as NovaiModularTool,
  record_strategic_memory: recordStrategicMemoryTool as unknown as NovaiModularTool
}

/**
 * Declaraciones JSON estándar para OpenAI / Gemini function calling.
 */
export const NOVAI_TOOL_DECLARATIONS = Object.values(NOVAI_ALL_MODULAR_TOOLS).map(t => {
  if (t.openAiDeclaration) return t.openAiDeclaration
  if (typeof t.toOpenAiDeclaration === 'function') return t.toOpenAiDeclaration()
  return {
    name: t.metadata.name,
    description: t.metadata.description,
    parameters: { type: 'object', properties: {} }
  }
})

export const NOVAI_OPENAI_TOOLS = NOVAI_TOOL_DECLARATIONS.map(d => ({
  type: 'function' as const,
  function: {
    name: d.name,
    description: d.description,
    parameters: d.parameters
  }
}))

export interface OpenAiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Ejecutor unificado server-side bajo RLS y ReBAC.
 */
export async function executeNovaiTool(
  name: string,
  args: Record<string, unknown>,
  principal: InvestigationsPrincipal
): Promise<ToolExecutionResult> {
  const toolInstance = NOVAI_ALL_MODULAR_TOOLS[name]
  if (!toolInstance) {
    return { toolName: name, success: false, error: `Herramienta desconocida: ${name}` }
  }

  return toolInstance.execute(args, principal)
}

/**
 * Adaptador de herramientas gobernadas para Vercel AI SDK Core (`ai`).
 */
export function getNovaiVercelTools(principal: InvestigationsPrincipal) {
  const vercelTools: Record<string, any> = {}
  for (const [name, t] of Object.entries(NOVAI_ALL_MODULAR_TOOLS)) {
    if (typeof t.toVercelTool === 'function') {
      vercelTools[name] = t.toVercelTool(principal)
    } else if (typeof t.toVercelAiTool === 'function') {
      vercelTools[name] = t.toVercelAiTool(principal)
    }
  }
  return vercelTools
}
