-- Stage 4.1 — the primary legacy and the plans, out of the customer's reach · Walker Brown
--
-- Found by schema-sentry after 20261026010000 was applied.
--
-- The primary legacy could be deleted by its own customer. own_rows covers
-- every command and content_items cascades from legacies, so one call from the
-- customer's token erased every message, even with building locked. It could
-- also be demoted, which leaves the account with no primary at all. The
-- primary is created at signup by handle_new_user. A second legacy, built
-- later, stays the customer's to delete.
--
-- Every column on a plan is set by payment: the plan year, the tier, when it
-- was paid, the delivery year, and when its funds were released. The customer's
-- token could write all of them, and Stage 4.3 will trust them. Plans are now
-- read-only to the customer; the webhook writes them with the service role. The
-- cart in Stage 4.3 opens whatever it needs and no more.
--
-- Deleting the account with the service role (Stage 4.7) still cascades
-- through both tables: a cascade is not subject to row-level security, and
-- neither guard below fires on delete.

-- ============================================================ the primary legacy

create policy legacies_primary_not_deleted on public.legacies
  as restrictive for delete to authenticated, anon
  using (not is_primary);

create or replace function public.guard_legacy_columns()
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
    if new.is_primary then
      raise exception 'the primary legacy is created at signup'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;
  if new.is_primary is distinct from old.is_primary
  or new.account_id is distinct from old.account_id then
    raise exception 'the primary legacy is set by Posterity, not by the account'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_legacy_columns
  before insert or update on public.legacies
  for each row execute function public.guard_legacy_columns();

-- One primary per account, so "the primary legacy" always names one row.
create unique index legacies_one_primary on public.legacies (account_id) where is_primary;

-- ============================================================ the plans

create policy plans_no_customer_delete on public.plans
  as restrictive for delete to authenticated, anon
  using (false);

create or replace function public.guard_plan_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  raise exception 'plans are set by payment, not by the account'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger guard_plan_columns
  before insert or update on public.plans
  for each row execute function public.guard_plan_columns();
