-- Stripe Tax values are copied from signed webhook payloads for accounting
-- visibility. Tax IDs are retained server-side and are not exposed in the
-- regular billing summary.
alter table public.billing_invoices
  add column if not exists tax_amount_minor integer
    check (tax_amount_minor is null or tax_amount_minor >= 0),
  add column if not exists tax_id text;

comment on column public.billing_invoices.tax_amount_minor is
  'Total Stripe Tax amount in the invoice currency minor unit.';

comment on column public.billing_invoices.tax_id is
  'Customer tax identifier captured by Stripe Checkout or attached to the invoice.';
