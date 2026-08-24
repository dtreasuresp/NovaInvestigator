begin;

-- =============================================================================
-- Migration: 2026-08-26T00-00-00_investigation_ai_reports.sql
-- Description: Persistencia del último dictamen con IA por investigación.
--   - Siempre guarda la última versión (upsert por investigation_id).
--   - Tenant-scoped, RLS + capability ai.report para lectura/escritura.
--   - Si el usuario hace 5 redacciones, solo queda la última (1 fila).
-- Reference: doc/plans/2026-08-22_PLAN_NOVAI_ENRIQUECIMIENTO_REPORT_Y_SYNC.md §5.1
-- =============================================================================

create table if not exists public.investigation_ai_reports (
  investigation_id uuid primary key
    references public.investigations(id) on delete cascade,
  tenant_id uuid not null
    references public.tenants(id) on delete cascade,
  report_text text not null check (length(btrim(report_text)) > 0),
  locale text not null default 'es'
    check (locale in ('es','en','de','ko','pt')),
  format text not null default 'academic'
    check (format in ('academic','executive','thesis')),
  model text,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investigation_ai_reports_tenant_idx
  on public.investigation_ai_reports (tenant_id);

-- Reusa el trigger genérico de updated_at ya existente
drop trigger if exists investigation_ai_reports_set_updated_at on public.investigation_ai_reports;
create trigger investigation_ai_reports_set_updated_at
before update on public.investigation_ai_reports
for each row execute function public.set_updated_at();

-- Validación de tenant coherente con la investigación referenciada
create or replace function public.validate_investigation_ai_report_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_investigation_tenant uuid;
begin
  select i.tenant_id into v_investigation_tenant
  from public.investigations as i
  where i.id = new.investigation_id;

  if v_investigation_tenant is null then
    raise exception using errcode = '23503', message = 'investigation not found for ai report';
  end if;

  if v_investigation_tenant <> new.tenant_id then
    raise exception using errcode = '23514', message = 'ai report tenant does not match investigation tenant';
  end if;

  -- updated_at se maneja por trigger; generated_at siempre ahora en inserts/updates
  new.generated_at := clock_timestamp();

  if TG_OP = 'INSERT' then
    new.created_at := clock_timestamp();
  end if;

  return new;
end;
$$;

drop trigger if exists investigation_ai_reports_validate_scope on public.investigation_ai_reports;
create trigger investigation_ai_reports_validate_scope
before insert or update on public.investigation_ai_reports
for each row execute function public.validate_investigation_ai_report_scope();

revoke all on function public.validate_investigation_ai_report_scope() from public;

alter table public.investigation_ai_reports enable row level security;

-- SELECT: miembro activo + ai.report o investigations.read
drop policy if exists investigation_ai_reports_select_visible on public.investigation_ai_reports;
create policy investigation_ai_reports_select_visible
on public.investigation_ai_reports
for select
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and (
    public.has_capability(auth.uid(), tenant_id, 'ai.report')
    or public.has_capability(auth.uid(), tenant_id, 'investigations.read')
  )
);

-- INSERT: debe ser dueño del insert y tener ai.report
drop policy if exists investigation_ai_reports_insert_authorized on public.investigation_ai_reports;
create policy investigation_ai_reports_insert_authorized
on public.investigation_ai_reports
for insert
to authenticated
with check (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'ai.report')
  and (generated_by is null or generated_by = auth.uid())
);

-- UPDATE: mismo guard que insert (upsert vía RLS)
drop policy if exists investigation_ai_reports_update_authorized on public.investigation_ai_reports;
create policy investigation_ai_reports_update_authorized
on public.investigation_ai_reports
for update
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'ai.report')
)
with check (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'ai.report')
);

-- DELETE: solo owner/admin con ai.report (no se usa en flujo normal, pero por completitud)
drop policy if exists investigation_ai_reports_delete_authorized on public.investigation_ai_reports;
create policy investigation_ai_reports_delete_authorized
on public.investigation_ai_reports
for delete
to authenticated
using (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  and public.has_capability(auth.uid(), tenant_id, 'ai.report')
);

grant usage on schema public to authenticated, service_role;

grant select on public.investigation_ai_reports to authenticated;
grant insert (investigation_id, tenant_id, report_text, locale, format, model, generated_by) on public.investigation_ai_reports to authenticated;
grant update (report_text, locale, format, model, generated_by) on public.investigation_ai_reports to authenticated;
grant delete on public.investigation_ai_reports to authenticated;
grant all on public.investigation_ai_reports to service_role;

commit;
