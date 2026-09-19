-- Stage 3.1 — the free trial and the storage state, held on the account · Walker Brown
--
-- Master Specification, Horizon Tier:
--   "Three-month free trial: one per account, beginning at signup and requiring
--    no payment method. The trial grants content building but not Posterity
--    Social access ... When the trial ends, content creation locks. The account
--    itself remains accessible."
-- Master Specification, Storage Lapse Grace Period:
--   "During the year, the customer can log in and view all content, but cannot
--    build or edit until storage is current."
--   "A payment within the year begins a new storage year from the date of payment."
--
-- So the question every build gate asks is one question: is storage current?
-- It is current while the trial is running, or while a paid storage year covers
-- today. Two dates on the account answer it. Nothing here touches Stripe — the
-- spec holds the trial "within Supabase rather than Stripe since it takes no
-- payment method". The Horizon subscription, prepaid years, and Grace Storage
-- all write storage_paid_through later; the lapse sequence (Stage 4) reads it.

alter table public.accounts
  -- Signup + three months. The column default fires inside handle_new_user's
  -- insert, so the trial begins at signup without touching that trigger.
  add column trial_ends_at        timestamptz not null default (now() + interval '3 months'),
  -- The last calendar day a paid storage year covers. Null until the first
  -- storage payment. A calendar date, not a timestamp: storage is sold by the
  -- year and the product is built on calendar dates.
  add column storage_paid_through date;

comment on column public.accounts.trial_ends_at is
  'Three-month free trial, one per account, beginning at signup (Master Spec, Horizon Tier). Building locks when it passes and no storage year covers today.';
comment on column public.accounts.storage_paid_through is
  'Last calendar day covered by paid storage (Horizon, Grace Storage, or prepaid years). Null until the first storage payment.';

-- Backfill: every existing account predates this column, and every one of them
-- signed up before launch. Their trial began at signup, as the spec says.
update public.accounts
   set trial_ends_at = created_at + interval '3 months';

-- The one question, answered in one place. SECURITY INVOKER: it reads accounts
-- under the caller's own row-level security, so a customer can only ever ask it
-- about their own account. Null (no such account, or not yours) counts as false
-- everywhere it is used.
create or replace function public.storage_is_current(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(a.trial_ends_at > now(), false)
      or coalesce(a.storage_paid_through >= current_date, false)
    from public.accounts a
   where a.id = p_account_id
$$;

-- The gate, at the database. The existing own_rows policies are permissive and
-- stay as they are; these are RESTRICTIVE, so both must pass. A lapsed account
-- can still read (select) and remove (delete) its own rows — "the customer can
-- log in and view all content" — but cannot build (insert) or edit (update).
-- The service role bypasses row-level security, so server-side writes by the
-- webhook and the delivery engine are unaffected.
--
-- Content and recipients are building. Trusted contacts are left open: during a
-- lapse "the Begin button and Legacy Guard confirmation remain available" and
-- Legacy Guards can hold payment authority, so a customer must be able to add one.

create policy storage_current_insert on public.content_items
  as restrictive for insert to authenticated
  with check (public.storage_is_current(account_id));
create policy storage_current_update on public.content_items
  as restrictive for update to authenticated
  using (public.storage_is_current(account_id));

create policy storage_current_insert on public.recipients
  as restrictive for insert to authenticated
  with check (public.storage_is_current(account_id));
create policy storage_current_update on public.recipients
  as restrictive for update to authenticated
  using (public.storage_is_current(account_id));

-- The media bucket too. Without this a lapsed account could still put a file in
-- the bucket and simply fail to record it — an orphan that costs storage the
-- customer is not paying for. Objects are keyed by account id as the first path
-- segment (20260713180000_media_storage).
create policy legacy_media_storage_current on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'legacy-media'
    or public.storage_is_current(((storage.foldername(name))[1])::uuid)
  );

-- The wall has to hold from the inside too. own_account lets a customer update
-- their own accounts row, so without this a customer could extend their own
-- trial or mark storage paid through PostgREST. Only the server — the Stripe
-- webhook and, later, the Grace approval task — writes these two columns.
-- (The customer never updates accounts from the app today; this guards the
-- two columns money depends on and leaves the rest as they were.)
create or replace function public.guard_storage_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Block the customer's own token (and anonymous). The service role and the
  -- database owner (sb.sh, migrations) carry a different role and pass.
  if coalesce(auth.role(), '') in ('authenticated', 'anon')
     and (new.trial_ends_at        is distinct from old.trial_ends_at
       or new.storage_paid_through is distinct from old.storage_paid_through) then
    raise exception 'trial_ends_at and storage_paid_through are set by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_storage_columns on public.accounts;
create trigger guard_storage_columns
  before update on public.accounts
  for each row execute function public.guard_storage_columns();
