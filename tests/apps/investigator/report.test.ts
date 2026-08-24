import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Utils Imports
import { createDemoState } from '../../../src/utils/investigator/demo'
import { calculateAnalysis } from '../../../src/utils/investigator/domain'
import { createReportModel, renderReportHtml } from '../../../src/utils/investigator/workspace'
import { injectReportCharts, renderReportSvg } from '../../../src/utils/investigator/charts'

const buildHtml = () => {
  const state = createDemoState()
  const model = createReportModel(state, calculateAnalysis(state))
  const html = injectReportCharts(renderReportHtml(model), model.chartData)

  return html
}

describe('report pipeline', () => {
  it('reemplaza los tres placeholders con SVG inline', () => {
    const html = buildHtml()

    assert.ok(!html.includes('{{GRAFICO_RADAR}}'), 'radar placeholder no reemplazado')
    assert.ok(!html.includes('{{GRAFICO_BARRAS}}'), 'barras placeholder no reemplazado')
    assert.ok(!html.includes('{{GRAFICO_COMPARATIVO}}'), 'comparativo placeholder no reemplazado')
    assert.ok((html.match(/<svg /g) || []).length >= 3)
  })

  it('los SVGs son bien formados y con viewBox', () => {
    const html = buildHtml()
    const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) || []

    assert.equal(svgs.length, 3)
    svgs.forEach(svg => {
      assert.match(svg, /viewBox="0 0 \d+ \d+"/)
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'))
    })
  })

  it('las series de barras DAFO cubren los cuatro cuadrantes', () => {
    const state = createDemoState()
    const model = createReportModel(state, calculateAnalysis(state))
    const bars = renderReportSvg(model.chartData).bars

    for (const label of ['FO', 'DO', 'FA', 'DA']) {
      assert.ok(bars.includes(label), `barra ${label} ausente`)
    }

    assert.ok(bars.includes(model.chartData.dafo.FO.toFixed(2)))
  })

  it('el informe incluye secciones, tabla QSPM y mesa de evidencia', () => {
    const html = buildHtml()

    assert.ok(html.includes('Selección estratégica'))
    assert.ok(html.includes('Mesa de evidencia'))
    assert.ok(html.includes('Plan operativo y prioridades'))
    assert.ok(html.includes('EST-FO-01'))
  })
})
