-- Stage 4.3 — the cart's payment records: checkouts and their lines · Walker Brown
--
-- The Master Specification's cart holds no record of its own: it is "all plans
-- currently being built, as well any purchased Additional Recipients and/or
-- skipped year storage fees" (User Profiles), read from the unpaid plans. What
-- needs a record is a payment. "Plans can be paid for individually or all at
-- once", so one payment can fund several plans, each with its inclusions, and
-- Financial Architecture asks for a "full audit trail for every payment,
-- refund, dispute, and transfer: timestamp, amount, customer ID, plan year."
--
-- A checkout is one opening of the payment form. Its lines are what it was
-- opened for, each priced as it stood at that moment: a plan, its Additional
-- Recipient slots, a skipped plan year's storage fee, or the storage fee
-- itself where it was not current (Horizon Tier: "Paying for a plan without a
-- current storage fee automatically adds the storage fee at checkout"). The
-- checkout also holds when the customer accepted the refund policy (Legal and
-- Compliance: "the customer accepts it before paying", and a dispute's answer
-- "carries the payer's acceptance of the refund policy").
--
-- A paid checkout is applied by apply_checkout below, in one transaction: each
-- plan it funded is marked paid, each skipped plan year's fee is written to
-- storage_fees, and the first plan paid initiates the account (Plan Year
-- System: "Paying for the first plan initiates the account and moves it into
-- the Planning Phase"). The Stripe webhook and the customer's browser
-- returning from the payment form both call it, and the second changes
-- nothing.
--
-- While a payment form is open, the plans it was opened for must not change
-- under it. The server closes the form before it changes a plan
-- (lib/posterity/checkout.js); the trigger on plans below refuses the change
-- if that was ever missed.
--
-- This replaces the webhook's interim record of a plan payment within
-- subscriptions, which holds storage subscriptions only from here on. No such
-- row was ever written.
--
-- It moves and removes no data.

-- ============================================================ checkouts

create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  -- open: the payment form may still be paid. paid: it was, and the payment is
  -- applied. expired: the form was closed unpaid.
  status text not null default 'open',
  -- The sign-in that opened the form and accepted the refund policy.
  opened_by uuid not null,
  refund_policy_accepted_at timestamptz not null,
  -- payment: plans and their inclusions alone. subscription: the storage fee
  -- was not current, so the storage subscription opens with the same payment.
  mode text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_customer_id text,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_subscription_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkouts_status_check check (status in ('open', 'paid', 'expired')),
  constraint checkouts_mode_check check (mode in ('payment', 'subscription')),
  constraint checkouts_amount_check check (amount_cents >= 0),
  constraint checkouts_paid_check check ((status = 'paid') = (paid_at is not null))
);

comment on table public.checkouts is
  'One opening of the payment form from the cart. Written by the server only (lib/posterity/checkout.js); the customer reads their own.';
comment on column public.checkouts.opened_by is 'The sign-in that opened the form and accepted the refund policy.';
comment on column public.checkouts.refund_policy_accepted_at is 'When the customer accepted the refund policy, before the form opened.';
comment on column public.checkouts.amount_cents is 'What the form asked for, the storage fee included where it was added.';
comment on column public.checkouts.stripe_payment_intent_id is 'The payment within Stripe, once paid. A refund is issued against it.';

create index checkouts_account_idx on public.checkouts (account_id);

-- An account has one payment form open at a time. Opening another closes the
-- one before it first.
create unique index checkouts_one_open_per_account on public.checkouts (account_id) where status = 'open';

create trigger t_checkouts
  before update on public.checkouts
  for each row execute function public.touch_updated_at();

alter table public.checkouts enable row level security;
revoke all on public.checkouts from anon, authenticated;
grant select on public.checkouts to authenticated;
create policy own_read on public.checkouts for select
  using (account_id in (select accounts.id from public.accounts where accounts.user_id = (select auth.uid())));

-- ============================================================ checkout lines

create table public.checkout_lines (
  id uuid primary key default gen_random_uuid(),
  checkout_id uuid not null references public.checkouts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  -- plan: a plan. recipient_slots: its Additional Recipient slots.
  -- skipped_year: the storage fee of one skipped plan year. storage: the
  -- storage fee itself, added because it was not current.
  kind text not null,
  -- The plan the line belongs to. A skipped plan year belongs to the plan
  -- after it. Empty for the storage fee.
  plan_id uuid references public.plans(id) on delete set null,
  -- The plan's year, or the skipped year itself. Empty for the storage fee.
  plan_year integer,
  -- The plan's tier as it stood, or the storage product for the storage fee.
  tier text not null,
  quantity integer not null default 1,
  unit_amount_cents integer not null,
  stripe_price_id text not null,
  created_at timestamptz not null default now(),
  constraint checkout_lines_kind_check check (kind in ('plan', 'recipient_slots', 'skipped_year', 'storage')),
  constraint checkout_lines_quantity_check check (quantity >= 1),
  constraint checkout_lines_amount_check check (unit_amount_cents >= 0),
  constraint checkout_lines_plan_year_check check ((kind = 'storage') = (plan_year is null))
);

comment on table public.checkout_lines is
  'What a checkout was opened for, each line priced as it stood. Written by the server only; the customer reads their own.';
comment on column public.checkout_lines.plan_id is
  'The plan the line belongs to: the plan itself, the plan its slots are on, or the plan after a skipped year. Empty once that plan is deleted.';

create index checkout_lines_checkout_idx on public.checkout_lines (checkout_id);
create index checkout_lines_account_idx on public.checkout_lines (account_id);
create index checkout_lines_plan_idx on public.checkout_lines (plan_id);

alter table public.checkout_lines enable row level security;
revoke all on public.checkout_lines from anon, authenticated;
grant select on public.checkout_lines to authenticated;
create policy own_read on public.checkout_lines for select
  using (account_id in (select accounts.id from public.accounts where accounts.user_id = (select auth.uid())));

-- ============================================================ a skipped year's fee names its payment and its plan

-- Legal and Compliance: "A skipped plan year's fee is the exception, and it is
-- refunded with its plan." So a paid fee says which plan it was paid with, and
-- which checkout paid it.
alter table public.storage_fees
  add column checkout_id uuid references public.checkouts(id) on delete set null,
  add column plan_id uuid references public.plans(id) on delete set null;

comment on column public.storage_fees.checkout_id is 'The checkout that paid the fee.';
comment on column public.storage_fees.plan_id is 'The plan the fee was paid with: the plan after the skipped year.';

create index storage_fees_checkout_idx on public.storage_fees (checkout_id);
create index storage_fees_plan_idx on public.storage_fees (plan_id);

-- ============================================================ plans hold still while a payment form is open

-- A plan is added, moved, re-tiered, given slots, or deleted only once the
-- account's open payment form is closed, so a payment never lands on a cart
-- that has changed under it. The server closes the form first; this refuses
-- the change with checkout_open where it did not. Marking a plan paid is not
-- one of these changes, and the delivery time zone carries no price.
--
-- A plan removed because its whole account is being removed is let through:
-- by then the account's row is already gone.
create or replace function public.refuse_plan_change_during_checkout()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_account uuid := case when tg_op = 'DELETE' then old.account_id else new.account_id end;
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.accounts where id = v_account) then
    return old;
  end if;
  if exists (select 1 from public.checkouts where account_id = v_account and status = 'open') then
    raise exception 'checkout_open';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger refuse_plan_change_during_checkout
  before insert or delete or update of tier, plan_year, additional_recipient_slots on public.plans
  for each row execute function public.refuse_plan_change_during_checkout();

