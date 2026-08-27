begin;

-- =============================================================================
-- Fase 5 — Evidence Model & Inline Citations
-- Tablas: novai_evidence, novai_citations
-- =============================================================================

-- 1. Tabla de Evidencia Estructurada
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
  investigation_id uuid references public.investigations(id) on delete set null,
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

-- 2. Citas Inline (Inline Citations)
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

-- 3. RLS Policies
alter table public.novai_evidence enable row level security;
alter table public.novai_citations enable row level security;

drop policy if exists novai_evidence_tenant_member_read on public.novai_evidence;
create policy novai_evidence_tenant_member_read
on public.novai_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_evidence.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists novai_evidence_tenant_member_write on public.novai_evidence;
create policy novai_evidence_tenant_member_write
on public.novai_evidence
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_evidence.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_evidence.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists novai_citations_tenant_member_read on public.novai_citations;
create policy novai_citations_tenant_member_read
on public.novai_citations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_citations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

drop policy if exists novai_citations_tenant_member_write on public.novai_citations;
create policy novai_citations_tenant_member_write
on public.novai_citations
for all
to authenticated
using (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_citations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.memberships as m
    where m.tenant_id = novai_citations.tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

commit;