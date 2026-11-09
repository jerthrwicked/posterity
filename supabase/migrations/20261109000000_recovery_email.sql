-- Recovery email address (Stage 4.2, Settings).
--
-- The Master Specification's recovery email address is "optional, confirmed by
-- link, and held only for account recovery. It receives reset links and
-- nothing else." A customer who has lost the address they sign in with resets
-- through a link sent here.
--
-- One row per account. The address counts only once confirmed_at is set, by
-- the link sent to it; until then token_hash holds a SHA-256 of that link's
-- token, which lasts an hour from link_sent_at (lib/auth/recovery-email.js).
-- A new address, or a link sent again, replaces the token, so only the newest
-- link works. Removing the address deletes the row.
--
-- Its own table rather than a column on accounts: own_account lets a customer
-- update their accounts row, so a column there could be marked confirmed
-- without the link. Server-side only, the pattern verification_codes set: RLS
-- on with no policies, and the client roles' grants revoked. Settings reads it
-- and lib/auth/recovery-email.js writes it with the service role, after the
-- password is entered again.

create table recovery_emails (
  account_id    uuid primary key references accounts(id) on delete cascade,
  email         text not null,
  token_hash    text,
  link_sent_at  timestamptz,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint recovery_emails_email check (email = lower(btrim(email)) and length(email) between 3 and 254 and email like '%_@_%'),
  -- Waiting on its link, or confirmed: never both, never neither.
  constraint recovery_emails_state check (
    (confirmed_at is null and token_hash is not null and link_sent_at is not null)
    or (confirmed_at is not null and token_hash is null)
  )
);
create unique index recovery_emails_token_idx on recovery_emails (token_hash) where token_hash is not null;
create index recovery_emails_confirmed_idx on recovery_emails (email) where confirmed_at is not null;

alter table recovery_emails enable row level security;
revoke all on recovery_emails from anon, authenticated;

-- The confirmation link's copy, a placeholder until Product surface copy
-- approves it. {{link}} is the link to /auth/recovery-email, built at send;
-- {{name}} is the name the account holds. The reset link a recovery address
-- receives reuses email.reset_password (20261102000000_auth_email_copy).

insert into dispatch_copy (key, channel, kind, subject, html_body, text_body) values
  ('email.confirm_recovery_email', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email confirming a recovery email address]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the email confirming a recovery email address, sent to {{name}} at that address after they added it within Settings; the link below confirms it and lasts an hour; once confirmed the address receives password reset links and nothing else; it can be ignored if they did not ask]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the email confirming a recovery email address, sent to {{name}} at that address after they added it within Settings; the link below confirms it and lasts an hour; once confirmed the address receives password reset links and nothing else; it can be ignored if they did not ask]'
   || E'\n\n{{link}}');
