begin;

-- =============================================================================
-- Fase 1 Instrumentación — Fix observabilidad NovAi
-- Corrige run_id FK compliance y añade columnas de traza diagnóstica
-- Idempotente: if not exists / add column if not exists
-- =============================================================================

-- 1. Añadir columnas de instrumentación a novai_agent_runs si no existen
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='novai_agent_runs') then
    -- context_snapshot: snapshot completo recibido/seleccionado + tool traces + evidence
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='context_snapshot') then
      alter table public.novai_agent_runs add column context_snapshot jsonb not null default '{}'::jsonb;
    end if;
    -- intent heurístico
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='intent') then
      alter table public.novai_agent_runs add column intent text;
    end if;
    -- evidence_count: total evidences+calculations+audits+sources
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='evidence_count') then
      alter table public.novai_agent_runs add column evidence_count integer not null default 0;
    end if;
    -- correlation_id para traza transversal
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='correlation_id') then
      alter table public.novai_agent_runs add column correlation_id uuid;
    end if;
    -- provider/model reales usados (pueden diferir del routing decision por fallback)
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='provider') then
      alter table public.novai_agent_runs add column provider text;
    end if;
    -- ttft_ms: time to first token
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='ttft_ms') then
      alter table public.novai_agent_runs add column ttft_ms integer;
    end if;
    -- usage_is_estimated: true si no hubo usage real del provider
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='usage_is_estimated') then
      alter table public.novai_agent_runs add column usage_is_estimated boolean not null default true;
    end if;
    -- cached_tokens / reasoning_tokens cuando el provider los reporta
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='cached_tokens') then
      alter table public.novai_agent_runs add column cached_tokens integer;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='reasoning_tokens') then
      alter table public.novai_agent_runs add column reasoning_tokens integer;
    end if;
  end if;
end $$;

-- 2. Backfill correlation_id = id donde sea null (para runs antiguos sin correlación)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='novai_agent_runs' and column_name='correlation_id') then
    update public.novai_agent_runs set correlation_id = id where correlation_id is null;
  end if;
end $$;

-- 3. Índice para queries de observabilidad por intent y por tiempo
create index if not exists novai_agent_runs_intent_idx on public.novai_agent_runs (intent);
create index if not exists novai_agent_runs_provider_idx on public.novai_agent_runs (provider);

-- 4. RLS ya existe en novai_agent_runs (user_read), no se modifica.
-- Verificar que set_updated_at trigger no sea necesario en agent_runs (solo inserted, no updated frecuente).

commit;
