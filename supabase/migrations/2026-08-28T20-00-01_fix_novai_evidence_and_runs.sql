begin;

-- Fix3: Corregir contrato novai_evidence y ampliar estados de novai_agent_runs

-- 1. Compatibilidad: si existió columna 'epistemic' huérfana, renombrarla o crear vista compat
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='novai_evidence') then
    -- Si existe columna epistemic pero no epistemic_status → renombrar
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='novai_evidence' and column_name='epistemic')
       and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='novai_evidence' and column_name='epistemic_status') then
      alter table public.novai_evidence rename column epistemic to epistemic_status;
    end if;
    -- Si existen ambas (caso reintento), eliminar huérfana epistemic si duplicada
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='novai_evidence' and column_name='epistemic')
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name='novai_evidence' and column_name='epistemic_status') then
      -- mantener epistemic_status como canónica; crear trigger de compatibilidad no es necesario: solo dropear duplicada si idéntica
      -- No dropeamos automáticamente para no perder datos; añadir comentario
      comment on column public.novai_evidence.epistemic is 'DEPRECATED: usar epistemic_status';
    end if;
  end if;
end $$;

-- 2. Ampliar check constraint de status en novai_agent_runs para permitir 'running'
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='novai_agent_runs') then
    -- Dropear check antiguo si existe (nombre puede variar)
    alter table public.novai_agent_runs drop constraint if exists novai_agent_runs_status_check;
    -- Recrear con 'running' permitido
    alter table public.novai_agent_runs add constraint novai_agent_runs_status_check
      check (status in ('completed','failed','aborted','running'));
  end if;
end $$;

-- 3. Notificar PostgREST para recargar schema cache
select pg_notify('pgrst', 'reload schema');

commit;
