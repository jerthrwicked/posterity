-- The Communication Dispatch System (Stage 3.4).
--
-- The single path every automated message takes on its way out. Callers enqueue
-- into dispatch_messages; the scheduler claims due rows with dispatch_claim();
-- the app applies channel policy, renders copy from dispatch_copy, sends, and
-- records every outcome in dispatch_events.
--
-- Everything here is server-side only, the same pattern as stripe_events:
-- RLS on with no policies, and the client roles' table grants revoked, so no
-- customer can read or write any of it. The functions are callable only by the
-- service role.
--
-- dispatch_events is the evidence record. It carries no foreign keys, so it
-- survives account deletion (Legal & Compliance, Event records), and it is
-- append-only: UPDATE, DELETE and TRUNCATE are rejected even for the service role.

-- ============================================================ enums

-- Meta joins later with: alter type dispatch_channel add value 'social';
create type dispatch_channel as enum ('email', 'sms');
create type dispatch_status  as enum ('queued', 'sending', 'sent', 'failed', 'cancelled');

-- ============================================================ copy

-- Message copy as a field. Approved copy replaces a placeholder as a content
-- change, never a code change. Placeholders open with [Placeholder: so a search
-- for the marker finds every one before launch.
create table dispatch_copy (
  key         text primary key,
  channel     dispatch_channel not null,
  subject     text,
  html_body   text,
  text_body   text,
  sms_body    text,
  updated_at  timestamptz not null default now(),
  constraint dispatch_copy_email_complete check (
    channel <> 'email' or (subject is not null and (html_body is not null or text_body is not null))
  ),
  constraint dispatch_copy_sms_complete check (channel <> 'sms' or sms_body is not null)
);
create trigger t_dispatch_copy before update on dispatch_copy
  for each row execute function touch_updated_at();

insert into dispatch_copy (key, channel, sms_body) values
  ('sms.agreement_confirmation', 'sms',
   '[Placeholder: Cascade copy — the confirmation text sent on agreement]');

-- ============================================================ queue

create table dispatch_messages (
  id                  uuid primary key default gen_random_uuid(),
  -- Pending sends end with the account.
  account_id          uuid not null references accounts(id) on delete cascade,
  channel             dispatch_channel not null,
  destination         text not null,               -- email address, or E.164 phone
  recipient_id        uuid references recipients(id) on delete set null,
  trusted_contact_id  uuid references trusted_contacts(id) on delete set null,
  copy_key            text not null references dispatch_copy(key),
  from_name           text,                        -- optional; email only
  params              jsonb not null default '{}'::jsonb,
  self_initiated      boolean not null default false,  -- a text the person set off themselves
  not_before          timestamptz,                 -- the caller's earliest send time
  status              dispatch_status not null default 'queued',
  attempts            int not null default 0,
  max_attempts        int not null default 5 check (max_attempts >= 1),
  next_attempt_at     timestamptz,                 -- set on insert from not_before
  locked_at           timestamptz,
  last_error          text,
  provider_message_id text,
  caller              text not null,               -- who enqueued it, e.g. 'consent', 'checkin'
  idempotency_key     text unique,                 -- lets a caller retry an enqueue safely
  is_test             boolean not null default false,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz,
  constraint dispatch_messages_destination_shape check (
    (channel = 'email' and destination ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') or
    (channel = 'sms'   and destination ~ '^\+[1-9][0-9]{7,14}$')
  ),
  constraint dispatch_messages_from_name_email_only check (from_name is null or channel = 'email'),
  constraint dispatch_messages_sent_has_time check (status <> 'sent' or sent_at is not null)
);
create index dispatch_messages_due_idx     on dispatch_messages (next_attempt_at) where status = 'queued';
create index dispatch_messages_stuck_idx   on dispatch_messages (locked_at) where status = 'sending';
create index dispatch_messages_account_idx on dispatch_messages (account_id, created_at desc);
create index dispatch_messages_provider_idx on dispatch_messages (provider_message_id)
  where provider_message_id is not null;

-- ============================================================ agreements

-- An agreement to receive texts belongs to the phone number, not to an account
-- row: Twilio applies STOP per number, and an edited number starts over.
create table text_agreements (
  phone             text primary key check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status            text not null check (status in ('agreed', 'stopped')),
  agreed_at         timestamptz,
  last_confirmed_at timestamptz,  -- older than a year: not texted (Reassigned Numbers fail-closed)
  stopped_at        timestamptz,
  stopped_via       text,
  constraint text_agreements_stop_recorded check (status <> 'stopped' or stopped_at is not null)
);

-- ============================================================ inbound

-- Every inbound text, kept. Anything other than STOP/START/HELP waits here for
-- the Check-in System (Stage 4.8) to consume; Stage 3.4 writes nothing to checkins.
create table dispatch_inbound (
  id          uuid primary key default gen_random_uuid(),
  twilio_sid  text not null unique,
  from_phone  text not null,
  body        text,
  received_at timestamptz not null default now(),
  handled_as  text not null check (handled_as in ('stop', 'start', 'help', 'other')),
  consumed_at timestamptz
);
create index dispatch_inbound_unconsumed_idx on dispatch_inbound (received_at)
  where handled_as = 'other' and consumed_at is null;

-- ============================================================ event log

create table dispatch_events (
  id                  bigint generated always as identity primary key,
  occurred_at         timestamptz not null default now(),
  account_id          uuid,   -- no FK: the record outlives the account
  message_id          uuid,   -- no FK: the record outlives the queue row
  event_type          text not null check (event_type in (
                        'queued', 'attempt', 'sent', 'delivered', 'bounced', 'failed',
                        'exhausted', 'held_window', 'rnd_unavailable', 'agreement',
                        'confirmed', 'stop', 'start', 'inbound')),
  channel             dispatch_channel,
  destination         text,
  outcome             text,
  provider_message_id text,
  detail              jsonb not null default '{}'::jsonb,  -- who, how, disclosure snapshot
  is_test             boolean not null default false
);
create index dispatch_events_account_idx  on dispatch_events (account_id, occurred_at desc);
create index dispatch_events_message_idx  on dispatch_events (message_id);
create index dispatch_events_provider_idx on dispatch_events (provider_message_id)
  where provider_message_id is not null;

create or replace function dispatch_events_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'dispatch_events is append-only (% rejected)', tg_op
    using errcode = 'insufficient_privilege';
end $$;

create trigger dispatch_events_no_update before update on dispatch_events
  for each row execute function dispatch_events_append_only();
create trigger dispatch_events_no_delete before delete on dispatch_events
  for each row execute function dispatch_events_append_only();
create trigger dispatch_events_no_truncate before truncate on dispatch_events
  for each statement execute function dispatch_events_append_only();

-- Every enqueue is logged in the same transaction as the insert, and the send
-- time defaults to the caller's not_before.
create or replace function dispatch_messages_on_insert() returns trigger
language plpgsql as $$
begin
  if new.next_attempt_at is null then
    new.next_attempt_at := coalesce(new.not_before, now());
  end if;
  return new;
end $$;

create or replace function dispatch_messages_log_queued() returns trigger
language plpgsql as $$
begin
  insert into dispatch_events (account_id, message_id, event_type, channel, destination, outcome, detail, is_test)
  values (new.account_id, new.id, 'queued', new.channel, new.destination, 'queued',
          jsonb_build_object('copy_key', new.copy_key, 'caller', new.caller,
                             'self_initiated', new.self_initiated, 'not_before', new.not_before),
          new.is_test);
  return new;
end $$;

create trigger dispatch_messages_before_insert before insert on dispatch_messages
  for each row execute function dispatch_messages_on_insert();
create trigger dispatch_messages_after_insert after insert on dispatch_messages
  for each row execute function dispatch_messages_log_queued();

-- ============================================================ functions

-- Claims due rows for one scheduler cycle. skip locked means two concurrent
-- cycles never take the same row. A row left in 'sending' for over ten minutes
-- (a crashed cycle) is claimed again.
create or replace function dispatch_claim(p_limit int default 25)
returns setof dispatch_messages
language sql security invoker set search_path = public as $$
  update dispatch_messages m
     set status = 'sending', locked_at = now()
   where m.id in (
     select id from dispatch_messages
      where (status = 'queued'  and next_attempt_at <= now())
         or (status = 'sending' and locked_at < now() - interval '10 minutes')
      order by next_attempt_at
      limit greatest(p_limit, 0)
      for update skip locked)
  returning m.*;
$$;

-- Records an agreement to receive texts, and confirms the number, in one
-- transaction. p_detail carries who agreed, how, and the disclosure shown.
create or replace function dispatch_record_agreement(
  p_phone text, p_account_id uuid default null,
  p_detail jsonb default '{}'::jsonb, p_is_test boolean default false)
returns text_agreements
language plpgsql security invoker set search_path = public as $$
declare r text_agreements;
begin
  insert into text_agreements (phone, status, agreed_at, last_confirmed_at, stopped_at, stopped_via)
  values (p_phone, 'agreed', now(), now(), null, null)
  on conflict (phone) do update
    set status = 'agreed', agreed_at = now(), last_confirmed_at = now(),
        stopped_at = null, stopped_via = null
  returning * into r;

  insert into dispatch_events (account_id, event_type, channel, destination, outcome, detail, is_test)
  values (p_account_id, 'agreement', 'sms', p_phone, 'agreed', coalesce(p_detail, '{}'::jsonb), p_is_test),
         (p_account_id, 'confirmed', 'sms', p_phone, 'confirmed',
          jsonb_build_object('via', 'agreement'), p_is_test);
  return r;
end $$;

-- Ends a number's agreement. A STOP from a number with no agreement is still
-- recorded, so a later agreement attempt sees it.
create or replace function dispatch_record_stop(
  p_phone text, p_via text, p_account_id uuid default null,
  p_detail jsonb default '{}'::jsonb, p_is_test boolean default false)
returns text_agreements
language plpgsql security invoker set search_path = public as $$
declare r text_agreements;
begin
  insert into text_agreements (phone, status, stopped_at, stopped_via)
  values (p_phone, 'stopped', now(), p_via)
  on conflict (phone) do update
    set status = 'stopped', stopped_at = now(), stopped_via = p_via
  returning * into r;

  insert into dispatch_events (account_id, event_type, channel, destination, outcome, detail, is_test)
  values (p_account_id, 'stop', 'sms', p_phone, 'stopped',
          coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('via', p_via), p_is_test);
  return r;
end $$;

-- Refreshes last_confirmed_at. Never changes an agreement's status: a text
-- received from a stopped number confirms the number but leaves it stopped.
create or replace function dispatch_confirm_number(
  p_phone text, p_via text, p_account_id uuid default null,
  p_detail jsonb default '{}'::jsonb, p_is_test boolean default false)
returns text_agreements
language plpgsql security invoker set search_path = public as $$
declare r text_agreements;
begin
  if p_via not in ('agreement', 'verification_code', 'inbound_text') then
    raise exception 'dispatch_confirm_number: unknown via %', p_via;
  end if;

  update text_agreements set last_confirmed_at = now()
   where phone = p_phone
  returning * into r;

  insert into dispatch_events (account_id, event_type, channel, destination, outcome, detail, is_test)
  values (p_account_id, 'confirmed', 'sms', p_phone,
          case when r.phone is null then 'no_agreement' else 'confirmed' end,
          coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('via', p_via), p_is_test);
  return r;
end $$;

-- ============================================================ lock down

alter table dispatch_copy     enable row level security;
alter table dispatch_messages enable row level security;
alter table text_agreements   enable row level security;
alter table dispatch_inbound  enable row level security;
alter table dispatch_events   enable row level security;

-- No policies on purpose: server-side (service_role) only. The client roles'
-- default grants are revoked as well, so a customer is refused outright.
revoke all on dispatch_copy, dispatch_messages, text_agreements, dispatch_inbound, dispatch_events
  from anon, authenticated;

revoke execute on function
  dispatch_claim(int),
  dispatch_record_agreement(text, uuid, jsonb, boolean),
  dispatch_record_stop(text, text, uuid, jsonb, boolean),
  dispatch_confirm_number(text, text, uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function
  dispatch_claim(int),
  dispatch_record_agreement(text, uuid, jsonb, boolean),
  dispatch_record_stop(text, text, uuid, jsonb, boolean),
  dispatch_confirm_number(text, text, uuid, jsonb, boolean)
  to service_role;
