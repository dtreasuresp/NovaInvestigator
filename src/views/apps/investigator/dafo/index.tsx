// React Imports
import { useMemo, useState } from 'react'

// Type Imports
import type { Factor, Quadrant, Relationship } from '@/types/apps/investigator-types'
import type { ColumnDef } from '@tanstack/react-table'

// Third-party Imports
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

// Icon Imports
import { Lock, Sparkles } from 'lucide-react'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { ORIENTATIONS, formatNumber, formatPercent } from '@/utils/investigator/domain'

// View Imports
import { StageHeader } from '../shared/primitives'
import { DafoAiModal } from './dafo-ai-modal'

const STRENGTH_OPTIONS = [
  { value: 'null', label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  { value: '0', label: '0 · Sin relación directa', color: 'bg-muted text-muted-foreground' },
  { value: '1', label: '1 · Débil', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: '2', label: '2 · Moderada', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: '3', label: '3 · Fuerte', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }
]

export const InvestigatorDafoView = () => {
  const { t } = useI18n()
  const { state, analysis, updateRelationship, applyDafoProposal, isReadOnly, hydrated, syncStatus } = useInvestigatorAnalysis()
  const isLoading = !hydrated || syncStatus === 'loading'
  const [selectedQuadrantFilter, setSelectedQuadrantFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix')
  const [editingRelation, setEditingRelation] = useState<Relationship | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  // Edit form state
  const [formStrength, setFormStrength] = useState<string>('')
  const [formJustification, setFormJustification] = useState<string>('')
  const [formEvidence, setFormEvidence] = useState<string>('')
  const [formEvaluator, setFormEvaluator] = useState<string>('')

  const summary = analysis.relations.summary
  const dominant = analysis.relations.dominant

  const factorMap = new Map([...state.internal, ...state.external].map(f => [f.id, f]))

  const handleOpenEdit = (relation: Relationship) => {
    setEditingRelation(relation)
    setFormStrength(relation.strength?.toString() ?? '')
    setFormJustification(relation.justification ?? '')
    setFormEvidence(relation.evidence ?? '')
    setFormEvaluator(relation.evaluator ?? '')
    setDialogOpen(true)
  }

  const handleSaveRelation = () => {
    if (!editingRelation || isReadOnly) return

    updateRelationship(editingRelation.id, 'strength', formStrength)
    updateRelationship(editingRelation.id, 'justification', formJustification)
    updateRelationship(editingRelation.id, 'evidence', formEvidence)
    updateRelationship(editingRelation.id, 'evaluator', formEvaluator)
    setDialogOpen(false)
  }

  const filteredRelations = state.relationships.filter(relation => {
    if (selectedQuadrantFilter === 'all') return true
    if (selectedQuadrantFilter === 'pending') return relation.strength == null

    return relation.quadrant === selectedQuadrantFilter
  })

  if (isLoading) {
    return (
      <div className='flex flex-col gap-5' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-96' />
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className='p-4 space-y-3'>
              <div className='flex justify-between items-center'>
                <Skeleton className='h-6 w-12' />
                <Skeleton className='h-5 w-16' />
              </div>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-8 w-20' />
              <div className='flex justify-between'>
                <Skeleton className='h-3.5 w-20' />
                <Skeleton className='h-3.5 w-24' />
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className='space-y-2'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-96' />
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='rounded-xl border p-4 space-y-3'>
                  <Skeleton className='h-5 w-32' />
                  <div className='grid grid-cols-2 gap-2'>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className='h-20 rounded-lg' />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      <StageHeader
        kicker={`04 · ${t('investigator.dafo')}`}
        title={t('investigator.dafo')}
        description={t('investigator.subtitle')}
        action={
          isReadOnly ? (
            <Badge
              variant='outline'
              className='bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1 text-xs py-1 px-2.5'
            >
              <Lock className='w-3.5 h-3.5' /> {t('common.readOnlyMode')}
            </Badge>
          ) : undefined
        }
      />

      {/* Top 4 Quadrant KPI Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {(['FO', 'DO', 'FA', 'DA'] as Quadrant[]).map(quadrant => {
          const item = summary[quadrant]
          const active = dominant === quadrant

          return (
            <Card
              key={quadrant}
              className={`cursor-pointer transition-all ${
                active ? 'ring-primary ring-2 shadow-md' : 'hover:border-primary/50'
              } ${selectedQuadrantFilter === quadrant ? 'bg-primary/5' : ''}`}
              onClick={() => setSelectedQuadrantFilter(selectedQuadrantFilter === quadrant ? 'all' : quadrant)}
            >
              <CardHeader className='p-4'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='font-mono text-lg'>{quadrant}</CardTitle>
                  {active && <Badge className='bg-primary text-primary-foreground'>{t('investigator.dafoDominant')}</Badge>}
                </div>
                <CardDescription className='text-xs'>
                  {ORIENTATIONS[quadrant].name} · {ORIENTATIONS[quadrant].subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0 text-sm'>
                <p className='font-heading text-3xl font-bold'>{formatNumber(item.index)}</p>
                <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
                  <span>
                    {item.evaluated}/{item.available} evaluadas
                  </span>
                  <span className='font-medium text-foreground'>{formatPercent(item.coverage)} cobertura</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Working Panel */}
      <Card>
        <CardHeader className='flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0'>
          <div>
            <CardTitle>{t('investigator.dafoCrossAnalysis')}</CardTitle>
            <CardDescription>
              Haz clic en cualquier cruce para evaluar su fuerza (0 a 3), justificación y evidencia documental.
            </CardDescription>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {!isReadOnly && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary'
                onClick={() => setAiModalOpen(true)}
              >
                <Sparkles className='w-3.5 h-3.5 text-primary' />
                {t('investigator.proposeDafoAi') || 'Proponer cruces con NovAi'}
              </Button>
            )}
            <div className='flex rounded-lg border bg-muted/30 p-0.5'>
              <Button
                size='sm'
                variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                className='h-7 text-xs'
                onClick={() => setViewMode('matrix')}
              >
                Matriz 2×2
              </Button>
              <Button
                size='sm'
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                className='h-7 text-xs'
                onClick={() => setViewMode('list')}
              >
                Lista detallada
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Filters Bar */}
          <div className='flex flex-wrap items-center gap-1.5 border-b pb-3 text-xs'>
            <span className='text-muted-foreground mr-1 font-medium'>{t('common.filter')}</span>
            {[
              { id: 'all', label: 'Todos los cruces' },
              { id: 'FO', label: 'FO (Ofensivo)' },
              { id: 'DO', label: 'DO (Adaptativo)' },
              { id: 'FA', label: 'FA (Defensivo)' },
              { id: 'DA', label: 'DA (Supervivencia)' },
              { id: 'pending', label: 'Pendientes' }
            ].map(tab => (
              <Button
                key={tab.id}
                size='sm'
                variant={selectedQuadrantFilter === tab.id ? 'default' : 'outline'}
                className='h-6 text-xs px-2.5 rounded-md'
                onClick={() => setSelectedQuadrantFilter(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* View Mode 1: Interactive Matrix 2x2 */}
          {viewMode === 'matrix' ? (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {(['FO', 'DO', 'FA', 'DA'] as Quadrant[])
                .filter(q => selectedQuadrantFilter === 'all' || selectedQuadrantFilter === q)
                .map(quadrant => {
                  const quadRelations = state.relationships.filter(r => r.quadrant === quadrant)
                  const isDom = dominant === quadrant

                  return (
                    <div
                      key={quadrant}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isDom ? 'bg-primary/5 border-primary/40' : 'bg-card'
                      }`}
                    >
                      <div className='flex items-center justify-between border-b pb-2'>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded'>
                            {quadrant}
                          </span>
                          <span className='font-medium text-xs'>
                            {ORIENTATIONS[quadrant].name} ({ORIENTATIONS[quadrant].subtitle})
                          </span>
                        </div>
                        <Badge variant='outline' className='text-[10px]'>
                          {quadRelations.length} cruces
                        </Badge>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1'>
                        {quadRelations.map(relation => {
                          const internal = factorMap.get(relation.internalId)
                          const external = factorMap.get(relation.externalId)
                          const strengthOpt = STRENGTH_OPTIONS.find(s => s.value === relation.strength?.toString())

                          return (
                            <button
                              key={relation.id}
                              type='button'
                              className='flex flex-col text-left p-2.5 rounded-lg border bg-background hover:bg-accent/50 hover:border-primary/40 transition-all group'
                              onClick={() => handleOpenEdit(relation)}
                            >
                              <div className='flex items-center justify-between gap-1 w-full'>
                                                              <span className='font-mono text-xs font-semibold text-primary'>
                                                                {relation.internalId} × {relation.externalId}
                                                              </span>
                                                              <Badge
                                                                variant='outline'
                                                                className={`text-[10px] px-1.5 py-0 ${strengthOpt?.color || 'bg-muted text-muted-foreground'}`}
                                                              >
                                                                {relation.strength === null ? 'Pendiente' : `Fuerza ${relation.strength}`}
                                                              </Badge>
                                                            </div>
                              <p className='text-xs font-medium truncate mt-1 text-foreground'>
                                {internal?.name || relation.internalId}
                              </p>
                              <p className='text-[11px] text-muted-foreground truncate'>
                                {external?.name || relation.externalId}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (

            /* View Mode 2: Detailed Table */
            <DafoTableView
              relations={filteredRelations}
              factorMap={factorMap}
              onEdit={handleOpenEdit}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Relationship Evaluation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <span>{t('investigator.dafoEvaluation')}</span>
              <span className='font-mono text-primary'>
                {editingRelation?.internalId} × {editingRelation?.externalId}
              </span>
              <Badge variant='outline' className='ml-1'>
                {editingRelation?.quadrant}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {factorMap.get(editingRelation?.internalId ?? '')?.name} ×{' '}
              {factorMap.get(editingRelation?.externalId ?? '')?.name}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-sm'>
            <div className='space-y-1.5'>
              <Label>{t('investigator.strategicRelationshipStrength') || 'Fuerza de la relación estratégica'}</Label>
              <Select disabled={isReadOnly} value={formStrength} onValueChange={value => setFormStrength(value ?? '')}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={t('investigator.selectStrengthPlaceholder') || 'Selecciona la fuerza del vínculo'} />
                </SelectTrigger>
                <SelectContent>
                  {STRENGTH_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>{t('investigator.qualitativeJustification') || 'Justificación cualitativa del cruce'}</Label>
              <Textarea
                rows={3}
                disabled={isReadOnly}
                value={formJustification}
                placeholder={t('investigator.qualitativeJustificationPlaceholder') || 'Explica por qué este factor interno se vincula estratégicamente con este factor externo...'}
                onChange={e => setFormJustification(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <Label>{t('investigator.cameEvidenceSource')}</Label>
              <Input
                disabled={isReadOnly}
                value={formEvidence}
                placeholder={t('investigator.cameEvidenceSourcePlaceholder') || 'Ej: Entrevistas a directivos, informe de gestión, diagnóstico operativo'}
                onChange={e => setFormEvidence(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <Label>{t('investigator.evaluationAppraiser')}</Label>
              <Input
                disabled={isReadOnly}
                value={formEvaluator}
                placeholder={t('investigator.assessmentCommittee')}
                onChange={e => setFormEvaluator(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isReadOnly && <Button onClick={handleSaveRelation}>{t('common.save')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Proposal Modal */}
      <DafoAiModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        state={state}
        onApply={applyDafoProposal}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}

const DafoTableView = ({
  relations,
  factorMap,
  onEdit
}: {
  relations: Relationship[]
  factorMap: Map<string, Factor>
  onEdit: (rel: Relationship) => void
}) => {
  const { t } = useI18n()
  const columns = useMemo<ColumnDef<Relationship>[]>(
    () => [
      {
        id: 'pair',
        header: 'Par / Cuadrante',
        cell: ({ row }) => (
          <div className='font-mono text-xs whitespace-nowrap space-y-1'>
            <span className='font-semibold text-foreground'>
              {row.original.internalId} × {row.original.externalId}
            </span>
            <div>
              <Badge variant='outline' className='text-[10px]'>
                {row.original.quadrant || '—'}
              </Badge>
            </div>
          </div>
        )
      },
      {
        id: 'internal',
        header: 'Factor Interno',
        cell: ({ row }) => {
          const internal = factorMap.get(row.original.internalId)

          return (
            <div className='min-w-40 text-xs'>
              <p className='font-medium text-foreground'>{internal?.name || row.original.internalId}</p>
              <p className='text-muted-foreground text-[11px]'>Peso: {formatNumber(internal?.weight)}</p>
            </div>
          )
        }
      },
      {
        id: 'external',
        header: 'Factor Externo',
        cell: ({ row }) => {
          const external = factorMap.get(row.original.externalId)

          return (
            <div className='min-w-40 text-xs'>
              <p className='font-medium text-foreground'>{external?.name || row.original.externalId}</p>
              <p className='text-muted-foreground text-[11px]'>Peso: {formatNumber(external?.weight)}</p>
            </div>
          )
        }
      },
      {
              accessorKey: 'strength',
              header: 'Fuerza',
              cell: ({ row }) => {
                const strength = row.original.strength
                const strengthOpt = strength === null ? STRENGTH_OPTIONS.find(s => s.value === 'null') : STRENGTH_OPTIONS.find(s => s.value === strength?.toString())

                return (
                  <Badge
                    variant='outline'
                    className={`text-xs px-2 py-0.5 ${strengthOpt?.color || 'bg-muted text-muted-foreground'}`}
                  >
                    {strength === null ? 'Pendiente' : strengthOpt ? strengthOpt.label.split('·')[1].trim() : 'Pendiente'}
                  </Badge>
                )
              }
            },
      {
        id: 'justification',
        header: t('investigator.cameEvidenceSource') || 'Justificación y Evidencia',
        cell: ({ row }) => (
          <div className='min-w-64 max-w-sm space-y-1 text-xs'>
            <p className='line-clamp-2 text-foreground font-normal'>
              {row.original.justification || (
                <span className='text-muted-foreground italic'>{t('investigator.noStrategySelected') || 'Sin justificación redactada'}</span>
              )}
            </p>
            {row.original.evidence && (
              <p className='text-[11px] text-muted-foreground line-clamp-1'>
                {row.original.evidence}
              </p>
            )}
          </div>
        )
      },
      {
        id: 'actions',
        header: t('common.actions') || 'Acción',
        cell: ({ row }) => (
          <Button
            size='sm'
            variant='outline'
            className='h-7 text-xs'
            onClick={() => onEdit(row.original)}
          >
            Editar
          </Button>
        )
      }
    ],
    [factorMap, onEdit]
  )

  const table = useReactTable({
    data: relations,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className='max-h-[32rem] overflow-auto rounded-md border'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='text-muted-foreground py-8 text-center text-xs'>
                No se encontraron cruces con el filtro seleccionado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default InvestigatorDafoView