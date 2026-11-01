-- Stages 4.5 and 4.6 — a contact's phone number is held as E.164 · Walker Brown
--
-- The Communication Dispatch System sends only to E.164 numbers, and
-- lib/dispatch/enqueue.js refuses anything else before it queues the message,
-- so a number saved as typed would stop that person's email as well as their
-- text. accounts.phone already holds this rule (20261027020000). The Saved
-- Recipient and Legacy Guard forms now convert what the customer types with
-- lib/posterity/phone.js, and each table holds the same rule as accounts.
--
-- A Saved Recipient's phone stays optional; a Legacy Guard's is required by
-- trusted_contacts_reachable (20261031010000). Neither table held a row when
-- this ran; if one held a number in another form, adding the constraint would
-- fail and change nothing.

alter table public.recipients
  add constraint recipients_phone_e164
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
comment on constraint recipients_phone_e164 on public.recipients is
  'A phone number is held as E.164, the form the Communication Dispatch System sends to. The form converts what the customer types (lib/posterity/phone.js).';

alter table public.trusted_contacts
  add constraint trusted_contacts_phone_e164
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
comment on constraint trusted_contacts_phone_e164 on public.trusted_contacts is
  'A phone number is held as E.164, the form the Communication Dispatch System sends to. The form converts what the customer types (lib/posterity/phone.js).';
