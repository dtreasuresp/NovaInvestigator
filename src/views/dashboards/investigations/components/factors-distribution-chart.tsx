'use client'

// React & Lucide Imports
import { BarChart2Icon, PieChartIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps
} from 'recharts'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { InvestigationState } from '@/types/apps/investigator-types'

interface FactorsDistributionProps {
  investigations: InvestigationState[]
}

interface FactorStat {
  key: string
  label: string
  count: number
  avgWeight: number
  color: string
}

interface FactorTooltipProps {
  active?: boolean
  payload?: Array<{ payload: FactorStat }>
}

const CustomTooltip = ({ active, payload }: FactorTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className='bg-popover text-popover-foreground rounded-lg border p-2.5 shadow-md text-xs'>
      <p className='font-semibold'>{data.label}</p>
      <div className='mt-1 flex flex-col gap-0.5 text-muted-foreground'>
        <span>Total: <strong className='text-foreground'>{data.count}</strong></span>
        <span>Ponderación: <strong className='text-foreground'>{((data.avgWeight || 0) * 100).toFixed(1)}%</strong></span>
      </div>
    </div>
  )
}

export const FactorsDistributionChart = ({ investigations }: FactorsDistributionProps) => {
  const { t } = useI18n()
  let fCount = 0
  let dCount = 0
  let oCount = 0
  let aCount = 0

  let fWeight = 0
  let dWeight = 0
  let oWeight = 0
  let aWeight = 0

  investigations.forEach(inv => {
    inv.internal?.forEach(f => {
      if (f.type === 'F') {
        fCount += 1
        fWeight += f.weight || 0
      } else if (f.type === 'D') {
        dCount += 1
        dWeight += f.weight || 0
      }
    })

    inv.external?.forEach(f => {
      if (f.type === 'O') {
        oCount += 1
        oWeight += f.weight || 0
      } else if (f.type === 'A') {
        aCount += 1
        aWeight += f.weight || 0
      }
    })
  })

  const chartData: FactorStat[] = [
    {
      key: 'F',
      label: `${t('investigator.strengths')} (F)`,
      count: fCount,
      avgWeight: fCount > 0 ? fWeight / fCount : 0,
      color: '#10b981'
    },
    {
      key: 'D',
      label: `${t('investigator.weaknesses')} (D)`,
      count: dCount,
      avgWeight: dCount > 0 ? dWeight / dCount : 0,
      color: '#f43f5e'
    },
    {
      key: 'O',
      label: `${t('investigator.opportunities')} (O)`,
      count: oCount,
      avgWeight: oCount > 0 ? oWeight / oCount : 0,
      color: '#0ea5e9'
    },
    {
      key: 'A',
      label: `${t('investigator.threats')} (A)`,
      count: aCount,
      avgWeight: aCount > 0 ? aWeight / aCount : 0,
      color: '#f59e0b'
    }
  ]

  const internalBalance = fCount + dCount > 0 ? Math.round((fCount / (fCount + dCount)) * 100) : 50
  const externalBalance = oCount + aCount > 0 ? Math.round((oCount / (oCount + aCount)) * 100) : 50

  return (
    <Card className='border-border/60 shadow-xs flex flex-col'>
      <CardHeader className='pb-2'>
        <div className='flex items-center gap-2'>
          <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
            <BarChart2Icon className='size-4' />
          </div>
          <div>
            <CardTitle className='text-base font-semibold'>{t('dashboard.factorsBalanceTitle')}</CardTitle>
            <CardDescription className='text-xs'>
              {t('dashboard.factorsBalanceSubtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 pb-4'>
        <div className='h-52 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/40' vertical={false} />
              <XAxis dataKey='key' className='text-[11px] font-semibold' tick={{ fill: 'currentColor' }} />
              <YAxis className='text-[10px]' allowDecimals={false} tick={{ fill: 'currentColor' }} />
              <Tooltip
                content={<CustomTooltip />}
                offset={5}
              />
              <Bar dataKey='count' radius={[6, 6, 0, 0]}>
                {chartData.map(entry => (
                  <Cell key={`cell-${entry.key}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Balance metrics */}
        <div className='mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs'>
          <div className='flex flex-col gap-1'>
            <div className='flex justify-between text-muted-foreground'>
              <span>{t('dashboard.internalBalance')}:</span>
              <strong className='text-foreground'>{internalBalance}% F</strong>
            </div>
            <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
              <div className='bg-emerald-500 h-full' style={{ width: `${internalBalance}%` }} />
            </div>
          </div>

          <div className='flex flex-col gap-1'>
            <div className='flex justify-between text-muted-foreground'>
              <span>{t('dashboard.externalBalance')}:</span>
              <strong className='text-foreground'>{externalBalance}% O</strong>
            </div>
            <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
              <div className='bg-sky-500 h-full' style={{ width: `${externalBalance}%` }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FactorsDistributionChart
