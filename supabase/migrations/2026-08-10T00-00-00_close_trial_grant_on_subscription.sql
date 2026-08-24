begin;

-- GAP 5 (plan section 7.3): cuando un tenant activa una suscripción
-- (checkout.session.completed en modo subscription), cualquier grant de
-- trial aún activo debe cerrarse literalmente (status='revoked' +
-- revoked_at) y auditarse, aunque `evaluateCommercialAccess` ya priorice la
-- suscripción. Esto es una redundancia de seguridad: elimina los grants de
-- trial activos para que ningún flujo residual pueda utilizarlos.

-- `access_grants` no tenía `revoked_at` (solo `consumed_at`); se añade de
-- forma aditiva y forward-only. No se reutiliza `consumed_at` porque ese
-- campo semánticamente pertenece a grants consumidos por uso, no a un cierre
-- administrativo por upgrade.
alter table public.access_grants
  add column if not exists revoked_at timestamptz;

-- Helper de auditoría reutilizable por la función de cierre: registra en
-- `audit_logs` cada grant de trial cerrado por activación de suscripción.
create or replace function public.close_tenant_active_trial_grants(
  p_tenant_id uuid,
  p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_closed integer := 0;
  v_grant_id uuid;
begin
  if p_tenant_id is null then
    raise exception using errcode = '22023', message = 'tenant_required';
  end if;

  -- Actualiza y audita en la misma operación. El `returning` hace que los
  -- reintentos concurrentes solo auditen las filas que este invocador cerró.
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
      jsonb_build_object(
        'mode', 'trial',
        'closed_at', clock_timestamp(),
        'actor', p_actor,
        'reason', 'subscription_activated'
      )
    );
  end loop;

  return v_closed;
end;
$$;

revoke all on function public.close_tenant_active_trial_grants(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.close_tenant_active_trial_grants(uuid, uuid)
  to service_role;

commit;
