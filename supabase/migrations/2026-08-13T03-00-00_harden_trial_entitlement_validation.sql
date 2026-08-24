begin;

create or replace function public.validate_trial_policy_entitlement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_namespace text;
  v_key text;
begin
  v_namespace := split_part(new.entitlement_key, '.', 1);
  v_key := substring(new.entitlement_key from position('.' in new.entitlement_key) + 1);

  if v_namespace = 'modules' then
    if not exists (
      select 1
      from public.platform_modules as module_row
      where module_row.module_key = v_key
        and module_row.is_active
    ) then
      raise exception using
        errcode = '23514',
        message = 'trial_module_not_configured';
    end if;
  elsif v_namespace = 'actions' then
    if v_key like 'platform.%' then
      raise exception using
        errcode = '23514',
        message = 'trial_platform_action_not_allowed';
    end if;

    if not exists (
      select 1
      from public.capabilities as capability
      where capability.key = v_key
        and capability.is_active
    ) then
      raise exception using
        errcode = '23514',
        message = 'trial_action_not_configured';
    end if;
  elsif v_namespace = 'limits' then
    if new.limit_value is null then
      raise exception using
        errcode = '23514',
        message = 'trial_limit_value_required';
    end if;
  else
    raise exception using
      errcode = '23514',
      message = 'trial_entitlement_namespace_invalid';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_trial_policy_entitlement() from public, anon, authenticated;

create or replace function public.get_trial_policy_entitlements_json(
  p_policy_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', entitlement.entitlement_key,
        'limitValue', entitlement.limit_value,
        'isEnabled', entitlement.is_enabled
      )
      order by entitlement.entitlement_key
    ),
    '[]'::jsonb
  )
  from public.trial_policy_entitlements as entitlement
  where entitlement.policy_id = p_policy_id
    and (
      entitlement.entitlement_key not like 'modules.%'
      or exists (
        select 1
        from public.platform_modules as module_row
        where module_row.module_key = substring(entitlement.entitlement_key from char_length('modules.') + 1)
          and module_row.is_active
      )
    );
$$;

revoke all on function public.get_trial_policy_entitlements_json(uuid) from public, anon, authenticated;

grant select on table public.platform_modules to authenticated;

drop policy if exists platform_modules_select_active_authenticated on public.platform_modules;
create policy platform_modules_select_active_authenticated
on public.platform_modules
for select
to authenticated
using (is_active);

commit;
