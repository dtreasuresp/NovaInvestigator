begin;

-- Personal billing information for the purchase wizard
-- (doc/plans/PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md section 12.3.1).
-- `first_name`, `last_name` and `mobile` are stored per (user, workspace)
-- alongside the purchase address; they are supplied by the buyer on step 2
-- (Personal Information) and reused for future transactions.

alter table public.billing_purchase_addresses
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists mobile text;

drop function if exists public.upsert_billing_purchase_address(
  uuid, uuid, text, text, text, text, text, text
);

create or replace function public.upsert_billing_purchase_address(
  p_tenant_id uuid,
  p_workspace_id uuid,
  p_first_name text default null,
  p_last_name text default null,
  p_mobile text default null,
  p_line1 text default null,
  p_line2 text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country text default null
)
returns table (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  workspace_id uuid,
  first_name text,
  last_name text,
  mobile text,
  line1 text,
  line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.billing_purchase_addresses%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.authorize_billing_checkout(v_user_id, p_tenant_id, p_workspace_id)
  ) then
    raise exception using errcode = '42501', message = 'billing_purchase_not_allowed';
  end if;

  insert into public.billing_purchase_addresses (
    user_id,
    tenant_id,
    workspace_id,
    first_name,
    last_name,
    mobile,
    line1,
    line2,
    city,
    state,
    postal_code,
    country
  )
  values (
    v_user_id,
    p_tenant_id,
    p_workspace_id,
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    nullif(trim(coalesce(p_mobile, '')), ''),
    nullif(trim(coalesce(p_line1, '')), ''),
    nullif(trim(coalesce(p_line2, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_postal_code, '')), ''),
    nullif(trim(coalesce(p_country, '')), '')
  )
  on conflict (user_id, workspace_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    mobile = excluded.mobile,
    line1 = excluded.line1,
    line2 = excluded.line2,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    country = excluded.country,
    updated_at = clock_timestamp()
  returning * into v_address;

  -- Audit without PII: only the country and whether a street was provided.
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
    p_tenant_id,
    v_user_id,
    'user',
    'billing.purchase.address.upserted',
    'billing_purchase_address',
    v_address.id,
    jsonb_build_object(
      'workspaceId', v_address.workspace_id,
      'country', v_address.country,
      'hasStreet', v_address.line1 is not null or v_address.postal_code is not null,
      'hasPersonalInfo', v_address.first_name is not null or v_address.last_name is not null or v_address.mobile is not null
    )
  );

  return query
  select
    v_address.id,
    v_address.user_id,
    v_address.tenant_id,
    v_address.workspace_id,
    v_address.first_name,
    v_address.last_name,
    v_address.mobile,
    v_address.line1,
    v_address.line2,
    v_address.city,
    v_address.state,
    v_address.postal_code,
    v_address.country,
    v_address.created_at,
    v_address.updated_at;
end;
$$;

revoke all on function public.upsert_billing_purchase_address(
  uuid, uuid, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.upsert_billing_purchase_address(
  uuid, uuid, text, text, text, text, text, text, text, text, text
) to authenticated, service_role;

commit;