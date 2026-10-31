-- Stages 4.5 and 4.6 — a Saved Recipient and a Legacy Guard each need an email address · Walker Brown
--
-- The Master Specification defines a Saved Recipient as "a single labelled
-- entry holding an email address and an optional phone number", and says of a
-- Legacy Guard: "Adding one takes a label, an email address the customer
-- confirms before anything is sent, and a phone number." Migrations
-- 20260713140000 and 20260713160000 asked only for an email or a phone, so a
-- phone-only entry was accepted. Email is the spine of delivery and of the
-- check-in escalation, so each table now requires it.
--
-- The constraints keep their names, and their reasoning still holds: a social
-- platform can be lost, and an unreachable Legacy Guard leaves the escalation
-- nowhere to go. Neither table held a row when this ran, so nothing is
-- rewritten; if a row without an email existed, adding the constraint would
-- fail and change nothing.
--
-- A Legacy Guard's phone number stays optional, offered on the form but not
-- required (Walker, October 31, 2026).

alter table public.recipients
  drop constraint recipients_reachable_without_meta;
alter table public.recipients
  add constraint recipients_reachable_without_meta
  check (email is not null and btrim(email) <> '');
comment on constraint recipients_reachable_without_meta on public.recipients is
  'A Saved Recipient holds an email address (Master Spec). Social platforms can be lost (memorialization, credential failure, API change) and are not a guaranteed channel; a phone number is optional.';

alter table public.trusted_contacts
  drop constraint trusted_contacts_reachable;
alter table public.trusted_contacts
  add constraint trusted_contacts_reachable
  check (email is not null and btrim(email) <> '');
comment on constraint trusted_contacts_reachable on public.trusted_contacts is
  'A Legacy Guard holds an email address (Master Spec). They are the people the check-in escalation is sent to; an unreachable one silently breaks the trigger.';
