begin;

create table if not exists public.billing_purchase_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  line1 text,
  line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

create index if not exists billing_purchase_addresses_tenant_idx
  on public.billing_purchase_addresses (tenant_id);

drop trigger if exists billing_purchase_addresses_set_updated_at
  on public.billing_purchase_addresses;
create trigger billing_purchase_addresses_set_updated_at
before update on public.billing_purchase_addresses
for each row execute function public.set_updated_at();

alter table public.billing_purchase_addresses enable row level security;

revoke all on table public.billing_purchase_addresses from public, anon, authenticated;
grant all on table public.billing_purchase_addresses to service_role;
grant select on table public.billing_purchase_addresses to authenticated;

-- Own-row reads only. Writes go through the security-definer RPC below, which
-- re-checks that the caller has Checkout authorization for the workspace so a
-- member can never persist an address for a workspace they are not allowed to
-- buy for (or, worse, for another user's row).
drop policy if exists billing_purchase_addresses_select_own
  on public.billing_purchase_addresses;
create policy billing_purchase_addresses_select_own
  on public.billing_purchase_addresses
  for select
  using (auth.uid() = user_id);

create or replace function public.upsert_billing_purchase_address(
  p_tenant_id uuid,
  p_workspace_id uuid,
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
    nullif(trim(coalesce(p_line1, '')), ''),
    nullif(trim(coalesce(p_line2, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_state, '')), ''),
    nullif(trim(coalesce(p_postal_code, '')), ''),
    nullif(trim(coalesce(p_country, '')), '')
  )
  on conflict (user_id, workspace_id) do update
  set
    line1 = excluded.line1,
    line2 = excluded.line2,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    country = excluded.country,
    updated_at = clock_timestamp()
  returning * into v_address;

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
      'hasStreet', v_address.line1 is not null or v_address.postal_code is not null
    )
  );

  return query
  select
    v_address.id,
    v_address.user_id,
    v_address.tenant_id,
    v_address.workspace_id,
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

revoke all on function public.upsert_billing_purchase_address(uuid, uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.upsert_billing_purchase_address(uuid, uuid, text, text, text, text, text, text) to authenticated, service_role;

commit;