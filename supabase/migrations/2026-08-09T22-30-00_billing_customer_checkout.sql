begin;

create or replace function public.create_billing_customer(
  p_tenant_id uuid,
  p_provider_customer_id text,
  p_billing_email text
)
returns table (
  id uuid,
  tenant_id uuid,
  provider_customer_id text,
  billing_email text,
  country text,
  tax_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_provider_customer_id text := nullif(trim(p_provider_customer_id), '');
  v_billing_email text := nullif(trim(coalesce(p_billing_email, '')), '');
  v_customer public.billing_customers%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_tenant_id is null or v_provider_customer_id is null then
    raise exception using errcode = '22023', message = 'invalid_billing_customer';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
      and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'account_setup_required';
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    join public.tenants as tenant on tenant.id = membership.tenant_id
    where membership.user_id = v_user_id
      and membership.tenant_id = p_tenant_id
      and membership.status = 'active'
      and tenant.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'tenant_required';
  end if;

  if not public.has_capability(v_user_id, p_tenant_id, 'billing.checkout.create') then
    raise exception using errcode = '42501', message = 'capability_denied';
  end if;

  select customer.*
  into v_customer
  from public.billing_customers as customer
  where customer.tenant_id = p_tenant_id
  for update;

  if found then
    if v_customer.provider_customer_id <> v_provider_customer_id then
      raise exception using errcode = '23505', message = 'billing_customer_conflict';
    end if;

    return query
    select
      v_customer.id,
      v_customer.tenant_id,
      v_customer.provider_customer_id,
      v_customer.billing_email,
      v_customer.country,
      v_customer.tax_id,
      v_customer.created_at,
      v_customer.updated_at;
    return;
  end if;

  insert into public.billing_customers (
    tenant_id,
    provider_customer_id,
    billing_email
  )
  values (
    p_tenant_id,
    v_provider_customer_id,
    v_billing_email
  )
  returning * into v_customer;

  return query
  select
    v_customer.id,
    v_customer.tenant_id,
    v_customer.provider_customer_id,
    v_customer.billing_email,
    v_customer.country,
    v_customer.tax_id,
    v_customer.created_at,
    v_customer.updated_at;
exception
  when unique_violation then
    select customer.*
    into v_customer
    from public.billing_customers as customer
    where customer.tenant_id = p_tenant_id
    for update;

    if found and v_customer.provider_customer_id = v_provider_customer_id then
      return query
      select
        v_customer.id,
        v_customer.tenant_id,
        v_customer.provider_customer_id,
        v_customer.billing_email,
        v_customer.country,
        v_customer.tax_id,
        v_customer.created_at,
        v_customer.updated_at;
      return;
    end if;

    raise;
end;
$$;

comment on function public.create_billing_customer(uuid, text, text) is
  'Creates or reuses the Stripe customer for an active tenant checkout without granting direct table writes.';

drop policy if exists billing_customers_select_managed on public.billing_customers;
create policy billing_customers_select_managed
on public.billing_customers
for select
to authenticated
using (
  tenant_id is not null
  and (
    public.has_capability(auth.uid(), tenant_id, 'billing.subscription.read')
    or public.has_capability(auth.uid(), tenant_id, 'billing.checkout.create')
  )
);

revoke all on function public.create_billing_customer(uuid, text, text) from public, anon;
grant execute on function public.create_billing_customer(uuid, text, text) to authenticated, service_role;

commit;
