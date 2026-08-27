import test from 'node:test'
import assert from 'node:assert/strict'

import { executeWebExtract, webExtractSchema, webExtractTool } from '../../src/features/novai/tools/research/web-extract'
import { executeWebResearch, webResearchSchema, webResearchTool } from '../../src/features/novai/tools/research/web-research'
import { projectToolResultToEvents } from '../../src/features/novai/event-projection'
import type { InvestigationsPrincipal } from '../../src/lib/investigations/access'

const mockPrincipal: InvestigationsPrincipal = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  client: {} as never
}

test('NovAi Web Research & Extract Tools Suite (Fase 2)', async t => {
  await t.test('web_extract schema validation: accepts 1-3 valid URLs', () => {
    const valid = webExtractSchema.safeParse({
      urls: ['https://example.com/report-2026', 'https://governance.org/policy']
    })
    assert.equal(valid.success, true)
    if (valid.success) {
      assert.equal(valid.data.urls.length, 2)
    }

    const invalid = webExtractSchema.safeParse({
      urls: ['not-a-valid-url']
    })
    assert.equal(invalid.success, false)

    const tooMany = webExtractSchema.safeParse({
      urls: [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4'
      ]
    })
    assert.equal(tooMany.success, false)
  })

  await t.test('web_extract: returns EXTERNAL_RESEARCH_DISABLED gracefully if no key', async () => {
    const origKey = process.env.TAVILY_API_KEY
    delete process.env.TAVILY_API_KEY

    try {
      const res = await executeWebExtract(
        { urls: ['https://example.com/data'] },
        mockPrincipal
      )
      assert.equal(res.success, true)
      assert.equal((res.result as any).status, 'EXTERNAL_RESEARCH_DISABLED')
      assert.equal((res.result as any).source, 'EXTERNAL_EVIDENCE')
      assert.deepEqual((res.result as any).results, [])
    } finally {
      if (origKey) process.env.TAVILY_API_KEY = origKey
    }
  })

  await t.test('web_extract metadata and tool registration', () => {
    assert.equal(webExtractTool.metadata.name, 'web_extract')
    assert.equal(webExtractTool.metadata.riskLevel, 'read-only')
    assert.ok(webExtractTool.openAiDeclaration)
    assert.equal(webExtractTool.openAiDeclaration.name, 'web_extract')
  })

  await t.test('web_research schema: ensures query is required', () => {
    const valid = webResearchSchema.safeParse({ query: 'tendencias logisticas 2026' })
    assert.equal(valid.success, true)

    const empty = webResearchSchema.safeParse({ query: '' })
    assert.equal(empty.success, false)
  })

  await t.test('web_research schema: accepts advanced parameters (topic, days, domains)', () => {
    const advanced = webResearchSchema.safeParse({
      query: 'reforma tributaria 2026',
      topic: 'news',
      days: 30,
      include_domains: ['cepal.org', 'gob.cl'],
      exclude_domains: ['spam.com'],
      top_k: 8
    })
    assert.equal(advanced.success, true)
    if (advanced.success) {
      assert.equal(advanced.data.topic, 'news')
      assert.equal(advanced.data.days, 30)
      assert.equal(advanced.data.include_domains?.length, 2)
      assert.equal(advanced.data.top_k, 8)
    }

    const invalidTopic = webResearchSchema.safeParse({
      query: 'test',
      topic: 'invalid-topic' as any
    })
    assert.equal(invalidTopic.success, false)

    const tooManyDomains = webResearchSchema.safeParse({
      query: 'test',
      include_domains: ['1.com', '2.com', '3.com', '4.com', '5.com', '6.com']
    })
    assert.equal(tooManyDomains.success, false)
  })

  await t.test('event projection: projectToolResultToEvents projects web_extract to source events', () => {
    const extractOutput = {
      status: 'EXTERNAL_EVIDENCE',
      results: [
        {
          url: 'https://cepal.org/informe-2026',
          title: 'CEPAL Informe Logístico 2026',
          content: 'El crecimiento de la demanda en corredores bioceánicos alcanzó 18.5% en el primer trimestre.',
          retrievedAt: new Date().toISOString()
        }
      ]
    }

    const events = projectToolResultToEvents('web_extract', extractOutput)
    assert.equal(events.length, 1)
    assert.equal(events[0].type, 'source')
    assert.equal((events[0] as any).sourceType, 'external')
    assert.equal((events[0] as any).name, 'CEPAL Informe Logístico 2026')
    assert.equal((events[0] as any).url, 'https://cepal.org/informe-2026')
    assert.ok((events[0] as any).excerpt.includes('18.5%'))
  })

  await t.test('event projection: projectToolResultToEvents preserves snippet excerpt in web_research', () => {
    const researchOutput = {
      status: 'EXTERNAL_EVIDENCE',
      results: [
        {
          url: 'https://mop.cl/licitacion',
          title: 'Licitación Corredor',
          snippet: 'Bases de licitación aprobadas para el tramo central.',
          retrievedAt: new Date().toISOString(),
          relevanceScore: 0.88
        }
      ]
    }

    const events = projectToolResultToEvents('web_research', researchOutput)
    assert.equal(events.length, 1)
    assert.equal(events[0].type, 'source')
    assert.equal((events[0] as any).sourceType, 'external')
    assert.equal((events[0] as any).excerpt, 'Bases de licitación aprobadas para el tramo central.')
  })
})
