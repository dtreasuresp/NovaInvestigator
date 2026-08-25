// React Imports
import { useMemo, useState } from 'react'

// Type Imports
import type { CameAction, CameCriteriaValues, CameEnrichedAction, CameType } from '@/types/apps/investigator-types'
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
import { Lock } from 'lucide-react'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { CAME_LABELS } from '@/utils/investigator/constants'
import { formatNumber } from '@/utils/investigator/domain'

// View Imports
import { StageHeader } from '../shared/primitives'

const CATEGORY_CLASS: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold',
  alta: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium',
  media: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  baja: 'bg-muted text-muted-foreground'
}

const CRITERIA_DEFINITIONS: { key: keyof CameCriteriaValues; label: string; desc: string }[] = [
  { key: 'impact', label: 'Impacto', desc: 'Efecto sobre los objetivos estratégicos (1=Bajo, 5=Crítico)' },
  { key: 'urgency', label: 'Urgencia', desc: 'Premura de intervención en el tiempo (1=Baja, 5=Inmediata)' },
  { key: 'severity', label: 'Severidad', desc: 'Consecuencia de no actuar oportunamente (1=Mínima, 5=Severa)' },
  { key: 'alignment', label: 'Alineación', desc: 'Alineación con la estrategia ganadora (1=Baja, 5=Total)' },
  { key: 'feasibility', label: 'Factibilidad', desc: 'Viabilidad técnica, operativa y presupuestaria (1=Compleja, 5=Inmediata)' }
]

