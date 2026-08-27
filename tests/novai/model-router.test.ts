import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiModelRouter } from '../../src/features/novai/adapters/model-router'
import { NOVAI_MODES, getNovaiModeDefinition } from '../../src/features/novai/adapters/modes'
import { NovaiContextEngine } from '../../src/features/novai/context-engine'
import type { AiMessage } from '../../src/features/novai/schema'

test('NovAi Model Router & 7 Operational Modes Engine', async t => {
  await t.test('All 7 operational modes are defined with instructions and risk levels', () => {
    const expectedModes = ['CHAT', 'CONSULTANT', 'ANALYST', 'RESEARCHER', 'DEVELOPER', 'ARCHITECT', 'OPERATOR'] as const

    for (const mode of expectedModes) {
      const def = NOVAI_MODES[mode]

      assert.ok(def, `Mode ${mode} must be defined`)
      assert.equal(def.mode, mode)
      assert.ok(def.title.length > 0)
      assert.ok(def.systemInstruction.length > 0)
      assert.ok(['low', 'medium', 'high'].includes(def.riskLevel))
      assert.ok(['fast', 'reasoning', 'coding', 'balanced'].includes(def.preferredModelCategory))
    }
  })

  await t.test('Intent Classification: Correctly infers DEVELOPER mode from coding prompts', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: '¿Puedes revisar este componente React y la consulta SQL en el Route Handler?' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages)

    assert.equal(mode, 'DEVELOPER')

    const decision = NovaiModelRouter.routeTask({ messages })

    assert.equal(decision.category, 'coding')
    assert.match(decision.recommendedOpenRouterModel, /qwen/)
  })

  await t.test('Intent Classification: Correctly infers ARCHITECT mode from security/RBAC prompts', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: '¿Cómo diseñamos las políticas de aislamiento multi-tenant y ReBAC con Stripe webhooks?' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages)

    assert.equal(mode, 'ARCHITECT')

    const decision = NovaiModelRouter.routeTask({ messages })

    assert.equal(decision.category, 'reasoning')
  })

  await t.test('Intent Classification: Correctly infers CONSULTANT mode for strategic matrix queries', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: 'Explícame el impacto cruzado DAFO y la puntuación TAS de la matriz QSPM.' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages)

    assert.equal(mode, 'CONSULTANT')

    const decision = NovaiModelRouter.routeTask({ messages })

    assert.equal(decision.category, 'reasoning')
    assert.match(decision.recommendedOpenRouterModel, /nemotron/)
  })

  await t.test('Sticky Mode Window: Retains CONSULTANT mode across short follow-up messages', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: '¿Por qué el cruce D-03 × A-02 tiene fuerza 0?' },
      { role: 'assistant', content: 'El cruce entre D-03 y A-02 está subestimado...' },
      { role: 'user', content: '¿Y por qué no debería ser 3?' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages)

    assert.equal(mode, 'CONSULTANT')

    const decision = NovaiModelRouter.routeTask({ messages })

    assert.equal(decision.category, 'reasoning')
  })

  await t.test('Intent Classification: Correctly infers OPERATOR mode from Kanban/Task queries', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: 'Revisa las tareas urgentes del tablero kanban y el sprint actual.' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages)

    assert.equal(mode, 'OPERATOR')
  })

  await t.test('Explicit Mode Override: Prioritizes explicit mode passed in context', () => {
    const messages: AiMessage[] = [
      { role: 'user', content: 'Hola, buenos días.' }
    ]

    const mode = NovaiModelRouter.classifyTaskIntent(messages, 'general', 'RESEARCHER')

    assert.equal(mode, 'RESEARCHER')

    const decision = NovaiModelRouter.routeTask({ messages, explicitMode: 'RESEARCHER' })

    assert.equal(decision.mode, 'RESEARCHER')
  })

  await t.test('Context Engine integrates active mode instruction into the system prompt', () => {
    const mockPrincipal = {
      userId: 'usr-mode-test',
      tenantId: 'tnt-mode-test',
      client: {} as any
    }

    const prompt = NovaiContextEngine.buildSystemPrompt({
      principal: mockPrincipal,
      context: {
        app: 'general',
        mode: 'DEVELOPER'
      },
      locale: 'es'
    })

    assert.match(prompt, /Modo de Análisis Activo/)
    assert.match(prompt, /ESPECIALISTA EN CÓDIGO E INTEGRACIONES/)
    assert.match(prompt, /Next\.js App Router/)
  })

  await t.test('Model Router outputs requiredCapabilities according to spec §27', () => {
    const decisionReasoning = NovaiModelRouter.routeTask({
      messages: [{ role: 'user', content: 'Audita la matriz DAFO' }],
      explicitMode: 'CONSULTANT'
    })

    assert.equal(decisionReasoning.category, 'reasoning')
    assert.equal(decisionReasoning.requiredCapabilities.supportsReasoning, true)
    assert.equal(decisionReasoning.requiredCapabilities.supportsTools, true)
    assert.equal(decisionReasoning.requiredCapabilities.supportsStreaming, true)

    const decisionFast = NovaiModelRouter.routeTask({
      messages: [{ role: 'user', content: 'Hola' }],
      explicitMode: 'CHAT'
    })

    assert.equal(decisionFast.category, 'fast')
    assert.equal(decisionFast.requiredCapabilities.supportsTools, true)
    assert.equal(decisionFast.requiredCapabilities.supportsStreaming, true)
  })
})
