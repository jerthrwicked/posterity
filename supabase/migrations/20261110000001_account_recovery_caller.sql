-- Account recovery: a request names its caller, with no default to fall back on.
--
-- 20261110000000_account_recovery gave account_recoveries.caller a default of
-- 'account-recovery'. The scheduled pass reads caller to tell a test script's
-- requests (test-...) from real ones, and skips the test ones. With the
-- default, a row written without a caller was quietly marked as a real
-- request, so a test that forgot the label would have had its request carried
-- out by the live pass (schema-sentry, November 9). Without it, the not null
-- refuses the row. lib/auth/account-recovery.js has named the caller on every
-- insert from the start, so nothing that runs today changes.

alter table account_recoveries alter column caller drop default;
