-- Posterity — initial schema (Phase 0.1) · Walker Brown
--
-- The database was completely empty before this: zero tables in public, no
-- migration history. This is the first migration the project has ever had.
--
-- Modeled directly on CONTEXT_for_posterity.md. Vocabulary is deliberately the
-- product's own: accounts move through PHASES; plans live inside accounts and
-- move with them; the system responds to EVENTS and DATES, never to a
-- customer's passing. No clinical terminology anywhere, including here.
--
-- NOT YET APPLIED. For Jeremy's review.

-- ============================================================ enums

-- The six phases, in order. Only ACCOUNTS shift phases — plans move with them.
create type account_phase as enum (
  'horizon',    -- 1. Building. $9.99/yr. No time limit.
  'planning',   -- 2. Initiated (funded). Longest phase. 6-month check-ins run.
  'abeyance',   -- 3. Quiet pause after a trigger event. Ends the following Jan 1.
  'active',     -- 4. Delivering content on the customer's calendar.
  'twilight',   -- 5. Final plan year complete. First year free.
  'posterity'   -- 6. Transferred to a trusted contact. Permanent archive.
);

create type plan_tier as enum (
  'basic',      -- $99/yr   — 4 messages (quarterly), 1 video
  'premium',    -- $249/yr  — 12 messages (monthly),  4 videos
  'legacy',     -- $899/yr  — 52 messages (weekly),  12 videos
  'custom',     -- contact us
  'grace'       -- contact us — 1-2 messages, no video
);

-- The three ways the non-response trigger fires (internal term; never shown to
-- customers).
create type trigger_source as enum (
  'non_response',       -- all 6 check-in notifications went unanswered
  'trusted_contact',    -- a trusted contact confirmed via double verification
  'customer_ready'      -- the customer chose "I'm Ready" themselves
);

create type content_kind    as enum ('message', 'video', 'photo', 'note');
create type delivery_status as enum ('scheduled', 'sent', 'failed', 'cancelled');
create type checkin_status  as enum ('due', 'answered', 'missed');

-- ============================================================ accounts

-- One account per customer. The container; plans are its contents.
create table accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  phase             account_phase not null default 'horizon',
  phase_entered_at  timestamptz not null default now(),

  -- Set when the account is initiated (funded). Marks the move to 'planning'.
  initiated_at      timestamptz,

  -- Set when a trigger fires. Year 1 of delivery begins the following Jan 1 —
  -- that date is derived from this, never guessed.
  abeyance_at       timestamptz,
  trigger_source    trigger_source,

  -- Every 6 months during Planning. Drives the check-in scheduler.
  checkin_interval_months int not null default 6,
  next_checkin_due    date,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index accounts_phase_idx        on accounts (phase);
create index accounts_next_checkin_idx on accounts (next_checkin_due) where phase = 'planning';

-- Every phase change, ever. Append-only. This product moves people's final
-- words; the phase history must be auditable forever.
create table account_phase_events (
  id           bigint generated always as identity primary key,
  account_id   uuid not null references accounts(id) on delete cascade,
  from_phase   account_phase,
  to_phase     account_phase not null,
  source       trigger_source,
  note         text,
  created_at   timestamptz not null default now()
);
create index account_phase_events_account_idx on account_phase_events (account_id, created_at desc);

-- ============================================================ plans

-- One plan = one YEAR of delivery. Plan years count from account activation,
-- not from signup or calendar year. A year with no plan is a SKIPPED year and
-- accrues a storage fee.
create table plans (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  plan_year     int  not null check (plan_year >= 1),
  tier          plan_tier not null,

  paid_at       timestamptz,           -- payment timeline...
  delivery_year int,                   -- ...tracked separately from delivery
  funds_released_at timestamptz,       -- Year N funds not touched until Year N-1 completes

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (account_id, plan_year)
);
create index plans_account_idx on plans (account_id, plan_year);

