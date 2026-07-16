-- Staff death-verification hold for the non-response trigger.
--
-- `trigger_confirmations` already records the DOUBLE VERIFICATION of whoever
-- INITIATED a trigger (verified_password / verified_code). It does NOT record a
-- staff member verifying the actual DEATH. This adds that field — the
-- human-in-the-loop hold:
--
--   No legacy content is delivered for a DEATH-triggered account until a staff
--   member has affirmatively verified the death here.
--
-- A false positive (the customer is alive) is recorded as a VETO, which the app
-- uses to return the account to Planning and reset the check-in clock.
--
-- This migration is behavior-neutral on its own: additive, nullable/defaulted
-- columns. The delivery gate that READS these (and any DB-level enforcement) ships
-- with the delivery engine — this is the record it will check.

alter table trigger_confirmations
  add column if not exists staff_verified    boolean     not null default false,
  add column if not exists staff_verified_by uuid        references auth.users(id) on delete set null,
  add column if not exists staff_verified_at timestamptz,
  add column if not exists staff_note        text,
  add column if not exists vetoed            boolean     not null default false,
  add column if not exists vetoed_by         uuid        references auth.users(id) on delete set null,
  add column if not exists vetoed_at         timestamptz,
  add column if not exists veto_reason       text;

-- A confirmation is pending, staff-verified, or vetoed — never both verified and vetoed.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trigger_confirmations_not_both_verified_and_vetoed'
  ) then
    alter table trigger_confirmations
      add constraint trigger_confirmations_not_both_verified_and_vetoed
      check (not (staff_verified and vetoed));
  end if;
end $$;

-- The admin "verify death" task queue reads this: death-triggered accounts still
-- awaiting a human decision.
create index if not exists trigger_confirmations_awaiting_staff_idx
  on trigger_confirmations (account_id)
  where not staff_verified and not vetoed;
