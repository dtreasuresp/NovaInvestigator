'use client'

// React & Lucide Imports
import { CheckSquareIcon, ListTodoIcon } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps
} from 'recharts'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

import type { InvestigationState } from '@/types/apps/investigator-types'
import { calculateCame } from '@/utils/investigator/domain'

interface CameActionsChartProps {
  investigations: InvestigationState[]
}

interface ActionSlice {
  name: string
  key: string
  count: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ActionSlice }>
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className='bg-popover text-popover-foreground rounded-lg border p-2.5 shadow-md text-xs'>
      <p className='font-semibold'>{data.name}</p>
      <p className='text-muted-foreground mt-0.5'>
        Total: <strong className='text-foreground'>{data.count}</strong>
      </p>
    </div>
  )
}

export const CameActionsChart = ({ investigations }: CameActionsChartProps) => {
  const { t } = useI18n()
  let cCount = 0
  let aCount = 0
  let mCount = 0
  let eCount = 0

  let highPriority = 0
  let mediumPriority = 0
  let lowPriority = 0

  let totalActions = 0
  let completedActions = 0

  investigations.forEach(inv => {
    const cameResult = calculateCame(inv.cameActions || [], inv.cameCriteria || [])
    cameResult.actions.forEach(action => {
      totalActions += 1

      if (action.type === 'C') cCount += 1
      else if (action.type === 'A') aCount += 1
      else if (action.type === 'M') mCount += 1
      else if (action.type === 'E') eCount += 1

      if (action.category === 'alta' || action.category === 'critica') highPriority += 1
      else if (action.category === 'media') mediumPriority += 1
      else if (action.category === 'baja') lowPriority += 1

      if (action.status === 'completada') {
        completedActions += 1
      }
    })
  })

  const chartData: ActionSlice[] = [
    { key: 'C', name: t('dashboard.correct'), count: cCount, color: '#f43f5e' },
    { key: 'A', name: t('dashboard.cope'), count: aCount, color: '#f59e0b' },
    { key: 'M', name: t('dashboard.maintain'), count: mCount, color: '#10b981' },
    { key: 'E', name: t('dashboard.exploit'), count: eCount, color: '#0ea5e9' }
  ].filter(item => item.count > 0)

  return (
    <Card className='border-border/60 shadow-xs flex flex-col'>
      <CardHeader className='pb-2'>
        <div className='flex items-center gap-2'>
          <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
            <ListTodoIcon className='size-4' />
          </div>
          <div>
            <CardTitle className='text-base font-semibold'>{t('dashboard.camePlanTitle')}</CardTitle>
            <CardDescription className='text-xs'>
              {t('dashboard.camePlanSubtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 pb-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='h-52 w-48 relative'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Tooltip
                  content={<CustomTooltip />}
                  offset={5}
                />
                <Pie
                  data={chartData.length > 0 ? chartData : [{ name: t('dashboard.noCameActions'), count: 1, color: '#cbd5e1' }]}
                  dataKey='count'
                  nameKey='name'
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {(chartData.length > 0 ? chartData : [{ color: '#cbd5e1' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <span className='font-heading text-xl font-bold'>{totalActions}</span>
              <span className='text-muted-foreground text-[10px] uppercase'>{t('investigator.came')}</span>
            </div>
          </div>

          {/* Type breakdown badges */}
          <div className='flex flex-1 flex-col gap-2 text-xs'>
            <div className='flex items-center justify-between border-b pb-1'>
              <span className='flex items-center gap-1.5 font-medium'>
                <span className='size-2 rounded-full bg-rose-500' /> {t('dashboard.correct')}
              </span>
              <span className='font-semibold'>{cCount}</span>
            </div>
            <div className='flex items-center justify-between border-b pb-1'>
              <span className='flex items-center gap-1.5 font-medium'>
                <span className='size-2 rounded-full bg-amber-500' /> {t('dashboard.cope')}
              </span>
              <span className='font-semibold'>{aCount}</span>
            </div>
            <div className='flex items-center justify-between border-b pb-1'>
              <span className='flex items-center gap-1.5 font-medium'>
                <span className='size-2 rounded-full bg-emerald-500' /> {t('dashboard.maintain')}
              </span>
              <span className='font-semibold'>{mCount}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1.5 font-medium'>
                <span className='size-2 rounded-full bg-sky-500' /> {t('dashboard.exploit')}
              </span>
              <span className='font-semibold'>{eCount}</span>
            </div>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className='mt-3 flex items-center justify-between border-t pt-3 text-xs'>
          <span className='text-muted-foreground font-medium'>{t('dashboard.priorities')}:</span>
          <div className='flex gap-1.5'>
            <Badge variant='outline' className='bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]'>
              {highPriority} {t('dashboard.high')}
            </Badge>
            <Badge variant='outline' className='bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'>
              {mediumPriority} {t('dashboard.medium')}
            </Badge>
            <Badge variant='outline' className='bg-slate-500/10 text-slate-600 border-slate-500/20 text-[10px]'>
              {lowPriority} {t('dashboard.low')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CameActionsChart
