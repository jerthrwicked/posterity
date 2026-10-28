-- Stage 4.2 — Account details · Walker Brown
--
-- Settings holds the account's name, legal name, and phone number, each
-- editable by the customer under own_account. Two rules sit beneath that page,
-- and they live here rather than in the page so no other path can skip them.
--
-- A name is never empty. The legal name is required, and the name recipients
-- see falls back to it whenever none is given, at signup or within Settings.
-- Both are trimmed, must carry at least one letter or digit (so a name made of
-- spaces or invisible characters is refused), and run 200 characters at most.
-- A signup that reaches the database without a legal name is refused; the
-- signup page always sends one.
--
-- A changed phone number starts over unconfirmed. Within the Communication
-- Dispatch System an agreement to texts belongs to the number it was given for,
-- and text_agreements is keyed by number, so a number typed into Settings could
-- otherwise arrive carrying someone else's agreement. phone_confirmed_at records
-- when this account's own number was confirmed: by its agreement being recorded,
-- a code sent to it being entered, or a text received from it. Posterity sets
-- it, never the customer, and any change to the number clears it unless the
-- same write confirms the new number. The text switch and reset by text read
-- only a confirmed number. Nothing sets it yet; the text switch is the first.
--
-- Triggers of the same timing fire in name order, so tidy_account_details runs
-- after guard_account_columns: the guard sees the customer's own write, and the
-- tidy pass then clears the confirmation the customer could not have touched.

alter table public.accounts
  add column phone_confirmed_at timestamptz;

update public.accounts
set legal_name = btrim(legal_name),
    name       = coalesce(nullif(btrim(name), ''), btrim(legal_name))
where legal_name is distinct from btrim(legal_name)
   or name is distinct from coalesce(nullif(btrim(name), ''), btrim(legal_name));

alter table public.accounts
  drop constraint accounts_legal_name_not_blank,
  drop constraint accounts_name_not_blank,
  alter column legal_name set not null,
  alter column name       set not null,
  add constraint accounts_legal_name_readable check (legal_name ~ '[[:alnum:]]' and char_length(legal_name) <= 200),
  add constraint accounts_name_readable       check (name ~ '[[:alnum:]]' and char_length(name) <= 200);

create or replace function public.tidy_account_details()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.legal_name := btrim(new.legal_name);
  new.name       := coalesce(nullif(btrim(new.name), ''), new.legal_name);

  if tg_op = 'INSERT' then
    new.phone_confirmed_at := null;
  elsif new.phone is distinct from old.phone
    and new.phone_confirmed_at is not distinct from old.phone_confirmed_at then
    new.phone_confirmed_at := null;
  end if;

  return new;
end;
$$;

create trigger tidy_account_details
  before insert or update on public.accounts
  for each row execute function public.tidy_account_details();

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
  return new;
end;
$$;
