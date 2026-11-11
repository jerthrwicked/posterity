-- Account deletion and refunds (Stage 4.2, Settings; the refund is Stage 3.1's,
-- built with it).
--
-- The Master Specification's Delete account is "available throughout the
-- Horizon and Planning Phases and confirmed through double verification.
-- Stripe issues any refund owed under the refund policy held within Legal and
-- Compliance." Every record and file ties to its account and is removed with
-- it; the event log is the exception and stays. This changes three things the
-- code needs before it can run. It moves and removes no data.
--
-- 1. Double verification gains the purpose account_deletion, as its own
--    migration said each new use would add (20261104000000).
--
-- 2. The event log gains two kinds of record. Every row that tells the story
--    of an account, its phase history, its check-ins and its plans, is removed
--    with the account, so the record of the deletion itself, carrying a
--    summary of them, has to sit where nothing is removed:
--      refund           one refund issued through Stripe: which payment, how
--                       much, and why
--      account_deleted  one account deleted at its customer's confirmed
--                       request, with the summary of what it held
--    dispatch_events is append-only (its triggers refuse every update and
--    delete) and has no tie to the account's row, so both outlive the account.
--
-- 3. Copy for the two notices, each a placeholder until Product surface copy
--    approves it. {{name}} is the name the account holds. In the refund
--    notice, {{amount}} is the amount refunded, with its currency sign, and
--    {{plan}} is the name of the plan the payment was for.

alter table verification_codes drop constraint verification_codes_purpose;
alter table verification_codes add constraint verification_codes_purpose
  check (purpose in ('email_change', 'account_deletion'));

alter table dispatch_events drop constraint dispatch_events_event_type_check;
alter table dispatch_events add constraint dispatch_events_event_type_check
  check (event_type in (
    'queued', 'attempt', 'sent', 'delivered', 'bounced', 'failed',
    'exhausted', 'held_window', 'rnd_unavailable', 'agreement',
    'confirmed', 'stop', 'start', 'inbound',
    'refund', 'account_deleted'));

insert into dispatch_copy (key, channel, kind, subject, html_body, text_body) values
  ('email.refund_notice', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the refund notice]',
   '<p style="margin:0;">[Placeholder: Product surface copy — the refund notice, sent to {{name}}, who paid, when a refund is issued: {{amount}} for the {{plan}} plan is on its way back to the payment method that paid it, under the refund policy accepted at checkout]</p>',
   '[Placeholder: Product surface copy — the refund notice, sent to {{name}}, who paid, when a refund is issued: {{amount}} for the {{plan}} plan is on its way back to the payment method that paid it, under the refund policy accepted at checkout]'),
  ('email.account_deleted', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email confirming an account was deleted]',
   '<p style="margin:0;">[Placeholder: Product surface copy — the email confirming to {{name}} that their Posterity account was deleted at their request, with everything it held; any refund owed arrives in a notice of its own]</p>',
   '[Placeholder: Product surface copy — the email confirming to {{name}} that their Posterity account was deleted at their request, with everything it held; any refund owed arrives in a notice of its own]');
