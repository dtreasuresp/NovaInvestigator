// ─── Tipos de dominio ────────────────────────────────────────────────────────

export type Quadrant = 'FO' | 'DO' | 'FA' | 'DA'

export type FactorType = 'F' | 'D' | 'O' | 'A'

export type InvestigationStatus =
  | 'nueva'
  | 'borrador'
  | 'en análisis'
  | 'validada'
  | 'exportada'
  | 'cerrada'

export type RelationStatusLabel =
  | 'pendiente'
  | 'sin relación'
  | 'débil'
  | 'moderada'
  | 'fuerte'

export type OrientationKey = Quadrant

export type Severity = 'warning' | 'error'

export type CameType = 'C' | 'A' | 'M' | 'E'

export type CameActionStatus = 'propuesta' | 'en curso' | 'completada' | 'pausada'

export type FactorGroup = 'internal' | 'external'

export type StageKey = 'context' | 'summary' | 'efi' | 'efe' | 'dafo' | 'qspm' | 'came'

export type RelationStatusKey = 'pending' | 'none' | 'weak' | 'moderate' | 'strong'

// ─── Interfaces de datos ─────────────────────────────────────────────────────

export interface Factor {
  id: string
  name: string
  type: FactorType
  group: FactorGroup
  weight: number
  rating: number
  description: string
  evidence: string
}

export interface FactorWithScore extends Factor {
  score: number
}

export interface Relationship {
  id: string
  internalId: string
  externalId: string
  quadrant: Quadrant | null
  strength: number | null
  status: RelationStatusLabel | string
  justification: string
  evidence: string
  evaluator: string
  date: string
}

export interface Strategy {
  id: string
  name: string
  quadrant: Quadrant
  orientation: string
  description: string
  relatedFactors: string[]
  observations: string
}

export interface CameCriterion {
  id: string
  name: string
  weight: number
}

export interface CameCriteriaValues {
  impact: number
  urgency: number
  severity: number
  alignment: number
  feasibility: number
}

export interface CameAction {
  id: string
  type: CameType
  factorId: string
  factor: string
  strategyId: string
  problem: string
  objective: string
  action: string
  responsible: string
  participants: string
  resources: string[]
  startDate: string
  endDate: string
  indicator: string
  baseline: string
  target: string
  frequency: string
  status: CameActionStatus
  criteria: CameCriteriaValues
  justification: string
  observations: string
}

export interface InvestigationCollaborator {
  userId: string
  displayName: string
  avatarUrl?: string | null
  email?: string | null
  role: 'editor' | 'viewer'
  addedAt: string
}

export interface Metadata {
  id: string
  label: string
  organization: string
  unit: string
  title: string
  author: string
  evaluationDate: string
  validation: string
  status: string
  problem: string
  objective: string
  assumptions: string
  methodologicalVersion: string
  updatedAt: string
  archivedAt: string | null
  createdAt?: string
  ownerId?: string
  createdByName?: string | null
  updatedByName?: string | null
  lastOpenedAt?: string | null
  lastOpenedByName?: string | null
  isLocked?: boolean
  accessLevel?: 'private' | 'team_read' | 'team_write'
  collaborators?: InvestigationCollaborator[]
  version?: number
}

export interface HistoryChangeDetail {
  area: 'metadata' | 'internal' | 'external' | 'relationships' | 'strategies' | 'came' | 'qspm'
  action: 'create' | 'update' | 'delete' | 'reorder'
  summary: string
  entityId?: string
}

export interface HistoryEntry {
  id: string
  version: number
  timestamp: string
  reason: string
  authorName?: string | null
  changes?: HistoryChangeDetail[]
  snapshot?: Partial<InvestigationState> | null
}

export type QspmScores = Record<string, Record<string, number | null>>

export interface InvestigationState {
  metadata: Metadata
  internal: Factor[]
  external: Factor[]
  relationships: Relationship[]
  strategies: Strategy[]
  qspmScores: QspmScores
  selectedStrategyId: string | null
  selectionJustification: string
  cameCriteria: CameCriterion[]
  cameActions: CameAction[]
  history: HistoryEntry[]
}

