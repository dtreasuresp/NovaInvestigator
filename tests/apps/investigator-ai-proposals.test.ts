import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dafoProposalRequestSchema,
  dafoProposalResponseSchema,
  qspmProposalRequestSchema,
  qspmProposalResponseSchema
} from '../../src/features/novai/schema'

describe('NovAi Investigator DAFO & QSPM proposals', () => {
  describe('DAFO schema validation', () => {
    it('validates a correct DAFO proposal request payload', () => {
      const validPayload = {
        investigationId: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
        state: { internal: [], external: [] },
        locale: 'es'
      }

      const result = dafoProposalRequestSchema.safeParse(validPayload)
      assert.equal(result.success, true)
    })

    it('validates a structured DAFO response with strengths, justifications and evidence', () => {
      const sampleResponse = {
        relationships: [
          {
            internalId: 'F1',
            externalId: 'O1',
            quadrant: 'FO',
            strength: 3,
            justification: 'La voluntad directiva permite aprovechar al máximo el financiamiento externo.',
            evidence: 'Entrevistas a directivos; Dictamen de panel',
            evaluator: 'Equipo de Planificación'
          },
          {
            internalId: 'D1',
            externalId: 'A1',
            quadrant: 'DA',
            strength: 1,
            justification: 'Relación indirecta de vulnerabilidad.',
            evidence: 'Reporte de auditoría',
            evaluator: 'Equipo de Planificación'
          }
        ],
        dominantQuadrantSuggested: 'FO',
        summary: 'Vector dominante ofensivo FO.'
      }

      const parsed = dafoProposalResponseSchema.safeParse(sampleResponse)
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.relationships.length, 2)
        assert.equal(parsed.data.relationships[0].strength, 3)
      }
    })

    it('rejects invalid relationship strength (> 3 or < 0)', () => {
      const invalidResponse = {
        relationships: [
          {
            internalId: 'F1',
            externalId: 'O1',
            quadrant: 'FO',
            strength: 5,
            justification: 'Inválido',
            evidence: '',
            evaluator: ''
          }
        ]
      }

      const parsed = dafoProposalResponseSchema.safeParse(invalidResponse)
      assert.equal(parsed.success, false)
    })
  })

  describe('QSPM schema validation', () => {
    it('validates a correct QSPM proposal request payload', () => {
      const validPayload = {
        investigationId: '1f400e7c-7c49-4b1a-8bc7-b7e2a1b0c3d5',
        state: { strategies: [], internal: [], external: [] },
        proposeStrategiesIfEmpty: true,
        locale: 'es'
      }

      const result = qspmProposalRequestSchema.safeParse(validPayload)
      assert.equal(result.success, true)
    })

    it('validates a structured QSPM response with AS scores (1-4 or null)', () => {
      const sampleResponse = {
        qspmScores: {
          'EST-01': {
            F1: 4,
            D1: 2,
            O1: 3,
            A1: null
          }
        },
        proposedStrategies: [
          {
            id: 'EST-01',
            name: 'Expansión de servicios digitales',
            quadrant: 'FO',
            description: 'Capitalizar infraestructura para nuevos canales.'
          }
        ],
        rationale: 'La estrategia EST-01 maximiza el atractivo frente a los factores clave.'
      }

      const parsed = qspmProposalResponseSchema.safeParse(sampleResponse)
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.qspmScores['EST-01'].F1, 4)
        assert.equal(parsed.data.qspmScores['EST-01'].A1, null)
        assert.equal(parsed.data.proposedStrategies?.length, 1)
      }
    })
  })
})
