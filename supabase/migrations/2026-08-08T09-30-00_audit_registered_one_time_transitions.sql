begin;

create or replace function public.audit_registered_one_time_grant_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.mode = 'one_time'
     and old.status is distinct from new.status
     and new.status in ('active', 'revoked') then
    insert into public.audit_logs (
      tenant_id,
      actor_user_id,
      source,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data
    )
    values (
      new.tenant_id,
      new.user_id,
      'system',
      case new.status
        when 'active' then 'billing.one_time.activated'
        else 'billing.one_time.revoked'
      end,
      'access_grant',
      new.id,
      jsonb_build_object(
        'status', old.status,
        'provider_checkout_id', old.provider_checkout_id
      ),
      jsonb_build_object(
        'status', new.status,
        'provider_checkout_id', new.provider_checkout_id,
        'provider_payment_id', new.provider_payment_id,
        'starts_at', new.starts_at,
        'expires_at', new.expires_at
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists access_grants_audit_registered_one_time_transition on public.access_grants;
create trigger access_grants_audit_registered_one_time_transition
after update on public.access_grants
for each row
execute function public.audit_registered_one_time_grant_transition();

revoke all on function public.audit_registered_one_time_grant_transition() from public, anon, authenticated;
grant execute on function public.audit_registered_one_time_grant_transition() to service_role;

commit;
