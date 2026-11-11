// Posterity — plan records: placing a plan and changing one · Walker Brown
//
// A plan is one year of delivery (Master Specification, Plan Year System). Its
// record carries its tier, its plan year, its delivery time zone, its
// allowances and its Additional Recipient slots. This file is every way a
// customer changes one before it is paid for (User Profiles, Plan Selection):
//
//   placePlan     Add a plan: a new plan with its tier, on a plan year
//   setSkips      the skipped years before a plan, which moves it and the
//                 unpaid plans after it
//   setSlots      its Additional Recipient slots, 0 to 4
//   setTimeZone   its delivery time zone
//   setTier       its tier, taking the new tier's allowances
//   deletePlan    the plan and all work on it
//
// Plans are read-only to the customer at the database (20261026020000), so
// every function here takes a service-role client, and the caller has already
// established whose account it is. Each also takes the account's id and writes
// only where the plan belongs to that account.
//
// A refusal is thrown as PlanRefused with a reason; anything else thrown is a
// fault. No payment moves here: the cart that prices and pays for a plan is
// built next, and a paid plan is changed only through it, so a change that
// would alter what a paid plan costs is refused as plan_paid.
import { PLANS, getPlan } from './plans.js'
import { BUCKET } from './account-deletion.js'
import { CUSTOMER_TIERS, MAX_SLOTS, MAX_PLAN_YEAR, isDowngrade } from './plan-calendar.js'

export class PlanRefused extends Error {
  constructor(reason) {
    super(`plan refused: ${reason}`)
    this.name = 'PlanRefused'
    this.reason = reason
  }
}

// What the two database functions refuse with, and the triggers beneath them.
const REFUSALS = new Set([
  'no_account', 'building_closed', 'one_plan_limit', 'year_out_of_range', 'year_taken',
  'unknown_time_zone', 'no_plan', 'plan_paid', 'skips_out_of_range', 'paid_plan_in_the_way',
])

function refusalOf(error) {
  const message = String(error?.message ?? '')
  return REFUSALS.has(message) ? message : null
}

// A time zone name this server can read. The database checks the name again
// against its own list when the plan is written.
export function isTimeZone(name) {
  if (typeof name !== 'string' || !name || name.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: name })
    return true
  } catch {
    return false
  }
}

function wholeNumber(value) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim() || NaN)
  return Number.isInteger(n) ? n : null
}

async function buildingOpen(db, accountId) {
  const { data, error } = await db.rpc('building_is_open', { p_account_id: accountId })
  if (error) throw error
  return data === true
}

// The plan as this account holds it, or a refusal: no_plan where it is not
// this account's.
async function readPlan(db, accountId, planId) {
  if (typeof planId !== 'string' || !/^[0-9a-f-]{36}$/i.test(planId)) throw new PlanRefused('no_plan')
  const { data, error } = await db.from('plans').select('*').eq('id', planId).eq('account_id', accountId).maybeSingle()
  if (error) throw error
  if (!data) throw new PlanRefused('no_plan')
  return data
}

// The checks shared by every change that alters what an unpaid plan is.
// Returns the plan.
async function openPlan(db, accountId, planId) {
  if (!(await buildingOpen(db, accountId))) throw new PlanRefused('building_closed')
  const plan = await readPlan(db, accountId, planId)
  if (plan.paid_at) throw new PlanRefused('plan_paid')
  if (!CUSTOMER_TIERS.includes(plan.tier)) throw new PlanRefused('staff_plan')
  return plan
}

// One plan's row, written where it is still unpaid. The row comes back, so a
// write that reached nothing is seen rather than assumed.
async function writeUnpaid(db, accountId, planId, changes) {
  const { data, error } = await db
    .from('plans')
    .update(changes)
    .eq('id', planId)
    .eq('account_id', accountId)
    .is('paid_at', null)
    .select('*')
    .maybeSingle()
  if (error) {
    const reason = refusalOf(error)
    if (reason) throw new PlanRefused(reason)
    throw error
  }
  if (!data) throw new PlanRefused('plan_paid')
  return data
}

// Add a plan. planYear null places it on the year after the account's last
// plan. The plan takes its tier's allowances from the catalog. The one-plan
// limit of an account that has not been initiated (Horizon Tier) is held by
// the database function, which takes the account's row first, so two requests
// at once cannot both pass it.
export async function placePlan(db, { accountId, tier, planYear = null, timeZone }) {
  const catalog = CUSTOMER_TIERS.includes(tier) ? getPlan(tier) : null
  if (!catalog) throw new PlanRefused('bad_tier')
  if (!isTimeZone(timeZone)) throw new PlanRefused('unknown_time_zone')
  let year = null
  if (planYear !== null && planYear !== undefined && planYear !== '') {
    year = wholeNumber(planYear)
    if (year === null || year < 1 || year > MAX_PLAN_YEAR) throw new PlanRefused('year_out_of_range')
  }

  const { data, error } = await db.rpc('place_plan', {
    p_account_id: accountId,
    p_tier: tier,
    p_plan_year: year,
    p_time_zone: timeZone,
    p_standard: catalog.standard,
    p_feature: catalog.feature,
    p_social: catalog.social,
  })
  if (error) {
    const reason = refusalOf(error)
    if (reason) throw new PlanRefused(reason)
    throw error
  }
  return data
}

