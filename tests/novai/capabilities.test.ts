import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROVIDER_CAPABILITIES,
  checkCapabilities,
  filterCandidatesByCapabilities,
  requiredCapabilitiesForCategory,
  type ProviderId,
  type ProviderCapabilities,
  type RequiredCapabilities
} from '../../src/features/novai/capabilities'

test('NovAi Capability Detection (PROMPT_NOVAI_PRO_V2 §27/§29)', async t => {

  await t.test('PROVIDER_CAPABILITIES cubre los 3 proveedores oficiales', () => {
    const providers: ProviderId[] = ['openrouter', 'gemini', 'opencode-zen']

    for (const p of providers) {
      const caps = PROVIDER_CAPABILITIES[p]

      assert.ok(caps, `Falta ${p}`)
      assert.ok(typeof caps.supportsTools === 'boolean')
      assert.ok(typeof caps.supportsStreaming === 'boolean')
      assert.ok(typeof caps.supportsReasoning === 'boolean')
      assert.ok(typeof caps.supportsStructuredOutput === 'boolean')
      assert.ok(typeof caps.supportsVision === 'boolean')
    }
  })

  await t.test('OpenRouter & OpenCode Zen: tools + streaming SÍ; reasoning/structured NO', () => {
    for (const p of ['openrouter', 'opencode-zen'] as ProviderId[]) {
      const caps = PROVIDER_CAPABILITIES[p]

      assert.equal(caps.supportsTools, true, `${p} debe soportar tools`)
      assert.equal(caps.supportsStreaming, true, `${p} debe soportar streaming`)
      assert.equal(caps.supportsReasoning, false, `${p} NO debe reportar reasoning nativo`)
      assert.equal(caps.supportsStructuredOutput, false, `${p} NO debe reportar structured output nativo`)
    }
  })

  await t.test('Gemini: TODO soportado', () => {
    const caps = PROVIDER_CAPABILITIES.gemini

    assert.equal(caps.supportsTools, true)
    assert.equal(caps.supportsStreaming, true)
    assert.equal(caps.supportsReasoning, true)
    assert.equal(caps.supportsStructuredOutput, true)
    assert.equal(caps.supportsVision, true)
  })

  await t.test('checkCapabilities: compatible devuelve missing=[]', () => {
    const req: RequiredCapabilities = { supportsTools: true, supportsStreaming: true }
    const result = checkCapabilities('gemini', req)
    
    assert.equal(result.compatible, true)
    assert.deepEqual(result.missing, [])
  })

  await t.test('checkCapabilities: incompatible lista missing específicos', () => {
    const req: RequiredCapabilities = { supportsReasoning: true }
    const result = checkCapabilities('openrouter', req)
    assert.equal(result.compatible, false)
    assert.ok(result.missing.includes('supportsReasoning'))
  })

  await t.test('requiredCapabilitiesForCategory: reasoning exige reasoning', () => {
    const req = requiredCapabilitiesForCategory('reasoning')
    assert.equal(req.supportsTools, true)
    assert.equal(req.supportsStreaming, true)
    assert.equal(req.supportsReasoning, true)
  })

  await t.test('requiredCapabilitiesForCategory: coding exige tools', () => {
    const req = requiredCapabilitiesForCategory('coding')
    assert.equal(req.supportsTools, true)
    assert.equal(req.supportsStreaming, true)
  })

  await t.test('filterCandidatesByCapabilities filtra candidatos incompatibles con reasoning', () => {
    const candidates = [
      { provider: 'gemini' as ProviderId, name: 'Gemini' },
      { provider: 'openrouter' as ProviderId, name: 'OpenRouter' }
    ]

    const req: RequiredCapabilities = { supportsReasoning: true }
    const logs: string[] = []
    const filtered = filterCandidatesByCapabilities(candidates, req, (msg) => logs.push(msg))

    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].provider, 'gemini')
    assert.ok(logs.some(l => l.includes('OpenRouter') && l.includes('supportsReasoning')))
  })

  await t.test('filterCandidatesByCapabilities con categoría fast (streaming + tools)', () => {
    const candidates = [
      { provider: 'gemini' as ProviderId, name: 'Gemini' },
      { provider: 'openrouter' as ProviderId, name: 'OpenRouter' },
      { provider: 'opencode-zen' as ProviderId, name: 'OpenCode Zen' }
    ]

    const req = requiredCapabilitiesForCategory('fast')
    const logs: string[] = []
    const filtered = filterCandidatesByCapabilities(candidates, req, (msg) => logs.push(msg))

    assert.equal(filtered.length, 3) // los 3 soportan fast (streaming + tools)
  })
})