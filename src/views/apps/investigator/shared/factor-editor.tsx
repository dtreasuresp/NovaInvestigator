'use client'

// React Imports
import { useMemo } from 'react'

// Type Imports
import type { Factor, FactorGroup, FactorType } from '@/types/apps/investigator-types'
import type { ColumnDef } from '@tanstack/react-table'

// Third-party Imports
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { Lock } from 'lucide-react'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { RATING_SCALE, TYPE_LABELS } from '@/utils/investigator/constants'
import { formatNumber } from '@/utils/investigator/domain'

const EVIDENCE_PRESETS = [
  'Entrevista a directivos y especialistas',
  'Encuesta de clima y procesos',
  'Revisión documental y normativa',
  'Observación directa y registro operativo',
  'Dictamen de panel de expertos'
]

const INTERNAL_VALID_TYPES: FactorType[] = ['F', 'D']
const EXTERNAL_VALID_TYPES: FactorType[] = ['O', 'A']

const FactorNameCell = ({
  group,
  factorId,
  value,
  disabled,
  placeholder,
  updateFactor
}: {
  group: FactorGroup
  factorId: string
  value: string
  disabled: boolean
  placeholder: string
  updateFactor: (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => void
}) => (
  <div className='min-w-48 max-w-xs'>
    <Input
      className='h-8 text-xs'
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      onChange={e => updateFactor(group, factorId, 'name', e.target.value)}
    />
  </div>
)

const FactorTypeCell = ({
  factorId,
  value,
  disabled,
  validTypes,
  updateFactorType
}: {
  factorId: string
  value: FactorType
  disabled: boolean
  validTypes: FactorType[]
  updateFactorType: (factorId: string, type: FactorType) => void
}) => (
  <div className='w-18 min-w-18'>
    <Select
      disabled={disabled}
      value={value}
      onValueChange={val => updateFactorType(factorId, val as FactorType)}
    >
      <SelectTrigger className='w-full h-8 text-xs font-mono font-bold justify-center px-1'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {validTypes.map(type => (
          <SelectItem key={type} value={type}>
            <span className='font-bold font-mono'>{type}</span> · {TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

const FactorWeightCell = ({
  group,
  factorId,
  value,
  disabled,
  updateFactor
}: {
  group: FactorGroup
  factorId: string
  value: number
  disabled: boolean
  updateFactor: (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => void
}) => (
  <div className='w-24'>
    <Input
      className='h-8 text-xs font-mono text-center'
      disabled={disabled}
      type='number'
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={e => updateFactor(group, factorId, 'weight', e.target.value)}
    />
  </div>
)

const FactorRatingCell = ({
  group,
  factorId,
  value,
  disabled,
  updateFactor
}: {
  group: FactorGroup
  factorId: string
  value: number
  disabled: boolean
  updateFactor: (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => void
}) => (
  <div className='w-20'>
    <Input
      className='h-8 text-xs font-mono text-center'
      disabled={disabled}
      type='number'
      min={1}
      max={4}
      step={1}
      value={value}
      onChange={e => updateFactor(group, factorId, 'rating', e.target.value)}
    />
  </div>
)

const FactorScoreCell = ({
  weight,
  rating
}: {
  weight: number
  rating: number
}) => {
  const score = (Number(weight) || 0) * (Number(rating) || 0)

  return (
    <div className='w-20 text-center font-mono text-xs font-medium text-foreground'>
      {formatNumber(score)}
    </div>
  )
}

const FactorEvidenceCell = ({
  group,
  factorId,
  value,
  disabled,
  placeholder,
  updateFactor
}: {
  group: FactorGroup
  factorId: string
  value: string
  disabled: boolean
  placeholder: string
  updateFactor: (group: FactorGroup, factorId: string, field: keyof Factor, value: string | number) => void
}) => (
  <div className='min-w-96 w-[30rem] space-y-1.5'>
    <Textarea
      className='w-full min-h-12 max-h-32 text-xs resize-y break-words'
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      onChange={e => updateFactor(group, factorId, 'evidence', e.target.value)}
    />
    {!disabled && (
      <div className='flex flex-wrap gap-1'>
        {EVIDENCE_PRESETS.slice(0, 3).map(preset => (
          <button
            key={preset}
            type='button'
            className='text-[10px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded px-1.5 py-0.5 transition-colors'
            onClick={() => {
              const current = value ? `${value}; ` : ''
              updateFactor(group, factorId, 'evidence', `${current}${preset}`)
            }}
          >
            + {preset.split(' ')[0]}
          </button>
        ))}
      </div>
    )}
  </div>
)

const FactorActionsCell = ({
  group,
  factorId,
  disabled,
  moveUpTitle,
  moveDownTitle,
  deleteTitle,
  moveFactor,
  deleteFactor
}: {
  group: FactorGroup
  factorId: string
  disabled: boolean
  moveUpTitle: string
  moveDownTitle: string
  deleteTitle: string
  moveFactor: (group: FactorGroup, factorId: string, direction: 'up' | 'down') => void
  deleteFactor: (factorId: string) => void
}) => (
  <div className='w-24 flex items-center justify-end gap-1'>
    <Button
      size='icon-xs'
      variant='outline'
      disabled={disabled}
      onClick={() => moveFactor(group, factorId, 'up')}
      title={moveUpTitle}
    >
      ↑
    </Button>
    <Button
      size='icon-xs'
      variant='outline'
      disabled={disabled}
      onClick={() => moveFactor(group, factorId, 'down')}
      title={moveDownTitle}
    >
      ↓
    </Button>
    <Button
      size='icon-xs'
      variant='destructive'
      disabled={disabled}
      onClick={() => deleteFactor(factorId)}
      title={deleteTitle}
    >
      ✕
    </Button>
  </div>
)

export const FactorEditor = ({
  group,
  title,
  description
}: {
  group: FactorGroup
  title: string
  description: string
}) => {
  const { t } = useI18n()
  const {
    state,
    analysis,
    updateFactor,
    addFactor,
    deleteFactor,
    moveFactor,
    updateFactorType,
    normalizeWeights,
    isReadOnly,
    hydrated,
    syncStatus
  } = useInvestigatorAnalysis()

  const isLoading = !hydrated || syncStatus === 'loading'
  const factors = state[group] || []
  const result = group === 'internal' ? analysis.efi : analysis.efe
  const validTypes = group === 'internal' ? INTERNAL_VALID_TYPES : EXTERNAL_VALID_TYPES
  const weightTotal = factors.reduce((total, factor) => total + Number(factor.weight || 0), 0)
  const isWeightValid = Math.abs(weightTotal - 1.0) < 0.001

  // Calculate subtotals
  const primaryType: FactorType = group === 'internal' ? 'F' : 'O'
  const secondaryType: FactorType = group === 'internal' ? 'D' : 'A'

  const primaryFactors = result.factors.filter(f => f.type === primaryType)
  const secondaryFactors = result.factors.filter(f => f.type === secondaryType)

  const primaryWeight = primaryFactors.reduce((sum, f) => sum + (Number(f.weight) || 0), 0)
  const primaryScore = primaryFactors.reduce((sum, f) => sum + (Number(f.score) || 0), 0)

  const secondaryWeight = secondaryFactors.reduce((sum, f) => sum + (Number(f.weight) || 0), 0)
  const secondaryScore = secondaryFactors.reduce((sum, f) => sum + (Number(f.score) || 0), 0)

  const COLUMN_HEADER_CLASSES: Record<string, string> = {
    id: 'w-16 min-w-16',
    name: 'min-w-48 max-w-xs',
    type: 'w-18 min-w-18 text-center',
    weight: 'w-24 min-w-24 text-center',
    rating: 'w-20 min-w-20 text-center',
    score: 'w-20 min-w-20 text-center',
    evidence: 'min-w-96 w-[30rem]',
    actions: 'w-24 min-w-24 text-right'
  }

  const columns = useMemo<ColumnDef<Factor>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('investigator.code'),
        cell: ({ row }) => (
          <span className='font-mono text-xs font-semibold text-foreground'>{row.original.id}</span>
        )
      },
      {
        accessorKey: 'name',
        header: t('investigator.name'),
        cell: ({ row }) => (
          <FactorNameCell
            group={group}
            factorId={row.original.id}
            value={row.original.name}
            disabled={isReadOnly}
            placeholder={t('investigator.factorNamePlaceholder')}
            updateFactor={updateFactor}
          />
        )
      },
      {
        accessorKey: 'type',
        header: () => <span className='text-center block'>{t('investigator.type')}</span>,
        cell: ({ row }) => (
          <FactorTypeCell
            factorId={row.original.id}
            value={row.original.type}
            disabled={isReadOnly}
            validTypes={validTypes}
            updateFactorType={updateFactorType}
          />
        )
      },
      {
        accessorKey: 'weight',
        header: t('investigator.weightColHeader'),
        cell: ({ row }) => (
          <FactorWeightCell
            group={group}
            factorId={row.original.id}
            value={row.original.weight}
            disabled={isReadOnly}
            updateFactor={updateFactor}
          />
        )
      },
      {
        accessorKey: 'rating',
        header: t('investigator.ratingColHeader'),
        cell: ({ row }) => (
          <FactorRatingCell
            group={group}
            factorId={row.original.id}
            value={row.original.rating}
            disabled={isReadOnly}
            updateFactor={updateFactor}
          />
        )
      },
      {
        id: 'score',
        header: t('investigator.scoreColHeader'),
        cell: ({ row }) => (
          <FactorScoreCell
            weight={row.original.weight}
            rating={row.original.rating}
          />
        )
      },
      {
        accessorKey: 'evidence',
        header: t('investigator.evidenceColHeader'),
        cell: ({ row }) => (
          <FactorEvidenceCell
            group={group}
            factorId={row.original.id}
            value={row.original.evidence}
            disabled={isReadOnly}
            placeholder={t('investigator.evidencePlaceholder')}
            updateFactor={updateFactor}
          />
        )
      },
      {
        id: 'actions',
        header: t('investigator.actionsColHeader'),
        cell: ({ row }) => (
          <FactorActionsCell
            group={group}
            factorId={row.original.id}
            disabled={isReadOnly}
            moveUpTitle={t('investigator.moveUp')}
            moveDownTitle={t('investigator.moveDown')}
            deleteTitle={t('investigator.deleteFactor')}
            moveFactor={moveFactor}
            deleteFactor={deleteFactor}
          />
        )
      }
    ],
    [
      group,
      validTypes,
      isReadOnly,
      updateFactor,
      updateFactorType,
      moveFactor,
      deleteFactor,
      t
    ]
  )

  const table = useReactTable({
    data: factors,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel()
  })

  const allRows = table.getRowModel().rows
  const primaryRows = allRows.filter(row => row.original.type === primaryType)
  const secondaryRows = allRows.filter(row => row.original.type === secondaryType)

  if (isLoading) {
    return (
      <Card aria-busy='true'>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-72' />
            </div>
            <Skeleton className='h-6 w-32' />
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-4 w-36' />
            <div className='flex gap-2'>
              <Skeleton className='h-8 w-28' />
              <Skeleton className='h-8 w-28' />
            </div>
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-10 w-full' />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <div className='flex items-center gap-2'>
              <CardTitle>
                {title} · {t('investigator.totalScore')} {formatNumber(result.total)}
              </CardTitle>
              {isReadOnly && (
                <Badge
                  variant='outline'
                  className='bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1 text-xs'
                >
                  <Lock className='w-3 h-3' /> {t('common.readOnlyMode')}
                </Badge>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge
            variant={isWeightValid ? 'secondary' : 'destructive'}
            className='font-mono text-xs'
          >
            {t('investigator.weightSumLabel')}: {formatNumber(weightTotal)} / 1.00 {isWeightValid ? '✓' : `(${t('investigator.weightRequiresOne')})`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            {!isWeightValid && factors.length > 0 && !isReadOnly && (
              <Button
                size='sm'
                variant='secondary'
                onClick={() => normalizeWeights(group)}
                className='text-xs'
              >
                {t('investigator.normalizeWeights')}
              </Button>
            )}
            <p className='text-muted-foreground text-xs'>
              {factors.length} {t('investigator.factors').toLowerCase()} ({primaryFactors.length} {TYPE_LABELS[primaryType].toLowerCase()}, {secondaryFactors.length} {TYPE_LABELS[secondaryType].toLowerCase()})
            </p>
          </div>
          {!isReadOnly && (
            <div className='flex gap-2'>
              {validTypes.map(type => (
                <Button key={type} size='sm' variant='outline' onClick={() => addFactor(group, type)}>
                  + {t('common.create')} {TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className={COLUMN_HEADER_CLASSES[header.id] || ''}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {/* SECTION 1: PRIMARY FACTORS (FORTALEZAS / OPORTUNIDADES) */}
              <TableRow className='bg-primary/5 hover:bg-primary/10 border-y border-border/80 font-semibold'>
                <TableCell colSpan={columns.length} className='py-2 px-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='bg-primary/10 text-primary border-primary/20 text-xs font-bold'>
                        {primaryType}
                      </Badge>
                      <span className='text-xs font-bold text-foreground'>
                        {TYPE_LABELS[primaryType]} ({primaryType}) · {primaryFactors.length} {primaryFactors.length === 1 ? 'factor' : 'factores'}
                      </span>
                    </div>
                    {!isReadOnly && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-7 text-xs text-primary hover:text-primary hover:bg-primary/10'
                        onClick={() => addFactor(group, primaryType)}
                      >
                        + {t('common.create')} {TYPE_LABELS[primaryType]}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>

              {primaryRows.length > 0 ? (
                primaryRows.map(row => (
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
                  <TableCell colSpan={columns.length} className='text-muted-foreground py-4 text-center text-xs italic'>
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              )}

              {/* SUBTOTAL SECTION 1 */}
              <TableRow className='bg-muted/40 font-semibold border-y border-border/80'>
                <TableCell colSpan={3} className='text-xs text-foreground py-2'>
                  {t('investigator.subtotalInternal')} {TYPE_LABELS[primaryType]} ({primaryType})
                </TableCell>
                <TableCell className='w-24 min-w-24 text-center font-mono text-xs font-bold text-foreground py-2'>
                  {formatNumber(primaryWeight)}
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-xs text-muted-foreground py-2'>
                  —
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-xs font-bold text-foreground py-2'>
                  {formatNumber(primaryScore)}
                </TableCell>
                <TableCell colSpan={2} className='py-2' />
              </TableRow>

              {/* SECTION 2: SECONDARY FACTORS (DEBILIDADES / AMENAZAS) */}
              <TableRow className='bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20 border-y border-border/80 font-semibold'>
                <TableCell colSpan={columns.length} className='py-2 px-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold'>
                        {secondaryType}
                      </Badge>
                      <span className='text-xs font-bold text-foreground'>
                        {TYPE_LABELS[secondaryType]} ({secondaryType}) · {secondaryFactors.length} {secondaryFactors.length === 1 ? 'factor' : 'factores'}
                      </span>
                    </div>
                    {!isReadOnly && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        onClick={() => addFactor(group, secondaryType)}
                      >
                        + {t('common.create')} {TYPE_LABELS[secondaryType]}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>

              {secondaryRows.length > 0 ? (
                secondaryRows.map(row => (
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
                  <TableCell colSpan={columns.length} className='text-muted-foreground py-4 text-center text-xs italic'>
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              )}

              {/* SUBTOTAL SECTION 2 */}
              <TableRow className='bg-muted/40 font-semibold border-y border-border/80'>
                <TableCell colSpan={3} className='text-xs text-foreground py-2'>
                  {t('investigator.subtotalExternal')} {TYPE_LABELS[secondaryType]} ({secondaryType})
                </TableCell>
                <TableCell className='w-24 min-w-24 text-center font-mono text-xs font-bold text-foreground py-2'>
                  {formatNumber(secondaryWeight)}
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-xs text-muted-foreground py-2'>
                  —
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-xs font-bold text-foreground py-2'>
                  {formatNumber(secondaryScore)}
                </TableCell>
                <TableCell colSpan={2} className='py-2' />
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className='bg-muted/90 font-bold border-t-2'>
                <TableCell colSpan={3} className='text-xs text-foreground py-3'>
                  {t('investigator.totalScore')} ({group === 'internal' ? 'EFI' : 'EFE'})
                </TableCell>
                <TableCell className='w-24 min-w-24 text-center font-mono text-xs font-extrabold text-foreground py-3'>
                  {formatNumber(result.weightTotal)}
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-xs text-muted-foreground py-3'>
                  —
                </TableCell>
                <TableCell className='w-20 min-w-20 text-center font-mono text-sm font-extrabold text-primary py-3'>
                  {formatNumber(result.total)}
                </TableCell>
                <TableCell colSpan={2} className='py-3' />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export const RatingScale = ({ group }: { group: FactorGroup }) => {
  const { t } = useI18n()

  const scaleOptions = group === 'internal' ? [
    { value: '1', label: t('investigator.ratingInternal1') },
    { value: '2', label: t('investigator.ratingInternal2') },
    { value: '3', label: t('investigator.ratingInternal3') },
    { value: '4', label: t('investigator.ratingInternal4') }
  ] : [
    { value: '1', label: t('investigator.ratingExternal1') },
    { value: '2', label: t('investigator.ratingExternal2') },
    { value: '3', label: t('investigator.ratingExternal3') },
    { value: '4', label: t('investigator.ratingExternal4') }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('investigator.ratingScaleTitle')}</CardTitle>
        <CardDescription>
          {group === 'internal' ? t('investigator.ratingScaleInternalDesc') : t('investigator.ratingScaleExternalDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-2 sm:grid-cols-2'>
        {scaleOptions.map(option => (
          <div key={option.value} className='rounded-lg border p-3 bg-card'>
            <p className='text-foreground font-medium text-xs'>{option.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}