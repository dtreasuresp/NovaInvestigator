begin;

alter table public.investigations
  add column if not exists idempotency_key text;

create unique index if not exists investigations_tenant_idempotency_key_uidx
  on public.investigations (tenant_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.protect_investigation_idempotency_key()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.idempotency_key is distinct from old.idempotency_key then
    raise exception using
      errcode = '42501',
      message = 'investigation idempotency key is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists investigations_protect_idempotency_key on public.investigations;
create trigger investigations_protect_idempotency_key
before update on public.investigations
for each row execute function public.protect_investigation_idempotency_key();

revoke all on function public.protect_investigation_idempotency_key() from public;

commit;
