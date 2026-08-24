'use client'

// React & Lucide Imports
import {
  ActivityIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  FileSpreadsheetIcon,
  LayersIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  ZapIcon
} from 'lucide-react'

// Component Imports
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { InvestigationState } from '@/types/apps/investigator-types'
import { calculateAnalysis } from '@/utils/investigator/domain'

interface KpiCardsProps {
  investigations: InvestigationState[]
}

export const KpiCards = ({ investigations }: KpiCardsProps) => {
  const { t } = useI18n()
  const total = investigations.length
  const validated = investigations.filter(item => item.metadata.status === 'validada' || item.metadata.validation === 'validada').length
  const inProgress = investigations.filter(item => item.metadata.status !== 'validada' && !item.metadata.archivedAt).length
  const archived = investigations.filter(item => Boolean(item.metadata.archivedAt)).length

  // Calculate aggregate metrics across all active investigations
  const analyses = investigations.map(item => calculateAnalysis(item))

  const avgEfi =
    analyses.length > 0
      ? Number((analyses.reduce((acc, a) => acc + (a?.efi?.total ?? 0), 0) / analyses.length).toFixed(2))
      : 0

  const avgEfe =
    analyses.length > 0
      ? Number((analyses.reduce((acc, a) => acc + (a?.efe?.total ?? 0), 0) / analyses.length).toFixed(2))
      : 0

  const totalFactors = investigations.reduce(
    (acc, item) => acc + (item.internal?.length || 0) + (item.external?.length || 0),
    0
  )

  const totalRelations = investigations.reduce(
    (acc, item) => acc + (item.relationships?.length || 0),
    0
  )

  const totalCameActions = investigations.reduce(
    (acc, item) => acc + (item.cameActions?.length || 0),
    0
  )

  const completedCameActions = investigations.reduce(
    (acc, item) =>
      acc + (item.cameActions?.filter(action => action.status === 'completada')?.length || 0),
    0
  )

  const cameCompletionRate =
    totalCameActions > 0 ? Math.round((completedCameActions / totalCameActions) * 100) : 0

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {/* Total Expedientes */}
      <Card className='relative overflow-hidden border-border/60 shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('dashboard.totalInvestigations')}
          </CardTitle>
          <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
            <FileSpreadsheetIcon className='size-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <div className='font-heading text-2xl font-bold tracking-tight'>{total}</div>
            <div className='flex items-center gap-1.5'>
              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-medium'>
                {validated} {t('dashboard.closedInvestigations').toLowerCase()}
              </Badge>
            </div>
          </div>
          <div className='text-muted-foreground mt-2 flex items-center justify-between text-xs'>
            <span>{inProgress} {t('dashboard.inAnalysis')}</span>
            <span>{archived} {t('dashboard.archivedCount')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Salud Interna (EFI) */}
      <Card className='relative overflow-hidden border-border/60 shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('dashboard.internalHealth')}
          </CardTitle>
          <div className={`flex size-8 items-center justify-center rounded-lg ${avgEfi >= 2.5 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {avgEfi >= 2.5 ? <ShieldCheckIcon className='size-4' /> : <ShieldAlertIcon className='size-4' />}
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <div className='font-heading text-2xl font-bold tracking-tight'>
              {avgEfi > 0 ? avgEfi.toFixed(2) : '—'}
              <span className='text-muted-foreground ml-1 text-xs font-normal'>/ 4.00</span>
            </div>
            <Badge variant='outline' className={avgEfi >= 2.5 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
              {avgEfi >= 2.5 ? `${t('dashboard.strong')} (>2.5)` : `${t('dashboard.vulnerable')} (≤2.5)`}
            </Badge>
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('dashboard.internalHealthDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Respuesta al Entorno (EFE) */}
      <Card className='relative overflow-hidden border-border/60 shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('dashboard.externalResponse')}
          </CardTitle>
          <div className={`flex size-8 items-center justify-center rounded-lg ${avgEfe >= 2.5 ? 'bg-sky-500/10 text-sky-600' : 'bg-rose-500/10 text-rose-600'}`}>
            <TrendingUpIcon className='size-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <div className='font-heading text-2xl font-bold tracking-tight'>
              {avgEfe > 0 ? avgEfe.toFixed(2) : '—'}
              <span className='text-muted-foreground ml-1 text-xs font-normal'>/ 4.00</span>
            </div>
            <Badge variant='outline' className={avgEfe >= 2.5 ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}>
              {avgEfe >= 2.5 ? `${t('dashboard.favorable')} (>2.5)` : `${t('dashboard.adverse')} (≤2.5)`}
            </Badge>
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('dashboard.externalResponseDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Factores & Acciones CAME */}
      <Card className='relative overflow-hidden border-border/60 shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('dashboard.actionsAndFactors')}
          </CardTitle>
          <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
            <ZapIcon className='size-4' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <div className='font-heading text-2xl font-bold tracking-tight'>{totalCameActions}</div>
            <Badge variant='outline' className='bg-purple-500/10 text-purple-600 border-purple-500/20 text-[11px] font-medium'>
              {cameCompletionRate}%
            </Badge>
          </div>
          <div className='text-muted-foreground mt-2 flex items-center justify-between text-xs'>
            <span>{totalFactors} {t('dashboard.dafoFactorsCount')}</span>
            <span>{totalRelations} {t('dashboard.crossingsCount')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default KpiCards
