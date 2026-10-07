-- Stage 3.1 — a paid-through date covers the whole of that day, everywhere · Walker Brown
--
-- Found by scripts/test-storage-gate.py minutes after 20260918120000 was applied:
-- at 9 PM Central it is already the next day in UTC, and current_date is the
-- database's day. "Paid through September 18" stopped counting at 7 PM in New
-- Orleans. Storage is sold by the calendar year and the product is built on
-- calendar dates, so the rule is: a paid-through date holds until that date has
-- ended in every timezone (UTC-12). The gate can only ever err a few hours in
-- the customer's favor. lib/posterity/storage.js applies the same rule.

create or replace function public.storage_is_current(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(a.trial_ends_at > now(), false)
      or coalesce(a.storage_paid_through >= (now() - interval '12 hours')::date, false)
    from public.accounts a
   where a.id = p_account_id
$$;
