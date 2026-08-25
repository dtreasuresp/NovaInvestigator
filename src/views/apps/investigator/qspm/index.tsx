'use client'

// React Imports
import type { CSSProperties } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'

// Type Imports
import type { FactorType, QspmWeightedFactor, Quadrant, Strategy } from '@/types/apps/investigator-types'
import type { Cell, ColumnDef, Header } from '@tanstack/react-table'

// Third-party Imports
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Rating } from '@/components/ui/rating'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

// Icon Imports
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Edit2,
  GripVertical,
  Layers,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy
} from 'lucide-react'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { TYPE_LABELS } from '@/utils/investigator/constants'
import { ORIENTATIONS, formatNumber } from '@/utils/investigator/domain'

// View Imports
import { MetricCard, StageHeader } from '../shared/primitives'
import { StrategyModalDialog } from './strategy-modal-dialog'
import { QspmAiModal } from './qspm-ai-modal'

const FACTOR_TYPE_BADGE_STYLE: Record<FactorType, string> = {
  F: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  D: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  O: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  A: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
}

export const InvestigatorQspmView = () => {
  const { t } = useI18n()
  const {
    state,
    analysis,
    updateQspmScore,
    applyQspmProposal,
    updateStrategy,
    addStrategy,
    deleteStrategy,
    selectStrategy,
    updateSelectionJustification,
    confirmSelection,
    isReadOnly,
    hydrated,
    syncStatus
  } = useInvestigatorAnalysis()

  const isLoading = !hydrated || syncStatus === 'loading'
  const [activeFactorFilter, setActiveFactorFilter] = useState<'all' | 'internal' | 'external'>('all')

  // Modal state for creating/editing strategic alternatives
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStrategy, setModalStrategy] = useState<Strategy | null>(null)
  const [isEditingModal, setIsEditingModal] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  const weightedFactors = analysis.qspm.factors
  const topResult = analysis.qspm.results[0]
  const maxTas = topResult?.totalTas || 1

  const internalFactors = useMemo(
    () => weightedFactors.filter(f => f.group === 'internal'),
    [weightedFactors]
  )

  const externalFactors = useMemo(
    () => weightedFactors.filter(f => f.group === 'external'),
    [weightedFactors]
  )

  const displayedFactors = useMemo(() => {
    if (activeFactorFilter === 'internal') return internalFactors
    if (activeFactorFilter === 'external') return externalFactors

    return weightedFactors
  }, [activeFactorFilter, internalFactors, externalFactors])

  // Subtotal calculations for each strategy
  const strategySubtotals = useMemo(() => {
    const subtotals: Record<string, { internal: number; external: number; total: number }> = {}

    state.strategies.forEach(strategy => {
      const scores = state.qspmScores[strategy.id] || {}

      let intSum = 0
      let extSum = 0

      internalFactors.forEach(f => {
        const asScore = Number(scores[f.id])
        if (asScore >= 1 && asScore <= 4) {
          intSum += (f.normalizedWeight || 0) * asScore
        }
      })

      externalFactors.forEach(f => {
        const asScore = Number(scores[f.id])
        if (asScore >= 1 && asScore <= 4) {
          extSum += (f.normalizedWeight || 0) * asScore
        }
      })

      subtotals[strategy.id] = {
        internal: intSum,
        external: extSum,
        total: intSum + extSum
      }
    })

    return subtotals
  }, [state.strategies, state.qspmScores, internalFactors, externalFactors])

  // Evaluation progress calculation
  const evaluationStats = useMemo(() => {
    const totalCells = state.strategies.length * weightedFactors.length
    if (totalCells === 0) return { evaluated: 0, total: 0, percentage: 0 }

    let evaluatedCells = 0
    state.strategies.forEach(strategy => {
      const scores = state.qspmScores[strategy.id] || {}
      weightedFactors.forEach(f => {
        const asScore = Number(scores[f.id])
        if (asScore >= 1 && asScore <= 4) {
          evaluatedCells += 1
        }
      })
    })

    const percentage = Math.round((evaluatedCells / totalCells) * 100)
    return { evaluated: evaluatedCells, total: totalCells, percentage }
  }, [state.strategies, weightedFactors, state.qspmScores])

  // Modal handlers
  const handleOpenCreateStrategy = () => {
    setModalStrategy(null)
    setIsEditingModal(false)
    setModalOpen(true)
  }

  const handleOpenEditStrategy = (strategy: Strategy) => {
    setModalStrategy(strategy)
    setIsEditingModal(true)
    setModalOpen(true)
  }

  const handleSaveStrategy = (data: { name: string; quadrant: Quadrant; description: string }) => {
    if (isEditingModal && modalStrategy) {
      updateStrategy(modalStrategy.id, 'name', data.name)
      updateStrategy(modalStrategy.id, 'quadrant', data.quadrant)
      updateStrategy(modalStrategy.id, 'description', data.description)
    } else {
      const nextNum = state.strategies.length + 1
      const nextId = `EST-${String(nextNum).padStart(2, '0')}`
      addStrategy()
      setTimeout(() => {
        updateStrategy(nextId, 'name', data.name)
        updateStrategy(nextId, 'quadrant', data.quadrant)
        updateStrategy(nextId, 'description', data.description)
      }, 0)
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-5' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-96' />
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-3.5'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 w-full rounded-xl' />
          ))}
        </div>

        <Skeleton className='h-96 w-full rounded-xl' />

        <div className='grid gap-5 lg:grid-cols-2'>
          <Skeleton className='h-80 w-full rounded-xl' />
          <Skeleton className='h-80 w-full rounded-xl' />
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Top Metric Cards / KPIs */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3.5'>
        <MetricCard
          label={t('investigator.totalAlternatives') || 'Alternativas'}
          value={
            <div className='flex items-center justify-between'>
              <span>{state.strategies.length}</span>
              <Layers className='w-5 h-5 text-muted-foreground/60' />
            </div>
          }
          hint={`${weightedFactors.length} ${t('investigator.factors') || 'factores ponderados'}`}
        />

        <MetricCard
          label={t('investigator.recommendedStrategy')}
          value={
            <div className='flex items-center justify-between'>
              <span className='truncate text-xl font-bold font-mono'>
                {topResult ? topResult.strategyId : '—'}
              </span>
              <Trophy className='w-5 h-5 text-amber-500' />
            </div>
          }
          hint={topResult ? `TAS ${formatNumber(topResult.totalTas)} (${topResult.quadrant})` : 'Pendiente de evaluación'}
          tone={topResult ? 'positive' : 'default'}
        />

        <MetricCard
          label={t('investigator.selectedAsWinner') || 'Seleccionada'}
          value={
            <div className='flex items-center justify-between'>
              <span className='truncate text-xl font-bold font-mono text-primary'>
                {state.selectedStrategyId || '—'}
              </span>
              <Target className='w-5 h-5 text-primary/70' />
            </div>
          }
          hint={
            state.selectedStrategyId
              ? state.selectedStrategyId === topResult?.strategyId
                ? 'Coincide con recomendación'
                : 'Definida por el evaluador'
              : 'Sin seleccionar aún'
          }
        />

        <MetricCard
          label={t('investigator.evaluationProgress') || 'Evaluación'}
          value={
            <div className='flex items-center justify-between'>
              <span>{evaluationStats.percentage} %</span>
              <CheckCircle2 className='w-5 h-5 text-emerald-500' />
            </div>
          }
          hint={`${evaluationStats.evaluated} / ${evaluationStats.total} puntuaciones AS`}
          tone={evaluationStats.percentage === 100 ? 'positive' : 'warning'}
        />
      </div>

      {/* SECTION 1 (FULL WIDTH): Complete QSPM Matrix Table */}
      <Card className='w-full shadow-xs border'>
        <CardHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b'>
          <div>
            <CardTitle className='text-lg font-heading font-semibold flex items-center gap-2'>
              {t('investigator.quantitativeMatrix')}
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              {t('investigator.quantitativeMatrixDesc')}
            </CardDescription>
          </div>

          <div className='flex flex-wrap items-center gap-2 self-start sm:self-auto'>
            {!isReadOnly && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary'
                onClick={() => setAiModalOpen(true)}
              >
                <Sparkles className='w-3.5 h-3.5 text-primary' />
                {t('investigator.proposeQspmAi') || 'Proponer AS con NovAi'}
              </Button>
            )}

            <div className='flex items-center bg-muted/70 p-1 rounded-lg gap-1'>
              <Button
                size='sm'
                variant={activeFactorFilter === 'all' ? 'default' : 'ghost'}
                className='h-7 text-xs px-2.5 rounded-md'
                onClick={() => setActiveFactorFilter('all')}
              >
                {t('investigator.allTab')} ({weightedFactors.length})
              </Button>
              <Button
                size='sm'
                variant={activeFactorFilter === 'internal' ? 'default' : 'ghost'}
                className='h-7 text-xs px-2.5 rounded-md'
                onClick={() => setActiveFactorFilter('internal')}
              >
                {t('investigator.internalTab')} ({internalFactors.length})
              </Button>
              <Button
                size='sm'
                variant={activeFactorFilter === 'external' ? 'default' : 'ghost'}
                className='h-7 text-xs px-2.5 rounded-md'
                onClick={() => setActiveFactorFilter('external')}
              >
                {t('investigator.externalTab')} ({externalFactors.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          <QspmTableView
            factors={displayedFactors}
            internalFactors={internalFactors}
            externalFactors={externalFactors}
            activeFilter={activeFactorFilter}
            strategies={state.strategies}
            qspmScores={state.qspmScores}
            strategySubtotals={strategySubtotals}
            topResult={topResult}
            isReadOnly={isReadOnly}
            onScoreChange={updateQspmScore}
            onEditStrategy={handleOpenEditStrategy}
          />
        </CardContent>
      </Card>

      {/* SECTION 2 (2-COLUMN GRID): Strategic Alternatives (Full Height) + Ranking & Decision */}
      <div className='grid gap-6 lg:grid-cols-2 items-stretch'>
        {/* Left Column: Formulated Strategic Alternatives (Always Open Cards, Full Height) */}
        <Card className='shadow-xs border h-full flex flex-col'>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base font-semibold'>
                {t('investigator.strategicAlternatives')}
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                {t('investigator.strategicAlternativesDesc')}
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Button size='sm' variant='outline' onClick={handleOpenCreateStrategy} className='h-8 text-xs gap-1'>
                <Plus className='w-3.5 h-3.5' /> {t('common.add')}
              </Button>
            )}
          </CardHeader>
          <CardContent className='space-y-3 flex-1 overflow-y-auto pr-1 pt-1 min-h-[28rem]'>
            {state.strategies.length === 0 ? (
              <div className='py-16 text-center text-muted-foreground text-xs border border-dashed rounded-xl'>
                {t('investigator.noAlternativesMessage') || 'No hay alternativas formuladas aún.'}
              </div>
            ) : (
              state.strategies.map(strategy => {
                const isSelected = state.selectedStrategyId === strategy.id
                const isWinner = topResult?.strategyId === strategy.id
                const result = analysis.qspm.results.find(r => r.strategyId === strategy.id)
                const orientationInfo = ORIENTATIONS[strategy.quadrant]

                return (
                  <div
                    key={strategy.id}
                    className={`group relative rounded-xl border p-3.5 transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                        : 'bg-card hover:border-primary/40'
                    }`}
                  >
                    {/* Header line of the card */}
                    <div className='flex items-center justify-between gap-2 flex-wrap'>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground'>
                          {strategy.id}
                        </span>
                        <Badge variant='outline' className='text-[11px] font-medium'>
                          <span className='font-mono font-semibold mr-1'>{strategy.quadrant}</span> · {orientationInfo?.name}
                        </Badge>
                        {isWinner && (
                          <Badge variant='default' className='text-[10px] gap-1 py-0 bg-emerald-600 hover:bg-emerald-600 text-white'>
                            <Sparkles className='w-3 h-3' /> {t('investigator.strategyWinnerBadge') || 'Recomendada'}
                          </Badge>
                        )}
                      </div>

                      {result && (
                        <div className='font-mono text-xs font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded'>
                          TAS: {formatNumber(result.totalTas)}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className='font-semibold text-sm text-foreground leading-snug'>
                        {strategy.name || `Alternativa ${strategy.id}`}
                      </h4>
                    </div>

                    {/* Description */}
                    {strategy.description && (
                      <p className='text-xs text-muted-foreground leading-relaxed line-clamp-3'>
                        {strategy.description}
                      </p>
                    )}

                    {/* Footer Actions */}
                    <div className='flex items-center justify-between pt-2 border-t text-xs gap-2 flex-wrap'>
                      <div className='text-muted-foreground text-[11px]'>
                        {result
                          ? `${result.evaluated}/${weightedFactors.length} evaluados`
                          : '0 evaluados'}
                      </div>

                      <div className='flex items-center gap-1.5'>
                        {!isReadOnly && (
                          <>
                            <Button
                              size='sm'
                              variant={isSelected ? 'default' : 'outline'}
                              className={`h-7 text-xs px-2.5 gap-1 ${
                                isSelected ? 'bg-primary text-primary-foreground' : ''
                              }`}
                              onClick={() => selectStrategy(isSelected ? null : strategy.id)}
                            >
                              {isSelected ? (
                                <>
                                  <Check className='w-3.5 h-3.5' /> {t('investigator.selectedAsWinner') || 'Seleccionada'}
                                </>
                              ) : (
                                t('investigator.selectAsWinner') || 'Seleccionar'
                              )}
                            </Button>

                            <Button
                              size='icon-xs'
                              variant='ghost'
                              className='h-7 w-7'
                              title={t('common.edit')}
                              onClick={() => handleOpenEditStrategy(strategy)}
                            >
                              <Edit2 className='w-3.5 h-3.5 text-muted-foreground hover:text-foreground' />
                            </Button>

                            <Button
                              size='icon-xs'
                              variant='ghost'
                              className='h-7 w-7 text-destructive hover:bg-destructive/10'
                              title={t('common.delete')}
                              onClick={() => deleteStrategy(strategy.id)}
                            >
                              <Trash2 className='w-3.5 h-3.5' />
                            </Button>
                          </>
                        )}

                        {isReadOnly && isSelected && (
                          <Badge variant='default' className='text-xs'>
                            {t('investigator.selectedAsWinner') || 'Seleccionada'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column: Strategic Attractive Ranking (Progress Bars) + Decision Rationale */}
        <div className='flex flex-col gap-6'>
          {/* Ranking Card */}
          <Card className='shadow-xs border flex-1'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Award className='w-4 h-4 text-amber-500' />
                {t('investigator.strategicAttractiveRanking')}
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                {t('investigator.strategicAttractiveRankingDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 pt-1'>
              {analysis.qspm.results.length === 0 ? (
                <div className='py-8 text-center text-muted-foreground text-xs'>
                  {t('investigator.noAlternativesMessage')}
                </div>
              ) : (
                analysis.qspm.results.map((result, index) => {
                  const progressValue = maxTas > 0 ? (result.totalTas / maxTas) * 100 : 0
                  const isWinner = index === 0 && result.totalTas > 0
                  const isSelected = state.selectedStrategyId === result.strategyId

                  return (
                    <div
                      key={result.strategyId}
                      className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : isWinner
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-card'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span
                              className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isWinner
                                  ? 'bg-amber-500 text-white dark:bg-amber-600'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              #{index + 1}
                            </span>
                            <span className='font-mono text-xs font-bold text-primary'>
                              {result.strategyId}
                            </span>
                            <Badge variant='outline' className='text-[10px] py-0'>
                              {result.quadrant}
                            </Badge>
                          </div>
                          <p className='text-xs font-medium text-foreground mt-1 truncate'>
                            {result.name}
                          </p>
                        </div>

                        <div className='text-right shrink-0'>
                          <span className='font-heading text-lg font-bold text-foreground block font-mono'>
                            {formatNumber(result.totalTas)}
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            {result.evaluated}/{weightedFactors.length} fact.
                          </span>
                        </div>
                      </div>

                      {/* Visual progress relative to the winning strategy */}
                      <div className='space-y-1 pt-0.5'>
                        <Progress value={progressValue} className='h-1.5' />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Decision Rationale and Validation Card */}
          <Card className='shadow-xs border'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-semibold'>
                {t('investigator.decisionRationale')}
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                {t('investigator.decisionRationaleDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3.5 pt-1'>
              <Textarea
                className='min-h-24 text-xs resize-none'
                disabled={isReadOnly}
                value={state.selectionJustification}
                placeholder={t('investigator.decisionPlaceholder') || t('common.or')}
                onChange={e => updateSelectionJustification(e.target.value)}
              />

              <div className='flex items-center justify-between pt-1 gap-2 flex-wrap'>
                {!isReadOnly && (
                  <Button onClick={confirmSelection} size='sm' className='shadow-xs'>
                    {t('investigator.validateInvestigation')}
                  </Button>
                )}
                {state.metadata.status === 'validada' && (
                  <Badge
                    variant='outline'
                    className='bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-1 text-xs py-1 px-2.5'
                  >
                    ✓ {t('common.success') || 'Validada'}
                  </Badge>
                )}
              </div>

              {analysis.qspm.warnings.length > 0 && (
                <div className='space-y-2 pt-1'>
                  {analysis.qspm.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className='text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 text-xs p-2.5 rounded-lg flex items-start gap-2'
                    >
                      <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-amber-600' />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Dialog for Create/Edit Strategy */}
      <StrategyModalDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        strategy={modalStrategy}
        isEditing={isEditingModal}
        onSave={handleSaveStrategy}
      />

      {/* AI Proposal Modal for QSPM */}
      <QspmAiModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        state={state}
        onApply={applyQspmProposal}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}

const QspmTableView = ({
  factors,
  internalFactors,
  externalFactors,
  activeFilter,
  strategies,
  qspmScores,
  strategySubtotals,
  topResult,
  isReadOnly,
  onScoreChange,
  onEditStrategy
}: {
  factors: QspmWeightedFactor[]
  internalFactors: QspmWeightedFactor[]
  externalFactors: QspmWeightedFactor[]
  activeFilter: 'all' | 'internal' | 'external'
  strategies: Strategy[]
  qspmScores: Record<string, Record<string, number | null>>
  strategySubtotals: Record<string, { internal: number; external: number; total: number }>
  topResult: { strategyId: string; totalTas: number } | undefined
  isReadOnly?: boolean
  onScoreChange: (strategyId: string, factorId: string, value: string) => void
  onEditStrategy: (strategy: Strategy) => void
}) => {
  const { t } = useI18n()
  const dndId = useId()

  const initialColumnOrder = useMemo(
    () => ['factor', 'normalizedWeight', ...strategies.map(s => s.id)],
    [strategies]
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumnOrder)

  // Sincronizar columnOrder si se añaden o eliminan estrategias
  useEffect(() => {
    setColumnOrder(prevOrder => {
      const base = ['factor', 'normalizedWeight']
      const currentStrategyIds = new Set(strategies.map(s => s.id))
      const existing = prevOrder.filter(id => currentStrategyIds.has(id))
      const newlyAdded = strategies.map(s => s.id).filter(id => !existing.includes(id))

      return [...base, ...existing, ...newlyAdded]
    })
  }, [strategies])

  const columns = useMemo<ColumnDef<QspmWeightedFactor>[]>(() => {
    const baseCols: ColumnDef<QspmWeightedFactor>[] = [
      {
        id: 'factor',
        header: () => (
          <span className='font-semibold text-foreground text-xs'>
            {t('investigator.criticalFactor')}
          </span>
        ),
        cell: ({ row }) => {
          const factor = row.original
          const typeBadge = factor.type as FactorType
          const badgeStyle = FACTOR_TYPE_BADGE_STYLE[typeBadge] || ''

          return (
            <div className='w-full py-0.5'>
              <div className='flex items-center gap-1.5'>
                <span className='font-mono text-xs font-bold text-foreground'>{factor.id}</span>
                <Badge variant='outline' className={`text-[9px] px-1 py-0 font-medium ${badgeStyle}`}>
                  {TYPE_LABELS[typeBadge]}
                </Badge>
              </div>
              <p className='text-xs text-foreground font-medium mt-0.5 line-clamp-2 leading-tight'>
                {factor.name || factor.description || `Factor ${factor.id}`}
              </p>
            </div>
          )
        }
      },
      {
        accessorKey: 'normalizedWeight',
        header: () => (
          <span className='text-center block text-xs font-semibold'>
            {t('investigator.weightCol')}
          </span>
        ),
        cell: ({ row }) => (
          <div className='font-mono text-xs text-center font-medium text-foreground'>
            {formatNumber(row.original.normalizedWeight)}
          </div>
        )
      }
    ]

    const strategyCols: ColumnDef<QspmWeightedFactor>[] = strategies.map(strategy => {
      const isWinner = topResult?.strategyId === strategy.id

      return {
        id: strategy.id,
        header: () => (
          <div className='w-full text-center p-0.5 space-y-1'>
            <div className='flex items-center justify-center gap-1'>
              <span className='font-mono text-[11px] font-bold text-primary'>{strategy.id}</span>
              <Badge variant='outline' className='text-[9px] px-1 py-0'>
                {strategy.quadrant}
              </Badge>
              {!isReadOnly && (
                <button
                  type='button'
                  onClick={() => onEditStrategy(strategy)}
                  className='text-muted-foreground hover:text-foreground inline-flex items-center p-0.5 rounded hover:bg-muted'
                  title={t('common.edit')}
                >
                  <Edit2 className='w-3 h-3' />
                </button>
              )}
            </div>
            <p
              className='text-[10px] text-muted-foreground font-normal whitespace-normal break-words leading-tight line-clamp-3 text-center px-0.5 min-h-[2.4rem]'
              title={strategy.name}
            >
              {strategy.name}
            </p>
            {isWinner && (
              <Badge variant='default' className='text-[8px] py-0 px-1 bg-emerald-600 hover:bg-emerald-600 text-white'>
                ★ {t('investigator.strategyWinnerBadge') || 'Rec.'}
              </Badge>
            )}
          </div>
        ),
        cell: ({ row }) => {
          const factor = row.original
          const asScore = qspmScores[strategy.id]?.[factor.id]
          const numScore = Number(asScore)
          const hasScore = numScore >= 1 && numScore <= 4
          const tas = hasScore ? (factor.normalizedWeight || 0) * numScore : null

          return (
            <div className='w-full p-0.5 flex flex-col items-center justify-center gap-0.5'>
              <Rating
                max={4}
                size={16}
                precision={1}
                variant='default'
                readOnly={isReadOnly}
                value={hasScore ? numScore : 0}
                onValueChange={val => onScoreChange(strategy.id, factor.id, val > 0 ? val.toString() : '')}
                aria-label={`Calificación de ${factor.id} para ${strategy.id}`}
              />
              {tas != null ? (
                <span className='font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>
                  TAS: {formatNumber(tas)}
                </span>
              ) : (
                <span className='text-[9px] text-muted-foreground/40 italic'>TAS: —</span>
              )}
            </div>
          )
        }
      }
    })

    return [...baseCols, ...strategyCols]
  }, [strategies, qspmScores, onScoreChange, onEditStrategy, topResult, isReadOnly, t])

  const table = useReactTable({
    data: factors,
    columns,
    getRowId: row => row.id,
    state: {
      columnOrder
    },
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel()
  })

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {})
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return

    // Las 2 primeras columnas fijas (factor, normalizedWeight) no se pueden mover ni desplazar
    if (
      active.id === 'factor' ||
      active.id === 'normalizedWeight' ||
      over.id === 'factor' ||
      over.id === 'normalizedWeight'
    ) {
      return
    }

    setColumnOrder(prevOrder => {
      const oldIndex = prevOrder.indexOf(active.id as string)
      const newIndex = prevOrder.indexOf(over.id as string)

      if (oldIndex < 2 || newIndex < 2) return prevOrder

      return arrayMove(prevOrder, oldIndex, newIndex)
    })
  }

  // Estrategias en el orden visual actual para el pie de tabla
  const orderedStrategies = useMemo(() => {
    const strategyMap = new Map(strategies.map(s => [s.id, s]))

    return columnOrder
      .filter(id => id !== 'factor' && id !== 'normalizedWeight')
      .map(id => strategyMap.get(id))
      .filter((s): s is Strategy => s !== undefined)
  }, [strategies, columnOrder])

  // Group row separation logic when filter is 'all'
  const internalIds = useMemo(() => new Set(internalFactors.map(f => f.id)), [internalFactors])
  const externalIds = useMemo(() => new Set(externalFactors.map(f => f.id)), [externalFactors])

  return (
    <div className='overflow-x-auto border-t sm:border-0'>
      <DndContext
        id={dndId}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <Table className='w-full table-fixed'>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='bg-muted/40'>
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  {headerGroup.headers.map((header, idx) => {
                    if (idx === 0) {
                      return (
                        <TableHead
                          key={header.id}
                          className='sticky left-0 z-20 w-[220px] min-w-[200px] max-w-[240px] bg-card dark:bg-[#18181b] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] h-auto whitespace-normal align-top py-2 px-3'
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    }

                    if (idx === 1) {
                      return (
                        <TableHead
                          key={header.id}
                          className='w-[64px] min-w-[56px] max-w-[72px] text-center h-auto whitespace-normal align-top py-2 px-1'
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    }

                    return (
                      <DraggableStrategyHeader
                        key={header.id}
                        header={header}
                        isReadOnly={isReadOnly}
                      />
                    )
                  })}
                </SortableContext>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, rowIndex) => {
                const currentFactor = row.original
                const prevFactor = rowIndex > 0 ? table.getRowModel().rows[rowIndex - 1].original : null

                const isFirstInternal =
                  activeFilter === 'all' &&
                  internalIds.has(currentFactor.id) &&
                  (!prevFactor || !internalIds.has(prevFactor.id))

                const isFirstExternal =
                  activeFilter === 'all' &&
                  externalIds.has(currentFactor.id) &&
                  (!prevFactor || !externalIds.has(prevFactor.id))

                return (
                  <ReactGroupRowWrapper
                    key={row.id}
                    isFirstInternal={isFirstInternal}
                    isFirstExternal={isFirstExternal}
                    colSpan={2 + strategies.length}
                    internalWeightSum={internalFactors.reduce((s, f) => s + (f.normalizedWeight || 0), 0)}
                    externalWeightSum={externalFactors.reduce((s, f) => s + (f.normalizedWeight || 0), 0)}
                  >
                    <TableRow className='hover:bg-muted/30 transition-colors'>
                      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                        {row.getVisibleCells().map((cell, idx) => {
                          if (idx === 0) {
                            return (
                              <TableCell
                                key={cell.id}
                                className='sticky left-0 z-10 w-[220px] min-w-[200px] max-w-[240px] bg-card dark:bg-[#18181b] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] py-1.5'
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            )
                          }

                          if (idx === 1) {
                            return (
                              <TableCell
                                key={cell.id}
                                className='w-[64px] min-w-[56px] max-w-[72px] text-center py-1.5'
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            )
                          }

                          return (
                            <DragAlongStrategyCell key={cell.id} cell={cell}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </DragAlongStrategyCell>
                          )
                        })}
                      </SortableContext>
                    </TableRow>
                  </ReactGroupRowWrapper>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={2 + strategies.length}
                  className='text-center py-12 text-muted-foreground text-xs'
                >
                  {t('investigator.noFactorsAssigned')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            {/* Subtotal Factores Internos */}
            <TableRow className='bg-muted/30 font-medium text-xs'>
              <TableCell className='sticky left-0 z-10 w-[220px] min-w-[200px] max-w-[240px] bg-card dark:bg-[#18181b] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-xs font-semibold py-2'>
                {t('investigator.subtotalInternal')}
              </TableCell>
              <TableCell className='text-center font-mono text-xs py-2'>
                {formatNumber(internalFactors.reduce((s, f) => s + (f.normalizedWeight || 0), 0))}
              </TableCell>
              {orderedStrategies.map(strategy => (
                <TableCell key={strategy.id} className='text-center font-mono text-xs font-semibold py-2'>
                  {formatNumber(strategySubtotals[strategy.id]?.internal ?? 0)}
                </TableCell>
              ))}
            </TableRow>

            {/* Subtotal Factores Externos */}
            <TableRow className='bg-muted/30 font-medium text-xs'>
              <TableCell className='sticky left-0 z-10 w-[220px] min-w-[200px] max-w-[240px] bg-card dark:bg-[#18181b] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-xs font-semibold py-2'>
                {t('investigator.subtotalExternal')}
              </TableCell>
              <TableCell className='text-center font-mono text-xs py-2'>
                {formatNumber(externalFactors.reduce((s, f) => s + (f.normalizedWeight || 0), 0))}
              </TableCell>
              {orderedStrategies.map(strategy => (
                <TableCell key={strategy.id} className='text-center font-mono text-xs font-semibold py-2'>
                  {formatNumber(strategySubtotals[strategy.id]?.external ?? 0)}
                </TableCell>
              ))}
            </TableRow>

            {/* Total TAS */}
            <TableRow className='bg-muted font-bold'>
              <TableCell className='sticky left-0 z-10 w-[220px] min-w-[200px] max-w-[240px] bg-card dark:bg-[#18181b] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-xs font-bold py-2.5'>
                {t('investigator.totalTas')}
              </TableCell>
              <TableCell className='text-center font-mono text-xs font-bold py-2.5'>1.00</TableCell>
              {orderedStrategies.map(strategy => {
                const totalTas = strategySubtotals[strategy.id]?.total ?? 0
                const isWinner = topResult?.strategyId === strategy.id

                return (
                  <TableCell
                    key={strategy.id}
                    className={`text-center font-mono text-sm py-2.5 ${
                      isWinner ? 'text-primary font-black bg-primary/10' : ''
                    }`}
                  >
                    <span className='block text-sm font-bold'>{formatNumber(totalTas)}</span>
                    {isWinner && (
                      <span className='block text-[9px] font-sans font-semibold text-emerald-600 dark:text-emerald-400'>
                        ★ {t('investigator.strategyWinnerBadge') || 'Rec.'}
                      </span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </DndContext>
    </div>
  )
}

const DraggableStrategyHeader = ({
  header,
  isReadOnly
}: {
  header: Header<QspmWeightedFactor, unknown>
  isReadOnly?: boolean
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: header.column.id
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.75 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 0
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className='w-[110px] min-w-[96px] max-w-[130px] text-center h-auto whitespace-normal align-top py-2 px-1 relative group'
    >
      {!isReadOnly && (
        <button
          type='button'
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 left-1 inline-flex items-center'
          title='Arrastrar para reordenar columna'
          aria-label='Arrastrar para reordenar'
        >
          <GripVertical className='w-3 h-3' />
        </button>
      )}
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </TableHead>
  )
}

const DragAlongStrategyCell = ({
  cell,
  children
}: {
  cell: Cell<QspmWeightedFactor, unknown>
  children: React.ReactNode
}) => {
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.75 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0
  }

  return (
    <TableCell
      ref={setNodeRef}
      style={style}
      className='w-[110px] min-w-[96px] max-w-[130px] text-center py-1.5'
    >
      {children}
    </TableCell>
  )
}

const ReactGroupRowWrapper = ({
  isFirstInternal,
  isFirstExternal,
  colSpan,
  internalWeightSum,
  externalWeightSum,
  children
}: {
  isFirstInternal: boolean
  isFirstExternal: boolean
  colSpan: number
  internalWeightSum: number
  externalWeightSum: number
  children: React.ReactNode
}) => {
  return (
    <>
      {isFirstInternal && (
        <TableRow className='bg-muted/70 hover:bg-muted/70 border-y'>
          <TableCell
            colSpan={colSpan}
            className='py-1.5 px-4 font-heading font-semibold text-xs text-foreground tracking-wide uppercase'
          >
            Factores Internos (EFI) · Subtotal peso: {formatNumber(internalWeightSum)}
          </TableCell>
        </TableRow>
      )}
      {isFirstExternal && (
        <TableRow className='bg-muted/70 hover:bg-muted/70 border-y'>
          <TableCell
            colSpan={colSpan}
            className='py-1.5 px-4 font-heading font-semibold text-xs text-foreground tracking-wide uppercase'
          >
            Factores Externos (EFE) · Subtotal peso: {formatNumber(externalWeightSum)}
          </TableCell>
        </TableRow>
      )}
      {children}
    </>
  )
}

export default InvestigatorQspmView
