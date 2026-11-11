-- Stage 4.3 — plan records: the delivery time zone, the allowances, and the
-- Additional Recipient slots · Walker Brown
--
-- The Master Specification's plan is one year of delivery with its own
-- parameters on its record (Custom Plans and Posterity Grace: "its Standard,
-- Feature, and social media allowances, its Additional Recipient slots"), and
-- it "carries a delivery time zone, selected during plan selection" (Calendar
-- System). The plans table held the tier, the plan year, the payment date, the
-- delivery year, and the release of funds. This adds the rest of what a plan
-- is before it is paid for. Its payment record and a Custom plan's price
-- arrive with the cart, which is what writes them.
--
-- The table is empty, so the new columns take no default: a plan without its
-- allowances or its time zone cannot be written at all.
--
-- Plans stay read-only to the customer (20261026020000). The two functions
-- below are how a plan is placed and moved, and only the server calls them.
-- Each takes the account's row first, so two requests for one account run one
-- after the other and neither sees the other half done.
--
-- It moves and removes no data.

-- ============================================================ the columns

alter table public.plans
  add column delivery_time_zone text not null,
  add column standard_deliveries integer not null,
  add column feature_deliveries integer not null,
  add column social_posts integer not null,
  add column additional_recipient_slots integer not null default 0,
  add constraint plans_standard_deliveries_check check (standard_deliveries >= 0),
  add constraint plans_feature_deliveries_check check (feature_deliveries >= 0),
  add constraint plans_social_posts_check check (social_posts >= 0),
  -- Subscription Tiers: "up to four extra slots can be purchased per plan."
  add constraint plans_additional_recipient_slots_check check (additional_recipient_slots between 0 and 4),
  -- A ceiling on the plan year. The specification sets none; this one only
  -- keeps a mistyped year from placing a plan thousands of years out.
  add constraint plans_plan_year_ceiling check (plan_year <= 100);

comment on column public.plans.delivery_time_zone is
  'The time zone the plan''s deliveries go out in, at noon on their date. A name the database knows (pg_timezone_names).';
comment on column public.plans.standard_deliveries is 'Standard Deliveries the plan carries for its plan year.';
comment on column public.plans.feature_deliveries is 'Feature Deliveries the plan carries for its plan year.';
comment on column public.plans.social_posts is 'Social media posts the plan carries, drawn from its deliveries.';
comment on column public.plans.additional_recipient_slots is 'Additional Recipient slots chosen for the plan, 0 to 4.';

-- ============================================================ the time zone is a real one

-- Stage 4.7 sends each delivery at noon in the plan's time zone, so a name the
-- database cannot read must never be stored.
create or replace function public.check_plan_time_zone()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.delivery_time_zone) then
    raise exception 'unknown_time_zone' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_plan_time_zone
  before insert or update of delivery_time_zone on public.plans
  for each row execute function public.check_plan_time_zone();

-- ============================================================ placing a plan

