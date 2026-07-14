-- Phase 0.2 — an account for every user, guaranteed by the database.
--
-- Signup could create an auth user and then fail to create the account row:
-- a dropped connection, a closed tab, an RLS mistake. The result is a person
-- who can log in and has nothing to log in to. There is already exactly one
-- such orphan in this database.
--
-- So the account is not created by the client, or by an API route. It is created
-- by the database, in the same transaction as the user. It cannot be skipped.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public   -- pinned: a SECURITY DEFINER function must not inherit the caller's search_path
as $$
declare
  v_account_id uuid;
begin
  insert into public.accounts (user_id, phase)
  values (new.id, 'horizon')
  on conflict (user_id) do nothing
  returning id into v_account_id;

  -- Null only if the account already existed. Every phase change, ever, is
  -- recorded — including the first one.
  if v_account_id is not null then
    insert into public.account_phase_events (account_id, from_phase, to_phase, note)
    values (v_account_id, null, 'horizon', 'Account created at signup.');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give every existing user an account. Idempotent.
with created as (
  insert into public.accounts (user_id, phase)
  select u.id, 'horizon'
  from auth.users u
  where not exists (select 1 from public.accounts a where a.user_id = u.id)
  returning id
)
insert into public.account_phase_events (account_id, from_phase, to_phase, note)
select id, null, 'horizon', 'Account backfilled 2026-07-13 — the user predated the signup trigger.'
from created;
