-- Stage 4.1 — Account Status: one reading of the account, held in the database · Walker Brown
--
-- Every later screen asks the same questions of an account: which phase it is
-- in, whether storage is on trial, current, lapsed or ended, which storage
-- product it holds, whether building is open, and the state of Posterity
-- Social. account_status() answers all of them, and the row-level security
-- that locks building reads the same functions, so the page and the lock
-- cannot disagree.
--
-- Master Specification, Storage Lapse Grace Period:
--   "For a lapsed payment, the sequence begins once Stripe's automatic charge
--    fails its single retry, three days after the first attempt, or once a
--    payment request goes unpaid past its due date."
--   "Building and editing continue for the first three months and then lock
--    until storage is current."
-- Master Specification, Horizon Tier:
--   "The storage lapse sequence described below begins upon the free trial's
--    end date when no Storage Fee has been paid."
--   "The trial grants content building but not Posterity Social access, which
--    opens once a storage fee is paid."
-- Posterity Social:
--   "Posterity Social stays open through the year of a storage lapse. It closes
--    when that year ends and reopens once storage is paid."
--   "When the Account Trigger fires ... the profile becomes read-only."
--
-- What changes from 20260918120000: building no longer locks the moment a paid
-- year or the trial ends. It stays open through Stripe's retry and the first
-- three months of the lapse, and it closes at Interlude whatever is paid.
-- Held for funding (5.3) and deletion at Interlude (4.7) come later.

-- ============================================================ phase names

-- The confirmed names. Renaming an enum value changes its label only: rows
-- already holding it keep it, and the partial index on 'planning' is untouched.
alter type public.account_phase rename value 'abeyance' to 'interlude';
alter type public.account_phase rename value 'twilight' to 'reprise';

-- Set when the Account Trigger fires. Nothing reads it yet.
alter table public.accounts rename column abeyance_at to interlude_at;

-- ============================================================ new state

create type public.storage_product as enum (
  'horizon',   -- $9.99 a year
  'grace'      -- Grace Storage, $4.99 a year, kept once assigned
);

alter table public.accounts
  add column storage_lapsed_at timestamptz,
  add column storage_product   public.storage_product not null default 'horizon';

comment on column public.accounts.storage_lapsed_at is
  'When the current storage lapse began, recorded by the Stripe webhook: the single retry failed, or a payment request went unpaid past its due date. Cleared on payment. Ignored unless it falls after the last covered moment, so a stale value never reads as a lapse.';
comment on column public.accounts.storage_product is
  'The storage product the account holds. Grace Storage is kept once assigned (Master Spec, Grace Storage).';

-- ============================================================ the reading

-- The moment a paid-through date stops covering: noon UTC the day after, so the
-- date holds until it has ended in every timezone (20260918123000).
create or replace function public.storage_paid_end(p_paid_through date)
returns timestamptz
language sql
immutable
as $$
  select ((p_paid_through + 1)::timestamp + interval '12 hours') at time zone 'UTC'
$$;

-- The moment storage stops being current, given what is paid today: the trial's
-- end, the paid year's end plus Stripe's three-day retry, or the lapse the
-- webhook recorded. Never null for an account that exists. Storage is current
-- while this is in the future; once past, it is the day the lapse began. The
-- retry fallback holds if the webhook never hears of the failure.
create or replace function public.storage_lapse_at(p_account_id uuid)
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select case
           when a.storage_lapsed_at >= greatest(a.trial_ends_at, public.storage_paid_end(a.storage_paid_through))
             then a.storage_lapsed_at
           when public.storage_paid_end(a.storage_paid_through) >= a.trial_ends_at
             then public.storage_paid_end(a.storage_paid_through) + interval '3 days'
           else a.trial_ends_at
         end
    from public.accounts a
   where a.id = p_account_id
$$;

