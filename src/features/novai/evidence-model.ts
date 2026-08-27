import { z } from 'zod'

// =============================================================================
// NovAi Evidence Model — Fase 5
// Modelo estructurado de evidencia con citas inline trazables
// =============================================================================

export type EvidenceSourceType = 'internal_document' | 'web_source' | 'database_evidence' | 'tool_derived'
export type EpistemicStatus = 'FACT' | 'INFERENCE' | 'HYPOTHESIS' | 'ASSUMPTION' | 'UNSUPPORTED'

// Workaround for TypeScript 5.9+ / Zod TS1117 false positive
// Use array of tuples with Object.fromEntries to avoid TS1117 false positive
const _evidenceShapeEntries = [
  ['id', z.string().uuid()] as const,
  ['tenantId', z.string().uuid()] as const,
  ['conversationId', z.string().uuid().nullable()] as const,
  ['investigationId', z.string().uuid().nullable()] as const,
  ['runId', z.string().uuid().nullable()] as const,
  ['sourceId', z.string()] as const,
  ['sourceType', z.enum(['internal_document', 'web_source', 'database_evidence', 'tool_derived'])] as const,
  ['claim', z.string()] as const,
  ['excerpt', z.string()] as const,
  ['location', z.string().nullable()] as const,
  ['confidence', z.number().min(0).max(1)] as const,
  ['epistemicStatus', z.enum(['FACT', 'INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNSUPPORTED'])] as const,
  ['factorId', z.string().nullable()] as const,
  ['documentName', z.string().nullable()] as const,
  ['url', z.string().url().nullable()] as const,
  ['page', z.string().nullable()] as const,
  ['retrievedAt', z.string().datetime()] as const,
  ['createdAt', z.string().datetime()] as const,
  ['metadata', z.record(z.unknown()).default({})] as const
] as const

const evidenceShape = Object.fromEntries(_evidenceShapeEntries)

export const evidenceSchema = z.object(evidenceShape)

export type Evidence = z.infer<typeof evidenceSchema>

export const citationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  messageId: z.string().uuid().nullable(),
  runId: z.string().uuid().nullable(),
  claim: z.string(),
  excerpt: z.string(),
  location: z.string().nullable(),
  createdAt: z.string().datetime()
})

export type Citation = z.infer<typeof citationSchema>

export interface EvidenceWithCitations extends Evidence {
  citations: Citation[]
}

export interface SourceGroup {
  sourceType: EvidenceSourceType
  sources: Array<{
    id: string
    name: string
    url?: string | null
    documentName?: string | null
    factorCount?: number
    excerpt?: string
    retrievedAt: string
    evidenceCount: number
  }>
  totalEvidence: number
}

// Esquemas para novai_evidence table (SQL)
export const EVIDENCE_TABLE_SQL = `
create table if not exists public.novai_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid references public.novai_conversations(id) on delete set null,
  investigation_id uuid references public.investigations(id) on delete set null,
  run_id uuid references public.novai_agent_runs(id) on delete set null,
  source_id text not null,
  source_type text not null check (source_type in ('internal_document','web_source','database_evidence','tool_derived')),
  claim text not null,
  excerpt text not null,
  location text,
  confidence numeric not null default 1.0 check (confidence >= 0.0 and confidence <= 1.0),
  epistemic_status text not null default 'FACT' check (epistemic_status in ('FACT','INFERENCE','HYPOTHESIS','ASSUMPTION','UNSUPPORTED')),
  factor_id text,
  document_name text,
  url text,
  page text,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists novai_evidence_tenant_idx on public.novai_evidence (tenant_id, created_at desc);
create index if not exists novai_evidence_conversation_idx on public.novai_evidence (conversation_id);
create index if not exists novai_evidence_investigation_idx on public.novai_evidence (investigation_id);
create index if not exists novai_evidence_run_idx on public.novai_evidence (run_id);
create index if not exists novai_evidence_factor_idx on public.novai_evidence (factor_id);
create index if not exists novai_evidence_source_type_idx on public.novai_evidence (source_type);
create index if not exists novai_evidence_epistemic_idx on public.novai_evidence (epistemic_status);

-- Citas inline
create table if not exists public.novai_citations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  evidence_id uuid not null references public.novai_evidence(id) on delete cascade,
  message_id uuid references public.novai_messages(id) on delete set null,
  run_id uuid references public.novai_agent_runs(id) on delete set null,
  claim text not null,
  excerpt text not null,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists novai_citations_evidence_idx on public.novai_citations (evidence_id);
create index if not exists novai_citations_message_idx on public.novai_citations (message_id);
create index if not exists novai_citations_run_idx on public.novai_citations (run_id);

-- RLS policies
alter table public.novai_evidence enable row level security;
alter table public.novai_citations enable row level security;

create policy novai_evidence_tenant_member_read on public.novai_evidence
for select to authenticated using (
  exists (select 1 from public.memberships m where m.tenant_id = novai_evidence.tenant_id and m.user_id = auth.uid() and m.status = 'active')
);

create policy novai_evidence_tenant_member_write on public.novai_evidence
for all to authenticated using (
  exists (select 1 from public.memberships m where m.tenant_id = novai_evidence.tenant_id and m.user_id = auth.uid() and m.status = 'active')
) with check (
  exists (select 1 from public.memberships m where m.tenant_id = novai_evidence.tenant_id and m.user_id = auth.uid() and m.status = 'active')
);

create policy novai_citations_tenant_member_read on public.novai_citations
for select to authenticated using (
  exists (select 1 from public.memberships m where m.tenant_id = novai_citations.tenant_id and m.user_id = auth.uid() and m.status = 'active')
);

create policy novai_citations_tenant_member_write on public.novai_citations
for all to authenticated using (
  exists (select 1 from public.memberships m where m.tenant_id = novai_citations.tenant_id and m.user_id = auth.uid() and m.status = 'active')
) with check (
  exists (select 1 from public.memberships m where m.tenant_id = novai_citations.tenant_id and m.user_id = auth.uid() and m.status = 'active')
);
`