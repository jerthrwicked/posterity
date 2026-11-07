-- Double verification (Stage 4.2, Settings).
--
-- The Master Specification's double verification is "re-enter password +
-- confirmation code sent to their email/phone". It is built once, for every
-- action that needs it: the email change uses it first, and account deletion,
-- the Begin button, the Legacy Guard confirmation, and Account Restoration
-- reuse it as they are built, each adding its purpose to the check below.
--
-- verification_codes holds one row per code sent. The code itself is never
-- stored: code_hash is a SHA-256 of the row's id and the code, so the table
-- alone cannot confirm anything. payload carries what the code confirms (for
-- the email change, the new address), so the confirming step acts on what was
-- verified rather than on what the form sends back. A row is open until
-- closed_at is set, with the outcome saying why: confirmed, superseded by a
-- newer code for the same purpose, or too many wrong attempts.
--
-- Server-side only, the same pattern as the dispatch tables: RLS on with no
-- policies, and the client roles' grants revoked, so no customer can read a
-- code's hash or count its attempts. lib/auth/double-verification.js writes it
-- with the service role.

create table verification_codes (
  id          uuid primary key,
  account_id  uuid not null references accounts(id) on delete cascade,
  purpose     text not null,
  code_hash   text not null,
  payload     jsonb not null default '{}'::jsonb,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  closed_at   timestamptz,
  outcome     text,
  created_at  timestamptz not null default now(),
  constraint verification_codes_purpose check (purpose in ('email_change')),
  constraint verification_codes_outcome check (outcome in ('confirmed', 'superseded', 'too_many_attempts')),
  constraint verification_codes_closed check ((closed_at is null) = (outcome is null)),
  constraint verification_codes_attempts check (attempts >= 0)
);
create index verification_codes_account_idx on verification_codes (account_id, purpose, created_at desc);

alter table verification_codes enable row level security;
revoke all on verification_codes from anon, authenticated;

-- Copy for the code and for the email change's link, each a placeholder until
-- Product surface copy approves it. {{code}} is the six-digit code; {{link}}
-- is the link to the site's confirm route, built at send; {{name}} is the name
-- the account holds.

insert into dispatch_copy (key, channel, kind, subject, html_body, text_body) values
  ('email.verification_code', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email carrying a confirmation code]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the confirmation code email, sent to {{name}} after they re-enter their password to confirm an action such as changing their email address; the code below works once, for ten minutes, and can be ignored if they did not ask]</p>'
   '<p style="margin:0;font-size:28px;letter-spacing:6px;font-weight:bold;">{{code}}</p>',
   '[Placeholder: Product surface copy — the confirmation code email, sent to {{name}} after they re-enter their password to confirm an action such as changing their email address; the code below works once, for ten minutes, and can be ignored if they did not ask]'
   || E'\n\n{{code}}'),
  ('email.confirm_email_change', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email confirming a new email address]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the email confirming a new email address, sent to {{name}} at that address after the change passed double verification; the link below confirms it, and until it does every message keeps going to the old address]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the email confirming a new email address, sent to {{name}} at that address after the change passed double verification; the link below confirms it, and until it does every message keeps going to the old address]'
   || E'\n\n{{link}}');
