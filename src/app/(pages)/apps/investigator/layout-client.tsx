'use client'

import { Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheckBigIcon } from 'lucide-react'

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTrigger
} from '@/components/ui/stepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  InvestigatorAnalysisProvider,
  useInvestigatorAnalysis
} from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

const STEP_DEFINITIONS = [
  { id: 'context', title: 'Contexto de la investigación', description: 'Expediente del análisis', href: '/apps/investigator/context' },
  { id: 'efi', title: 'Factores Internos (EFI)', description: 'Matriz EFI', href: '/apps/investigator/efi' },
  { id: 'efe', title: 'Factores Externos (EFE)', description: 'Matriz EFE', href: '/apps/investigator/efe' },
  { id: 'dafo', title: 'Matriz DAFO', description: 'Cruces y relaciones', href: '/apps/investigator/dafo' },
  { id: 'qspm', title: 'Matriz QSPM', description: 'Selección estratégica', href: '/apps/investigator/qspm' },
  { id: 'came', title: 'Plan de acción (CAME)', description: 'Plan operativo', href: '/apps/investigator/came' },
  { id: 'summary', title: 'Resumen y dictamen', description: 'Lectura ejecutiva', href: '/apps/investigator/summary' }
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

  const currentStepId = useMemo(() => {
    const found = STEP_DEFINITIONS.find(item => {
      const href = item.href ?? `/apps/investigator/${item.id}`

      return pathname === href
    })

    return found?.id ?? 'context'
  }, [pathname])

  const handleStepChange = (value: string) => {
    if (!value) return
    const item = STEP_DEFINITIONS.find(i => i.id === value)

    if (item) {
      const href = item.href ?? `/apps/investigator/${item.id}`

      router.push(href)
    }
  }

  const investigationTitle =
    state.metadata?.title?.trim() ||
    state.metadata?.organization?.trim() ||
    'Expediente de Investigación'

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      {!isManagerView && (
        <div className='bg-card/90 backdrop-blur-md shadow-xs border border-border/80 rounded-2xl p-3 sm:p-4 transition-all'>
          <div className='flex items-center justify-between gap-3 mb-3 pb-2 border-b border-border/40'>
            <Button
              variant='ghost'
              size='sm'
              render={<Link href='/apps/investigator/investigations' />}
              nativeButton={false}
              className='h-7 sm:h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
            >
              <ArrowLeft className='size-3.5 mr-1.5' />
              <span>Gestor de investigaciones</span>
            </Button>
            <div className='flex items-center gap-2 max-w-[50%] truncate'>
              <Badge variant='outline' className='text-[11px] font-normal truncate px-2 py-0.5 border-primary/30 text-primary bg-primary/5'>
                {investigationTitle}
              </Badge>
            </div>
          </div>

          <Stepper
            steps={STEP_DEFINITIONS}
            value={currentStepId}
            onValueChange={handleStepChange}
            className='w-full'
            indicators={{
              completed: <CircleCheckBigIcon className='size-4 text-primary-foreground' />
            }}
          >
            <StepperNav className='w-full flex items-center justify-between overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth gap-1 sm:gap-2'>
              {STEP_DEFINITIONS.map((step, idx) => {
                const isCompleted = validation?.stageStatus?.[step.id as keyof typeof validation.stageStatus] === 'ready'
                const i18nKey = STEP_I18N_MAP[step.id]
                const displayTitle = i18nKey ? t(i18nKey) || step.title : step.title

                return (
                  <StepperItem
                    key={step.id}
                    stepId={step.id}
                    completed={isCompleted}
                    className='flex-1 min-w-[95px] sm:min-w-[125px]'
                  >
                    <StepperTrigger className='p-1.5 sm:p-2 cursor-pointer flex flex-col items-center gap-1 sm:gap-1.5 w-full rounded-xl hover:bg-muted/50 transition-all'>
                      <StepperIndicator className='flex items-center justify-center font-semibold text-xs sm:text-sm size-8 rounded-lg'>
                        {idx + 1}
                      </StepperIndicator>
                      <div className='flex flex-col items-center text-center w-full'>
                        <span className='text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 px-1'>
                          {displayTitle}
                        </span>
                        <span className='text-[10px] text-muted-foreground hidden lg:block line-clamp-1 mt-0.5'>
                          {step.description}
                        </span>
                      </div>
                    </StepperTrigger>
                    {idx < STEP_DEFINITIONS.length - 1 && (
                      <StepperSeparator className='h-0.5 flex-1 mx-1' />
                    )}
                  </StepperItem>
                )
              })}
            </StepperNav>
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
