'use server'

// Posterity — Plan Selection: Add a plan and the plan options · Walker Brown
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { requireAccount } from '../../../lib/posterity/account'
import {
  placePlan, setSkips, setSlots, setTimeZone, setTier, deletePlan, PlanRefused,
} from '../../../lib/posterity/plan-records'

// The server actions behind Plan Selection (Master Specification, User
// Profiles): Add a plan, and each option on a plan. The customer's session
// says whose account it is; the plan is then written with the service role,
// for that account alone, since plans are read-only to the customer at the
// database (lib/posterity/plan-records.js).
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  notSaved: '[Placeholder: Product surface copy — error messages: the change to the plan was not saved]',
  building_closed: '[Placeholder: Product surface copy — error messages: plans cannot be added or changed while building is closed]',
  one_plan_limit: '[Placeholder: Product surface copy — error messages: an account builds one plan until that plan is paid for; paying for it opens further plans]',
  year_taken: '[Placeholder: Product surface copy — error messages: that plan year already holds a plan]',
  year_out_of_range: '[Placeholder: Product surface copy — error messages: that plan year is outside the years a plan can be placed on]',
  unknown_time_zone: '[Placeholder: Product surface copy — error messages: that time zone is not one Posterity can deliver in]',
  bad_tier: '[Placeholder: Product surface copy — error messages: that tier cannot be chosen here]',
  no_plan: '[Placeholder: Product surface copy — error messages: that plan cannot be found]',
  plan_paid: '[Placeholder: Product surface copy — error messages: a paid plan is not changed here]',
  staff_plan: '[Placeholder: Product surface copy — error messages: this plan was placed by Posterity and is changed by contacting us]',
  skips_out_of_range: '[Placeholder: Product surface copy — error messages: the number of skipped years is not one that can be set]',
  slots_out_of_range: '[Placeholder: Product surface copy — error messages: a plan carries up to four Additional Recipient slots]',
  paid_plan_in_the_way: '[Placeholder: Product surface copy — error messages: a paid plan holds its year, so this plan cannot be moved onto or past it]',
  downgrade_unconfirmed: '[Placeholder: Product surface copy — error messages: a change to a lower tier needs to be confirmed]',
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// Runs one change for the signed-in customer's account. Returns
// { result } or { error }.
async function change(what, run) {
  const { account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }
  try {
    return { result: await run(serviceDb(), account.id) }
  } catch (err) {
    revalidatePath('/dashboard')
    if (err instanceof PlanRefused) return { error: ERRORS[err.reason] ?? ERRORS.notSaved }
    console.log(`plans: ${what} failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { error: ERRORS.notSaved }
  }
}

// Add a plan. The form carries the tier, the browser's time zone, and the
// plan year where the customer chose one on the calendar. With no year the
// plan lands on the year after their last. Opens the new plan on the calendar.
//
// The plan's time zone defaults to the one the browser reports (Calendar
// System). A browser that reports none still places its plan: the plan takes
// UTC, shows it, and the customer changes it on the plan. A time zone that is
// sent and cannot be read is refused.
export async function addPlanAction(_prev, formData) {
  const { result: plan, error } = await change('add', (db, accountId) => placePlan(db, {
    accountId,
    tier: formData.get('tier'),
    planYear: formData.get('year') || null,
    timeZone: formData.get('time_zone') || 'UTC',
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  redirect(`/dashboard?year=${plan.plan_year}`)
}

// The skipped years before a plan. The plan moves, so the calendar reopens on
// its new year.
export async function skipsAction(_prev, formData) {
  const { result: plan, error } = await change('skips', (db, accountId) => setSkips(db, {
    accountId,
    planId: formData.get('plan_id'),
    skips: formData.get('skips'),
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  redirect(`/dashboard?year=${plan.plan_year}`)
}

export async function slotsAction(_prev, formData) {
  const { error } = await change('slots', (db, accountId) => setSlots(db, {
    accountId,
    planId: formData.get('plan_id'),
    slots: formData.get('slots'),
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  return { done: true }
}

export async function timeZoneAction(_prev, formData) {
  const { error } = await change('time zone', (db, accountId) => setTimeZone(db, {
    accountId,
    planId: formData.get('plan_id'),
    timeZone: formData.get('time_zone'),
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  return { done: true }
}

// A change of tier. A downgrade arrives twice: first without `confirmed`,
// which the form answers by asking, then with it.
export async function tierAction(_prev, formData) {
  const { error } = await change('tier', (db, accountId) => setTier(db, {
    accountId,
    planId: formData.get('plan_id'),
    tier: formData.get('tier'),
    confirmed: formData.get('confirmed') === 'yes',
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  return { done: true }
}

// Deletes a plan. The form shows the specification's confirmation sentence
// and sends `confirmed` only from the button beneath it.
export async function deletePlanAction(_prev, formData) {
  if (formData.get('confirmed') !== 'yes') return { error: ERRORS.notSaved }
  const { result, error } = await change('delete', (db, accountId) => deletePlan(db, {
    accountId,
    planId: formData.get('plan_id'),
  }))
  if (error) return { error }
  revalidatePath('/dashboard')
  redirect(`/dashboard?year=${result.planYear}`)
}