-- ============================================================ applying a paid checkout

-- Applies a checkout Stripe holds as paid. The caller has already confirmed
-- that with Stripe; this records it, all of it or none.
--
--   each plan it funded is marked paid, unless it already is
--   each skipped plan year's fee is written to storage_fees as paid
--   the checkout is marked paid, with its payment within Stripe
--   where it funded a plan and the account is in the Horizon Phase, the
--   account is initiated and moves to the Planning Phase
--
-- A payment for skipped plan years alone initiates nothing (Legal and
-- Compliance: "Initiation is the first non-storage payment within the
-- system"). The storage fee, where the checkout added it, is recorded by the
-- server as a storage subscription and is not this function's work.
--
-- Returns what it did: { already, plans, fees, initiated }. Applying a paid
-- checkout again returns already = true and changes nothing. A checkout
-- marked expired that Stripe nonetheless took payment for is applied as any
-- other.
--
-- Refused with no_checkout where there is no such checkout.
create or replace function public.apply_checkout(
  p_checkout_id uuid,
  p_payment_intent text,
  p_subscription text,
  p_paid_at timestamptz
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_checkout public.checkouts;
  v_account public.accounts;
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_plans integer;
  v_fees integer;
  v_initiated boolean := false;
begin
  select * into v_checkout from public.checkouts where id = p_checkout_id;
  if not found then
    raise exception 'no_checkout';
  end if;
  -- The account's row first, as place_plan and move_plan take it, so this and
  -- any change to the account's plans run one after the other.
  select * into v_account from public.accounts where id = v_checkout.account_id for update;
  select * into v_checkout from public.checkouts where id = p_checkout_id for update;
  if v_checkout.status = 'paid' then
    return jsonb_build_object('already', true, 'plans', 0, 'fees', 0, 'initiated', false);
  end if;

  update public.plans p
     set paid_at = v_paid_at
   where p.account_id = v_checkout.account_id
     and p.paid_at is null
     and p.id in (select l.plan_id from public.checkout_lines l
                   where l.checkout_id = p_checkout_id and l.kind = 'plan');
  get diagnostics v_plans = row_count;

  insert into public.storage_fees (account_id, plan_year, amount_cents, paid_at, checkout_id, plan_id)
  select v_checkout.account_id, l.plan_year, l.unit_amount_cents, v_paid_at, p_checkout_id, l.plan_id
    from public.checkout_lines l
   where l.checkout_id = p_checkout_id and l.kind = 'skipped_year'
  on conflict (account_id, plan_year) do update
     set paid_at = excluded.paid_at,
         amount_cents = excluded.amount_cents,
         checkout_id = excluded.checkout_id,
         plan_id = excluded.plan_id
   where public.storage_fees.paid_at is null;
  get diagnostics v_fees = row_count;

  update public.checkouts
     set status = 'paid',
         paid_at = v_paid_at,
         stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
         stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id)
   where id = p_checkout_id;

  if v_account.phase = 'horizon'
     and exists (select 1 from public.checkout_lines l
                  where l.checkout_id = p_checkout_id and l.kind = 'plan') then
    update public.accounts
       set phase = 'planning',
           phase_entered_at = now(),
           initiated_at = coalesce(initiated_at, v_paid_at)
     where id = v_checkout.account_id;
    insert into public.account_phase_events (account_id, from_phase, to_phase, note)
    values (v_checkout.account_id, 'horizon', 'planning',
            format('initiated by plan payment (checkout %s)', p_checkout_id));
    v_initiated := true;
  end if;

  return jsonb_build_object('already', false, 'plans', v_plans, 'fees', v_fees, 'initiated', v_initiated);
end;
$$;

-- Only the server calls it. Marking a plan paid is refused to a customer's own
-- token by guard_plan_columns, and moving the phase by guard_account_columns.
revoke execute on function public.apply_checkout(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_checkout(uuid, text, text, timestamptz) to service_role;
