import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createDemoState } from '../../../src/utils/investigator/demo'
import { buildInvestigationSystemPrompt } from '../../../src/features/novai/context-builder'
import { PREDEFINED_PROMPTS, aiChatRequestSchema, aiReportRequestSchema } from '../../../src/features/novai/schema'
import { CAPABILITY_MANIFEST } from '../../../src/features/access/capabilityManifest'

describe('AI Copilot and Governance', () => {
  it('CAPABILITY_MANIFEST includes ai.chat capability (NovAi)', () => {
    const aiCap = CAPABILITY_MANIFEST.find(c => c.key === 'ai.chat')
    assert.ok(aiCap, 'ai.chat capability must exist')
    assert.equal(aiCap.resource, 'ai')
    assert.equal(aiCap.action, 'chat')
  })

  it('PREDEFINED_PROMPTS contains 5 structured category prompts', () => {
    assert.equal(PREDEFINED_PROMPTS.length, 5)
    const categories = PREDEFINED_PROMPTS.map(p => p.category)
    assert.ok(categories.includes('diagnosis'))
    assert.ok(categories.includes('dafo'))
    assert.ok(categories.includes('weights'))
    assert.ok(categories.includes('came'))
    assert.ok(categories.includes('qspm'))
  })

  it('buildInvestigationSystemPrompt properly serializes investigation factors, metrics and matrices', () => {
    const state = createDemoState()
    const prompt = buildInvestigationSystemPrompt(state)

    assert.ok(prompt.includes('Índice EFI'), 'Prompt must include EFI index')
    assert.ok(prompt.includes('Índice EFE'), 'Prompt must include EFE index')
    assert.ok(prompt.includes('Vector Dominante DAFO'), 'Prompt must include DAFO dominant vector')
    assert.ok(prompt.includes('FACTORES INTERNOS (EFI):'), 'Prompt must include internal factors')
    assert.ok(prompt.includes('FACTORES EXTERNOS (EFE):'), 'Prompt must include external factors')
    assert.ok(prompt.includes('ALTERNATIVAS ESTRATÉGICAS Y MATRIZ QSPM:'), 'Prompt must include QSPM alternatives')
    assert.ok(prompt.includes('PLAN DE ACCIÓN CAME'), 'Prompt must include CAME actions')
  })

  it('buildInvestigationSystemPrompt adapts language instructions according to locale', () => {
    const state = createDemoState()

    const promptEs = buildInvestigationSystemPrompt(state, 'es')
    assert.ok(promptEs.includes('Español'), 'Spanish prompt must mention Español')

    const promptEn = buildInvestigationSystemPrompt(state, 'en')
    assert.ok(promptEn.includes('English'), 'English prompt must mention English')

    const promptKo = buildInvestigationSystemPrompt(state, 'ko')
    assert.ok(promptKo.includes('한국어'), 'Korean prompt must mention Korean')

    const promptDe = buildInvestigationSystemPrompt(state, 'de')
    assert.ok(promptDe.includes('Deutsch'), 'German prompt must mention Deutsch')

    const promptPt = buildInvestigationSystemPrompt(state, 'pt')
    assert.ok(promptPt.includes('Português'), 'Portuguese prompt must mention Português')
  })

  it('aiChatRequestSchema validates messages, flags and locale', () => {
    const valid = {
      messages: [{ role: 'user', content: '¿Cuál es mi debilidad principal?' }],
      isFreeText: false,
      locale: 'ko'
    }
    const parsed = aiChatRequestSchema.parse(valid)
    assert.equal(parsed.isFreeText, false)
    assert.equal(parsed.locale, 'ko')
    assert.equal(parsed.messages.length, 1)

    assert.throws(() => {
      aiChatRequestSchema.parse({ messages: [] })
    })
  })

  it('aiReportRequestSchema validates format and locale options', () => {
    const valid = aiReportRequestSchema.parse({ format: 'academic', locale: 'en' })
    assert.equal(valid.format, 'academic')
    assert.equal(valid.locale, 'en')

    const thesis = aiReportRequestSchema.parse({ format: 'thesis', locale: 'de' })
    assert.equal(thesis.format, 'thesis')
    assert.equal(thesis.locale, 'de')
  })
})
