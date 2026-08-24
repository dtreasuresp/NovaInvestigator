'use client'

import { Suspense } from 'react'
import type { ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NAV_ITEMS } from '@/utils/investigator/constants'
import { InvestigatorAnalysisProvider } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'
import { AiCopilotSheet } from '@/views/apps/investigator/shared/ai-copilot-sheet'

const TAB_I18N_MAP: Record<string, string> = {
  context: 'investigator.context',
  summary: 'investigator.summary',
  efi: 'investigator.efi',
  efe: 'investigator.efe',
  dafo: 'investigator.dafo',
  qspm: 'investigator.qspm',
  came: 'investigator.came',
  gestor: 'investigator.manager'
}

const InvestigatorLayoutClient = ({ children }: Readonly<{ children: ReactNode }>) => {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  const currentTab =
    NAV_ITEMS.find(item => {
      const href = item.href ?? `/apps/investigator/${item.id}`

      return pathname === href || (item.id === 'gestor' && pathname === '/apps/investigator')
    })?.id ?? 'gestor'

  const handleTabChange = (value: string | null) => {
    if (!value) return
    const item = NAV_ITEMS.find(i => i.id === value)

    if (item) {
      const href = item.href ?? `/apps/investigator/${item.id}`

      router.push(href)
    }
  }

  return (
    <InvestigatorAnalysisProvider>
      <div className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Tabs value={currentTab} onValueChange={handleTabChange} className='w-auto gap-0'>
            <div className='overflow-x-auto overflow-y-hidden'>
              <TabsList className='inline-flex'>
                {NAV_ITEMS.map(item => {
                  const i18nKey = TAB_I18N_MAP[item.id]
                  const displayLabel = i18nKey ? t(i18nKey) : item.label

                  return (
                    <TabsTrigger key={item.id} value={item.id}>
                      {displayLabel}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </Tabs>
        </div>
        <div className='min-w-0'>{children}</div>
      </div>
    </InvestigatorAnalysisProvider>
  )
}

const InvestigatorLayoutWithSuspense = ({ children }: Readonly<{ children: ReactNode }>) => (
  <Suspense fallback={null}>
    <InvestigatorLayoutClient>{children}</InvestigatorLayoutClient>
  </Suspense>
)

export default InvestigatorLayoutWithSuspense
