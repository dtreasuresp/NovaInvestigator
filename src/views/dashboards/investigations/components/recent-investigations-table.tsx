'use client'

// React & Lucide Imports
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  SearchIcon
} from 'lucide-react'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvestigationSummarySheet } from './investigation-summary-sheet'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { InvestigationState } from '@/types/apps/investigator-types'
import { calculateAnalysis } from '@/utils/investigator/domain'

interface RecentInvestigationsTableProps {
  investigations: InvestigationState[]
  onOpenResearch: (investigation: InvestigationState) => void
  onShowSummary?: (investigation: InvestigationState) => void
}

export const RecentInvestigationsTable = ({
  investigations,
  onOpenResearch,
  onShowSummary
}: RecentInvestigationsTableProps) => {
  const router = useRouter()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [localSummaryInvestigation, setLocalSummaryInvestigation] = useState<InvestigationState | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const ORIENTATION_BADGES: Record<string, { label: string; className: string }> = {
    FO: { label: `FO · ${t('investigator.offensive')}`, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    DO: { label: `DO · ${t('investigator.reorientation')}`, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    FA: { label: `FA · ${t('investigator.defensive')}`, className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
    DA: { label: `DA · ${t('investigator.survival')}`, className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
  }

  const filtered = investigations.filter(item => {
    const term = search.toLowerCase()
    const title = (item.metadata?.title || '').toLowerCase()
    const id = (item.metadata?.id || '').toLowerCase()
    const org = (item.metadata?.organization || '').toLowerCase()

    return title.includes(term) || id.includes(term) || org.includes(term)
  })

  const handleOpen = (investigation: InvestigationState, targetPath = '/apps/investigator/context') => {
    onOpenResearch(investigation)
    router.push(targetPath)
  }

  const handleSummaryClick = (investigation: InvestigationState) => {
    if (onShowSummary) {
      onShowSummary(investigation)
    } else {
      setLocalSummaryInvestigation(investigation)
      setIsSheetOpen(true)
    }
  }

  return (
    <>
      <Card className='border-border/60 shadow-xs'>
        <CardHeader className='pb-3'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2'>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <FileSpreadsheetIcon className='size-4' />
              </div>
              <div>
                <CardTitle className='text-base font-semibold'>{t('dashboard.investigationsRegistry')}</CardTitle>
                <CardDescription className='text-xs'>
                  {t('dashboard.investigationsRegistryDesc')}
                </CardDescription>
              </div>
            </div>

            {/* Search box */}
            <div className='relative w-full sm:w-64'>
              <SearchIcon className='text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2' />
              <Input
                placeholder={t('dashboard.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='h-8 pl-8 text-xs'
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-muted/50 text-muted-foreground border-y text-[11px] font-medium uppercase tracking-wider'>
                <tr>
                  <th className='px-4 py-3'>{t('dashboard.colInvestigation')}</th>
                  <th className='px-4 py-3 text-center'>{t('dashboard.colEfi')}</th>
                  <th className='px-4 py-3 text-center'>{t('dashboard.colEfe')}</th>
                  <th className='px-4 py-3 text-center'>{t('dashboard.colOrientation')}</th>
                  <th className='px-4 py-3 text-center'>{t('dashboard.colStatus')}</th>
                  <th className='px-4 py-3 text-right'>{t('dashboard.colAction')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='text-muted-foreground px-4 py-8 text-center text-xs'>
                      {t('dashboard.noSearchResults')}
                    </td>
                  </tr>
                ) : (
                  filtered.map(inv => {
                    const analysis = calculateAnalysis(inv)
                    const efiScore = analysis?.efi?.total ?? 0
                    const efeScore = analysis?.efe?.total ?? 0
                    const dominant = analysis?.relations?.dominant ?? 'DO'
                    const orientationInfo = ORIENTATION_BADGES[dominant] || ORIENTATION_BADGES.DO
                    const isValidated = inv.metadata.status === 'validada' || inv.metadata.validation === 'validada'

                    return (
                      <tr
                        key={inv.metadata.id}
                        className='hover:bg-muted/40 transition-colors group cursor-pointer'
                        onClick={() => handleSummaryClick(inv)}
                      >
                        {/* Title & Organization */}
                        <td className='px-4 py-3.5 max-w-64 sm:max-w-xs'>
                          <div className='font-semibold text-foreground truncate'>
                            {inv.metadata.title || inv.metadata.id}
                          </div>
                          <div className='text-muted-foreground mt-0.5 flex items-center gap-2 text-[11px] truncate'>
                            <span className='font-mono font-medium text-primary/80'>{inv.metadata.id}</span>
                            {inv.metadata.organization && (
                              <>
                                <span>•</span>
                                <span className='truncate'>{inv.metadata.organization}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* EFI */}
                        <td className='px-4 py-3.5 text-center whitespace-nowrap'>
                          <Badge
                            variant='outline'
                            className={
                              efiScore >= 2.5
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold'
                            }
                          >
                            {efiScore.toFixed(2)}
                          </Badge>
                        </td>

                        {/* EFE */}
                        <td className='px-4 py-3.5 text-center whitespace-nowrap'>
                          <Badge
                            variant='outline'
                            className={
                              efeScore >= 2.5
                                ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-semibold'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold'
                            }
                          >
                            {efeScore.toFixed(2)}
                          </Badge>
                        </td>

                        {/* Dominant Orientation */}
                        <td className='px-4 py-3.5 text-center whitespace-nowrap'>
                          <Badge variant='outline' className={orientationInfo.className}>
                            {orientationInfo.label}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className='px-4 py-3.5 text-center whitespace-nowrap'>
                          {isValidated ? (
                            <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20'>
                              <CheckCircle2Icon className='mr-1 size-3' /> {t('dashboard.closedInvestigations')}
                            </Badge>
                          ) : inv.metadata.archivedAt ? (
                            <Badge variant='outline' className='bg-slate-500/10 text-slate-500 border-slate-500/20'>
                              {t('dashboard.archivedCount')}
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='bg-amber-500/10 text-amber-600 border-amber-500/20'>
                              <ClockIcon className='mr-1 size-3' /> {t('dashboard.inAnalysis')}
                            </Badge>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className='px-4 py-3.5 text-right whitespace-nowrap' onClick={e => e.stopPropagation()}>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 px-2 text-xs'
                              onClick={() => handleSummaryClick(inv)}
                            >
                              <EyeIcon className='mr-1 size-3.5' /> {t('investigator.summary')}
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-xs font-medium'
                              onClick={() => handleOpen(inv, '/apps/investigator/context')}
                            >
                              {t('common.details')} <ArrowUpRightIcon className='ml-1 size-3' />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Local Sheet fallback when not hoisted */}
      {!onShowSummary && (
        <InvestigationSummarySheet
          investigation={localSummaryInvestigation}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onOpenFull={inv => handleOpen(inv, '/apps/investigator/context')}
        />
      )}
    </>
  )
}

export default RecentInvestigationsTable
