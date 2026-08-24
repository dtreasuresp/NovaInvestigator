'use client'

import { useMemo } from 'react'
import { CompassIcon, InfoIcon } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Type Imports
import type { InvestigationState, Quadrant } from '@/types/apps/investigator-types'
import { calculateAnalysis } from '@/utils/investigator/domain'

interface PositioningMatrixProps {
  investigations: InvestigationState[]
  onSelectInvestigation?: (investigation: InvestigationState) => void
}

interface ScatterPoint {
  id: string
  title: string
  organization: string
  x: number // EFI Score (clamped for visualization)
  y: number // EFE Score (clamped for visualization)
  rawX: number
  rawY: number
  dominant: Quadrant
  status: string
  investigation: InvestigationState
}

const QUADRANT_COLORS: Record<Quadrant, string> = {
  FO: '#10b981',
  DO: '#f59e0b',
  FA: '#0ea5e9',
  DA: '#f43f5e'
}

interface MatrixTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ScatterPoint }>
}

const CustomTooltip = ({ active, payload }: MatrixTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className='bg-popover text-popover-foreground rounded-lg border p-3 shadow-md text-xs min-w-48 pointer-events-none select-none'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-semibold truncate max-w-36'>{data.title || data.id}</span>
        <Badge variant='outline' className='text-[10px] uppercase'>
          {data.dominant}
        </Badge>
      </div>
      <p className='text-muted-foreground mt-0.5'>{data.organization || 'Sin organización'}</p>
      <div className='mt-2.5 flex items-center justify-between border-t pt-2'>
        <span>EFI: <strong className='text-foreground'>{data.rawX.toFixed(2)}</strong></span>
        <span>EFE: <strong className='text-foreground'>{data.rawY.toFixed(2)}</strong></span>
      </div>
      <p className='text-muted-foreground mt-1 text-[11px] capitalize'>{data.status}</p>
    </div>
  )
}

