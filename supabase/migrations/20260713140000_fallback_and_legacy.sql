-- Phase 1.1 — every recipient must be reachable without Meta · Walker Brown
--
-- TWO CHANGES, both of which are cheap now and expensive later.
--
-- 1. A recipient must have an email or a phone.
--
--    Today `recipients.email` and `recipients.phone` are both nullable, so a
--    customer can add a recipient with nothing but a Facebook handle. If that
--    account is later memorialized — which any relative can trigger, and which
--    locks the account against all posting, forever — that message has NOWHERE
--    TO GO. Not a failed delivery: no delivery is possible, ever, and we find
--    out on the day it was supposed to arrive.
--
--    Meta is a channel Posterity cannot guarantee. Email and SMS are the spine.
--    So the database now refuses a recipient it could not reach without Meta.
--
--    This constraint is free while the table is empty. Once there is real
--    content, adding it means backfilling recipients whose customers may already
--    be gone. See BUILD/META_DELIVERY.md.
--
-- 2. Every account gets its primary legacy at signup.
--
--    `content_items.legacy_id` is NOT NULL, so a customer cannot write a single
--    message until a legacy exists. Creating it lazily means every write path
--    has to remember to check. Creating it in the same transaction as the
--    account means no write path ever has to.

-- ============================================================ 1. the fallback

alter table recipients
  add constraint recipients_reachable_without_meta
  check (email is not null or phone is not null);

comment on constraint recipients_reachable_without_meta on recipients is
  'A recipient must be reachable by email or phone. Social platforms can be lost '
  '(memorialization, credential failure, API change) and are not a guaranteed channel.';

-- ============================================================ 2. the legacy

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  insert into public.accounts (user_id, phase)
  values (new.id, 'horizon')
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

-- Backfill: a primary legacy for every account that predates this. Idempotent.
insert into public.legacies (account_id, is_primary, title)
select a.id, true, 'My Legacy'
from public.accounts a
where not exists (
  select 1 from public.legacies l where l.account_id = a.id and l.is_primary
);
