// SVG inline para el reporte PDF. Sin dependencias: geometría Vectoriala manual
// sobre chartData del modelo de reporte.

import type { Quadrant } from '@/types/apps/investigator-types'
import type { ReportModel } from '@/types/apps/investigator-types'

const COLORS = ['#087f78', '#c28a2c', '#4d7891', '#b25d38']

const QUADRANT_LABELS: Record<Quadrant, string> = {
  FO: 'FO · Crecer',
  DO: 'DO · Mejorar',
  FA: 'FA · Defender',
  DA: 'DA · Sobrevivir'
}

const average = (values: number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

const el = (tag: string, attrs: Record<string, string | number>, children = ''): string => {
  const body = Object.entries(attrs)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ')

  return `<${tag} ${body}>${children}</${tag}>`
}

const svgWrap = (width: number, height: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico del informe">${body}</svg>`

export function renderRadarSvg(chartData: ReportModel['chartData']): string {
  const radius = 78
  const width = 260
  const height = 210
  const centerX = width / 2 + 20
  const centerY = height / 2 + 6
  const labels = ['Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas']

  const values = [
    average(chartData.fortalezas.map(f => f.puntaje)),
    average(chartData.debilidades.map(f => f.puntaje)),
    average(chartData.oportunidades.map(f => f.puntaje)),
    average(chartData.amenazas.map(f => f.puntaje))
  ]

  const angles = labels.map((_, index) => (index / labels.length) * Math.PI * 2 - Math.PI / 2)

  const point = (angle: number, ratio: number): [number, number] => [
    centerX + Math.cos(angle) * radius * ratio,
    centerY + Math.sin(angle) * radius * ratio
  ]

  const grid = [0.25, 0.5, 0.75, 1]
    .map(mesh =>
      el(
        'polygon',
        {
          points: angles.map(angle => point(angle, mesh).join(',')).join(' '),
          fill: 'none',
          stroke: '#d6e1de',
          'stroke-width': 1
        }
      )
    )
    .join('')

  const axes = angles
    .map((angle, i) => {
      const [x, y] = point(angle, 1)

      return `${el('line', { x1: centerX, y1: centerY, x2: x, y2: y, stroke: '#d6e1de', 'stroke-width': 1 })}
      ${el(
        'text',
        { x: point(angle, 1.16)[0], y: point(angle, 1.16)[1], 'text-anchor': 'middle', 'font-size': 9, fill: '#53676b' },
        labels[i]
      )}`
    })
    .join('')

  const polygon = el(
    'polygon',
    {
      points: angles.map((angle, i) => point(angle, Math.max(values[i] / 4, 0.08)).join(',')).join(' '),
      fill: '#087f78',
      'fill-opacity': 0.25,
      stroke: '#087f78',
      'stroke-width': 1.5
    }
  )

  const dots = angles
    .map((angle, i) => {
      const [x, y] = point(angle, Math.max(values[i] / 4, 0.08))

      return `${el('circle', { cx: x, cy: y, r: 2.5, fill: COLORS[i] })}
      ${el('text', { x: x + 6, y: y - 4, 'font-size': 8, fill: COLORS[i] }, values[i].toFixed(2))}`
    })
    .join('')

  const text = el(
    'text',
    { x: width - 20, y: 14, 'text-anchor': 'end', 'font-size': 8, fill: '#68777a' },
    'Escala 0–4 · promedio por grupo'
  )

  return svgWrap(width, height, `${text}${axes}${grid}${polygon}${dots}`)
}

export function renderBarsSvg(dafo: Record<Quadrant, number>): string {
  const width = 260
  const height = 210
  const base = 176
  const left = 8
  const barWidth = 32
  const gap = 18
  const maxValue = Math.max(...Object.values(dafo), 1)

  const bars = (Object.keys(dafo) as Quadrant[])
    .map((quadrant, i) => {
      const value = dafo[quadrant]
      const barHeight = Math.max((value / maxValue) * 150, 2)
      const x = left + i * (gap + barWidth)

      return `${el('rect', { x, y: base - barHeight, width: barWidth, height: barHeight, fill: COLORS[i] })}
        ${el(
          'text',
          { x: x + barWidth / 2, y: base + 12, 'text-anchor': 'middle', 'font-size': 8, fill: '#68777a' },
          QUADRANT_LABELS[quadrant]
        )}
        ${el(
          'text',
          { x: x + barWidth / 2, y: base - barHeight - 4, 'text-anchor': 'middle', 'font-size': 9, fill: '#1a3035' },
          value.toFixed(2)
        )}`
    })
    .join('')

  const axis = el('line', { x1: left, y1: base, x2: left + (gap + barWidth) * 4, y2: base, stroke: '#d6e1de' })

  return svgWrap(width, height, `${axis}${bars}`)
}

export function renderComparativeSvg(efi: number, efe: number): string {
  const width = 260
  const height = 210
  const base = 120
  const maxScale = 4
  const scale = width / maxScale

  const rows = [
    { label: 'EFI · entorno interno', value: efi, color: '#087f78' },
    { label: 'EFE · entorno externo', value: efe, color: '#4d7891' }
  ]

  const body = rows
    .map((row, i) => {
      const y = base - i * 52
      const barWidth = Math.max(row.value * scale, 2)
      const marker = 2.5

      return `${el(
        'line',
        { x1: marker * scale, y1: y - 20, x2: marker * scale, y2: y + 2, stroke: '#b25d38', 'stroke-width': 1, 'stroke-dasharray': '3 3' }
      )}
      ${el('text', { x: 0, y: y - 26, 'font-size': 9, fill: '#53676b' }, row.label)}
      ${el('rect', { x: 0, y: y - 4, width: barWidth, height: 18, fill: row.color, rx: 2 })}
      ${el(
        'text',
        { x: barWidth + 6, y: y + 9, 'font-size': 9, fill: '#1a3035' },
        `${row.value.toFixed(2)} / 4`
      )}`
    })
    .join('')

  const legend = el('text', { x: 0, y: height - 6, 'font-size': 7.5, fill: '#68777a' }, 'Marca naranja: punto de equilibrio (2.50)')

  return svgWrap(width, height, `${body}${legend}`)
}

export function renderReportSvg(chartData: ReportModel['chartData']): {
  radar: string
  bars: string
  comparative: string
} {
  return {
    radar: renderRadarSvg(chartData),
    bars: renderBarsSvg(chartData.dafo),
    comparative: renderComparativeSvg(chartData.efi_score, chartData.efe_score)
  }
}

export function injectReportCharts(html: string, chartData: ReportModel['chartData']): string {
  const charts = renderReportSvg(chartData)

  return html
    .replace('{{GRAFICO_RADAR}}', charts.radar)
    .replace('{{GRAFICO_BARRAS}}', charts.bars)
    .replace('{{GRAFICO_COMPARATIVO}}', charts.comparative)
}