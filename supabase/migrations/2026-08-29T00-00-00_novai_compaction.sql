begin;

-- =============================================================================
-- Fase 6 — Compaction semántica + UIMessage parts persistence
-- =============================================================================

-- 1. Columnas de compaction en novai_conversations
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='novai_conversations') then
    if not exists (select 1 from information_schema.columns where table_name='novai_conversations' and column_name='summary') then
      alter table public.novai_conversations add column summary jsonb not null default '{}'::jsonb;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='novai_conversations' and column_name='compaction_version') then
      alter table public.novai_conversations add column compaction_version integer not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='novai_conversations' and column_name='token_snapshot') then
      alter table public.novai_conversations add column token_snapshot jsonb not null default '{}'::jsonb;
    end if;
  end if;
end $$;

-- 2. Columna parts en novai_messages para UIMessage parts (text/reasoning/tool-call/tool-result/source)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='novai_messages') then
    if not exists (select 1 from information_schema.columns where table_name='novai_messages' and column_name='parts') then
      alter table public.novai_messages add column parts jsonb;
    end if;
  end if;
end $$;

create index if not exists novai_conversations_compaction_version_idx on public.novai_conversations (compaction_version) where compaction_version > 0;

commit;
