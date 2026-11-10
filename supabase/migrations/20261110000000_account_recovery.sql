-- Account recovery (Stage 4.2, Settings) · Walker Brown
--
-- The Master Specification's rule: "Account recovery - for a customer or a
-- Legacy Guard who has lost every route. A recovery request from the sign-in
-- page opens with either a code from a Legacy Guard on the account or a
-- browser that has signed into that login before, and it names a new email
-- address. The request waits seven days while every email address and phone
-- number on file is notified, and each notice carries a link that cancels it.
-- Access then moves to the new address. The Begin button and account deletion
-- stay locked for thirty days after a recovery."
--
-- Built here: the browser check, the request, the seven days, the notices and
-- their cancel link, the move, and the thirty-day lock as account_status()
-- reads it. The Legacy Guard's code is Stage 5.2's, and a Legacy Guard's own
-- login is Stage 5.1's.
--
-- Three points the rule leaves open, settled by Walker on November 9:
--   - the seven days and the notices start once the new address has confirmed
--     itself through a link sent to it, not when the request is typed
--   - the notices go to the account's own: the address it signs in with, its
--     confirmed recovery email address, and its phone number by text. Legacy
--     Guards are not told
--   - on day seven the new address becomes the address the account signs in
--     with, every signed-in browser is signed out, and a link to choose a new
--     password goes to the new address
--
-- lib/auth/known-browser.js and lib/auth/account-recovery.js write all of it
-- with the service role.

-- ============================================================ known browsers
--
-- "A browser that has signed into that login before." A browser holding a
-- session is given a marker in a cookie (proxy.js), and this table holds a
-- SHA-256 of the marker against the login, never the marker. A recovery
-- request opens only from a browser whose cookie matches a row here.
--
-- Keyed to the login (auth.users) rather than the account, so a Legacy Guard's
-- login can use it once Stage 5.1 builds one. A browser keeps a cookie 400 days
-- at most, so a row not seen for 400 days can match nothing and is pruned.
-- Server-only, the pattern verification_codes set: RLS on with no policies and
-- the client roles' grants revoked.

create table known_browsers (
  user_id        uuid not null references auth.users(id) on delete cascade,
  marker_hash    text not null,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  primary key (user_id, marker_hash)
);

alter table known_browsers enable row level security;
revoke all on known_browsers from anon, authenticated;

-- ============================================================ recovery requests
--
-- One row per request, kept after it closes. A request is in one of three
-- states:
--   asked     confirm_token_hash and link_sent_at: a link has gone to the new
--             address and lasts an hour. Nothing else has happened and no one
--             on file has been told.
--   waiting   confirmed_at, due_at and cancel_token_hash: the new address used
--             its link, the notices went out carrying the cancel link, and
--             access moves at due_at.
--   closed    closed_at and outcome: completed (access moved), cancelled (a
--             notice's link was used), expired (the new address never used its
--             link), superseded (a newer request replaced it before it was
--             confirmed), or failed (it could not be carried out: the new
--             address was taken meanwhile, or its notices were never queued).
--
-- One open request per account. Each token is stored as a SHA-256, never the
-- token. The cancel token stays after closing so its link can still say what
-- became of the request. caller marks a test script's rows (it starts with
-- test-), which the scheduled pass skips, as dispatch_claim does.

