-- Stage 4.6 — a Legacy Guard needs a phone number · Walker Brown
--
-- The Master Specification says of a Legacy Guard: "Adding one takes a label,
-- an email address the customer confirms before anything is sent, and a phone
-- number." Migration 20261030020000 required the email address and left the
-- phone optional. Walker, October 31, 2026: the record lists the phone, so it
-- is required. A Saved Recipient's phone stays optional; the specification
-- calls it optional there.
--
-- The constraint keeps its name. No Legacy Guard row existed when this ran; if
-- one without a phone existed, adding the constraint would fail and change
-- nothing.

alter table public.trusted_contacts
  drop constraint trusted_contacts_reachable;
alter table public.trusted_contacts
  add constraint trusted_contacts_reachable
  check (email is not null and btrim(email) <> ''
         and phone is not null and btrim(phone) <> '');
comment on constraint trusted_contacts_reachable on public.trusted_contacts is
  'A Legacy Guard holds an email address and a phone number (Master Spec: adding one takes a label, an email address, and a phone number). They are the people the check-in escalation is sent to; an unreachable one silently breaks the trigger.';