-- Kept for anything that asks only this, and now read from the same moment.
-- Storage standing ends with the storage subscription at the Account Trigger,
-- so Interlude and every later phase read false, as account_status says ended.
create or replace function public.storage_is_current(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
           a.phase in ('horizon', 'planning')
           and public.storage_lapse_at(a.id) > now(),
           false)
    from public.accounts a
   where a.id = p_account_id
$$;

-- Building is open in Horizon and Planning until three months into a lapse.
-- Interlude and every later phase are closed: content locks at the trigger.
create or replace function public.building_is_open(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
           a.phase in ('horizon', 'planning')
           and public.storage_lapse_at(a.id) + interval '3 months' > now(),
           false)
    from public.accounts a
   where a.id = p_account_id
$$;

-- The one reading. SECURITY INVOKER: a customer reads only their own account,
-- and any other id returns no row. The service role reads any.
--   storage_standing  trial | current | lapsed | ended (Interlude and later)
--   lapse_at          when storage stops or stopped being current; null once ended
--   building_locks_at three months after lapse_at; null once ended
--   social            closed until a storage fee is paid; open while current and
--                     through the year of a lapse; closed after it; read_only
--                     from Interlude on
create or replace function public.account_status(p_account_id uuid)
returns table (
  phase                public.account_phase,
  storage_standing     text,
  storage_product      public.storage_product,
  trial_ends_at        timestamptz,
  storage_paid_through date,
  lapse_at             timestamptz,
  building_open        boolean,
  building_locks_at    timestamptz,
  social               text
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.phase,
         case
           when not l.live                                        then 'ended'
           when l.lapse_at <= now()                               then 'lapsed'
           when public.storage_paid_end(a.storage_paid_through) > now() then 'current'
           when a.trial_ends_at > now()                           then 'trial'
           else 'current'   -- Stripe's retry window
         end,
         a.storage_product,
         a.trial_ends_at,
         a.storage_paid_through,
         case when l.live then l.lapse_at end,
         public.building_is_open(a.id),
         case when l.live then l.lapse_at + interval '3 months' end,
         case
           when a.storage_paid_through is null                    then 'closed'
           when not l.live                                        then 'read_only'
           when l.lapse_at + interval '1 year' > now()            then 'open'
           else 'closed'
         end
    from public.accounts a
   cross join lateral (
     select public.storage_lapse_at(a.id)      as lapse_at,
            a.phase in ('horizon', 'planning') as live
   ) l
   where a.id = p_account_id
$$;

-- ============================================================ the lock

drop policy storage_current_insert on public.content_items;
drop policy storage_current_update on public.content_items;
drop policy storage_current_insert on public.recipients;
drop policy storage_current_update on public.recipients;
drop policy legacy_media_storage_current on storage.objects;

-- RESTRICTIVE, beside the permissive own_rows policies, in the same shapes as
-- before: select and delete stay open, insert and update need building open.
create policy building_open_insert on public.content_items
  as restrictive for insert to authenticated
  with check (public.building_is_open(account_id));
create policy building_open_update on public.content_items
  as restrictive for update to authenticated
  using (public.building_is_open(account_id));

create policy building_open_insert on public.recipients
  as restrictive for insert to authenticated
  with check (public.building_is_open(account_id));
create policy building_open_update on public.recipients
  as restrictive for update to authenticated
  using (public.building_is_open(account_id));

create policy legacy_media_building_open on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'legacy-media'
    or public.building_is_open(((storage.foldername(name))[1])::uuid)
  );

-- ============================================================ the guard

-- Phase now decides the lock, so the customer's own token must not move it, nor
-- any of the dates and states that Posterity sets. The service role and the
-- database owner carry a different role and pass. Inserts are refused too: the
-- account is created at signup by handle_new_user, and without this a customer
-- could delete their row and insert one with storage paid through any date.
-- The check-in columns are left to Stage 4.8.
drop trigger guard_storage_columns on public.accounts;
drop function public.guard_storage_columns();

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
  return new;
end;
$$;

create trigger guard_account_columns
  before insert or update on public.accounts
  for each row execute function public.guard_account_columns();
