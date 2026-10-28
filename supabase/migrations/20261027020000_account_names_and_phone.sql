-- Changes to Previous Work — signup's legal name · Walker Brown
--
-- Settings within the Master Specification holds the account's name, legal
-- name, email address, and phone number. Recipients see the customer under the
-- name, which starts as the legal name given at signup and changes within
-- Settings (Stage 4.2). Signup also offers the name itself, optional, so a
-- customer can set it before Settings exists; left blank, it is the legal
-- name. The legal name stays within Posterity's own records.
-- The email address stays with the login. The phone number is optional, and
-- signup recommends it.
--
-- Signup sent its name as full_name in the user's metadata, and nothing but
-- the dashboard's greeting read it. It now sends legal_name, name, and phone, and
-- handle_new_user writes them to the account in the same transaction that
-- creates it. The metadata comes from the browser, so a phone number that is
-- not E.164 is dropped rather than refusing the signup; the signup page checks
-- it first. The two accounts that signed up before this take their legal name
-- from full_name.
--
-- Each column is the customer's to edit under own_account, as Settings will.
-- A changed phone number carries no agreement to texts, since an agreement
-- belongs to the number (Communication Dispatch System).

alter table public.accounts
  add column legal_name text,
  add column name       text,
  add column phone      text,
  add constraint accounts_legal_name_not_blank check (legal_name is null or btrim(legal_name) <> ''),
  add constraint accounts_name_not_blank       check (name is null or btrim(name) <> ''),
  add constraint accounts_phone_e164           check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

update public.accounts a
set legal_name = nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
    name       = nullif(btrim(u.raw_user_meta_data->>'full_name'), '')
from auth.users u
where u.id = a.user_id
  and a.legal_name is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_legal_name text := nullif(btrim(new.raw_user_meta_data->>'legal_name'), '');
  v_name       text := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), v_legal_name);
  v_phone      text := btrim(new.raw_user_meta_data->>'phone');
begin
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    v_phone := null;
  end if;

  insert into public.accounts (user_id, phase, legal_name, name, phone)
  values (new.id, 'horizon', v_legal_name, v_name, v_phone)
  on conflict (user_id) do nothing
  returning id into v_account_id;

  if v_account_id is not null then
    insert into public.account_phase_events (account_id, from_phase, to_phase, note)
    values (v_account_id, null, 'horizon', 'Account created at signup.');

    -- One primary legacy per account, from the first moment. A second is
    -- buildable later, during the Posterity phase.
    insert into public.legacies (account_id, is_primary, title)
    values (v_account_id, true, 'My Legacy');
  end if;

  return new;
end;
$$;