export const InvestigatorCameView = () => {
  const { t } = useI18n()
  const {
    state,
    analysis,
    updateCameCriterion,
    updateCameAction,
    updateCameActionCriteria,
    deleteCameAction,
    addCameAction,
    generateCameDraft,
    saveCameAction,
    isReadOnly,
    hydrated,
    syncStatus
  } = useInvestigatorAnalysis()

  const isLoading = !hydrated || syncStatus === 'loading'
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all')
  const [editingAction, setEditingAction] = useState<CameAction | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Edit form state for modal
  const [formData, setFormData] = useState<Partial<CameAction>>({})

  const totalCriteriaWeight = state.cameCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  const isWeightSumValid = Math.abs(totalCriteriaWeight - 1.0) < 0.001

  const handleOpenDetail = (action: CameAction) => {
    setEditingAction(action)
    setFormData({ ...action })
    setDetailDialogOpen(true)
  }

  const handleSaveModal = () => {
    if (!editingAction || isReadOnly) return
    saveCameAction(editingAction.id, formData)
    setDetailDialogOpen(false)
  }

  const filteredActions = analysis.came.actions.filter(action => {
    if (activeTypeFilter === 'all') return true
    if (activeTypeFilter === 'critica' || activeTypeFilter === 'alta') return action.category === activeTypeFilter

    return action.type === activeTypeFilter
  })

  if (isLoading) {
    return (
      <div className='flex flex-col gap-5' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-96' />
        </div>

        <Card>
          <CardHeader className='space-y-2'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-72' />
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='p-3 rounded-lg border space-y-2'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-8 w-full' />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex justify-between items-center'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-72' />
            </div>
            <div className='flex gap-2'>
              <Skeleton className='h-8 w-32' />
              <Skeleton className='h-8 w-28' />
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Skeleton className='h-10 w-full' />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Criteria Weight Config Card */}
      <Card>
        <CardHeader className='flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
          <div>
            <CardTitle>{t('investigator.cameWeighting')}</CardTitle>
            <CardDescription>
              Ajusta el peso relativo de cada dimensión. La suma debe totalizar exactamente 1.00.
            </CardDescription>
          </div>
          <Badge
            variant={isWeightSumValid ? 'secondary' : 'destructive'}
            className='font-mono text-xs'
          >
            Suma de criterios: {formatNumber(totalCriteriaWeight)} / 1.00 {isWeightSumValid ? '✓' : '(Ajustar)'}
          </Badge>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          {state.cameCriteria.map(criterion => (
            <div key={criterion.id} className='rounded-lg border p-2.5 bg-card space-y-1'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-semibold text-foreground'>{criterion.name}</p>
                <span className='font-mono text-xs text-muted-foreground'>
                  {Math.round((criterion.weight || 0) * 100)}%
                </span>
              </div>
              <Input
                type='number'
                disabled={isReadOnly}
                min={0}
                max={1}
                step={0.05}
                className='h-8 text-xs'
                value={criterion.weight}
                onChange={e => updateCameCriterion(criterion.id, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Main Actions Panel */}
      <Card>
        <CardHeader className='flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0'>
          <div>
            <CardTitle>{t('investigator.cameActionStrategy')}</CardTitle>
            <CardDescription>
              {analysis.came.actions.length} acciones registradas · Prioridad calculada por modelo multicriterio continuo.
            </CardDescription>
          </div>
          {!isReadOnly && (
            <div className='flex flex-wrap items-center gap-2'>
              <Button size='sm' variant='outline' onClick={generateCameDraft}>
                ⚡ Generar borrador desde diagnóstico
              </Button>
              <Button size='sm' onClick={addCameAction}>
                + Añadir ficha manual
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Quick Filter Tabs */}
          <div className='flex flex-wrap items-center gap-1.5 border-b pb-3 text-xs'>
            <span className='text-muted-foreground mr-1 font-medium'>{t('common.filter')}</span>
            {[
              { id: 'all', label: 'Todas las acciones' },
              { id: 'C', label: 'Corregir Debilidades (C)' },
              { id: 'A', label: 'Afrontar Amenazas (A)' },
              { id: 'M', label: 'Mantener Fortalezas (M)' },
              { id: 'E', label: 'Explotar Oportunidades (E)' },
              { id: 'critica', label: '🔥 Críticas' },
              { id: 'alta', label: '⚡ Altas' }
            ].map(tab => (
              <Button
                key={tab.id}
                size='sm'
                variant={activeTypeFilter === tab.id ? 'default' : 'outline'}
                className='h-6 text-xs px-2.5 rounded-md'
                onClick={() => setActiveTypeFilter(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <CameTableView
            actions={filteredActions}
            isReadOnly={isReadOnly}
            onCriteriaChange={updateCameActionCriteria}
            onActionChange={updateCameAction}
            onDelete={deleteCameAction}
            onOpenDetail={handleOpenDetail}
          />
        </CardContent>
      </Card>

      {/* Modal Dialog for Expanded CAME Action Sheet */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <span>{t('platform.planAction')}</span>
              <span className='font-mono text-primary'>{editingAction?.id}</span>
              <Badge variant='outline'>{editingAction?.type ? CAME_LABELS[editingAction.type] : ''}</Badge>
            </DialogTitle>
            <DialogDescription>
              Gestión operativa completa, cronograma, indicadores y recursos requeridos.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameFactorOrigin')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.factor || ''}
                  onChange={e => setFormData({ ...formData, factor: e.target.value })}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameLinkedStrategy')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.strategyId || ''}
                  onChange={e => setFormData({ ...formData, strategyId: e.target.value })}
                />
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs'>{t('investigator.cameObjective')}</Label>
              <Input
                disabled={isReadOnly}
                value={formData.objective || ''}
                placeholder='¿Qué resultado concreto se busca alcanzar?'
                onChange={e => setFormData({ ...formData, objective: e.target.value })}
              />
            </div>

            <div className='space-y-1'>
              <Label className='text-xs'>{t('investigator.cameDescription')}</Label>
              <Textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.action || ''}
                placeholder={t('investigator.cameActionDetailsPlaceholder') || 'Detalla los pasos y actividades a ejecutar...'}
                onChange={e => setFormData({ ...formData, action: e.target.value })}
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameResponsible')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.responsible || ''}
                  placeholder={t('platform.planName')}
                  onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameParticipantAreas')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.participants || ''}
                  placeholder={t('investigator.cameParticipantAreasPlaceholder') || 'Áreas colaboradoras'}
                  onChange={e => setFormData({ ...formData, participants: e.target.value })}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameStartDate')}</Label>
                <Input
                  type='date'
                  disabled={isReadOnly}
                  value={formData.startDate || ''}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameEndDate')}</Label>
                <Input
                  type='date'
                  disabled={isReadOnly}
                  value={formData.endDate || ''}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameSuccessIndicator')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.indicator || ''}
                  placeholder={t('investigator.cameIndicatorPlaceholder') || 'Ej: % de procesos automatizados'}
                  onChange={e => setFormData({ ...formData, indicator: e.target.value })}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameBaseline')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.baseline || ''}
                  placeholder={t('investigator.cameBaselinePlaceholder') || 'Ej: 15 %'}
                  onChange={e => setFormData({ ...formData, baseline: e.target.value })}
                />
              </div>
              <div className='space-y-1'>
                <Label className='text-xs'>{t('investigator.cameTarget')}</Label>
                <Input
                  disabled={isReadOnly}
                  value={formData.target || ''}
                  placeholder={t('investigator.cameTargetPlaceholder') || 'Ej: 85 %'}
                  onChange={e => setFormData({ ...formData, target: e.target.value })}
                />
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs'>{t('investigator.cameMethodologicalJustification')}</Label>
              <Textarea
                rows={2}
                disabled={isReadOnly}
                value={formData.justification || ''}
                placeholder={t('investigator.cameJustificationPlaceholder') || 'Fundamento de la acción en el marco de la investigación...'}
                onChange={e => setFormData({ ...formData, justification: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDetailDialogOpen(false)}>
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isReadOnly && <Button onClick={handleSaveModal}>{t('investigator.cameSaveCard')}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const CameTableView = ({
  actions,
  isReadOnly,
  onCriteriaChange,
  onActionChange,
  onDelete,
  onOpenDetail
}: {
  actions: CameEnrichedAction[]
  isReadOnly?: boolean
  onCriteriaChange: (actionId: string, criterionKey: keyof CameCriteriaValues, value: number) => void
  onActionChange: (actionId: string, field: string, value: string) => void
  onDelete: (actionId: string) => void
  onOpenDetail: (action: CameAction) => void
}) => {
  const { t } = useI18n()
  const columns = useMemo<ColumnDef<CameEnrichedAction>[]>(
    () => [
      {
        id: 'id',
        header: () => <span className='font-semibold'>{t('notifications.type')}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='font-mono text-xs space-y-1 py-1'>
              <span className='font-bold text-foreground'>{action.id}</span>
              <div>
                <Badge variant='outline' className='text-[10px]'>
                  {CAME_LABELS[action.type] || action.type}
                </Badge>
              </div>
            </div>
          )
        }
      },
      {
        id: 'action',
        header: () => <span className='font-semibold'>{t('investigator.cameActionAndOrigin')}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='min-w-64 space-y-1 py-1'>
              <p className='font-medium text-xs text-foreground line-clamp-2'>{action.action}</p>
              <p className='text-[11px] text-muted-foreground'>
                <span className='font-semibold'>{t('investigator.factor') || 'Factor'}:</span> {action.factor || action.factorId}
              </p>
              {action.objective && (
                <p className='text-[11px] text-muted-foreground line-clamp-1 italic'>
                  🎯 Obj: {action.objective}
                </p>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'priority',
        header: () => <span className='text-center block font-semibold'>{t('investigator.cameMulticriteriaPriority') || 'Prioridad Multicriterio'}</span>,
        cell: ({ row }) => {
          const action = row.original
          const categoryClass = CATEGORY_CLASS[action.category] || CATEGORY_CLASS.baja

          return (
            <div className='text-center'>
              <span
                className={`inline-block rounded-md px-2 py-1 text-xs uppercase tracking-wider ${categoryClass}`}
              >
                {formatNumber(action.priority)} · {action.category}
              </span>
            </div>
          )
        }
      },
      {
        id: 'criteria',
        header: () => <span className='font-semibold'>{t('investigator.cameCriteria') || 'Criterios (1–5)'}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='min-w-44'>
              <div className='grid grid-cols-5 gap-1 text-[10px] text-center'>
                {CRITERIA_DEFINITIONS.map(c => {
                  const val = action.criteria?.[c.key] ?? 3

                  return (
                    <div key={c.key} className='flex flex-col items-center' title={`${c.label}: ${val}/5`}>
                      <span className='text-muted-foreground text-[9px]'>{c.label.slice(0, 3)}</span>
                      <Select
                        disabled={isReadOnly}
                        value={val.toString()}
                        onValueChange={v => onCriteriaChange(action.id, c.key, Number(v))}
                      >
                        <SelectTrigger className='h-6 w-8 text-[11px] p-0 justify-center font-bold'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(score => (
                            <SelectItem key={score} value={score.toString()}>
                              {score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
      },
      {
        accessorKey: 'responsible',
        header: () => <span className='font-semibold'>{t('investigator.fieldAuthorPlaceholder')}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='min-w-36'>
              <Input
                className='h-8 text-xs'
                disabled={isReadOnly}
                value={action.responsible}
                placeholder={t('investigator.cameResponsiblePlaceholder') || 'Responsable del área'}
                onChange={e => onActionChange(action.id, 'responsible', e.target.value)}
              />
            </div>
          )
        }
      },
      {
        accessorKey: 'status',
        header: () => <span className='font-semibold'>{t('platform.moduleStatus')}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='w-28'>
              <Select
                disabled={isReadOnly}
                value={action.status}
                onValueChange={value => onActionChange(action.id, 'status', value ?? 'propuesta')}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='propuesta'>{t('investigator.statusProposed') || 'Propuesta'}</SelectItem>
                  <SelectItem value='en_revision'>{t('investigator.statusInReview') || 'En revisión'}</SelectItem>
                  <SelectItem value='aprobada'>{t('investigator.statusApproved') || 'Aprobada'}</SelectItem>
                  <SelectItem value='descartada'>{t('investigator.statusDiscarded') || 'Descartada'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: () => <span className='text-right block font-semibold'>{t('common.actions') || 'Acciones'}</span>,
        cell: ({ row }) => {
          const action = row.original

          return (
            <div className='flex items-center justify-end gap-1'>
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs px-2'
                onClick={() => onOpenDetail(action)}
              >
                Ficha
              </Button>
              {!isReadOnly && (
                <Button
                  size='icon-xs'
                  variant='destructive'
                  onClick={() => onDelete(action.id)}
                >
                  ✕
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    [isReadOnly, onCriteriaChange, onActionChange, onDelete, onOpenDetail]
  )

  const table = useReactTable({
    data: actions,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className='max-h-[36rem] overflow-auto border rounded-lg'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className='bg-muted/50'>
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
              <TableRow key={row.id} className='hover:bg-muted/30'>
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
                No hay fichas CAME registradas. Haz clic en «Generar borrador desde diagnóstico» o «Añadir ficha».
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default InvestigatorCameView