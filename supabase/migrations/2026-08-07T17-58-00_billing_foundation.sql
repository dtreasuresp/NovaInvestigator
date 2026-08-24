begin;

create extension if not exists pgcrypto;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9_-]*$'),
  name text not null,
  description text,
  provider_product_id text,
  provider_price_id text,
  currency text not null
    check (currency in ('USD', 'EUR', 'CLP')),
  interval text not null
    check (interval in ('one_time', 'month', 'year')),
  amount_minor integer not null
    check (amount_minor >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0
    check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    not is_active
    or code = 'enterprise'
    or (provider_price_id is not null and amount_minor > 0)
  )
);

create unique index if not exists plans_provider_product_unique
  on public.plans (provider_product_id)
  where provider_product_id is not null;

create unique index if not exists plans_provider_price_unique
  on public.plans (provider_price_id)
  where provider_price_id is not null;

create index if not exists plans_active_order_idx
  on public.plans (is_active, display_order, code);

comment on table public.plans is
  'Commercial products. A plan is not an authorization role.';
comment on column public.plans.amount_minor is
  'Price in the smallest unit of currency. Never calculate this value in the client.';

create table if not exists public.plan_entitlements (
  plan_id uuid not null references public.plans(id) on delete cascade,
  entitlement_key text not null
    check (length(trim(entitlement_key)) > 0),
  limit_value numeric
    check (limit_value is null or limit_value >= 0),
  is_enabled boolean not null default true,
  primary key (plan_id, entitlement_key)
);

create index if not exists plan_entitlements_enabled_idx
  on public.plan_entitlements (plan_id, is_enabled);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  provider_customer_id text not null,
  provider_subscription_id text not null unique,
  status text not null
    check (status in ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    current_period_end is null
    or current_period_start is null
    or current_period_end >= current_period_start
  )
);

create index if not exists subscriptions_tenant_status_idx
  on public.subscriptions (tenant_id, status, updated_at desc);

create index if not exists subscriptions_provider_customer_idx
  on public.subscriptions (provider_customer_id);

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid unique references public.tenants(id) on delete set null,
  provider_customer_id text not null unique,
  billing_email text,
  country text,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider_invoice_id text not null unique,
  status text not null
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  number text,
  amount_minor integer not null
    check (amount_minor >= 0),
  currency text not null
    check (currency in ('USD', 'EUR', 'CLP')),
  issued_at timestamptz,
  paid_at timestamptz,
  hosted_invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_invoices_tenant_issued_idx
  on public.billing_invoices (tenant_id, issued_at desc);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (length(trim(provider)) > 0),
  provider_event_id text not null,
  event_type text not null
    check (length(trim(event_type)) > 0),
  payload_sanitized jsonb not null,
  status text not null
    check (status in ('received', 'processed', 'failed')),
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_webhook_events_status_created_idx
  on public.billing_webhook_events (status, created_at desc);

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

drop trigger if exists billing_invoices_set_updated_at on public.billing_invoices;
create trigger billing_invoices_set_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

create or replace function public.prevent_billing_invoice_delete()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'billing_invoices are append-only';
end;
$$;

drop trigger if exists billing_invoices_no_delete on public.billing_invoices;
create trigger billing_invoices_no_delete
before delete on public.billing_invoices
for each row execute function public.prevent_billing_invoice_delete();

create or replace function public.prevent_billing_webhook_event_delete()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'billing_webhook_events are append-only';
end;
$$;

drop trigger if exists billing_webhook_events_no_delete on public.billing_webhook_events;
create trigger billing_webhook_events_no_delete
before delete on public.billing_webhook_events
for each row execute function public.prevent_billing_webhook_event_delete();

-- These rows are inactive until a real Stripe price is configured. The
-- migration deliberately does not invent currency amounts or provider IDs.
insert into public.plans (
  code,
  name,
  description,
  currency,
  interval,
  amount_minor,
  is_active,
  display_order
)
values
  (
    'one_time_access',
    'One-time access',
    'A single access window for one investigation.',
    'USD',
    'one_time',
    0,
    false,
    10
  ),
  (
    'basic',
    'Basic',
    'A focused workspace for individual investigation workflows.',
    'USD',
    'month',
    0,
    false,
    20
  ),
  (
    'team',
    'Team',
    'Shared investigation workflows for small teams.',
    'USD',
    'month',
    0,
    false,
    30
  ),
  (
    'enterprise',
    'Enterprise',
    'Managed workspace plan with limits configured per tenant.',
    'USD',
    'month',
    0,
    false,
    40
  )
on conflict (code) do nothing;

insert into public.plan_entitlements (plan_id, entitlement_key, limit_value)
select plan_row.id, entitlement.entitlement_key, entitlement.limit_value
from public.plans as plan_row
join (
  values
    ('basic', 'investigations.create', null::numeric),
    ('basic', 'investigations.max_active', 5::numeric),
    ('basic', 'investigations.export_pdf', 1::numeric),
    ('basic', 'investigations.export_pdf_monthly', 10::numeric),
    ('basic', 'users.max_members', 1::numeric),
    ('basic', 'storage.max_bytes', 104857600::numeric),
    ('basic', 'modules.investigator', null::numeric),
    ('team', 'investigations.create', null::numeric),
    ('team', 'investigations.max_active', 50::numeric),
    ('team', 'investigations.export_pdf', 1::numeric),
    ('team', 'investigations.export_pdf_monthly', 100::numeric),
    ('team', 'users.max_members', 10::numeric),
    ('team', 'storage.max_bytes', 1073741824::numeric),
    ('team', 'modules.investigator', null::numeric)
) as entitlement(plan_code, entitlement_key, limit_value)
  on entitlement.plan_code = plan_row.code
on conflict (plan_id, entitlement_key) do nothing;

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_webhook_events enable row level security;

drop policy if exists plans_select_active on public.plans;
create policy plans_select_active
on public.plans
for select
to anon, authenticated
using (is_active);

drop policy if exists plan_entitlements_select_active on public.plan_entitlements;
create policy plan_entitlements_select_active
on public.plan_entitlements
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.plans as plan_row
    where plan_row.id = plan_entitlements.plan_id
      and plan_row.is_active
  )
);

drop policy if exists subscriptions_select_managed on public.subscriptions;
create policy subscriptions_select_managed
on public.subscriptions
for select
to authenticated
using (
  public.has_capability(auth.uid(), tenant_id, 'billing.subscription.read')
);

drop policy if exists billing_customers_select_managed on public.billing_customers;
create policy billing_customers_select_managed
on public.billing_customers
for select
to authenticated
using (
  tenant_id is not null
  and public.has_capability(auth.uid(), tenant_id, 'billing.subscription.read')
);

drop policy if exists billing_invoices_select_managed on public.billing_invoices;
create policy billing_invoices_select_managed
on public.billing_invoices
for select
to authenticated
using (
  tenant_id is not null
  and public.has_capability(auth.uid(), tenant_id, 'billing.invoices.read')
);

grant usage on schema public to anon, authenticated, service_role;
grant select on
  public.plans,
  public.plan_entitlements
to anon, authenticated;
grant select on
  public.subscriptions,
  public.billing_customers,
  public.billing_invoices
to authenticated;
grant all on
  public.plans,
  public.plan_entitlements,
  public.subscriptions,
  public.billing_customers,
  public.billing_invoices,
  public.billing_webhook_events
to service_role;

commit;
