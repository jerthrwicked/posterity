-- The text message switch: proving a phone number before its agreement is
-- recorded (Stage 4.2, Settings).
--
-- A phone number is typed into a form, and text_agreements is keyed by number,
-- so without proof one account could type another person's number and record,
-- or end, that person's agreement. The switch therefore records nothing until
-- the customer has texted a code from the number to Posterity's own. The
-- Master Specification counts a number as confirmed "when any text is received
-- from it"; the code is what ties that text to the account that asked. Nothing
-- is sent to the number to prove it, so no text goes to anyone who has not
-- agreed.
--
-- One row per account, and only while it waits: the customer turned the switch
-- on, the page shows the code, and the text has not arrived. The text's
-- arrival records the agreement, stamps accounts.phone_confirmed_at, and
-- deletes the row (lib/dispatch/text-switch.js). Turning the switch on again
-- replaces the row and its code; cancelling deletes it. A row past expires_at
-- counts for nothing. An account whose number is already confirmed turns the
-- switch on without one.
--
-- disclosure and how are held as the customer was shown them when they turned
-- the switch on, since the agreement recorded when the text arrives is given
-- against that disclosure. caller is the label the queued confirmation will
-- carry: 'agreement', or a test script's own beginning 'test-', which the live
-- scheduler skips. It has no default, so a row written without one is refused
-- rather than quietly treated as real.
--
-- Server-side only, the pattern verification_codes set: RLS on with no
-- policies, and the client roles' grants revoked. Settings reads it and
-- lib/dispatch/text-switch.js writes it with the service role.

create table text_switch_requests (
  account_id    uuid primary key references accounts(id) on delete cascade,
  user_id       uuid not null,
  phone         text not null,
  code          text not null,
  disclosure    text not null,
  how           text not null,
  caller        text not null,
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  constraint text_switch_requests_phone check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint text_switch_requests_code check (code ~ '^[0-9]{6}$'),
  constraint text_switch_requests_disclosure check (length(btrim(disclosure)) > 0),
  constraint text_switch_requests_how check (length(btrim(how)) > 0),
  constraint text_switch_requests_caller check (length(btrim(caller)) > 0),
  constraint text_switch_requests_window check (expires_at > requested_at)
);

-- Two accounts waiting on one number never hold the same code, so a text from
-- that number answers exactly one of them.
create unique index text_switch_requests_phone_code_idx on text_switch_requests (phone, code);

alter table text_switch_requests enable row level security;
revoke all on text_switch_requests from anon, authenticated;