export const PositioningMatrix = ({
  investigations,
  onSelectInvestigation
}: PositioningMatrixProps) => {
  const { t } = useI18n()

  const points: ScatterPoint[] = useMemo(() => {
    return investigations.map(item => {
      const analysis = calculateAnalysis(item)
      const rawEfi = analysis?.efi?.total ?? 0
      const rawEfe = analysis?.efe?.total ?? 0

      // Clamp between 1.0 and 4.0 for standard strategic chart scaling
      const efiScore = Math.max(1.0, Math.min(4.0, rawEfi || 1.0))
      const efeScore = Math.max(1.0, Math.min(4.0, rawEfe || 1.0))

      const dominant: Quadrant =
        analysis?.relations?.dominant ||
        (rawEfi > 2.5 ? (rawEfe > 2.5 ? 'FO' : 'FA') : (rawEfe > 2.5 ? 'DO' : 'DA'))

      return {
        id: item.metadata.id,
        title: item.metadata.title || item.metadata.id,
        organization: item.metadata.organization || '',
        x: efiScore,
        y: efeScore,
        rawX: rawEfi,
        rawY: rawEfe,
        dominant,
        status: item.metadata.status || 'borrador',
        investigation: item
      }
    })
  }, [investigations])

  return (
    <Card className='border-border/60 shadow-xs flex flex-col h-full'>
      <CardHeader className='pb-2'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
              <CompassIcon className='size-4' />
            </div>
            <div>
              <CardTitle className='text-base font-semibold'>
                {t('dashboard.positioningMatrixTitle')}
              </CardTitle>
              <CardDescription className='text-xs'>
                {t('dashboard.positioningMatrixSubtitle')}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 pb-4'>
        <div className='relative h-80 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <ScatterChart margin={{ top: 15, right: 25, bottom: 30, left: 15 }}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border/40' />

              {/* Quadrant background zones with centered non-colliding labels */}
              {/* Quadrant II: DO (Adaptativo) - Top Left */}
              <ReferenceArea
                x1={1.0}
                x2={2.5}
                y1={2.5}
                y2={4.0}
                fill='#f59e0b'
                fillOpacity={0.04}
                label={{
                  value: `II · DO ${t('investigator.reorientation').toUpperCase()}`,
                  position: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: '#d97706',
                  opacity: 0.55
                }}
              />

              {/* Quadrant I: FO (Ofensivo) - Top Right */}
              <ReferenceArea
                x1={2.5}
                x2={4.0}
                y1={2.5}
                y2={4.0}
                fill='#10b981'
                fillOpacity={0.04}
                label={{
                  value: `I · FO ${t('investigator.offensive').toUpperCase()}`,
                  position: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: '#059669',
                  opacity: 0.55
                }}
              />

              {/* Quadrant IV: DA (Supervivencia) - Bottom Left */}
              <ReferenceArea
                x1={1.0}
                x2={2.5}
                y1={1.0}
                y2={2.5}
                fill='#f43f5e'
                fillOpacity={0.04}
                label={{
                  value: `IV · DA ${t('investigator.survival').toUpperCase()}`,
                  position: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: '#e11d48',
                  opacity: 0.55
                }}
              />

              {/* Quadrant III: FA (Defensivo) - Bottom Right */}
              <ReferenceArea
                x1={2.5}
                x2={4.0}
                y1={1.0}
                y2={2.5}
                fill='#0ea5e9'
                fillOpacity={0.04}
                label={{
                  value: `III · FA ${t('investigator.defensive').toUpperCase()}`,
                  position: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  fill: '#0284c7',
                  opacity: 0.55
                }}
              />

              {/* X Axis with explicit 1.0 to 4.0 domain and clean step ticks */}
              <XAxis
                type='number'
                dataKey='x'
                name='EFI'
                domain={[1.0, 4.0]}
                ticks={[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]}
                tickFormatter={(val: number) => val.toFixed(1)}
                className='text-[10px]'
                tick={{ fill: 'currentColor', fontSize: 10 }}
                label={{
                  value: 'EFI (1.00 - 4.00)',
                  position: 'insideBottom',
                  offset: -18,
                  fontSize: 11,
                  fill: 'currentColor',
                  opacity: 0.7
                }}
              />

              {/* Y Axis with explicit 1.0 to 4.0 domain and clean step ticks */}
              <YAxis
                type='number'
                dataKey='y'
                name='EFE'
                domain={[1.0, 4.0]}
                ticks={[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]}
                tickFormatter={(val: number) => val.toFixed(1)}
                className='text-[10px]'
                tick={{ fill: 'currentColor', fontSize: 10 }}
                label={{
                  value: 'EFE (1.00 - 4.00)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0,
                  fontSize: 11,
                  fill: 'currentColor',
                  opacity: 0.7
                }}
              />

              {/* Methodological 2.50 Threshold Lines */}
              <ReferenceLine
                x={2.5}
                stroke='#64748b'
                strokeDasharray='4 4'
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              <ReferenceLine
                y={2.5}
                stroke='#64748b'
                strokeDasharray='4 4'
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />

              <Tooltip
                content={<CustomTooltip />}
                offset={10}
                isAnimationActive={false}
                wrapperStyle={{ pointerEvents: 'none' }}
              />

              <Scatter
                name={t('dashboard.totalInvestigations')}
                data={points}
                cursor='pointer'
                onClick={(entry: unknown) => {
                  const point = entry as { investigation?: InvestigationState; payload?: { investigation?: InvestigationState } } | undefined
                  const inv = point?.investigation || point?.payload?.investigation
                  if (inv) onSelectInvestigation?.(inv)
                }}
              >
                {points.map(entry => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={QUADRANT_COLORS[entry.dominant] || '#6366f1'}
                    stroke='#ffffff'
                    strokeWidth={2}
                    className='transition-opacity duration-150 hover:opacity-80'
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className='text-muted-foreground mt-2 flex items-center justify-between text-xs border-t pt-3'>
          <div className='flex items-center gap-1 text-xs'>
            <InfoIcon className='size-3.5 text-muted-foreground' />
            <span>{t('dashboard.clickPointHint')}</span>
          </div>
          <span className='font-medium'>{points.length} {points.length === 1 ? 'item' : 'items'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default PositioningMatrix
