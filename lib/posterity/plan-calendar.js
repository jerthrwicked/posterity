// Posterity — plan records: what a page reads from them · Walker Brown
//
// The parts of a plan record that a page works out for itself, with nothing
// in them that needs the server: the year calendar, the skipped years before
// a plan, and the limits a form shows before the server enforces them
// (lib/posterity/plan-records.js, which writes plans, holds the enforcement).

// The tiers a customer places themselves. A Grace or Custom plan is placed by
// staff (Custom Plans and Posterity Grace) and is changed by staff.
export const CUSTOMER_TIERS = ['basic', 'premium', 'legacy']

// Subscription Tiers: "up to four extra slots can be purchased per plan."
export const MAX_SLOTS = 4

// The database's ceiling on a plan year (plans_plan_year_ceiling).
export const MAX_PLAN_YEAR = 100

// Whether moving a plan from one tier to another lowers what it carries.
export function isDowngrade(from, to) {
  return CUSTOMER_TIERS.indexOf(to) < CUSTOMER_TIERS.indexOf(from)
}

// The year calendar (Calendar System: "Each year shows its plan and tier and
// whether it is configured, scheduled, paid, or skipped").
//
// Every plan year from Year 1 to the last year holding a plan, in order. A
// year with a paid plan reads paid; one with a plan not yet paid for reads
// configured; one with no plan, below a later plan, reads skipped. Scheduled
// arrives with the delivery schedule within Stage 4.5.
//
// plans: the account's plan rows. Returns [{ year, plan, status }], plan null
// on a skipped year.
export function yearCalendar(plans) {
  const byYear = new Map(plans.map((p) => [p.plan_year, p]))
  const last = plans.reduce((max, p) => Math.max(max, p.plan_year), 0)
  const years = []
  for (let year = 1; year <= last; year += 1) {
    const plan = byYear.get(year) ?? null
    years.push({ year, plan, status: !plan ? 'skipped' : plan.paid_at ? 'paid' : 'configured' })
  }
  return years
}

// The skipped years directly before a plan: the empty years between it and
// the plan before it, or since Year 1.
export function skipsBefore(plans, plan) {
  const before = plans.reduce((max, p) => (p.plan_year < plan.plan_year ? Math.max(max, p.plan_year) : max), 0)
  return plan.plan_year - before - 1
}

// Whether the account is held to the plan it has (Horizon Tier: "A Horizon
// Phase account builds one plan before it is initiated"). The database
// function decides; this is for a page to explain it ahead of the attempt.
export function atPlanLimit(phase, plans) {
  return phase === 'horizon' && plans.some((p) => CUSTOMER_TIERS.includes(p.tier))
}
