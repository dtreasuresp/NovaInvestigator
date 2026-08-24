// Ruta de generación de PDF: recibe el estado de la investigación, construye el
// informe HTML (SVG inline), y lo imprime con un navegador headless.

// Node Imports
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// Next Imports
import { NextResponse } from 'next/server'

// Error Imports
import { InvestigationError } from '@/lib/investigations/errors'
import { readJsonBody, toErrorResponse } from '@/lib/investigations/http'
import { assertStatePayloadSize, exportPdfRequestSchema } from '@/lib/investigations/schema'
import { logger } from '@/lib/logger'

// Access Imports
import {
  assertInvestigationsCapability,
  assertInvestigationsCommercialAccess,
  assertInvestigationsPdfEntitlement,
  assertInvestigationsPdfMonthlyEntitlement,
  assertInvestigationsPdfRateLimit,
  requireInvestigationsPrincipal
} from '@/lib/investigations/access'
import { INVESTIGATIONS_CAPABILITIES } from '@/lib/investigations/capabilities'

// Type Imports
import type { InvestigationState } from '@/types/apps/investigator-types'

// Util Imports
import { calculateAnalysis } from '@/utils/investigator/domain'
import { createReportModel, renderReportHtml, reportValue } from '@/utils/investigator/workspace'
import { injectReportCharts } from '@/utils/investigator/charts'

export const runtime = 'nodejs'
export const maxDuration = 70

type PdfRenderer = {
  executablePath: string
  args: string[]
  headlessFlag: string | null
}

function findChromeExecutablePath(): string | null {
  const fromEnv = process.env.CHROME_PATH

  if (fromEnv) return fromEnv

  const home = process.env.LOCALAPPDATA || process.env.USERPROFILE || ''

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(home, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    join(home, 'AppData', 'Local', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ]

  return candidates.find(candidate => existsSync(candidate)) ?? null
}

async function resolvePdfRenderer(): Promise<PdfRenderer | null> {
  const localChromePath = findChromeExecutablePath()

  if (localChromePath) {
    return {
      executablePath: localChromePath,
      args: [],
      headlessFlag: '--headless'
    }
  }

  if (process.platform !== 'linux') return null

  const { default: chromium } = await import('@sparticuz/chromium')

  return {
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headlessFlag: null
  }
}

function spawnChromePrintToPdf(
  renderer: PdfRenderer,
  htmlPath: string,
  pdfPath: string,
  profileDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      renderer.executablePath,
      [
        ...renderer.args,
        ...(renderer.headlessFlag ? [renderer.headlessFlag] : []),
        '--new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${profileDir}`,
        '--print-to-pdf-no-header',
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`
      ],
      { stdio: 'ignore' }
    )

    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('Tiempo de espera agotado generando el PDF.'))
    }, 60000)

    child.once('error', error => {
      clearTimeout(timeout)
      reject(error)
    })

    child.once('close', code => {
      clearTimeout(timeout)

      if (code === 0) return resolve()

      reject(new Error(`Chrome salió con código ${code}.`))
    })
  })
}

export async function POST(request: Request) {
  try {
    const principal = await requireInvestigationsPrincipal()

    await assertInvestigationsCommercialAccess(principal)
    await assertInvestigationsCapability(principal, INVESTIGATIONS_CAPABILITIES.export)
    await assertInvestigationsPdfEntitlement(principal)
    await assertInvestigationsPdfRateLimit(principal)

    const payload = await readJsonBody(request, exportPdfRequestSchema, json => {
      if (typeof json === 'object' && json !== null) {
        assertStatePayloadSize((json as { state?: unknown }).state)
      }
    })

    const state = payload.state as unknown as InvestigationState

    const renderer = await resolvePdfRenderer()

    if (!renderer) {
      return NextResponse.json(
        { error: 'No se encontró Chrome/Chromium. Defina la variable de entorno CHROME_PATH.' },
        { status: 500 }
      )
    }

    const analysis = calculateAnalysis(state)
    const model = createReportModel(state, analysis)
    const html = injectReportCharts(renderReportHtml(model), model.chartData)

    await assertInvestigationsPdfMonthlyEntitlement(principal)

    const dir = await mkdtemp(join(tmpdir(), 'investigator-pdf-'))

    try {
      const htmlPath = join(dir, 'informe.html')
      const pdfPath = join(dir, 'informe.pdf')
      const profileDir = join(dir, 'chromium-profile')

      await writeFile(htmlPath, html, 'utf-8')
      await spawnChromePrintToPdf(renderer, htmlPath, pdfPath, profileDir)

      const pdf = await readFile(pdfPath)

      const responseBody = new Uint8Array(pdf.byteLength)

      responseBody.set(pdf)

      return new NextResponse(responseBody, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="exposicion-estrategica-${reportValue(model.state.metadata?.id)}.pdf"`
        }
      })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  } catch (error) {
    if (InvestigationError.isInvestigationError(error)) {
      return toErrorResponse(error)
    }

    logger.error('Falló la generación del PDF', {
      action: 'api.generar_pdf',
      details: { errorType: error instanceof Error ? error.name : typeof error }
    })

    return toErrorResponse(InvestigationError.internal())
  }
}