-- ============================================================ people

-- The recipient master list: added once, reused across pieces and plans.
create table recipients (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  name           text not null,
  email          text,
  phone          text,
  platform       text,        -- e.g. 'email', 'instagram', 'facebook'
  platform_handle text,
  created_at     timestamptz not null default now()
);
create index recipients_account_idx on recipients (account_id);

-- Trusted contacts have their OWN portal login — a separate account entirely,
-- independent of the customer's. user_id is null until they accept the invite.
create table trusted_contacts (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references accounts(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  name              text not null,
  email             text,
  phone             text,
  is_primary        boolean not null default false,

  invited_at        timestamptz,
  invite_resend_count int not null default 0,   -- resent every 6 months, sequence-labeled
  accepted_at       timestamptz,

  -- The personal note from the customer, surfaced to this contact only at
  -- confirmation time.
  personal_note     text,

  created_at        timestamptz not null default now()
);
create index trusted_contacts_account_idx on trusted_contacts (account_id);
create unique index trusted_contacts_one_primary
  on trusted_contacts (account_id) where is_primary;

-- ============================================================ the legacy

-- Each customer has ONE primary legacy; an optional second is buildable during
-- the Posterity phase.
create table legacies (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  is_primary  boolean not null default true,
  title       text,
  created_at  timestamptz not null default now()
);
create index legacies_account_idx on legacies (account_id);

create table content_items (
  id            uuid primary key default gen_random_uuid(),
  legacy_id     uuid not null references legacies(id) on delete cascade,
  account_id    uuid not null references accounts(id) on delete cascade,
  plan_id       uuid references plans(id) on delete set null,

  kind          content_kind not null,
  title         text,
  body          text,               -- the message
  storage_path  text,               -- Supabase Storage object (video/photo)
  thumbnail_path text,              -- first frame / image thumb, generated at upload
  file_type     text,
  file_size_bytes bigint,

  -- Delivery configuration
  recipient_id  uuid references recipients(id) on delete set null,
  platform      text,
  deliver_on    date,               -- the customer's chosen calendar date

  -- Paid plans only: a handwritten note can accompany a message.
  handwritten_note text,

  include_in_posterity boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index content_items_account_idx  on content_items (account_id);
create index content_items_plan_idx     on content_items (plan_id);
create index content_items_deliver_idx  on content_items (deliver_on);

-- ============================================================ delivery

-- The queue the delivery job reads. One row per attempt-able delivery.
-- Nothing is ever deleted from here — this is the record of what was sent to
-- whom, and when.
create table deliveries (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  account_id      uuid not null references accounts(id) on delete cascade,
  recipient_id    uuid references recipients(id) on delete set null,

  scheduled_for   timestamptz not null,
  status          delivery_status not null default 'scheduled',
  attempts        int not null default 0,
  sent_at         timestamptz,
  error           text,

  created_at      timestamptz not null default now()
);
create index deliveries_due_idx on deliveries (scheduled_for)
  where status = 'scheduled';
create index deliveries_account_idx on deliveries (account_id);

-- ============================================================ check-ins

-- One row per check-in cycle. The heart of the trigger system — and the most
-- dangerous logic in the product. A false positive sends a living person's
-- goodbye messages to their family, so this table exists to make every step
-- explicit and auditable rather than inferred.
create table checkins (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  due_on        date not null,
  status        checkin_status not null default 'due',
  answered_at   timestamptz,
  answered_via  text,                       -- 'email' | 'sms' | 'dashboard'
  created_at    timestamptz not null default now()
);
create index checkins_account_idx on checkins (account_id, due_on desc);
create index checkins_open_idx    on checkins (due_on) where status = 'due';

-- The 6-notification escalation after a missed check-in: 2/month for 3 months,
-- each labeled with its sequence position ("Reminder 2 of 6"). Sent to the
-- customer AND all trusted contacts. First and last messages are unique in
-- content; the middle four are standard reminders.
create table checkin_notifications (
  id            bigint generated always as identity primary key,
  checkin_id    uuid not null references checkins(id) on delete cascade,
  account_id    uuid not null references accounts(id) on delete cascade,
  sequence_no   int  not null check (sequence_no between 1 and 6),
  channel       text not null,              -- 'email' | 'sms'
  sent_to       text not null,              -- resolved address at send time
  is_first      boolean not null default false,
  is_final      boolean not null default false,
  sent_at       timestamptz not null default now(),
  unique (checkin_id, sequence_no, channel, sent_to)
);
create index checkin_notifications_account_idx on checkin_notifications (account_id);

-- A trusted contact's confirmation requires DOUBLE verification (re-entered
-- password + a code sent to their email/phone) precisely so this can never fire
-- by accident. Recorded, never inferred.
create table trigger_confirmations (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references accounts(id) on delete cascade,
  trusted_contact_id uuid references trusted_contacts(id) on delete set null,
  source             trigger_source not null,
  verified_password  boolean not null default false,
  verified_code      boolean not null default false,
  confirmed_at       timestamptz not null default now()
);
create index trigger_confirmations_account_idx on trigger_confirmations (account_id);

-- ============================================================ money

-- Written by the Stripe webhook. Until this exists, checkout takes money and
-- records nothing.
create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null references accounts(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  tier                   text,              -- 'horizon' | plan_tier | storage SKUs
  status                 text,              -- Stripe's status, verbatim
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index subscriptions_account_idx on subscriptions (account_id);

-- Skipped plan years accrue a non-recurring storage fee, stacking per year.
create table storage_fees (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  plan_year   int  not null,
  amount_cents int not null,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (account_id, plan_year)
);

-- Raw Stripe events, for idempotency and for arguing with reality later.
create table stripe_events (
  id           text primary key,          -- Stripe's event id
  type         text not null,
  payload      jsonb not null,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ============================================================ security

-- RLS on everything. A customer sees only their own account's rows; trusted
-- contacts get their access through their own portal (policies for that come
-- with the portal build, deliberately not guessed at here).
alter table accounts              enable row level security;
alter table account_phase_events  enable row level security;
alter table plans                 enable row level security;
alter table recipients            enable row level security;
alter table trusted_contacts      enable row level security;
alter table legacies              enable row level security;
alter table content_items         enable row level security;
alter table deliveries            enable row level security;
alter table checkins              enable row level security;
alter table checkin_notifications enable row level security;
alter table trigger_confirmations enable row level security;
alter table subscriptions         enable row level security;
alter table storage_fees          enable row level security;
alter table stripe_events         enable row level security;

-- Owner = the auth user the account belongs to.
create policy own_account on accounts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy own_rows on plans
  for all using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_rows on recipients
  for all using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_rows on trusted_contacts
  for all using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_rows on legacies
  for all using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_rows on content_items
  for all using (account_id in (select id from accounts where user_id = (select auth.uid())));

-- Read-only to the customer; only the server writes these.
create policy own_read on deliveries
  for select using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_read on checkins
  for select using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_read on account_phase_events
  for select using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_read on subscriptions
  for select using (account_id in (select id from accounts where user_id = (select auth.uid())));
create policy own_read on storage_fees
  for select using (account_id in (select id from accounts where user_id = (select auth.uid())));

-- checkin_notifications, trigger_confirmations and stripe_events have NO
-- policies on purpose: server-side (service_role) only. RLS-on with no policy
-- denies every client.

-- ============================================================ touch triggers
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_accounts      before update on accounts      for each row execute function touch_updated_at();
create trigger t_plans         before update on plans         for each row execute function touch_updated_at();
create trigger t_content_items before update on content_items for each row execute function touch_updated_at();
create trigger t_subscriptions before update on subscriptions for each row execute function touch_updated_at();
