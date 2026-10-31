-- Stage 4.6 — Legacy Guard setup through the account status check · Walker Brown
--
-- The roadmap's Stage 4.6: "Setup locks at Interlude through the account
-- status check." Stage 4's first convention: "Every surface reads the account
-- status check built within 4.1 rather than checking the account on its own."
-- 20261030000000 read accounts.phase within its own function. This moves the
-- rule into account_status(), which gains legacy_guard_setup_open, and
-- legacy_guard_setup_is_open() now reads that field, so the page and the
-- trigger read the one answer every other surface reads.
--
-- The rule is unchanged: open in Horizon and Planning, closed from Interlude
-- on, by phase only, so a storage lapse leaves it open. It is the same live
-- test account_status() already makes for storage, building, and Posterity
-- Social.
--
-- account_status() returns a table, and a table's columns cannot change in
-- place, so it is dropped and recreated with the same columns in the same
-- order and the new one last. No view, policy, or function body depends on it
-- in the catalog, and the privileges on it come back from the schema's
-- defaults.

drop function public.account_status(uuid);

create function public.account_status(p_account_id uuid)
returns table (
  phase                   public.account_phase,
  storage_standing        text,
  storage_product         public.storage_product,
  trial_ends_at           timestamptz,
  storage_paid_through    date,
  lapse_at                timestamptz,
  building_open           boolean,
  building_locks_at       timestamptz,
  social                  text,
  legacy_guard_setup_open boolean
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
         end,
         l.live
    from public.accounts a
   cross join lateral (
     select public.storage_lapse_at(a.id)      as lapse_at,
            a.phase in ('horizon', 'planning') as live
   ) l
   where a.id = p_account_id
$$;

-- Whether Legacy Guard setup is open, as account_status() reads it. SECURITY
-- INVOKER: a customer reads only their own account, and any other id returns
-- null. The trigger from 20261030000000 calls this and is unchanged.
create or replace function public.legacy_guard_setup_is_open(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select s.legacy_guard_setup_open
    from public.account_status(p_account_id) s
$$;

comment on function public.legacy_guard_setup_is_open(uuid) is
  'Legacy Guard setup is open in Horizon and Planning and locks at Interlude (Master Spec, Legacy Guards). It reads account_status().legacy_guard_setup_open, which follows the phase only; a storage lapse leaves it open.';
