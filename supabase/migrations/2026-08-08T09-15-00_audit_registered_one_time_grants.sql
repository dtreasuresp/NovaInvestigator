begin;

create or replace function public.audit_registered_one_time_grant_pending()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.mode = 'one_time' and new.status = 'pending' then
    insert into public.audit_logs (
      tenant_id,
      actor_user_id,
      source,
      action,
      entity_type,
      entity_id,
      after_data
    )
    values (
      new.tenant_id,
      new.user_id,
      'user',
      'billing.one_time.pending',
      'access_grant',
      new.id,
      jsonb_build_object(
        'mode', new.mode,
        'status', new.status,
        'max_uses', new.max_uses
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists access_grants_audit_registered_one_time_pending on public.access_grants;
create trigger access_grants_audit_registered_one_time_pending
after insert on public.access_grants
for each row
execute function public.audit_registered_one_time_grant_pending();

revoke all on function public.audit_registered_one_time_grant_pending() from public, anon, authenticated;
grant execute on function public.audit_registered_one_time_grant_pending() to service_role;

commit;