create table account_recoveries (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references accounts(id) on delete cascade,
  new_email           text not null,
  confirm_token_hash  text,
  link_sent_at        timestamptz,
  confirmed_at        timestamptz,
  due_at              timestamptz,
  cancel_token_hash   text,
  closed_at           timestamptz,
  outcome             text,
  caller              text not null default 'account-recovery',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint account_recoveries_new_email check (
    new_email = lower(btrim(new_email)) and length(new_email) between 3 and 254 and new_email like '%_@_%'
  ),
  constraint account_recoveries_outcome check (outcome in ('completed', 'cancelled', 'expired', 'superseded', 'failed')),
  constraint account_recoveries_closed check ((closed_at is null) = (outcome is null)),
  -- The link's token and its sent time come and go together, and a request the
  -- new address has confirmed holds no link.
  constraint account_recoveries_link check (
    (confirm_token_hash is null) = (link_sent_at is null)
    and (confirmed_at is null or confirm_token_hash is null)
  ),
  -- Confirming sets the day access moves and the cancel token together.
  constraint account_recoveries_waiting check (
    (confirmed_at is null) = (due_at is null) and (confirmed_at is null) = (cancel_token_hash is null)
  ),
  -- An open request is either asked or waiting.
  constraint account_recoveries_open check (
    closed_at is not null or confirmed_at is not null or confirm_token_hash is not null
  )
);
create unique index account_recoveries_open_idx on account_recoveries (account_id) where closed_at is null;
create unique index account_recoveries_confirm_idx on account_recoveries (confirm_token_hash) where confirm_token_hash is not null;
create unique index account_recoveries_cancel_idx on account_recoveries (cancel_token_hash) where cancel_token_hash is not null;
create index account_recoveries_due_idx on account_recoveries (due_at) where closed_at is null and confirmed_at is not null;

create trigger t_account_recoveries before update on account_recoveries
  for each row execute function touch_updated_at();

alter table account_recoveries enable row level security;
revoke all on account_recoveries from anon, authenticated;

-- ============================================================ two server-only functions
--
-- The request names the address a login signs in with, and Supabase's admin
-- interface cannot look a login up by address. This reads auth.users for the
-- one id and nothing else.

create function public.login_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.email = lower(btrim(p_email))
   order by u.created_at
   limit 1
$$;

-- "Every signed-in browser is signed out." Supabase's admin interface signs a
-- login out only when handed one of its own tokens, so this ends the login's
-- sessions directly; their refresh tokens go with them, and Supabase refuses a
-- token whose session is gone. Returns how many sessions ended.

create function public.end_login_sessions(p_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from auth.sessions s where s.user_id = p_user_id returning 1
  )
  select count(*)::integer from gone
$$;

revoke execute on function public.login_id_for_email(text), public.end_login_sessions(uuid)
  from public, anon, authenticated;
grant execute on function public.login_id_for_email(text), public.end_login_sessions(uuid)
  to service_role;

-- ============================================================ the thirty-day lock
--
-- "The Begin button and account deletion stay locked for thirty days after a
-- recovery." recovered_at is when access last moved. It sits on accounts
-- because account_status() runs with the reader's own rights and could not
-- read a server-only table; guard_account_columns keeps it out of the
-- customer's hands, as it does the phase and storage columns.

alter table public.accounts
  add column recovered_at timestamptz;

comment on column public.accounts.recovered_at is
  'When account recovery last moved access to a new address. Set by Posterity only (guard_account_columns). account_status().recovery_lock_until is thirty days after it.';

-- The guard as 20261028010000_account_details left it, with recovered_at added.
create or replace function public.guard_account_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'accounts are created at signup'
      using errcode = 'insufficient_privilege';
  end if;
  if new.phase                is distinct from old.phase
  or new.phase_entered_at     is distinct from old.phase_entered_at
  or new.initiated_at         is distinct from old.initiated_at
  or new.interlude_at         is distinct from old.interlude_at
  or new.trigger_source       is distinct from old.trigger_source
  or new.trial_ends_at        is distinct from old.trial_ends_at
  or new.storage_paid_through is distinct from old.storage_paid_through
  or new.storage_lapsed_at    is distinct from old.storage_lapsed_at
  or new.storage_product      is distinct from old.storage_product then
    raise exception 'phase and storage are set by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  if new.phone_confirmed_at is distinct from old.phone_confirmed_at then
    raise exception 'a phone number is confirmed by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  if new.recovered_at is distinct from old.recovered_at then
    raise exception 'a recovery is recorded by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- account_status() gains recovery_lock_until: the moment the lock lifts while
