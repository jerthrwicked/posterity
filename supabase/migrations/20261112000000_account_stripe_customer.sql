-- Posterity — one Stripe customer per account · Walker Brown
--
-- Stage 4.2, payment setup. Until now each checkout sent Stripe the customer's
-- email address and Stripe opened a new customer for it, so an account that
-- paid twice sat with two Stripe customers, each holding its own payment
-- method. Payment setup (Master Specification, Settings: Payment setup) is one
-- saved payment method for the account, which needs the account to be one
-- customer within Stripe.
--
-- accounts.stripe_customer_id holds that customer. The first checkout opens
-- it and every later one reuses it (lib/posterity/stripe-customer.js, with the
-- service role). It sits on accounts because it is one value per account and
-- is needed before any subscription row exists. The customer may read it; an
-- id opens nothing without Posterity's Stripe key. guard_account_columns keeps
-- it out of the customer's hands, as it does the phase and storage columns: an
-- account that could set it could point its checkout at another account's
-- customer and its saved payment method.

alter table public.accounts
  add column stripe_customer_id text;

comment on column public.accounts.stripe_customer_id is
  'The account''s one customer within Stripe: every checkout and the saved payment method belong to it. Set by Posterity only (guard_account_columns), by lib/posterity/stripe-customer.js at the first checkout.';

alter table public.accounts
  add constraint accounts_stripe_customer_id_shape
  check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$');

-- One Stripe customer belongs to one account.
create unique index accounts_stripe_customer_id_key
  on public.accounts (stripe_customer_id)
  where stripe_customer_id is not null;

-- The guard as 20261110000000_account_recovery left it, with stripe_customer_id
-- added.
create or replace function public.guard_account_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'accounts are created at signup'
      using errcode = 'insufficient_privilege';
  end if;
  if new.phase                is distinct from old.phase
  or new.phase_entered_at     is distinct from old.phase_entered_at
  or new.initiated_at         is distinct from old.initiated_at
  or new.interlude_at         is distinct from old.interlude_at
  or new.trigger_source       is distinct from old.trigger_source
  or new.trial_ends_at        is distinct from old.trial_ends_at
  or new.storage_paid_through is distinct from old.storage_paid_through
  or new.storage_lapsed_at    is distinct from old.storage_lapsed_at
  or new.storage_product      is distinct from old.storage_product then
    raise exception 'phase and storage are set by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  if new.phone_confirmed_at is distinct from old.phone_confirmed_at then
    raise exception 'a phone number is confirmed by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  if new.recovered_at is distinct from old.recovered_at then
    raise exception 'a recovery is recorded by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'the Stripe customer is set by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
