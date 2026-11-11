-- Stage 4.2 — a refund and an account's deletion are each recorded once · Walker Brown
--
-- The event log's refund and account_deleted records (20261113000000) were
-- each written by looking for the record and then inserting it. Two requests
-- for the same deletion at the same instant could both look, both find
-- nothing, and both insert. Stripe still issued each refund once, through its
-- own idempotency key, but the log could hold the record twice. Only the
-- database can settle two writers at the same instant, so each record gets a
-- unique index and the second insert is refused with 23505, which the code
-- treats as already recorded (lib/posterity/refunds.js,
-- lib/posterity/account-deletion.js). It follows dispatch_events_report_once
-- (20261101010000).
--
--   refund           one record per Stripe refund, by the refund's id within
--                    detail
--   account_deleted  one record per account
--
-- Both indexes start after event 4413. Every refund and account_deleted record
-- at or before it is is_test, written by scripts/test-account-deletion.mjs
-- before these indexes existed, and they include the duplicates its
-- deliberately broken runs produced (four refunds, two deletions). The log is
-- append-only, so they stay, outside the indexes. It moves and removes no data.

create unique index dispatch_events_refund_once
  on public.dispatch_events ((detail->>'refund'))
  where event_type = 'refund' and id > 4413;
comment on index public.dispatch_events_refund_once is
  'One refund record per Stripe refund: a second insert for the same refund is refused (23505). lib/posterity/refunds.js.';

create unique index dispatch_events_account_deleted_once
  on public.dispatch_events (account_id)
  where event_type = 'account_deleted' and id > 4413;
comment on index public.dispatch_events_account_deleted_once is
  'One account_deleted record per account: a second insert for the same account is refused (23505). lib/posterity/account-deletion.js.';
