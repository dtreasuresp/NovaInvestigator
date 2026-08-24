'use client'

// React & Lucide Imports
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayersIcon,
  ScaleIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserIcon
} from 'lucide-react'

// UI Components
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { InvestigationState, CameType } from '@/types/apps/investigator-types'
import {
  calculateAnalysis,
  ORIENTATIONS,
  formatNumber
} from '@/utils/investigator/domain'

interface InvestigationSummarySheetProps {
  investigation: InvestigationState | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenFull?: (investigation: InvestigationState) => void
}

const CAME_SECTION_HEADERS: Record<
  CameType,
  {
    numeral: string
    title: string
    subtitle: string
    colorBadge: string
  }
> = {
  C: {
    numeral: 'A',
    title: 'Medidas de Corrección (C · Debilidades Internas)',
    subtitle: 'Iniciativas orientadas a neutralizar y mitigar las vulnerabilidades operativas',
    colorBadge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
  },
  A: {
    numeral: 'B',
    title: 'Medidas de Afrontamiento (A · Amenazas del Entorno)',
    subtitle: 'Protocolos de contingencia y blindaje institucional ante riesgos externos',
    colorBadge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
  },
  M: {
    numeral: 'C',
    title: 'Medidas de Mantenimiento (M · Fortalezas Clave)',
    subtitle: 'Planes para sostener y consolidar las ventajas competitivas distintivas',
    colorBadge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
  },
  E: {
    numeral: 'D',
    title: 'Medidas de Explotación (E · Oportunidades Sectoriales)',
    subtitle: 'Proyectos de desarrollo y capitalización de oportunidades del entorno',
    colorBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  }
}

