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

const STEP_DEFINITIONS = [
  {
    id: 'context',
    title: 'Contexto de la investigación',
    description: 'Expediente del análisis',
    href: '/apps/investigator/context',
    icon: FileText
  },
  {
    id: 'efi',
    title: 'Factores Internos (EFI)',
    description: 'Matriz EFI',
    href: '/apps/investigator/efi',
    icon: SlidersHorizontal
  },
  {
    id: 'efe',
    title: 'Factores Externos (EFE)',
    description: 'Matriz EFE',
    href: '/apps/investigator/efe',
    icon: Globe
  },
  {
    id: 'dafo',
    title: 'Matriz DAFO',
    description: 'Cruces y relaciones',
    href: '/apps/investigator/dafo',
    icon: LayoutGrid
  },
  {
    id: 'qspm',
    title: 'Matriz QSPM',
    description: 'Selección estratégica',
    href: '/apps/investigator/qspm',
    icon: Calculator
  },
  {
    id: 'came',
    title: 'Plan de acción (CAME)',
    description: 'Plan operativo',
    href: '/apps/investigator/came',
    icon: ListTodo
  },
  {
    id: 'summary',
    title: 'Resumen y dictamen',
    description: 'Lectura ejecutiva',
    href: '/apps/investigator/summary',
    icon: Award
  }
]

const STEP_I18N_MAP: Record<string, string> = {
  context: 'investigator.context',
  efi: 'investigator.efi',
  efe: 'investigator.efe',
  dafo: 'investigator.dafo',
  qspm: 'investigator.qspm',
  came: 'investigator.came',
  summary: 'investigator.summary'
}

const InvestigatorLayoutInner = ({ children }: Readonly<{ children: ReactNode }>) => {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()
  const { state, validation } = useInvestigatorAnalysis()

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

  const currentStepId = STEP_DEFINITIONS[currentStepIndex]?.id ?? 'context'

  const handleStepClick = (href: string) => {
    router.push(href)
  }

  const investigationTitle =
    state.metadata?.title?.trim() ||
    state.metadata?.organization?.trim() ||
    'Expediente de Investigación'

  return (
    <div className='flex flex-col gap-6'>
      {!isManagerView && (
        <div className='flex flex-col gap-4 w-full'>
          {/* Top Bar: Back to Manager & Investigation Name */}
          <div className='flex items-center justify-between gap-3'>
            <Button
              variant='ghost'
              size='sm'
              render={<Link href='/apps/investigator/investigations' />}
              nativeButton={false}
              className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors'
            >
              <ArrowLeft className='size-3.5 mr-1.5' />
              <span>Gestor de investigaciones</span>
            </Button>

            <Badge
              variant='outline'
              className='text-xs font-normal max-w-[60%] truncate px-3 py-1 border-border/80 text-foreground bg-muted/30'
            >
              {investigationTitle}
            </Badge>
          </div>

          {/* Stepper Header (Same Pattern as Upgrade / Mejorar Plan) */}
          <Stepper steps={STEP_DEFINITIONS} value={currentStepId} className='w-full'>
            <StepperList className='flex w-full items-center justify-between gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 border-none bg-transparent p-0 shadow-none'>
              {STEP_DEFINITIONS.map((step, index) => {
                const StepIcon = step.icon
                const isCurrent = currentStepIndex === index
                const isCompleted =
                  currentStepIndex > index ||
                  validation?.stageStatus?.[step.id as keyof typeof validation.stageStatus] === 'ready'
                const i18nKey = STEP_I18N_MAP[step.id]
                const displayTitle = i18nKey ? t(i18nKey) || step.title : step.title

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
                        className={`size-9 sm:size-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isCurrent
                            ? 'bg-foreground text-background shadow-md ring-2 ring-primary/30'
                            : isCompleted
                              ? 'bg-foreground/90 text-background shadow-xs'
                              : 'bg-muted text-muted-foreground border border-border/60 group-hover:border-foreground/40'
                        }`}
                      >
                        <StepIcon className='size-4 sm:size-5 shrink-0' />
                      </div>

                      {/* Title & Subtitle */}
                      <div className='flex flex-col text-left'>
                        <span
                          className={`text-xs sm:text-sm font-semibold tracking-tight transition-colors whitespace-nowrap ${
                            isCurrent
                              ? 'text-foreground font-bold'
                              : isCompleted
                                ? 'text-foreground/90 font-medium'
                                : 'text-muted-foreground font-normal group-hover:text-foreground/80'
                          }`}
                        >
                          {displayTitle}
                        </span>
                        <span className='text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap hidden xl:block'>
                          {step.description}
                        </span>
                      </div>
                    </StepperItem>

                    {/* Separator Chevron between steps */}
                    {index < STEP_DEFINITIONS.length - 1 ? (
                      <div className='flex items-center justify-center text-muted-foreground/40 shrink-0 mx-1'>
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
