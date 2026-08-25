'use client'

// React & Next Imports
import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CloudCheckIcon,
  HardDriveIcon
} from 'lucide-react'

// Component Imports
import { Badge } from '@/components/ui/badge'

// Hook Imports
import {
  InvestigatorAnalysisProvider,
  useInvestigatorAnalysis
} from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// Subcomponent Imports
import KpiCards from './components/kpi-cards'
import { StrategicPositionMatrix, type StrategicMatrixPoint } from '@/components/ui/strategic-position-matrix'
import FactorsDistributionChart from './components/factors-distribution-chart'
import CameActionsChart from './components/came-actions-chart'
import RecentInvestigationsTable from './components/recent-investigations-table'
import InvestigationSummarySheet from '@/components/ui/investigation-summary-sheet'

// Type & Domain Imports
import type { InvestigationState } from '@/types/apps/investigator-types'
import { calculateAnalysis } from '@/utils/investigator/domain'

const InvestigatorDashboardContent = () => {
  const router = useRouter()
  const { t } = useI18n()
  const {
    investigations,
    syncStatus,
    openResearch
  } = useInvestigatorAnalysis()

  const [summaryInvestigation, setSummaryInvestigation] = useState<InvestigationState | null>(null)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  const strategicPoints = useMemo<Array<StrategicMatrixPoint & { rawItem: InvestigationState }>>(() => {
    return investigations.map(item => {
      const analysis = calculateAnalysis(item)

      return {
        id: item.metadata?.id || '',
        title: item.metadata?.title || 'Sin título',
        efi: Number((analysis?.efi?.total ?? 0).toFixed(2)),
        efe: Number((analysis?.efe?.total ?? 0).toFixed(2)),
        status: item.metadata?.status,
        rawItem: item
      }
    })
  }, [investigations])

  const handleOpenResearch = (research: Parameters<typeof openResearch>[0]) => {
    openResearch(research)
  }

  const handleShowSummary = (investigation: InvestigationState) => {
    setSummaryInvestigation(investigation)
    setIsSummaryOpen(true)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Dashboard Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5'>
        <div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold tracking-wider uppercase'>
              {t('dashboard.commandCenter')}
            </Badge>
            {syncStatus === 'synced' ? (
              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-medium'>
                <CloudCheckIcon className='mr-1 size-3' /> {t('dashboard.syncedCloud')}
              </Badge>
            ) : syncStatus === 'memory' ? (
              <Badge variant='outline' className='bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-medium'>
                <HardDriveIcon className='mr-1 size-3' /> {t('dashboard.demoLocal')}
              </Badge>
            ) : null}
          </div>
          <h1 className='font-heading text-2xl sm:text-3xl font-bold tracking-tight mt-1'>
            {t('dashboard.title')}
          </h1>
          <p className='text-muted-foreground text-sm mt-0.5'>
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* 1. KPI Metric Summary Cards */}
      <KpiCards investigations={investigations} />

      {/* 2. Visual Analytics Grid */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        {/* Left: Strategic Positioning Matrix (EFI vs EFE) */}
        <div className='lg:col-span-7 flex flex-col'>
          <StrategicPositionMatrix
            points={strategicPoints}
            onSelectPoint={point => {
              const item = (point as { rawItem?: InvestigationState }).rawItem || investigations.find(i => i.metadata?.id === point.id)
              if (item) handleShowSummary(item)
            }}
            className='h-full'
          />
        </div>

        {/* Right: Factors & CAME Distribution Charts */}
        <div className='lg:col-span-5 flex flex-col gap-6'>
          <FactorsDistributionChart investigations={investigations} />
          <CameActionsChart investigations={investigations} />
        </div>
      </div>

      {/* 3. Central Investigations Feed */}
      <RecentInvestigationsTable
        investigations={investigations}
        onOpenResearch={handleOpenResearch}
        onShowSummary={handleShowSummary}
      />

      {/* 4. Global Executive Summary & CAME Plan Sheet */}
      <InvestigationSummarySheet
        investigation={summaryInvestigation}
        open={isSummaryOpen}
        onOpenChange={setIsSummaryOpen}
        onOpenFull={inv => {
          handleOpenResearch(inv)
          router.push('/apps/investigator/context')
        }}
      />
    </div>
  )
}

export const InvestigatorDashboardView = () => {
  return (
    <Suspense fallback={null}>
      <InvestigatorAnalysisProvider>
        <InvestigatorDashboardContent />
      </InvestigatorAnalysisProvider>
    </Suspense>
  )
}

export default InvestigatorDashboardView
