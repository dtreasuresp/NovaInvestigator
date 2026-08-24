# Stripe Tax go-live checklist

This checklist is required before setting `STRIPE_TAX_ENABLED=true` in a
production environment. Stripe Tax calculates and collects tax only for
jurisdictions where the Stripe account has an active registration.

## Stripe account

- [ ] Set the business head-office address in **Dashboard > Tax > Settings**.
- [ ] Confirm Tax Settings show `active`, not `pending`.
- [ ] With the tax advisor, determine the jurisdictions where the business is
      already required to collect tax.
- [ ] Add each existing registration in **Dashboard > Tax > Locations** or
      through the Tax Registrations API. Adding a registration in Stripe does
      not register the business with the tax authority.
- [ ] Confirm the account's supported countries and tax types cover the
      intended customer locations.
- [ ] Decide with the tax advisor whether a local registration, EU OSS, or a
      filing partner is applicable. Stripe Tax does not file returns by itself.

## Stripe products and prices

- [ ] Assign a legally appropriate Stripe `tax_code` to every product. Do not
      use a generic or guessed `txcd_` value.
- [ ] Confirm each price has the intended `tax_behavior` (`exclusive`,
      `inclusive`, or `unspecified`) according to the business policy.
- [ ] Remove manual `tax_rates` and `default_tax_rates` from objects that use
      `automatic_tax`; the two mechanisms cannot be combined.
- [ ] Run a test Checkout for a representative B2B customer and verify that
      `tax_id_collection` accepts the intended tax ID type.

## Application configuration

- [ ] Set `STRIPE_TAX_ENABLED=true` only after the account checks above pass.
- [ ] Set `ALLOWED_TAX_COUNTRIES` to the approved ISO 3166-1 alpha-2 codes when
      Checkout must restrict collected shipping countries. Leave it empty only
      when the business intentionally relies on Stripe's active registrations
      and does not need an application allow-list.
- [ ] Configure the same values separately for each deployment environment.
- [ ] Apply the forward migration
      `2026-08-12T14-00-00_stripe_tax_invoice_fields.sql` before accepting paid
      webhooks in that environment.

## Verification and reconciliation

- [ ] Complete one test payment in each supported currency (`USD`, `EUR`, and
      `CLP`) and verify the invoice tax total in Stripe.
- [ ] Verify the `invoice.paid` webhook persists `tax_amount_minor` and the
      customer tax ID without exposing the tax ID in the regular billing UI.
- [ ] Verify the invoice history shows the tax amount in the invoice currency.
- [ ] Reconcile Stripe Tax reports with the accounting source before go-live.
- [ ] Repeat the registration check in live mode; sandbox registrations and
      sandbox volume do not transfer to live mode or count toward live nexus
      monitoring.

