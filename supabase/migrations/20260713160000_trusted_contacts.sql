-- Phase 1.1 — trusted contacts must be reachable, and exactly one is primary · Walker Brown
--
-- 1. A trusted contact we cannot reach is not a trusted contact.
--
--    Same reasoning as `recipients_reachable_without_meta`, but the stakes are
--    higher. A recipient we can't reach means a message doesn't land. A trusted
--    contact we can't reach means the SIX-NOTIFICATION ESCALATION HAS NOWHERE TO
--    GO — nobody can confirm, nobody can be told, and the account either fires on
--    non-response alone or never fires at all. Both are bad, and neither is a
--    thing to discover at the moment it matters.
--
-- 2. Promoting a primary is one transaction, not two.
--
--    `trusted_contacts_one_primary` is a unique partial index, so clearing the
--    old primary and setting the new one must happen together. Done as two
--    round-trips from the app, a failure between them leaves a customer with NO
--    primary contact and no sign anything went wrong. So it lives in the
--    database, in one statement.

alter table trusted_contacts
  add constraint trusted_contacts_reachable
  check (email is not null or phone is not null);

comment on constraint trusted_contacts_reachable on trusted_contacts is
  'A trusted contact must be reachable by email or phone. They are the people the '
  'check-in escalation is sent to — an unreachable one silently breaks the trigger.';

-- SECURITY INVOKER: this runs as the caller, so RLS applies and a customer can
-- only ever promote a contact on their own account.
create or replace function public.set_primary_trusted_contact(p_contact_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select account_id into v_account_id
  from trusted_contacts
  where id = p_contact_id;

  if v_account_id is null then
    raise exception 'no such trusted contact';
  end if;

  update trusted_contacts set is_primary = false
   where account_id = v_account_id and is_primary;

  update trusted_contacts set is_primary = true
   where id = p_contact_id;
end;
$$;
