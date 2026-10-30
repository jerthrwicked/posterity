-- Stage 4.1 — Legacy Guard setup locks at Interlude · Walker Brown
--
-- The Master Specification: "Legacy Guard setup locks when the account enters
-- Interlude. Invitation resends continue after the lock." Until now nothing
-- held that. A customer could add, edit, promote, or remove a Legacy Guard at
-- any phase. The schema calls Legacy Guards trusted contacts.
--
-- Setup is open while the account is in Horizon or Planning, and closed from
-- Interlude on. It follows the phase only. A storage lapse locks building
-- (building_is_open) but leaves Legacy Guard setup open, because a lapsed
-- account still needs people who can speak for it.
--
-- The lock is a trigger rather than a restrictive policy so a locked write is
-- refused with a reason instead of quietly changing nothing. It reads the
-- request's token, as guard_legacy_columns does: the customer's token is
-- refused, and the service role passes. Automatic invitation resends, not yet
-- built, must run with the service role so they continue after the lock, and
-- so must account deletion, whose cascade reaches this table. A manual resend
-- from the customer, also not yet built, is part of setup and closes with it.
--
-- The lock follows the phase, so an account Account Restoration returns to
-- Planning has setup open again.
--
-- A Legacy Guard's own portal login (trusted_contacts.user_id) has no policy
-- yet, so today only the customer's token reaches this table. The portal stage
-- decides how a guard's own writes, such as accepting an invitation after
-- Interlude, pass this lock.

-- Whether Legacy Guard setup is open. SECURITY INVOKER: a customer reads only
-- their own account, and any other id returns null. The page reads it to show
-- the lock; the trigger below enforces it.
create or replace function public.legacy_guard_setup_is_open(p_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(a.phase in ('horizon', 'planning'), false)
    from public.accounts a
   where a.id = p_account_id
$$;

create or replace function public.guard_legacy_guard_setup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if (tg_op in ('UPDATE', 'DELETE')
      and not coalesce(public.legacy_guard_setup_is_open(old.account_id), false))
  or (tg_op in ('INSERT', 'UPDATE')
      and not coalesce(public.legacy_guard_setup_is_open(new.account_id), false)) then
    raise exception 'Legacy Guard setup is locked once the account enters Interlude'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_legacy_guard_setup
  before insert or update or delete on public.trusted_contacts
  for each row execute function public.guard_legacy_guard_setup();

comment on function public.legacy_guard_setup_is_open(uuid) is
  'Legacy Guard setup is open in Horizon and Planning and locks at Interlude (Master Spec, Legacy Guards). It follows the phase only; a storage lapse leaves it open.';
