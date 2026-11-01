-- Stage 3.4 — a provider's report is recorded once · Walker Brown
--
-- Postmark and Twilio send a report again when it is not answered with a 2xx,
-- so the same delivery, bounce, status or inbound text can arrive twice. Each
-- event written from a report carries a report_id in its detail
-- (lib/dispatch/reports.js): 'delivery', 'bounce:<id>', 'status:<status>',
-- 'inbound', or 'start'. This index lets one copy of each into the append-only
-- log, and the second insert is refused with 23505, which the routes treat as
-- already recorded. Events the scheduler writes carry no report_id and are not
-- covered.
--
-- The index starts after event 538. The twelve events with a report_id before
-- it are all is_test, written by the first run of scripts/test-dispatch-reports.mjs
-- before this index existed, and they include the duplicates it was checking
-- for. The log is append-only, so they stay, outside the index.

create unique index dispatch_events_report_once
  on public.dispatch_events (provider_message_id, event_type, (detail->>'report_id'))
  where detail ? 'report_id' and id > 538;
comment on index public.dispatch_events_report_once is
  'One event per provider report: a delivery, bounce, status or inbound text sent again by Postmark or Twilio is refused (23505). lib/dispatch/reports.js.';
