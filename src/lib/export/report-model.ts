import type { InvestigationState, Analysis, CameAction } from '@/types/apps/investigator-types'
import type { ProjectDetail } from '@/features/projects'

export interface UnifiedReportProjectTask {
  id: string
  title: string
  priority: string
  status: string
  budgetAmount: number
  cameActionId: string | null
}

export interface UnifiedReportProject {
  id: string
  name: string
  description: string
  objective: string
  priority: string
  status: string
  budgetTotal: number
  budgetMode: string
  progressPercentage: number
  leaderName: string | null
  membersCount: number
  tasks: UnifiedReportProjectTask[]
  cameActionsCount: number
}

export interface UnifiedResearchReportData {
  reportType: 'summary' | 'full'
  investigationId: string
  title: string
  organization: string
  author: string
  date: string
  status: string
  executiveSummary: string
  strategicOrientation: string
  strategicPositionScore: {
    internalEfi: number
    externalEfe: number
    quadrant: string
  }
  factors: {
    strengths: Array<{ name: string; weight: number; rating: number; score: number }>
    weaknesses: Array<{ name: string; weight: number; rating: number; score: number }>
    opportunities: Array<{ name: string; weight: number; rating: number; score: number }>
    threats: Array<{ name: string; weight: number; rating: number; score: number }>
  }
  cameActions: Array<{
    id: string
    type: 'C' | 'A' | 'M' | 'E'
    action: string
    problem: string
    objective: string
    responsible: string
    status: string
    budget?: number
  }>
  projects: UnifiedReportProject[]
  budgetSummary: {
    totalBudget: number
    allocatedBudget: number
    executionRate: number
  }
}

export function buildUnifiedReportData(
  state: InvestigationState,
  analysis: Analysis,
  reportType: 'summary' | 'full' = 'full',
  projects: ProjectDetail[] = []
): UnifiedResearchReportData {
  const meta = state.metadata || {}

  const strengths = (state.internal || [])
    .filter(f => f.type === 'F')
    .map(f => ({
      name: f.name || f.description || '',
      weight: Number(f.weight) || 0,
      rating: Number(f.rating) || 0,
      score: (Number(f.weight) || 0) * (Number(f.rating) || 0)
    }))

  const weaknesses = (state.internal || [])
    .filter(f => f.type === 'D')
    .map(f => ({
      name: f.name || f.description || '',
      weight: Number(f.weight) || 0,
      rating: Number(f.rating) || 0,
      score: (Number(f.weight) || 0) * (Number(f.rating) || 0)
    }))

  const opportunities = (state.external || [])
    .filter(f => f.type === 'O')
    .map(f => ({
      name: f.name || f.description || '',
      weight: Number(f.weight) || 0,
      rating: Number(f.rating) || 0,
      score: (Number(f.weight) || 0) * (Number(f.rating) || 0)
    }))

  const threats = (state.external || [])
    .filter(f => f.type === 'A')
    .map(f => ({
      name: f.name || f.description || '',
      weight: Number(f.weight) || 0,
      rating: Number(f.rating) || 0,
      score: (Number(f.weight) || 0) * (Number(f.rating) || 0)
    }))

  const cameActions = (state.cameActions || []).map((a: CameAction) => ({
    id: a.id,
    type: a.type,
    action: a.action || a.objective || '',
    problem: a.problem || '',
    objective: a.objective || '',
    responsible: a.responsible || 'No asignado',
    status: a.status || 'pendiente',
    budget: undefined
  }))

  const mappedProjects: UnifiedReportProject[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    objective: p.objective || '',
    priority: p.priority,
    status: p.status,
    budgetTotal: Number(p.budget_total) || 0,
    budgetMode: p.budget_mode,
    progressPercentage: p.progressPercentage || 0,
    leaderName: p.members.find(m => m.role === 'leader')?.profile?.displayName || null,
    membersCount: p.members.length,
    tasks: (p.tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status || 'Backlog',
      budgetAmount: t.budgetAmount || 0,
      cameActionId: t.cameActionId
    })),
    cameActionsCount: p.cameActions.length
  }))

  const totalBudget = mappedProjects.reduce((acc, p) => acc + p.budgetTotal, 0)
  const allocatedBudget = mappedProjects.reduce(
    (acc, p) => acc + p.tasks.reduce((tAcc, t) => tAcc + t.budgetAmount, 0),
    0
  )
  const executionRate = totalBudget > 0 ? Math.round((allocatedBudget / totalBudget) * 100) : 0

  return {
    reportType,
    investigationId: meta.id || 'INV-001',
    title: meta.title || meta.organization || 'Informe Estratégico',
    organization: meta.organization || 'Organización',
    author: meta.author || 'Analista Estratégico',
    date: meta.createdAt || new Date().toISOString(),
    status: meta.status || 'Borrador',
    executiveSummary: meta.objective || meta.problem || 'Diagnóstico y plan de acción estratégico formulado mediante la suite NovaResearch.',
    strategicOrientation: analysis?.relations?.dominant || 'FO (Ofensiva)',
    strategicPositionScore: {
      internalEfi: analysis?.efi?.total || 2.5,
      externalEfe: analysis?.efe?.total || 2.5,
      quadrant: analysis?.relations?.dominant || 'FO'
    },
    factors: {
      strengths,
      weaknesses,
      opportunities,
      threats
    },
    cameActions,
    projects: mappedProjects,
    budgetSummary: {
      totalBudget,
      allocatedBudget,
      executionRate
    }
  }
}