-- it is in force, and null otherwise. The Begin button and account deletion
-- read it as they are built; nothing reads it yet.
--
-- As in 20261030010000: a table function's columns cannot change in place, so
-- it is dropped and recreated with the same columns in the same order and the
-- new one last. Nothing in the catalog depends on it, and its privileges come
-- back from the schema's defaults. legacy_guard_setup_is_open() calls it by
-- name at run time and is unchanged.

drop function public.account_status(uuid);

create function public.account_status(p_account_id uuid)
returns table (
  phase                   public.account_phase,
  storage_standing        text,
  storage_product         public.storage_product,
  trial_ends_at           timestamptz,
  storage_paid_through    date,
  lapse_at                timestamptz,
  building_open           boolean,
  building_locks_at       timestamptz,
  social                  text,
  legacy_guard_setup_open boolean,
  recovery_lock_until     timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select a.phase,
         case
           when not l.live                                        then 'ended'
           when l.lapse_at <= now()                               then 'lapsed'
           when public.storage_paid_end(a.storage_paid_through) > now() then 'current'
           when a.trial_ends_at > now()                           then 'trial'
           else 'current'   -- Stripe's retry window
         end,
         a.storage_product,
         a.trial_ends_at,
         a.storage_paid_through,
         case when l.live then l.lapse_at end,
         public.building_is_open(a.id),
         case when l.live then l.lapse_at + interval '3 months' end,
         case
           when a.storage_paid_through is null                    then 'closed'
           when not l.live                                        then 'read_only'
           when l.lapse_at + interval '1 year' > now()            then 'open'
           else 'closed'
         end,
         l.live,
         case when a.recovered_at + interval '30 days' > now() then a.recovered_at + interval '30 days' end
    from public.accounts a
   cross join lateral (
     select public.storage_lapse_at(a.id)      as lapse_at,
            a.phase in ('horizon', 'planning') as live
   ) l
   where a.id = p_account_id
$$;

-- ============================================================ copy
--
-- Four placeholder rows until Product surface copy approves them. {{link}} is
-- built at send. The link to the new address carries no name: until that
-- address has waited out the seven days it is a stranger's.

insert into dispatch_copy (key, channel, kind, subject, html_body, text_body) values
  ('email.confirm_account_recovery', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email confirming the new address named in an account recovery request]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the email sent to the new address named in an account recovery request from the sign-in page; the link below opens a page that starts the request and lasts an hour; once started, the account''s own addresses are told and access moves to this address after seven days unless one of them cancels; it can be ignored if they did not ask]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the email sent to the new address named in an account recovery request from the sign-in page; the link below opens a page that starts the request and lasts an hour; once started, the account''s own addresses are told and access moves to this address after seven days unless one of them cancels; it can be ignored if they did not ask]'
   || E'\n\n{{link}}'),
  ('email.account_recovery_notice', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the notice that an account recovery request is waiting]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the account recovery notice, sent to {{name}} at every email address the account holds; someone has asked to move access to the account to {{new_email}}; access moves in seven days; if they did not ask, the link below opens a page that cancels it]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the account recovery notice, sent to {{name}} at every email address the account holds; someone has asked to move access to the account to {{new_email}}; access moves in seven days; if they did not ask, the link below opens a page that cancels it]'
   || E'\n\n{{link}}'),
  ('email.account_recovery_complete', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email sent when account recovery has moved access]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the email sent to {{name}} at the new address once account recovery has moved access to it; this address now signs in; the link below opens the page to choose a new password and lasts an hour; after that, the sign-in page''s password reset sends another to this address]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the email sent to {{name}} at the new address once account recovery has moved access to it; this address now signs in; the link below opens the page to choose a new password and lasts an hour; after that, the sign-in page''s password reset sends another to this address]'
   || E'\n\n{{link}}');

insert into dispatch_copy (key, channel, sms_body) values
  ('sms.account_recovery_notice', 'sms',
   '[Placeholder: Product surface copy — the account recovery notice by text: someone has asked to move access to the Posterity account; if they did not ask, this link cancels it] {{link}}');