// The skipped years before a plan. The plan moves to sit that many years after
// the plan before it, and the unpaid plans after it move by the same number
// of years. A paid plan never moves, and a move that would reach one is
// refused as paid_plan_in_the_way (public.move_plan).
export async function setSkips(db, { accountId, planId, skips }) {
  const n = wholeNumber(skips)
  if (n === null || n < 0 || n >= MAX_PLAN_YEAR) throw new PlanRefused('skips_out_of_range')
  if (typeof planId !== 'string' || !/^[0-9a-f-]{36}$/i.test(planId)) throw new PlanRefused('no_plan')

  const { data, error } = await db.rpc('move_plan', {
    p_account_id: accountId,
    p_plan_id: planId,
    p_skipped_before: n,
  })
  if (error) {
    const reason = refusalOf(error)
    if (reason) throw new PlanRefused(reason)
    throw error
  }
  return data
}

// The plan's Additional Recipient slots.
export async function setSlots(db, { accountId, planId, slots }) {
  const n = wholeNumber(slots)
  if (n === null || n < 0 || n > MAX_SLOTS) throw new PlanRefused('slots_out_of_range')
  await openPlan(db, accountId, planId)
  return writeUnpaid(db, accountId, planId, { additional_recipient_slots: n })
}

// The plan's delivery time zone. Calendar System: "The time zone can be
// changed until the account enters Interlude", so this is open on a paid plan
// as well; it changes nothing a plan costs. Building closes at Interlude, and
// the check below is what locks it there.
export async function setTimeZone(db, { accountId, planId, timeZone }) {
  if (!isTimeZone(timeZone)) throw new PlanRefused('unknown_time_zone')
  if (!(await buildingOpen(db, accountId))) throw new PlanRefused('building_closed')
  await readPlan(db, accountId, planId)

  const { data, error } = await db
    .from('plans')
    .update({ delivery_time_zone: timeZone })
    .eq('id', planId)
    .eq('account_id', accountId)
    .select('*')
    .maybeSingle()
  if (error) {
    const reason = refusalOf(error)
    if (reason) throw new PlanRefused(reason)
    throw error
  }
  if (!data) throw new PlanRefused('no_plan')
  return data
}

// The plan's tier. It takes the new tier's allowances; its slots and its time
// zone carry over. A downgrade is confirmed by the customer before this is
// called with confirmed: true.
//
// Stage 4.5 adds the fit check here: a downgrade is refused while the plan
// holds more deliveries than the new tier carries. No plan holds a delivery
// count until then.
export async function setTier(db, { accountId, planId, tier, confirmed = false }) {
  const catalog = CUSTOMER_TIERS.includes(tier) ? PLANS[tier] : null
  if (!catalog) throw new PlanRefused('bad_tier')
  const plan = await openPlan(db, accountId, planId)
  if (plan.tier === tier) return plan
  if (isDowngrade(plan.tier, tier) && !confirmed) throw new PlanRefused('downgrade_unconfirmed')

  return writeUnpaid(db, accountId, planId, {
    tier,
    standard_deliveries: catalog.standard,
    feature_deliveries: catalog.feature,
    social_posts: catalog.social,
  })
}

// Deletes a plan and all work on it (User Profiles: "This will permanently
// delete all work on this plan and cannot be undone."). The customer has
// confirmed against that sentence before this is called.
//
// Deleting stays open while building is locked for a storage lapse, as
// deleting content does, and closes with the Planning Phase. The content tied
// to the plan does not go with the plan's row on its own (its link is cleared,
// not followed), so it is removed here: its files first, then its rows, then
// the plan. A run that stops partway is finished by deleting again.
export async function deletePlan(db, { accountId, planId }) {
  const { data: account, error: accountError } = await db.from('accounts').select('phase').eq('id', accountId).maybeSingle()
  if (accountError) throw accountError
  if (!account) throw new PlanRefused('no_account')
  if (account.phase !== 'horizon' && account.phase !== 'planning') throw new PlanRefused('building_closed')

  const plan = await readPlan(db, accountId, planId)
  if (plan.paid_at) throw new PlanRefused('plan_paid')
  if (!CUSTOMER_TIERS.includes(plan.tier)) throw new PlanRefused('staff_plan')

  const { data: content, error: contentError } = await db
    .from('content_items')
    .select('id, storage_path, thumbnail_path')
    .eq('plan_id', planId)
    .eq('account_id', accountId)
  if (contentError) throw contentError

  const paths = content.flatMap((c) => [c.storage_path, c.thumbnail_path]).filter(Boolean)
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) throw error
  }
  if (content.length) {
    const { error } = await db.from('content_items').delete().eq('plan_id', planId).eq('account_id', accountId)
    if (error) throw error
  }

  const { data: gone, error } = await db
    .from('plans')
    .delete()
    .eq('id', planId)
    .eq('account_id', accountId)
    .is('paid_at', null)
    .select('id, plan_year')
    .maybeSingle()
  if (error) throw error
  if (!gone) throw new PlanRefused('plan_paid')
  return { planYear: gone.plan_year, content: content.length, files: paths.length }
}
