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
import { StrategicPositionMatrix, type StrategicMatrixPoint } from '@/components/ui/strategic-position-matrix'
import { InvestigationSummarySheet } from '@/components/ui/investigation-summary-sheet'
import { DafoQuadrantIndices } from '@/components/ui/dafo-quadrant-indices'
import { CameActionsIndices } from '@/components/ui/came-actions-indices'

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
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false)

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

  // Prepare strategic points for the global matrix component
  const strategicPoints = useMemo<StrategicMatrixPoint[]>(() => {
    if (!hasData) return []

    return [
      {
        id: state.metadata?.id || 'active-investigation',
        title: state.metadata?.title || t('investigator.context') || 'Investigación Activa',
        efi: Number(efiVal.toFixed(2)),
        efe: Number(efeVal.toFixed(2)),
        status: state.metadata?.status
      }
    ]
  }, [hasData, state.metadata?.id, state.metadata?.title, state.metadata?.status, efiVal, efeVal, t])

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
        <div className='grid gap-4 lg:grid-cols-12'>
          <div className='lg:col-span-8'>
            <Skeleton className='h-96 w-full rounded-2xl' />
          </div>
          <div className='lg:col-span-4 space-y-4'>
            <Skeleton className='h-44 w-full rounded-2xl' />
            <Skeleton className='h-44 w-full rounded-2xl' />
          </div>
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-5 w-64' />
          <Skeleton className='h-3.5 w-96' />
          <Skeleton className='h-48 w-full rounded-xl' />
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
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

      {/* Central Section: Strategic Positioning Matrix (Left) + 2-Column Right Panel (IE/DAFO + Validation/CAME) */}
      <div className='grid gap-4 xl:grid-cols-12 items-stretch'>
        {/* Left Column: Interactive Strategic Position Matrix */}
        <div className='xl:col-span-6 flex flex-col'>
          <StrategicPositionMatrix
            points={strategicPoints}
            activeId={state.metadata?.id || 'active-investigation'}
            onSelectPoint={() => setIsSummarySheetOpen(true)}
            className='h-full'
            footerHint='Haz clic en el punto para inspeccionar el expediente completo'
          />
        </div>

        {/* Right Panel (4 Cards in a uniform 2x2 Grid with equal heights) */}
        <div className='xl:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch'>
          {/* 1. Posición Interna-Externa (Top-Left) */}
          <div className='rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between space-y-3 h-full'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between gap-2'>
                <h4 className='font-semibold text-sm text-foreground truncate'>
                  {t('investigator.ieMatrixPosition') || 'Posición Interna-Externa (IE Matrix)'}
                </h4>
                <Badge variant='outline' className='text-[10px] uppercase font-bold text-primary shrink-0'>
                  {iePosition.efiCategory} / {iePosition.efeCategory}
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground'>
                Cuadrante {iePosition.cell} · EFI ({formatNumber(efiVal)}) × EFE ({formatNumber(efeVal)})
              </p>
            </div>

            <div className='space-y-2'>
              <div className='p-2.5 rounded-xl border bg-muted/30 space-y-0.5'>
                <span className='text-[11px] font-semibold text-foreground block'>Prescripción Metodológica:</span>
                <p className='text-xs text-muted-foreground leading-relaxed line-clamp-2'>
                  {iePosition.prescription}
                </p>
              </div>

              {orientation && (
                <div className='p-2.5 rounded-xl border bg-primary/5 border-primary/20 text-xs space-y-0.5'>
                  <span className='font-semibold text-foreground block text-[11px]'>
                    Vector Dominante: {analysis.relations.dominant} ({orientation.name})
                  </span>
                  <p className='text-muted-foreground text-[11px] leading-relaxed line-clamp-2'>{orientation.action}</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Estado de Validación (Top-Right) */}
          <div className='rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between space-y-3 h-full'>
            <div className='space-y-0.5'>
              <h4 className='font-semibold text-sm text-foreground truncate'>
                {t('investigator.validationStatus')}
              </h4>
              <p className='text-xs text-muted-foreground'>
                {validation.errors} errores · {validation.warnings} advertencias · {readyStages}/{stageTotal} etapas listas
              </p>
            </div>

            <div className='grid grid-cols-2 gap-x-3 gap-y-2 pt-1'>
              {Object.entries(validation.stageStatus).map(([stage, status]) => (
                <div key={stage} className='space-y-1'>
                  <div className='flex items-center justify-between gap-1'>
                    <span className='truncate text-[11px] font-medium capitalize'>{stage}</span>
                    <Badge
                      variant={status === 'ready' ? 'secondary' : status === 'warning' ? 'outline' : 'destructive'}
                      className='px-1 py-0 text-[9px]'
                    >
                      {status}
                    </Badge>
                  </div>
                  <Progress value={status === 'ready' ? 100 : status === 'warning' ? 50 : 25} className='h-1' />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Índices DAFO por Cuadrante (Bottom-Left) */}
          <DafoQuadrantIndices
            summary={analysis.relations.summary}
            dominant={analysis.relations.dominant}
            evaluatedCount={analysis.relations.evaluatedCount}
            title={t('investigator.quinquennialIndices') || 'Índices DAFO por Cuadrante'}
            className='h-full'
          />

          {/* 4. Plan de Acción CAME (Bottom-Right) */}
          <CameActionsIndices
            actions={analysis.came.actions}
            byType={analysis.came.byType}
            title={t('investigator.cameSummaryTitle') || 'Plan de Acción CAME'}
            className='h-full'
          />
        </div>
      </div>

      {/* Full Academic Report & Thesis Defense Synthesis (Section 19) */}
      <div className='space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1'>
          <div className='space-y-1'>
            <h3 className='text-lg font-semibold text-foreground'>{t('investigator.academicReportTitle')}</h3>
            <p className='text-xs text-muted-foreground'>
              {t('investigator.academicReportDesc')}
            </p>
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
        </div>
        <div>
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
        </div>
      </div>
      {/* Full Executive Diagnosis Sheet */}
      <InvestigationSummarySheet
        investigation={state}
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        onOpenFull={() => router.push('/apps/investigator/context')}
      />
    </div>
  )
}

export default InvestigatorSummaryView