export interface WorkspaceEnvelope {
  schemaVersion: number
  activeId: string | null
  items: InvestigationState[]
}

// ─── Tipos de resultados de análisis ─────────────────────────────────────────

export interface EfiResult {
  total: number
  weightTotal: number
  strengths: FactorWithScore[]
  weaknesses: FactorWithScore[]
  factors: FactorWithScore[]
}

export interface EfeResult {
  total: number
  weightTotal: number
  opportunities: FactorWithScore[]
  threats: FactorWithScore[]
  factors: FactorWithScore[]
}

export interface QuadrantSummary {
  index: number
  coverage: number
  evaluated: number
  available: number
  evaluatedWeight: number
  averageStrength: number
  potentialWeight: number
  contribution: number
  mainRelations: (Relationship & {
    internalName: string
    externalName: string
    contribution: number
  })[]
}

export interface RelationsAnalysis {
  summary: Record<Quadrant, QuadrantSummary>
  ordered: (QuadrantSummary & { quadrant: Quadrant })[]
  dominant: Quadrant | null
  second: Quadrant | null
  difference: number
  coverage: number
  confidence: string
  warnings: string[]
  evaluatedCount: number
}

export interface CrossCell {
  factorId: string
  factorName: string
  value: number
}

export interface ExploratoryRow {
  factorId: string
  factorName: string
  type: FactorType
  weight: number
  score: number
  opportunityCells: CrossCell[]
  threatCells: CrossCell[]
  opportunityTotal: number
  threatTotal: number
  total: number
}

export interface ExploratoryMatrix {
  opportunities: { id: string; name: string }[]
  threats: { id: string; name: string }[]
  strengthRows: ExploratoryRow[]
  weaknessRows: ExploratoryRow[]
  subtotals: Record<Quadrant, number>
}

export interface DafoResult {
  FO: number
  FA: number
  DO: number
  DA: number
  matrix: ExploratoryMatrix
  relations: RelationsAnalysis
}

export interface QspmWeightedFactor extends Factor {
  normalizedWeight: number
}

export interface QspmStrategyResult {
  strategyId: string
  name: string
  quadrant: string
  totalTas: number
  internalTas?: number
  externalTas?: number
  evaluated: number
  pending: number
  complete: boolean
}

export interface QspmResult {
  factors: QspmWeightedFactor[]
  normalizedWeights: Record<string, number>
  results: QspmStrategyResult[]
  warnings: string[]
  winner: string | null
  topDifference: number
  tie: boolean
}

export interface CameEnrichedAction extends CameAction {
  priority: number
  category: string
}

export interface CameResult {
  actions: CameEnrichedAction[]
  byType: Record<CameType, CameEnrichedAction[]>
  warnings: string[]
  valid: boolean
  weightTotal: number
}

export interface Analysis {
  efi: EfiResult
  efe: EfeResult
  dafo: DafoResult
  relations: RelationsAnalysis
  qspm: QspmResult
  came: CameResult
}

// ─── Tipos de validación ─────────────────────────────────────────────────────

export interface ValidationIssue {
  id: string
  stage: StageKey
  message: string
  severity: Severity
}

export type StageStatusMap = Record<StageKey, 'error' | 'warning' | 'ready'>

export interface ValidationResult {
  issues: ValidationIssue[]
  byStage: Record<StageKey, ValidationIssue[]>
  stageStatus: StageStatusMap
  errors: number
  warnings: number
  valid: boolean
  complete: boolean
}

// ─── Tipos de modelo de reporte ──────────────────────────────────────────────

export interface ReportModel {
  state: InvestigationState
  analysis: Analysis
  selectedStrategy: Strategy | undefined
  chartData: {
    fortalezas: { nombre: string; puntaje: number }[]
    debilidades: { nombre: string; puntaje: number }[]
    oportunidades: { nombre: string; puntaje: number }[]
    amenazas: { nombre: string; puntaje: number }[]
    dafo: Record<Quadrant, number>
    efi_score: number
    efe_score: number
  }
}