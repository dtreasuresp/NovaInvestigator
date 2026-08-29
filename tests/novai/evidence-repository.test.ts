import test from 'node:test'
import assert from 'node:assert/strict'

import { NovaiEvidenceRepository } from '../../src/features/novai/evidence-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

test('NovAi Evidence Repository Suite (Fase 3)', async t => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const investigationId = '00000000-0000-0000-0000-000000000009'

  await t.test('createEvidence: builds correct tenant-scoped insert payload', async () => {
    let capturedTable = ''
    let capturedPayload: any = null

    const mockClient = {
      from: (table: string) => {
        capturedTable = table
        return {
          insert: (payload: any) => {
            capturedPayload = payload
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'ev-100',
                    tenant_id: payload.tenant_id,
                    conversation_id: payload.conversation_id,
                    investigation_id: payload.investigation_id,
                    run_id: payload.run_id,
                    source_id: payload.source_id,
                    source_type: payload.source_type,
                    claim: payload.claim,
                    excerpt: payload.excerpt,
                    location: payload.location,
                    confidence: payload.confidence,
                    epistemic_status: payload.epistemic_status,
                    retrieved_at: payload.retrieved_at,
                    created_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            }
          }
        }
      }
    } as unknown as SupabaseClient

    const result = await NovaiEvidenceRepository.createEvidence(mockClient, {
      tenantId,
      investigationId,
      sourceId: 'https://example.com/report',
      sourceType: 'web_source',
      claim: 'Crecimiento de exportaciones en 15%',
      excerpt: 'Las exportaciones regionales crecieron 15% interanual.',
      location: 'https://example.com/report',
      epistemicStatus: 'FACT'
    })

    assert.equal(capturedTable, 'novai_evidence')
    assert.equal(capturedPayload.tenant_id, tenantId)
    assert.equal(capturedPayload.investigation_id, investigationId)
    assert.equal(capturedPayload.source_type, 'web_source')
    assert.equal(capturedPayload.epistemic_status, 'FACT')
    assert.equal(capturedPayload.confidence, 1.0)
    assert.equal(result?.id, 'ev-100')
    assert.equal(result?.tenantId, tenantId)
  })

  await t.test('batchCreateEvidence: handles multiple rows in single transaction', async () => {
    let capturedRows: any[] = []

    const mockClient = {
      from: (table: string) => ({
        insert: (rows: any[]) => {
          capturedRows = rows
          return {
            select: async () => ({
              data: rows.map((r, i) => ({
                id: `ev-${i + 1}`,
                ...r,
                created_at: new Date().toISOString()
              })),
              error: null
            })
          }
        }
      })
    } as unknown as SupabaseClient

    const items = [
      {
        tenantId,
        investigationId,
        sourceId: 'https://cepal.org/1',
        sourceType: 'web_source' as const,
        claim: 'Fuente 1',
        excerpt: 'Contenido 1'
      },
      {
        tenantId,
        investigationId,
        sourceId: 'https://cepal.org/2',
        sourceType: 'web_source' as const,
        claim: 'Fuente 2',
        excerpt: 'Contenido 2'
      }
    ]

    const results = await NovaiEvidenceRepository.batchCreateEvidence(mockClient, tenantId, items)

    assert.equal(capturedRows.length, 2)
    assert.equal(results.length, 2)
    assert.equal(results[0].sourceId, 'https://cepal.org/1')
    assert.equal(results[1].sourceId, 'https://cepal.org/2')
  })

  await t.test('createCitation: associates citation with evidence and message', async () => {
    let capturedPayload: any = null

    const mockClient = {
      from: (table: string) => ({
        insert: (payload: any) => {
          capturedPayload = payload
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'cit-1',
                  ...payload,
                  created_at: new Date().toISOString()
                },
                error: null
              })
            })
          }
        }
      })
    } as unknown as SupabaseClient

    const citation = await NovaiEvidenceRepository.createCitation(mockClient, {
      tenantId,
      evidenceId: 'ev-100',
      claim: 'Crecimiento de exportaciones en 15%',
      excerpt: 'Exportaciones aumentaron',
      location: 'p. 12'
    })

    assert.equal(capturedPayload.tenant_id, tenantId)
    assert.equal(capturedPayload.evidence_id, 'ev-100')
    assert.equal(citation?.id, 'cit-1')
    assert.equal(citation?.evidenceId, 'ev-100')
  })

  await t.test('listEvidenceByInvestigation: applies tenant and investigation filters', async () => {
    const filters: Record<string, string> = {}

    const mockClient = {
      from: (table: string) => ({
        select: () => ({
          eq: (field: string, val: string) => {
            filters[field] = val
            return {
              eq: (field2: string, val2: string) => {
                filters[field2] = val2
                return {
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          id: 'ev-1',
                          tenant_id: tenantId,
                          investigation_id: investigationId,
                          source_id: 'doc-1',
                          source_type: 'internal_document',
                          claim: 'Memoria Anual',
                          excerpt: 'Texto',
                          location: 'p. 5',
                          confidence: 1.0,
                          epistemic: 'FACT',
                          retrieved_at: new Date().toISOString(),
                          created_at: new Date().toISOString()
                        }
                      ],
                      error: null
                    })
                  })
                }
              }
            }
          }
        })
      })
    } as unknown as SupabaseClient

    const list = await NovaiEvidenceRepository.listEvidenceByInvestigation(mockClient, {
      tenantId,
      investigationId
    })

    assert.equal(filters.tenant_id, tenantId)
    assert.equal(filters.investigation_id, investigationId)
    assert.equal(list.length, 1)
    assert.equal(list[0].id, 'ev-1')
    assert.equal(list[0].sourceType, 'internal_document')
  })
})
