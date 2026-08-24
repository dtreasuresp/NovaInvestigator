// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Third-party Imports
import { toast } from 'sonner'

// Component Imports
import { FileText, FolderOpen, PlusCircle, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

// Icon Imports

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { ORIENTATIONS, formatNumber } from '@/utils/investigator/domain'
import { buildLocalizedAcademicReport } from '@/utils/investigator/academic-report'

// View Imports
import { MetricCard, StageHeader } from '../shared/primitives'
import { AiReportDialog } from './ai-report-dialog'
import { MarkdownRenderer } from '@/views/apps/novai/components/markdown-renderer'

const formatPercent = (value: number) => `${Math.round((value || 0) * 100)} %`

export const InvestigatorSummaryView = () => {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { state, analysis, validation, selectedStrategy, hydrated, syncStatus } = useInvestigatorAnalysis()

  const [aiReportText, setAiReportText] = useState<string>('')
  const [activeReportTab, setActiveReportTab] = useState<'standard' | 'ai'>('standard')

  const investigationId = state.metadata?.id

  const isUuid = useMemo(
    () => Boolean(investigationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(investigationId)),
    [investigationId]
  )

  // Hidrata el último dictamen IA desde BD (última versión) al entrar a Resumen o cambiar de investigación
  useEffect(() => {
    if (!hydrated || !investigationId || !isUuid) {
      if (!isUuid) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset al salir de un expediente persistible
        setAiReportText('')
        setActiveReportTab('standard')
      }

      return
    }

    let cancelled = false

    fetch(`/api/investigations/${investigationId}/ai-report`, { cache: 'no-store' })
      .then(async res => {
        if (cancelled) return
        if (!res.ok) return
        const data = (await res.json()) as { report: { reportText: string } | null }

        if (data.report?.reportText) {
          setAiReportText(data.report.reportText)
          setActiveReportTab('ai')
        } else {
          setAiReportText('')
          setActiveReportTab('standard')
        }
      })
      .catch(() => {
        // best-effort
      })

    return () => {
      cancelled = true
    }
  }, [hydrated, investigationId, isUuid])

  const isLoading = !hydrated || syncStatus === 'loading'
  const hasData = (state.internal?.length || 0) > 0 || (state.external?.length || 0) > 0

  const orientation = analysis.relations.dominant ? ORIENTATIONS[analysis.relations.dominant] : null
  const readyStages = Object.values(validation.stageStatus).filter(status => status === 'ready').length
  const stageTotal = Object.keys(validation.stageStatus).length

  const efiVal = analysis.efi.total
  const efeVal = analysis.efe.total

  // Determine IE Matrix cell and region
  const iePosition = useMemo(() => {
    const efiCategory = efiVal >= 3.0 ? 'strong' : efiVal >= 2.0 ? 'average' : 'weak'
    const efeCategory = efeVal >= 3.0 ? 'high' : efeVal >= 2.0 ? 'medium' : 'low'

    let cell = 'V'
    let prescription = 'Retener y mantener'

    if (efeCategory === 'high') {
      if (efiCategory === 'strong') {
        cell = 'I'
        prescription = 'Crecer y construir (Estrategias intensivas)'
      } else if (efiCategory === 'average') {
        cell = 'II'
        prescription = 'Crecer y construir (Penetración de mercado)'
      } else {
        cell = 'III'
        prescription = 'Retener y mantener (Desarrollo de mercado)'
      }
    } else if (efeCategory === 'medium') {
      if (efiCategory === 'strong') {
        cell = 'IV'
        prescription = 'Crecer y construir (Desarrollo de producto)'
      } else if (efiCategory === 'average') {
        cell = 'V'
        prescription = 'Retener y mantener (Penetración y desarrollo)'
      } else {
        cell = 'VI'
        prescription = 'Cosechar o desinvertir (Defensiva)'
      }
    } else {
      if (efiCategory === 'strong') {
        cell = 'VII'
        prescription = 'Retener y mantener (Diversificación concéntrica)'
      } else if (efiCategory === 'average') {
        cell = 'VIII'
        prescription = 'Cosechar o desinvertir (Reducción de costos)'
      } else {
        cell = 'IX'
        prescription = 'Cosechar o liquidar (Desinversión rápida)'
      }
    }

    return { efiCategory, efeCategory, cell, prescription }
  }, [efiVal, efeVal])

  // Generate continuous narrative prose localized (Section 19 - Regla de Oro)
  const academicReport = useMemo(() => {
    if (!hasData) return ''

    return buildLocalizedAcademicReport({
      state,
      analysis,
      selectedStrategy,
      locale
    })
  }, [hasData, state, analysis, selectedStrategy, locale])

  const currentDisplayReport = activeReportTab === 'ai' && aiReportText ? aiReportText : academicReport

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && currentDisplayReport) {
      navigator.clipboard.writeText(currentDisplayReport)
      toast.success(t('novai.aiCopySuccess') || 'Dictamen editorial copiado al portapapeles con éxito.')
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-5' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-64' />
          <Skeleton className='h-4 w-96' />
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className='p-4 space-y-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-7 w-16' />
              <Skeleton className='h-3.5 w-32' />
            </Card>
          ))}
        </div>
        <div className='grid gap-4 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className='space-y-2'>
                <Skeleton className='h-5 w-40' />
                <Skeleton className='h-3.5 w-48' />
              </CardHeader>
              <CardContent className='space-y-3'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-3/4' />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className='space-y-2'>
            <Skeleton className='h-5 w-64' />
            <Skeleton className='h-3.5 w-96' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-48 w-full rounded-xl' />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      <StageHeader
        kicker={t('investigator.summary')}
        title={t('dashboard.subtitle')}
        description={`${state.metadata.title || t('investigator.newInvestigation')} · ${state.metadata.organization || '—'} · ${state.metadata.unit || '—'}`}
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricCard
          label={t('investigator.efiInternalLabel') || 'EFI · Interno'}
          value={hasData ? formatNumber(analysis.efi.total) : '—'}
          hint={`Peso ${formatNumber(analysis.efi.weightTotal)} · ${analysis.efi.factors.length} factores`}
          tone={analysis.efi.total >= 2.5 ? 'positive' : analysis.efi.total < 2 ? 'warning' : 'default'}
        />
        <MetricCard
          label={t('investigator.efeExternalLabel') || 'EFE · Entorno'}
          value={hasData ? formatNumber(analysis.efe.total) : '—'}
          hint={`Peso ${formatNumber(analysis.efe.weightTotal)} · ${analysis.efe.factors.length} factores`}
          tone={analysis.efe.total >= 2.5 ? 'positive' : analysis.efe.total < 2 ? 'warning' : 'default'}
        />
        <MetricCard
          label={t('dashboard.colOrientation')}
          value={hasData && analysis.relations.dominant ? analysis.relations.dominant : '—'}
          hint={hasData ? `${analysis.relations.confidence} · cobertura ${formatPercent(analysis.relations.coverage)}` : 'Sin cruces evaluados'}
        />
        <MetricCard
          label={t('investigator.qspmSelectionLabel') || 'Selección QSPM'}
          value={selectedStrategy?.id || '—'}
          hint={selectedStrategy?.name || (t('investigator.noStrategySelected') || 'Sin alternativa seleccionada')}
        />
      </div>

      {/* Grid: Validation + DAFO Breakdown + IE Positioning Matrix + CAME Summary */}
      <div className='grid items-stretch gap-4 lg:grid-cols-4'>
        {/* 1. Validation Status (Left) — layout compacto 2 col para igualar alturas */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle>{t('investigator.validationStatus')}</CardTitle>
            <CardDescription>
              {validation.errors} errores · {validation.warnings} advertencias · {readyStages}/{stageTotal} etapas listas
            </CardDescription>
          </CardHeader>
          <CardContent className='flex h-full flex-col justify-between gap-3'>
            <div className='grid grid-cols-2 gap-x-4 gap-y-2.5'>
              {Object.entries(validation.stageStatus).map(([stage, status]) => (
                <div key={stage} className='space-y-1'>
                  <div className='flex items-center justify-between gap-1.5'>
                    <span className='truncate text-xs font-medium capitalize'>{stage}</span>
                    <Badge
                      variant={status === 'ready' ? 'secondary' : status === 'warning' ? 'outline' : 'destructive'}
                      className='px-1.5 py-0 text-[10px]'
                    >
                      {status}
                    </Badge>
                  </div>
                  <Progress value={status === 'ready' ? 100 : status === 'warning' ? 50 : 25} className='h-1.5' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle>{t('investigator.quinquennialIndices')}</CardTitle>
            <CardDescription>
              Aporte relativo ({analysis.relations.evaluatedCount} cruces calificados)
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {Object.entries(analysis.relations.summary).map(([quadrant, summary]) => {
              const isDominant = analysis.relations.dominant === quadrant

              return (
                <div key={quadrant} className='flex items-center gap-3'>
                  <span className={`font-mono text-xs font-bold w-8 ${isDominant ? 'text-primary' : ''}`}>
                    {quadrant}
                  </span>
                  <Progress value={Math.min(100, summary.index * 40)} className='flex-1' />
                  <span className='w-12 text-right font-mono text-xs font-medium'>
                    {formatNumber(summary.index)}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* IE Matrix Box */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle>{t('investigator.ieMatrixPosition')}</CardTitle>
            <CardDescription>
              Ubicación matricial: EFI ({formatNumber(efiVal)}) × EFE ({formatNumber(efeVal)})
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2.5'>
            <div className='p-3 rounded-lg border bg-muted/30 space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-sm text-foreground'>Cuadrante {iePosition.cell}</span>
                <Badge variant='outline' className='text-[10px] uppercase font-bold text-primary'>
                  {iePosition.efiCategory} / {iePosition.efeCategory}
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground'>
                {iePosition.prescription}
              </p>
            </div>
            {orientation && (
              <div className='p-3 rounded-lg border bg-primary/5 border-primary/30 text-xs space-y-1'>
                <span className='font-semibold text-foreground block'>
                  Vector Dominante: {analysis.relations.dominant} ({orientation.name})
                </span>
                <p className='text-muted-foreground text-[11px]'>{orientation.action}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan de Acción CAME — 4ª card del grid (diseño compacto de lista + franja de prioridades) */}
        {hasData && analysis.came.actions.length > 0 && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle>{t('investigator.cameSummaryTitle') || 'Plan de Acción CAME'}</CardTitle>
              <CardDescription>
                {analysis.came.actions.length} {t('investigator.cameSummaryDesc') || 'acciones'} · multicriterio
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {(
                [
                  ['C', t('investigator.cameTypeC') || 'Corregir'],
                  ['A', t('investigator.cameTypeA') || 'Afrontar'],
                  ['M', t('investigator.cameTypeM') || 'Mantener'],
                  ['E', t('investigator.cameTypeE') || 'Explotar']
                ] as const
              ).map(([type, label]) => {
                const count = analysis.came.byType[type].length
                const pct = analysis.came.actions.length > 0 ? (count / analysis.came.actions.length) * 100 : 0

                return (
                  <div key={type} className='flex items-center gap-3'>
                    <span className='w-24 shrink-0 text-xs font-medium truncate'>{label}</span>
                    <Progress value={pct} className='flex-1' />
                    <span className='w-6 text-right text-xs font-semibold'>{count}</span>
                  </div>
                )
              })}

              {/* Franja de prioridades — chips inline */}
              <div className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/20 px-2.5 py-2'>
                {(['critica', 'alta', 'media', 'baja'] as const).map(cat => {
                  const count = analysis.came.actions.filter(a => a.category === cat).length

                  return (
                    <span key={cat} className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
                      <Badge
                        variant={cat === 'critica' ? 'destructive' : cat === 'media' && count > 0 ? 'secondary' : 'outline'}
                        className='px-1.5 py-0 text-[10px]'
                      >
                        {t(`investigator.camePriority${cat.charAt(0).toUpperCase()}${cat.slice(1)}`) || cat}
                      </Badge>
                      {count}
                    </span>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Academic Report & Thesis Defense Synthesis (Section 19) */}
      <Card>
        <CardHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0 pb-4'>
          <div className='space-y-1'>
            <CardTitle>{t('investigator.academicReportTitle')}</CardTitle>
            <CardDescription>
              {t('investigator.academicReportDesc')}
            </CardDescription>
          </div>
          {hasData && (
            <div className='flex flex-wrap items-center gap-2 shrink-0'>
              {aiReportText && (
                <div className='flex rounded-lg border bg-muted/30 p-0.5'>
                  <Button
                    size='sm'
                    variant={activeReportTab === 'standard' ? 'secondary' : 'ghost'}
                    className='h-7 text-xs px-2.5'
                    onClick={() => setActiveReportTab('standard')}
                  >
                    {t('novai.aiAcademicReportTab') || 'Estándar'}
                  </Button>
                  <Button
                    size='sm'
                    variant={activeReportTab === 'ai' ? 'secondary' : 'ghost'}
                    className='h-7 text-xs px-2.5 gap-1'
                    onClick={() => setActiveReportTab('ai')}
                  >
                    <Sparkles className='size-3 text-primary' />
                    {t('novai.aiAiReportTab') || 'Con IA'}
                  </Button>
                </div>
              )}
              <AiReportDialog
                onReportGenerated={text => {
                  setAiReportText(text)
                  setActiveReportTab('ai')
                }}
              />
              <Button size='sm' variant='outline' onClick={copyToClipboard} className='text-xs shrink-0'>
                {t('common.copy')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className='rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-foreground/90 max-h-150 overflow-y-auto'>
              <MarkdownRenderer content={currentDisplayReport} />
            </div>
          ) : (
            <div className='rounded-xl border border-dashed bg-muted/10 p-8 flex flex-col items-center justify-center text-center space-y-3'>
              <div className='p-3 rounded-full bg-muted text-muted-foreground'>
                <FileText className='size-6' />
              </div>
              <div className='space-y-1 max-w-md'>
                <h4 className='text-sm font-semibold text-foreground'>
                  {t('investigator.noDataForReport')}
                </h4>
                <p className='text-xs text-muted-foreground'>
                  {t('investigator.noDataForReportDesc')}
                </p>
              </div>
              <div className='flex flex-wrap items-center justify-center gap-2 pt-2'>
                <Button size='sm' onClick={() => router.push('/apps/investigator/efi')} className='text-xs gap-1.5'>
                  <PlusCircle className='size-3.5' />
                  {t('investigator.goToEfi')}
                </Button>
                <Button size='sm' variant='outline' onClick={() => router.push('/apps/investigator/investigations')} className='text-xs gap-1.5'>
                  <FolderOpen className='size-3.5' />
                  {t('investigator.goToManager')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvestigatorSummaryView
