'use client'

import { Fragment, Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Award,
  Calculator,
  ChevronRight,
  FileText,
  Globe,
  LayoutGrid,
  ListTodo,
  Lock,
  SlidersHorizontal
} from 'lucide-react'

import {
  Stepper,
  StepperItem,
  StepperList
} from '@/components/ui/stepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  InvestigatorAnalysisProvider,
  useInvestigatorAnalysis
} from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

type StageMetaItem = {
  id: string
  kicker: string
  title: string
  description: string
  stepTitle: string
  stepDesc: string
  href: string
  icon: typeof FileText
}

const STEP_DEFINITIONS: StageMetaItem[] = [
  {
    id: 'context',
    kicker: '01 · Contexto',
    title: 'Contexto de la investigación',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Contexto',
    stepDesc: 'Expediente',
    href: '/apps/investigator/context',
    icon: FileText
  },
  {
    id: 'efi',
    kicker: '02 · Diagnóstico interno',
    title: 'Factores Internos (Matriz EFI)',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Factores EFI',
    stepDesc: 'Matriz EFI',
    href: '/apps/investigator/efi',
    icon: SlidersHorizontal
  },
  {
    id: 'efe',
    kicker: '03 · Diagnóstico externo',
    title: 'Factores Externos (Matriz EFE)',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Factores EFE',
    stepDesc: 'Matriz EFE',
    href: '/apps/investigator/efe',
    icon: Globe
  },
  {
    id: 'dafo',
    kicker: '04 · Cruces estratégicos',
    title: 'Matriz DAFO / FODA',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Matriz DAFO',
    stepDesc: 'Cruces y relaciones',
    href: '/apps/investigator/dafo',
    icon: LayoutGrid
  },
  {
    id: 'qspm',
    kicker: '05 · Decisión estratégica',
    title: 'Matriz Cuantitativa (QSPM)',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Matriz QSPM',
    stepDesc: 'Selección estratégica',
    href: '/apps/investigator/qspm',
    icon: Calculator
  },
  {
    id: 'came',
    kicker: '06 · Plan de acción',
    title: 'Plan de Acción (Matriz CAME)',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Plan CAME',
    stepDesc: 'Plan operativo',
    href: '/apps/investigator/came',
    icon: ListTodo
  },
  {
    id: 'summary',
    kicker: '07 · Conclusiones',
    title: 'Resumen y Dictamen Estratégico',
    description: 'Suite de análisis y formulación estratégica empresarial',
    stepTitle: 'Resumen',
    stepDesc: 'Informe ejecutivo',
    href: '/apps/investigator/summary',
    icon: Award
  }
]