-- Places a plan on a plan year. p_plan_year null places it on the year after
-- the account's last plan, or on Year 1.
--
-- Refused with:
--   no_account          the account does not exist
--   building_closed     building is not open (Plan Year System: "Plans are
--                       built while an account's storage fee is current")
--   one_plan_limit      Horizon Tier: "A Horizon Phase account builds one plan
--                       before it is initiated ... A Grace or Custom plan
--                       placed by staff falls outside this limit."
--   year_out_of_range   the year is below 1 or above the ceiling
--   year_taken          the year already holds a plan
create or replace function public.place_plan(
  p_account_id uuid,
  p_tier public.plan_tier,
  p_plan_year integer,
  p_time_zone text,
  p_standard integer,
  p_feature integer,
  p_social integer
)
returns public.plans
language plpgsql
set search_path = public
as $$
declare
  v_account public.accounts;
  v_year integer;
  v_plan public.plans;
begin
  select * into v_account from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'no_account';
  end if;
  if not public.building_is_open(p_account_id) then
    raise exception 'building_closed';
  end if;

  if v_account.phase = 'horizon'
     and p_tier not in ('grace', 'custom')
     and exists (select 1 from public.plans
                  where account_id = p_account_id and tier not in ('grace', 'custom')) then
    raise exception 'one_plan_limit';
  end if;

  v_year := coalesce(
    p_plan_year,
    (select max(plan_year) + 1 from public.plans where account_id = p_account_id),
    1);
  if v_year < 1 or v_year > 100 then
    raise exception 'year_out_of_range';
  end if;

  begin
    insert into public.plans
      (account_id, plan_year, tier, delivery_time_zone, standard_deliveries, feature_deliveries, social_posts)
    values
      (p_account_id, v_year, p_tier, p_time_zone, p_standard, p_feature, p_social)
    returning * into v_plan;
  exception when unique_violation then
    raise exception 'year_taken';
  end;
  return v_plan;
end;
$$;

-- ============================================================ skipped years before a plan

-- Sets how many plan years are skipped before a plan, which moves the plan.
-- The plans after it move with it by the same number of years, so each keeps
-- the skipped years chosen for it.
--
-- A paid plan never moves: from payment Posterity "holds the plan's year on
-- the account's calendar" (Legal and Compliance, Initiation). So only an
-- unpaid plan is moved, the plans moving with it are those up to the next
-- paid plan, and a move that would reach that paid plan's year is refused.
--
-- Refused with:
--   no_account, building_closed   as place_plan
--   no_plan                the plan is not this account's
--   plan_paid              the plan is paid for
--   skips_out_of_range     a negative number of years
--   paid_plan_in_the_way   the move would reach a paid plan's year
--   year_out_of_range      the move would pass the ceiling
create or replace function public.move_plan(
  p_account_id uuid,
  p_plan_id uuid,
  p_skipped_before integer
)
returns public.plans
language plpgsql
set search_path = public
as $$
declare
  v_plan public.plans;
  v_before integer;
  v_delta integer;
  v_wall integer;
  v_last integer;
  r record;
begin
  perform 1 from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'no_account';
  end if;
  if not public.building_is_open(p_account_id) then
    raise exception 'building_closed';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and account_id = p_account_id;
  if not found then
    raise exception 'no_plan';
  end if;
  if v_plan.paid_at is not null then
    raise exception 'plan_paid';
  end if;
  if p_skipped_before is null or p_skipped_before < 0 then
    raise exception 'skips_out_of_range';
  end if;

  -- The year of the plan before this one, or 0 where this is the first.
  select coalesce(max(plan_year), 0) into v_before
    from public.plans where account_id = p_account_id and plan_year < v_plan.plan_year;
  v_delta := v_before + 1 + p_skipped_before - v_plan.plan_year;
  if v_delta = 0 then
    return v_plan;
  end if;

  -- The next paid plan after this one stays where it is, with everything
  -- beyond it.
  select min(plan_year) into v_wall
    from public.plans
   where account_id = p_account_id and plan_year > v_plan.plan_year and paid_at is not null;
  select max(plan_year) into v_last
    from public.plans
   where account_id = p_account_id and plan_year >= v_plan.plan_year
     and (v_wall is null or plan_year < v_wall);

  if v_delta > 0 then
    if v_wall is not null and v_last + v_delta >= v_wall then
      raise exception 'paid_plan_in_the_way';
    end if;
    if v_last + v_delta > 100 then
      raise exception 'year_out_of_range';
    end if;
  end if;

  -- One row at a time, the far end first, so no two plans ever hold one year.
  for r in
    select id from public.plans
     where account_id = p_account_id and plan_year >= v_plan.plan_year
       and (v_wall is null or plan_year < v_wall)
     order by case when v_delta > 0 then -plan_year else plan_year end
  loop
    update public.plans set plan_year = plan_year + v_delta where id = r.id;
  end loop;

  select * into v_plan from public.plans where id = p_plan_id;
  return v_plan;
end;
$$;

-- Only the server calls these. A customer's own token is refused here, and
-- would be refused by guard_plan_columns if it were not.
revoke execute on function public.place_plan(uuid, public.plan_tier, integer, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.move_plan(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.place_plan(uuid, public.plan_tier, integer, text, integer, integer, integer) to service_role;
grant execute on function public.move_plan(uuid, uuid, integer) to service_role;
