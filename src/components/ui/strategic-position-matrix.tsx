'use client'

// React Imports
import React, { useId, useMemo, useState } from 'react'

// Icon Imports
import { Compass, Info } from 'lucide-react'

// Util Imports
import { cn } from '@/lib/utils'

export interface StrategicMatrixPoint {
  id: string
  title: string
  efi: number
  efe: number
  status?: string
  date?: string
  color?: string
}

export interface StrategicPositionMatrixProps {
  points: StrategicMatrixPoint[]
  activeId?: string
  threshold?: number
  title?: string
  subtitle?: string
  onSelectPoint?: (point: StrategicMatrixPoint) => void
  showFooter?: boolean
  footerHint?: string
  className?: string
}

export const StrategicPositionMatrix: React.FC<StrategicPositionMatrixProps> = ({
  points = [],
  activeId,
  threshold = 2.5,
  title = 'Matriz de Posicionamiento Estratégico',
  subtitle = 'Distribución de los cuadrantes metodológicos (umbral: 2.50)',
  onSelectPoint,
  showFooter = true,
  footerHint,
  className
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<StrategicMatrixPoint | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const chartId = useId()

  // Dimensions & Margins
  const width = 640
  const height = 380
  const padding = { top: 30, right: 30, bottom: 50, left: 55 }

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Min and Max scale bounds
  const minVal = 1.0
  const maxVal = 4.0
  const valRange = maxVal - minVal

  // Scale functions (domain [1.0, 4.0] -> range [0, plotWidth/plotHeight])
  const getX = (val: number) => {
    const clamped = Math.min(Math.max(val, minVal), maxVal)

    return padding.left + ((clamped - minVal) / valRange) * plotWidth
  }

  const getY = (val: number) => {
    const clamped = Math.min(Math.max(val, minVal), maxVal)

    // Invert Y coordinate so 4.0 is top and 1.0 is bottom
    return padding.top + (1 - (clamped - minVal) / valRange) * plotHeight
  }

  const thresholdX = getX(threshold)
  const thresholdY = getY(threshold)

  // Axis grid ticks
  const ticks = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]

  // Quadrant information helper
  const getQuadrantInfo = (efi: number, efe: number) => {
    if (efi >= threshold && efe >= threshold) {
      return { code: 'FO', name: 'Ofensiva', roman: 'I', color: '#10b981', textColor: 'text-emerald-500' }
    }

    if (efi < threshold && efe >= threshold) {
      return { code: 'DO', name: 'Reorientación', roman: 'II', color: '#f59e0b', textColor: 'text-amber-500' }
    }

    if (efi >= threshold && efe < threshold) {
      return { code: 'FA', name: 'Defensiva', roman: 'III', color: '#0ea5e9', textColor: 'text-sky-500' }
    }

    return { code: 'DA', name: 'Supervivencia', roman: 'IV', color: '#f43f5e', textColor: 'text-rose-500' }
  }

  const validPoints = useMemo(() => {
    return points.filter(p => typeof p.efi === 'number' && !isNaN(p.efi) && typeof p.efe === 'number' && !isNaN(p.efe))
  }, [points])

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className='flex items-start gap-3.5 mb-2'>
        <div className='p-2 rounded-xl bg-muted/60 text-foreground border border-border/60 shrink-0'>
          <Compass className='size-5 text-foreground/80' />
        </div>
        <div className='space-y-0.5 min-w-0'>
          <h3 className='font-bold text-base sm:text-lg text-foreground tracking-tight'>{title}</h3>
          <p className='text-xs text-muted-foreground'>{subtitle}</p>
        </div>
      </div>

      {/* SVG Plot Container */}
      <div className='relative w-full overflow-hidden' style={{ aspectRatio: '640 / 380' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className='w-full h-full select-none'
          role='img'
          aria-label='Gráfico de Matriz de Posicionamiento Estratégico EFI vs EFE'
        >
          <defs>
            {/* Gradients for Quadrants */}
            <linearGradient id={`grad-fo-${chartId}`} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor='#10b981' stopOpacity='0.08' />
              <stop offset='100%' stopColor='#10b981' stopOpacity='0.02' />
            </linearGradient>
            <linearGradient id={`grad-do-${chartId}`} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor='#f59e0b' stopOpacity='0.08' />
              <stop offset='100%' stopColor='#f59e0b' stopOpacity='0.02' />
            </linearGradient>
            <linearGradient id={`grad-fa-${chartId}`} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor='#0ea5e9' stopOpacity='0.08' />
              <stop offset='100%' stopColor='#0ea5e9' stopOpacity='0.02' />
            </linearGradient>
            <linearGradient id={`grad-da-${chartId}`} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor='#f43f5e' stopOpacity='0.08' />
              <stop offset='100%' stopColor='#f43f5e' stopOpacity='0.02' />
            </linearGradient>

            {/* Glowing Drop Shadows for Points */}
            <filter id={`glow-${chartId}`} x='-50%' y='-50%' width='200%' height='200%'>
              <feDropShadow dx='0' dy='0' stdDeviation='3' floodColor='#f59e0b' floodOpacity='0.7' />
            </filter>
            <filter id={`shadow-point-${chartId}`} x='-50%' y='-50%' width='200%' height='200%'>
              <feDropShadow dx='0' dy='1.5' stdDeviation='1.5' floodColor='#000000' floodOpacity='0.3' />
            </filter>
          </defs>

          {/* Quadrant Background Fills */}
          {/* Quadrant II: DO (Top-Left) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={thresholdX - padding.left}
            height={thresholdY - padding.top}
            fill={`url(#grad-do-${chartId})`}
            rx='4'
          />
          {/* Quadrant I: FO (Top-Right) */}
          <rect
            x={thresholdX}
            y={padding.top}
            width={width - padding.right - thresholdX}
            height={thresholdY - padding.top}
            fill={`url(#grad-fo-${chartId})`}
            rx='4'
          />
          {/* Quadrant IV: DA (Bottom-Left) */}
          <rect
            x={padding.left}
            y={thresholdY}
            width={thresholdX - padding.left}
            height={height - padding.bottom - thresholdY}
            fill={`url(#grad-da-${chartId})`}
            rx='4'
          />
          {/* Quadrant III: FA (Bottom-Right) */}
          <rect
            x={thresholdX}
            y={thresholdY}
            width={width - padding.right - thresholdX}
            height={height - padding.bottom - thresholdY}
            fill={`url(#grad-fa-${chartId})`}
            rx='4'
          />

          {/* Grid Lines */}
          {ticks.map(tick => {
            const x = getX(tick)
            const y = getY(tick)

            return (
              <React.Fragment key={`grid-${tick}`}>
                {/* Vertical Grid Line */}
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke='currentColor'
                  strokeOpacity='0.08'
                  strokeWidth='1'
                />
                {/* Horizontal Grid Line */}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke='currentColor'
                  strokeOpacity='0.08'
                  strokeWidth='1'
                />
              </React.Fragment>
            )
          })}

          {/* Threshold Dashed Dividers (Umbral 2.50) */}
          {/* Vertical Threshold (EFI = 2.50) */}
          <line
            x1={thresholdX}
            y1={padding.top}
            x2={thresholdX}
            y2={height - padding.bottom}
            stroke='currentColor'
            strokeOpacity='0.45'
            strokeWidth='1.5'
            strokeDasharray='4 4'
          />
          {/* Horizontal Threshold (EFE = 2.50) */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke='currentColor'
            strokeOpacity='0.45'
            strokeWidth='1.5'
            strokeDasharray='4 4'
          />

          {/* Outer Border for Plot Area */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill='none'
            stroke='currentColor'
            strokeOpacity='0.25'
            strokeWidth='1.5'
          />

          {/* Quadrant Text Labels (Centered in each quadrant) */}
          {/* Quadrant II: DO */}
          <text
            x={padding.left + (thresholdX - padding.left) / 2}
            y={padding.top + (thresholdY - padding.top) / 2}
            textAnchor='middle'
            dominantBaseline='central'
            fill='#f59e0b'
            className='font-bold text-xs tracking-wider font-sans'
            fillOpacity='0.85'
          >
            II · DO REORIENTACIÓN (DO)
          </text>

          {/* Quadrant I: FO */}
          <text
            x={thresholdX + (width - padding.right - thresholdX) / 2}
            y={padding.top + (thresholdY - padding.top) / 2}
            textAnchor='middle'
            dominantBaseline='central'
            fill='#10b981'
            className='font-bold text-xs tracking-wider font-sans'
            fillOpacity='0.85'
          >
            I · FO OFENSIVA (FO)
          </text>

          {/* Quadrant IV: DA */}
          <text
            x={padding.left + (thresholdX - padding.left) / 2}
            y={thresholdY + (height - padding.bottom - thresholdY) / 2}
            textAnchor='middle'
            dominantBaseline='central'
            fill='#f43f5e'
            className='font-bold text-xs tracking-wider font-sans'
            fillOpacity='0.85'
          >
            IV · DA SUPERVIVENCIA (DA)
          </text>

          {/* Quadrant III: FA */}
          <text
            x={thresholdX + (width - padding.right - thresholdX) / 2}
            y={thresholdY + (height - padding.bottom - thresholdY) / 2}
            textAnchor='middle'
            dominantBaseline='central'
            fill='#0ea5e9'
            className='font-bold text-xs tracking-wider font-sans'
            fillOpacity='0.85'
          >
            III · FA DEFENSIVA (FA)
          </text>

          {/* X-Axis Tick Labels (Bottom) */}
          {ticks.map(tick => {
            const x = getX(tick)

            return (
              <text
                key={`tick-x-${tick}`}
                x={x}
                y={height - padding.bottom + 18}
                textAnchor='middle'
                className='text-xs font-mono font-medium fill-muted-foreground'
              >
                {tick.toFixed(1)}
              </text>
            )
          })}

          {/* Y-Axis Tick Labels (Left) */}
          {ticks.map(tick => {
            const y = getY(tick)

            return (
              <text
                key={`tick-y-${tick}`}
                x={padding.left - 10}
                y={y + 4}
                textAnchor='end'
                className='text-xs font-mono font-medium fill-muted-foreground'
              >
                {tick.toFixed(1)}
              </text>
            )
          })}

          {/* Axis Titles */}
          {/* X-Axis Title */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 10}
            textAnchor='middle'
            className='text-xs font-semibold tracking-wide fill-muted-foreground font-sans'
          >
            EFI (1.00 - 4.00)
          </text>

          {/* Y-Axis Title (Rotated) */}
          <text
            transform={`rotate(-90)`}
            x={-(padding.top + plotHeight / 2)}
            y={16}
            textAnchor='middle'
            className='text-xs font-semibold tracking-wide fill-muted-foreground font-sans'
          >
            EFE (1.00 - 4.00)
          </text>

          {/* Data Points Layer */}
          {validPoints.map(point => {
            const cx = getX(point.efi)
            const cy = getY(point.efe)
            const isActive = activeId ? point.id === activeId : true
            const isHovered = hoveredPoint?.id === point.id
            const qInfo = getQuadrantInfo(point.efi, point.efe)

            return (
              <g
                key={point.id}
                className='cursor-pointer transition-transform'
                onClick={() => onSelectPoint && onSelectPoint(point)}
                onMouseEnter={e => {
                  setHoveredPoint(point)
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top })
                }}
                onMouseLeave={() => {
                  setHoveredPoint(null)
                  setTooltipPos(null)
                }}
              >
                {/* Active Pulse Ring */}
                {(isActive || isHovered) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 14 : 10}
                    fill={qInfo.color}
                    fillOpacity='0.25'
                    className='animate-pulse'
                  />
                )}

                {/* Outer White Glow Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7.5 : 6}
                  fill='#ffffff'
                  stroke='#09090b'
                  strokeWidth='1.5'
                  filter={isHovered ? `url(#glow-${chartId})` : `url(#shadow-point-${chartId})`}
                />

                {/* Inner Core Point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : 3.5}
                  fill={point.color || qInfo.color}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Floating Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          className='pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm space-y-1'
          style={{
            left: `${getX(hoveredPoint.efi) / (width / 100)}%`,
            top: `${(getY(hoveredPoint.efe) - 14) / (height / 100)}%`
          }}
        >
          <p className='font-bold text-foreground truncate max-w-56 text-xs'>{hoveredPoint.title}</p>
          <div className='flex items-center gap-2 text-xs font-mono'>
            <span className='text-muted-foreground'>
              EFI: <strong className='text-foreground'>{hoveredPoint.efi.toFixed(2)}</strong>
            </span>
            <span>·</span>
            <span className='text-muted-foreground'>
              EFE: <strong className='text-foreground'>{hoveredPoint.efe.toFixed(2)}</strong>
            </span>
          </div>
          <div className='text-xs font-semibold'>
            {(() => {
              const q = getQuadrantInfo(hoveredPoint.efi, hoveredPoint.efe)

              return (
                <span className={q.textColor}>
                  Cuadrante {q.roman} · {q.code} ({q.name})
                </span>
              )
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className='flex items-center justify-between pt-3 mt-1 border-t border-border/60 text-xs text-muted-foreground'>
          <div className='flex items-center gap-1.5'>
            <Info className='size-3.5 shrink-0' />
            <span>{footerHint || 'Haz clic en cualquier punto para abrir el expediente completo'}</span>
          </div>
          <span className='font-mono font-medium text-foreground/80'>
            {validPoints.length} {validPoints.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      )}
    </div>
  )
}

export default StrategicPositionMatrix
