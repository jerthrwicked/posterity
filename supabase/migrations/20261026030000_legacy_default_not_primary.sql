-- Stage 4.1 — a new legacy is not the primary unless it says so · Walker Brown
--
-- Found by schema-sentry after 20261026020000 was applied. is_primary defaulted
-- to true, so a second legacy inserted without naming it was refused as a
-- second primary. handle_new_user names the primary explicitly and is
-- unaffected.

alter table public.legacies alter column is_primary set default false;