export const InvestigationSummarySheet = ({
  investigation,
  open,
  onOpenChange,
  onOpenFull
}: InvestigationSummarySheetProps) => {
  const { t } = useI18n()
  if (!investigation) return null

  const analysis = calculateAnalysis(investigation)
  const meta = investigation.metadata || {}

  const efiScore = analysis?.efi?.total ?? 0
  const efeScore = analysis?.efe?.total ?? 0
  const dominant = analysis?.relations?.dominant ?? 'DO'
  const orientationInfo = ORIENTATIONS[dominant] || ORIENTATIONS.DO

  const strengthsCount = analysis?.efi?.strengths?.length || 0
  const weaknessesCount = analysis?.efi?.weaknesses?.length || 0
  const opportunitiesCount = analysis?.efe?.opportunities?.length || 0
  const threatsCount = analysis?.efe?.threats?.length || 0

  const selectedStrategy = investigation.strategies?.find(
    s => s.id === investigation.selectedStrategyId
  )

  const cameActions = investigation.cameActions || []
  const isValidated = meta.status === 'validada' || meta.validation === 'validada'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-full sm:max-w-2xl lg:max-w-3xl overflow-hidden flex flex-col p-0 gap-0 border-l border-border/80 shadow-2xl'
      >
        {/* Header with Academic Style */}
        <SheetHeader className='p-6 pb-4 border-b bg-muted/25 relative space-y-2.5'>
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className='bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold tracking-wider uppercase font-mono'
            >
              {t('dashboard.strategicDiagnosis')}
            </Badge>
            {isValidated ? (
              <Badge
                variant='outline'
                className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]'
              >
                <CheckCircle2Icon className='mr-1 size-3' /> {t('dashboard.closedInvestigations')}
              </Badge>
            ) : meta.archivedAt ? (
              <Badge variant='outline' className='bg-muted text-muted-foreground text-[11px]'>
                {t('dashboard.archivedCount')}
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]'
              >
                <ClockIcon className='mr-1 size-3' /> {t('dashboard.inAnalysis')}
              </Badge>
            )}
          </div>

          <SheetTitle className='text-xl font-bold tracking-tight text-foreground font-heading leading-snug'>
            {meta.title || meta.id}
          </SheetTitle>

          {/* Academic Metadata Grid */}
          <SheetDescription className='text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60 flex flex-col gap-y-2'>
            <span className='flex items-center gap-1.5'>
              <Building2Icon className='size-3.5 text-muted-foreground shrink-0' />
              <strong className='text-foreground font-medium'>{t('investigator.fieldOrganization')}</strong>{' '}
              <span className='truncate'>{meta.organization || 'No especificada'}</span>
              {meta.unit && <span className='text-muted-foreground'>({meta.unit})</span>}
            </span>
            <span className='flex items-center gap-1.5'>
              <UserIcon className='size-3.5 text-muted-foreground shrink-0' />
              <strong className='text-foreground font-medium'>{t('dashboards.investigator')}</strong>{' '}
              <span className='truncate'>{meta.author || 'Equipo Evaluador'}</span>
            </span>
            <span className='flex items-center gap-1.5'>
              <CalendarIcon className='size-3.5 text-muted-foreground shrink-0' />
              <strong className='text-foreground font-medium'>{t('dashboards.evaluationDate')}</strong>{' '}
              <span>{meta.evaluationDate || 'En evaluación'}</span>
            </span>
            <span className='flex items-center gap-1.5'>
              <GraduationCapIcon className='size-3.5 text-muted-foreground shrink-0' />
              <strong className='text-foreground font-medium'>{t('dashboards.methodology')}</strong>{' '}
              <span>{t('investigator.cameAnalysis') || 'Metodología Integral'}</span>
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Academic Body */}
        <div className='flex-1 overflow-y-auto p-6 space-y-7 text-sm leading-relaxed'>
          {/* 1. Dictamen y Fundamentación Matricial (Narrativa) */}
          <section className='space-y-3'>
            <div className='flex items-center gap-2 pb-1 border-b border-border/70'>
              <CompassIcon className='size-4 text-primary' />
              <h3 className='font-heading text-sm font-semibold uppercase tracking-wider text-foreground'>
                1. Dictamen y Fundamentación Matricial
              </h3>
            </div>

            <div className='rounded-lg bg-muted/20 border p-4 space-y-3'>
              {efiScore === 0 && efeScore === 0 ? (
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  La investigación se encuentra en su fase preliminar de registro de factores. Actualmente
                  se han recopilado <strong className='text-foreground'>{strengthsCount} fortalezas</strong>,{' '}
                  <strong className='text-foreground'>{weaknessesCount} debilidades</strong>,{' '}
                  <strong className='text-foreground'>{opportunitiesCount} oportunidades</strong> y{' '}
                  <strong className='text-foreground'>{threatsCount} amenazas</strong>. El cálculo del
                  índice ponderado se formalizará una vez que se asignen pesos y calificaciones cuantitativas
                  en las matrices EFI y EFE.
                </p>
              ) : (
                <>
                  <p className='text-xs sm:text-sm text-foreground/90 leading-relaxed'>
                    A partir de la auditoría estratégica interna y externa, la organización alcanza una
                    puntuación ponderada interna <strong>EFI de {formatNumber(efiScore)} puntos</strong>{' '}
                    (reflejando una posición interna{' '}
                    <span className={efiScore >= 2.5 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-amber-600 dark:text-amber-400'}>
                      {efiScore >= 2.5 ? 'sólida y competitiva' : 'vulnerable'}
                    </span>{' '}
                    frente al valor medio teórico de 2.50) y una puntuación externa{' '}
                    <strong>EFE de {formatNumber(efeScore)} puntos</strong> (indicativa de una respuesta{' '}
                    <span className={efeScore >= 2.5 ? 'font-semibold text-sky-600 dark:text-sky-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>
                      {efeScore >= 2.5 ? 'favorable y proactiva' : 'reactiva o desfavorecida'}
                    </span>{' '}
                    ante las dinámicas del entorno sectorial).
                  </p>

                  <p className='text-xs sm:text-sm text-foreground/90 leading-relaxed'>
                    El análisis relacional DAFO determina una{' '}
                    <strong className='text-primary'>
                      orientación metodológica dominante {dominant} ({orientationInfo?.name || dominant})
                    </strong>
                    . {orientationInfo?.subtitle || 'Esta orientación orienta el direccionamiento estratégico de las iniciativas de intervención.'}
                  </p>
                </>
              )}

              {/* Fila de Resumen Numérico Discreto */}
              <div className='pt-2 border-t flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground'>
                <span>
                  <strong>{t('dashboards.efi')}</strong> {formatNumber(efiScore)} / 4.00 ({strengthsCount} F · {weaknessesCount} D)
                </span>
                <span>
                  <strong>{t('dashboards.efe')}</strong> {formatNumber(efeScore)} / 4.00 ({opportunitiesCount} O · {threatsCount} A)
                </span>
                <span>
                  <strong>{t('dashboard.colOrientation')}</strong> {dominant}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Decisión Estratégica Formal (QSPM) */}
          <section className='space-y-3'>
            <div className='flex items-center gap-2 pb-1 border-b border-border/70'>
              <ScaleIcon className='size-4 text-primary' />
              <h3 className='font-heading text-sm font-semibold uppercase tracking-wider text-foreground'>
                2. Decisión Estratégica Formal (Matriz QSPM)
              </h3>
            </div>

            <div className='rounded-lg bg-muted/20 border p-4 space-y-2.5'>
              {selectedStrategy ? (
                <>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-foreground text-sm flex items-center gap-1.5'>
                      <Badge variant='outline' className='font-mono text-xs font-bold bg-primary/10 text-primary border-primary/20'>
                        {selectedStrategy.id}
                      </Badge>
                      {selectedStrategy.name}
                    </span>
                  </div>

                  {selectedStrategy.description && (
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      {selectedStrategy.description}
                    </p>
                  )}

                  {investigation.selectionJustification ? (
                    <div className='mt-2.5 text-xs border-l-2 border-primary/60 pl-3 py-1 bg-background/50 rounded-r text-foreground/90 italic leading-relaxed'>
                      <strong className='not-italic font-semibold text-primary block mb-0.5'>{t('investigationDashboard.rationale') || 'Fundamentación del Comité Evaluador:'}</strong>
                      "{investigation.selectionJustification}"
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground italic pt-1'>
                      La alternativa fue seleccionada en base a la evaluación cuantitativa de atractivo de la matriz QSPM.
                    </p>
                  )}
                </>
              ) : (
                <p className='text-xs text-muted-foreground italic leading-relaxed'>
                  No se ha seleccionado formalmente una alternativa estratégica en la etapa QSPM.
                  Una vez priorizadas las alternativas cuantitativas, el dictamen incorporará la justificación
                  y fundamentación del equipo evaluador.
                </p>
              )}
            </div>
          </section>

          {/* 3. Plan de Intervención CAME (Eje Central de la Investigación) */}
          <section className='space-y-4'>
            <div className='flex items-center justify-between pb-1 border-b border-border/70'>
              <div className='flex items-center gap-2'>
                <TargetIcon className='size-4 text-primary' />
                <h3 className='font-heading text-sm font-semibold uppercase tracking-wider text-foreground'>
                  3. Plan de Intervención CAME
                </h3>
              </div>
              <Badge variant='outline' className='text-xs font-semibold'>
                {cameActions.length} {cameActions.length === 1 ? 'Iniciativa' : 'Iniciativas'}
              </Badge>
            </div>

            <p className='text-xs text-muted-foreground leading-relaxed'>
              A continuación se detalla la propuesta operativa destinada a operacionalizar la estrategia
              mediante acciones concretas de <strong>{t('investigator.validationCorrection')}</strong>, <strong>{t('investigator.validationApproach')}</strong>,{' '}
              <strong>{t('investigator.validationMaintenance')}</strong> y <strong>{t('investigator.validationExploitation')}</strong>:
            </p>

            {cameActions.length === 0 ? (
              <div className='rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground space-y-1.5'>
                <p className='font-semibold text-foreground'>{t('dashboards.pendingCameCards')}</p>
                <p className='max-w-md mx-auto'>
                  El plan de acción operativo se generará y estructurará automáticamente al definir las
                  estrategias específicas en la etapa CAME del espacio de trabajo.
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                {(['C', 'A', 'M', 'E'] as CameType[]).map(type => {
                  const actionsOfType = cameActions.filter(a => a.type === type)
                  if (actionsOfType.length === 0) return null

                  const section = CAME_SECTION_HEADERS[type]

                  return (
                    <div key={type} className='space-y-3'>
                      {/* Section Title */}
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className={`font-mono text-[11px] font-bold ${section.colorBadge}`}>
                            {section.numeral}
                          </Badge>
                          <div>
                            <h4 className='text-xs font-bold text-foreground'>{section.title}</h4>
                            <p className='text-[11px] text-muted-foreground'>{section.subtitle}</p>
                          </div>
                        </div>
                        <span className='text-[11px] text-muted-foreground font-medium'>
                          {actionsOfType.length} {actionsOfType.length === 1 ? 'acción' : 'acciones'}
                        </span>
                      </div>

                      {/* Action Cards */}
                      <div className='space-y-2.5 pl-2 border-l-2 border-border/80'>
                        {actionsOfType.map((action, idx) => (
                          <div
                            key={action.id}
                            className='rounded-lg border bg-card p-4 space-y-2 text-xs shadow-2xs'
                          >
                            {/* Action Header */}
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='flex items-center gap-1.5'>
                                <span className='font-mono font-bold text-primary'>
                                  {idx + 1}. {action.id}
                                </span>
                                <span className='text-muted-foreground'>•</span>
                                <span className='font-medium text-foreground'>
                                  Factor: {action.factor || action.factorId}
                                </span>
                              </div>
                              {action.status && (
                                <Badge variant='outline' className='text-[10px] capitalize'>
                                  {action.status}
                                </Badge>
                              )}
                            </div>

                            {/* Action Core Statement */}
                            <p className='text-xs font-semibold text-foreground leading-relaxed pt-0.5'>
                              {action.action || action.objective}
                            </p>

                            {/* Detailed Academic Attributes */}
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 pt-2 border-t text-[11px] text-muted-foreground'>
                              {action.objective && action.action !== action.objective && (
                                <div className='sm:col-span-2'>
                                  <strong className='text-foreground font-medium'>{t('dashboards.specificObjective')}</strong>{' '}
                                  <span>{action.objective}</span>
                                </div>
                              )}
                              <div>
                                <strong className='text-foreground font-medium'>{t('dashboards.responsible')}</strong>{' '}
                                <span>{action.responsible || 'Por designar'}</span>
                              </div>
                              <div>
                                <strong className='text-foreground font-medium'>{t('dashboards.progressIndicator')}</strong>{' '}
                                <span>{action.indicator || 'Por definir'}</span>
                              </div>
                              {action.target && (
                                <div>
                                  <strong className='text-foreground font-medium'>{t('dashboards.measurableGoal')}</strong>{' '}
                                  <span>{action.target}</span>
                                </div>
                              )}
                              {action.criteria && (
                                <div>
                                  <strong className='text-foreground font-medium'>{t('dashboards.severityUrgency')}</strong>{' '}
                                  <span>{action.criteria.urgency ?? 3}/5 · {t('dashboards.approach') || 'Impacto'}: {action.criteria.impact ?? 3}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <SheetFooter className='border-t p-4 px-6 bg-muted/15 flex flex-row items-center justify-between gap-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            className='text-xs'
          >
            {t('common.close')}
          </Button>

          <Button
            variant='default'
            size='sm'
            onClick={() => {
              onOpenChange(false)
              onOpenFull?.(investigation)
            }}
            className='text-xs font-semibold'
          >
            {t('dashboard.openFullInvestigation')} <ArrowUpRightIcon className='ml-1.5 size-3.5' />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default InvestigationSummarySheet