const InvestigatorLayoutInner = ({ children }: Readonly<{ children: ReactNode }>) => {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const { isReadOnly, validation } = useInvestigatorAnalysis()

  const isManagerView =
    pathname === '/apps/investigator/investigations' ||
    pathname === '/apps/investigator' ||
    pathname === '/apps/investigator/'

  const currentStepIndex = useMemo(() => {
    const idx = STEP_DEFINITIONS.findIndex(item => {
      const href = item.href ?? `/apps/investigator/${item.id}`

      return pathname === href
    })

    return idx !== -1 ? idx : 0
  }, [pathname])

  const currentStep = STEP_DEFINITIONS[currentStepIndex] || STEP_DEFINITIONS[0]
  const currentStepId = currentStep.id

  const handleStepClick = (href: string) => {
    router.push(href)
  }

  return (
    <div className='flex flex-col gap-6'>
      {!isManagerView && (
        <div className='flex flex-col gap-5 w-full'>
          {/* Header Superior: Kicker, Title, Subtitle a la izquierda | Volver al gestor a la derecha */}
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='max-w-2xl'>
              <p className='text-primary mb-1 text-xs font-semibold tracking-widest uppercase'>
                {currentStep.kicker}
              </p>
              <h1 className='font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                {currentStep.title}
              </h1>
              <p className='text-muted-foreground mt-1 text-sm'>
                {currentStep.description}
              </p>
            </div>

            <div className='flex items-center gap-2.5'>
              {isReadOnly && (
                <Badge
                  variant='outline'
                  className='bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1.5 text-xs py-1 px-2.5'
                >
                  <Lock className='size-3.5' /> {t('common.readOnlyMode')}
                </Badge>
              )}
              <Button
                variant='outline'
                size='sm'
                render={<Link href='/apps/investigator/investigations' />}
                nativeButton={false}
                className='h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground transition-colors'
              >
                <ArrowLeft className='size-3.5 mr-1.5' />
                <span>{t('investigator.manager') || 'Gestor de investigaciones'}</span>
              </Button>
            </div>
          </div>

          {/* Stepper (Debajo del Header, Fondo Transparente) */}
          <Stepper steps={STEP_DEFINITIONS} value={currentStepId} className='w-full'>
            <StepperList className='flex w-full items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 border-none bg-transparent p-0 shadow-none'>
              {STEP_DEFINITIONS.map((step, index) => {
                const StepIcon = step.icon
                const isCurrent = currentStepIndex === index
                const isCompleted =
                  validation?.stageStatus?.[step.id as keyof typeof validation.stageStatus] === 'ready'

                return (
                  <Fragment key={step.id}>
                    <StepperItem
                      value={step.id}
                      defaultTrigger={false}
                      separator={false}
                      onClick={() => handleStepClick(step.href)}
                      className='flex flex-row items-center gap-2.5 sm:gap-3 bg-transparent p-0 hover:bg-transparent focus:bg-transparent data-active:bg-transparent group cursor-pointer shrink-0'
                    >
                      {/* Circle Icon Container */}
                      <div
                        className={`size-9 sm:size-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 relative ${
                          isCurrent
                            ? 'bg-white text-black dark:bg-white dark:text-black shadow-md ring-2 ring-white/20'
                            : isCompleted
                              ? 'bg-zinc-800/90 text-zinc-300 border border-emerald-500/50 group-hover:border-emerald-500'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 group-hover:border-zinc-500'
                        }`}
                      >
                        <StepIcon className='size-4 sm:size-5 shrink-0' />
                        {isCompleted && !isCurrent && (
                          <span className='absolute -top-0.5 -right-0.5 size-2.5 bg-emerald-500 rounded-full ring-2 ring-background' />
                        )}
                      </div>

                      {/* Title & Subtitle */}
                      <div className='flex flex-col text-left'>
                        <span
                          className={`text-xs sm:text-sm tracking-tight transition-colors whitespace-nowrap ${
                            isCurrent
                              ? 'text-white font-bold'
                              : isCompleted
                                ? 'text-zinc-200 font-medium'
                                : 'text-zinc-400 font-normal group-hover:text-zinc-200'
                          }`}
                        >
                          {step.stepTitle}
                        </span>
                        <span className='text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap hidden xl:block'>
                          {step.stepDesc}
                        </span>
                      </div>
                    </StepperItem>

                    {/* Separator Chevron between steps */}
                    {index < STEP_DEFINITIONS.length - 1 ? (
                      <div className='flex items-center justify-center text-zinc-600 shrink-0 mx-1'>
                        <ChevronRight className='size-4' />
                      </div>
                    ) : null}
                  </Fragment>
                )
              })}
            </StepperList>
          </Stepper>
        </div>
      )}

      <div className='min-w-0'>{children}</div>
    </div>
  )
}

const InvestigatorLayoutClient = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <InvestigatorAnalysisProvider>
      <InvestigatorLayoutInner>{children}</InvestigatorLayoutInner>
    </InvestigatorAnalysisProvider>
  )
}

const InvestigatorLayoutWithSuspense = ({ children }: Readonly<{ children: ReactNode }>) => (
  <Suspense fallback={null}>
    <InvestigatorLayoutClient>{children}</InvestigatorLayoutClient>
  </Suspense>
)

export default InvestigatorLayoutWithSuspense
