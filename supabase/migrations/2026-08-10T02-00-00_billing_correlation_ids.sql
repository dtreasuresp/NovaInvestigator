begin;

-- Extends the trial closeout RPC without editing the previous migration. The
-- two-argument function remains available for compatibility; Billing uses this
-- overload so the upgrade audit carries the request correlation id.
create or replace function public.close_tenant_active_trial_grants(
  p_tenant_id uuid,
  p_actor uuid,
  p_correlation_id text default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_closed integer := 0;
  v_grant_id uuid;
  v_correlation_id text := nullif(btrim(p_correlation_id), '');
begin
  if p_tenant_id is null then
    raise exception using errcode = '22023', message = 'tenant_required';
  end if;

  if v_correlation_id is not null
     and (
       length(v_correlation_id) > 128
       or v_correlation_id !~ '^[A-Za-z0-9._:-]+$'
     ) then
    raise exception using errcode = '22023', message = 'correlation_id_invalid';
  end if;

  for v_grant_id in
    update public.access_grants as grant_row
       set status = 'revoked',
           revoked_at = clock_timestamp(),
           updated_at = clock_timestamp()
     where grant_row.tenant_id = p_tenant_id
       and grant_row.mode = 'trial'
       and grant_row.status = 'active'
     returning grant_row.id
  loop
    v_closed := v_closed + 1;

    insert into public.audit_logs (
      tenant_id,
      actor_user_id,
      source,
      action,
      entity_type,
      entity_id,
      metadata
    )
    values (
      p_tenant_id,
      p_actor,
      'system',
      'billing.trial_grant.closed_on_upgrade',
      'access_grant',
      v_grant_id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'mode', 'trial',
          'closed_at', clock_timestamp(),
          'actor', p_actor,
          'reason', 'subscription_activated',
          'correlation_id', v_correlation_id
        )
      )
    );
  end loop;

  return v_closed;
end;
$$;

revoke all on function public.close_tenant_active_trial_grants(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.close_tenant_active_trial_grants(uuid, uuid, text)
  to service_role;

commit;
