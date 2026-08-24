'use client'

import { Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperLabel,
  StepperList,
  StepperSeparator,
  StepperTrigger
} from '@/components/ui/stepper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { STEPPER_ITEMS } from '@/utils/investigator/constants'
import {
  InvestigatorAnalysisProvider,
  useInvestigatorAnalysis
} from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

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
    const found = STEPPER_ITEMS.find(item => {
      const href = item.href ?? `/apps/investigator/${item.id}`

      return pathname === href
    })

    return found?.id ?? 'context'
  }, [pathname])

  const handleStepChange = (value: string | null) => {
    if (!value) return
    const item = STEPPER_ITEMS.find(i => i.id === value)

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
          <div className='flex items-center justify-between gap-3 mb-2 pb-2 border-b border-border/40'>
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
            value={currentStepId}
            onValueChange={handleStepChange}
            className='w-full'
          >
            <StepperList className='w-full flex items-center justify-between overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth gap-1 sm:gap-2'>
              {STEPPER_ITEMS.map((item, index) => {
                const i18nKey = STEP_I18N_MAP[item.id]
                const displayLabel = i18nKey ? t(i18nKey) || item.label : item.label
                const isCompleted = validation?.stageStatus?.[item.id as keyof typeof validation.stageStatus] === 'ready'

                return (
                  <StepperItem
                    key={item.id}
                    value={item.id}
                    defaultTrigger={false}
                    completed={isCompleted}
                    className='data-[orientation=horizontal]:flex-1 data-[orientation=horizontal]:min-w-[100px] sm:data-[orientation=horizontal]:min-w-[130px]'
                  >
                    <StepperTrigger className='cursor-pointer group flex flex-col items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl transition-all hover:bg-muted/60 data-[state=active]:bg-primary/10 data-[state=active]:text-primary w-full'>
                      <StepperIndicator className='size-7 sm:size-8 text-xs sm:text-sm font-semibold transition-transform group-hover:scale-105 shadow-xs'>
                        {index + 1}
                      </StepperIndicator>
                      <div className='flex flex-col items-center text-center min-w-0 w-full'>
                        <StepperLabel className='text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 px-1'>
                          {displayLabel}
                        </StepperLabel>
                        <StepperDescription className='text-[10px] text-muted-foreground hidden lg:block leading-none mt-0.5 line-clamp-1'>
                          {item.detail}
                        </StepperDescription>
                      </div>
                    </StepperTrigger>
                    <StepperSeparator className='bg-border/60' />
                  </StepperItem>
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
