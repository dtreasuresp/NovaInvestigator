import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildInvestigationExportDto, type InvestigationExportDto } from '../../src/lib/investigations/service'
import { idParamSchema } from '../../src/lib/investigations/schema'

describe('investigation export', () => {
  it('builds the prepared DTO with the single renderer generationUrl', () => {
    const allowedAt = new Date('2026-08-10T12:00:00.000Z')
    const dto = buildInvestigationExportDto('1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5', allowedAt)

    assert.deepEqual(dto, {
      id: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
      status: 'prepared',
      generationUrl: '/api/generar-pdf',
      allowedAt: '2026-08-10T12:00:00.000Z'
    } satisfies InvestigationExportDto)
  })

  it('always points at the renderer and never consumes quota at prepare time', () => {
    const dto = buildInvestigationExportDto('1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5', new Date())

    assert.equal(dto.status, 'prepared')
    assert.equal(dto.generationUrl, '/api/generar-pdf')
  })

  it('accepts only uuid route ids', () => {
    assert.equal(idParamSchema.safeParse('1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5').success, true)

    assert.equal(idParamSchema.safeParse('no-es-un-uuid').success, false)
    assert.equal(idParamSchema.safeParse('').success, false)
  })
})
