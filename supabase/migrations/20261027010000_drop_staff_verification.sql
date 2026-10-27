-- Changes to Previous Work — staff verification removed from trigger confirmations · Walker Brown
--
-- 20260716120000 added a staff death check to trigger_confirmations: who
-- verified the death and when, a veto for a false positive, a check that a
-- confirmation is never both, and an index for the queue awaiting staff.
-- Nothing ever read them, and neither the Master Specification nor the
-- roadmap holds a staff check. A trigger is guarded by the check-in sequence,
-- double verification, and the Legacy Guard confirmation's month, and Account
-- Restoration covers a customer still speaking for themselves.
--
-- The table held no rows when this was applied. Dropping the columns drops
-- their two foreign keys to auth.users with them.

drop index if exists public.trigger_confirmations_awaiting_staff_idx;

alter table public.trigger_confirmations
  drop constraint if exists trigger_confirmations_not_both_verified_and_vetoed,
  drop column if exists staff_verified,
  drop column if exists staff_verified_by,
  drop column if exists staff_verified_at,
  drop column if exists staff_note,
  drop column if exists vetoed,
  drop column if exists vetoed_by,
  drop column if exists vetoed_at,
  drop column if exists veto_reason;
