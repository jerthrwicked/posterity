-- Stages 4.6 and 5.3 — the schema says Legacy Guard · Walker Brown
--
-- The specification's Legacy Guards were built in July as "trusted contacts",
-- and the schema kept that name after the site took the specification's. Walker,
-- November 1, 2026: the database and the code say Legacy Guard too, so the two
-- names stop meaning one thing.
--
-- A rename changes no data and no behavior. The table, its constraints and
-- indexes, the two columns that point at it, the trigger source, and the
-- primary-promotion function take the new name; the row-level security policy,
-- the setup-lock trigger and every grant move with the table. The function is
-- dropped and created under its new name with the same body, security and
-- grants. No Legacy Guard, trigger confirmation or message pointing at one
-- existed when this ran.
--
-- Renaming an enum value relabels it in place; no row is written, so the
-- append-only account_phase_events is untouched.

alter table public.trusted_contacts rename to legacy_guards;
alter table public.legacy_guards rename constraint trusted_contacts_pkey to legacy_guards_pkey;
alter table public.legacy_guards rename constraint trusted_contacts_account_id_fkey to legacy_guards_account_id_fkey;
alter table public.legacy_guards rename constraint trusted_contacts_user_id_fkey to legacy_guards_user_id_fkey;
alter table public.legacy_guards rename constraint trusted_contacts_reachable to legacy_guards_reachable;
alter table public.legacy_guards rename constraint trusted_contacts_phone_e164 to legacy_guards_phone_e164;
alter index public.trusted_contacts_account_idx rename to legacy_guards_account_idx;
alter index public.trusted_contacts_one_primary rename to legacy_guards_one_primary;

alter table public.trigger_confirmations rename column trusted_contact_id to legacy_guard_id;
alter table public.trigger_confirmations
  rename constraint trigger_confirmations_trusted_contact_id_fkey to trigger_confirmations_legacy_guard_id_fkey;
alter table public.dispatch_messages rename column trusted_contact_id to legacy_guard_id;
alter table public.dispatch_messages
  rename constraint dispatch_messages_trusted_contact_id_fkey to dispatch_messages_legacy_guard_id_fkey;

alter type public.trigger_source rename value 'trusted_contact' to 'legacy_guard';

drop function public.set_primary_trusted_contact(uuid);

create function public.set_primary_legacy_guard(p_guard_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select account_id into v_account_id
  from legacy_guards
  where id = p_guard_id;

  if v_account_id is null then
    raise exception 'no such Legacy Guard';
  end if;

  update legacy_guards set is_primary = false
   where account_id = v_account_id and is_primary;

  update legacy_guards set is_primary = true
   where id = p_guard_id;
end;
$$;

grant execute on function public.set_primary_legacy_guard(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
