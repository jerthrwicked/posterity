// Posterity — User Profiles: reading the cart for the page · Walker Brown
//
// The cart is read from the account's unpaid plans each time a page behind
// sign-in loads (lib/posterity/cart.js), under row-level security as the
// signed-in customer. Nothing is stored for it, which is how it "persists
// across sessions" (Master Specification, User Profiles): it is whatever the
// plans are.
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '../../../lib/posterity/stripe'
import { settleCheckout } from '../../../lib/posterity/checkout'
import { cartOf, storageLine, storageCurrent, plansInCheckout } from '../../../lib/posterity/cart'

// Stripe's statuses for a subscription that is over.
const ENDED = ['canceled', 'incomplete_expired']

const day = (date) => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date)

// Where the account has a payment form open, reads what became of it before
// the page reads its plans, so a form paid on Stripe's page shows as paid
// here whichever way the customer came back. Once per page load, however
// many parts of the page ask. An account with no form open costs one read.
export const settleCart = cache(async (supabase, accountId) => {
  if (!accountId) return
  const { data: open } = await supabase.from('checkouts').select('id').eq('account_id', accountId).eq('status', 'open').limit(1)
  if (!open?.length) return
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    await settleCheckout(db, getStripe(), { accountId })
  } catch (err) {
    // The page still loads. The form is read again on the next one.
    console.log(`cart: the open payment form could not be read: ${String(err?.message ?? err).slice(0, 200)}`)
  }
})

// The plans a payment form is open for right now, as a Set of plan ids.
export async function plansHeld(supabase, accountId) {
  const { data } = await supabase.from('checkouts')
    .select('status, expires_at, checkout_lines(plan_id, kind)')
    .eq('account_id', accountId).eq('status', 'open')
  return plansInCheckout(data ?? [])
}

// What the cart shows. profile: requireAccount()'s answer. Null where there
// is no account.
//
//   groups, loose   the cart (lib/posterity/cart.js)
//   storage         the storage fee, its own line: { name, amount, state,
//                   trial, next }
//                     current   a paid storage year holds
//                     joins     it is not current, so it is added to a
//                               payment for a plan
//                     owed      the storage subscription's renewal is unpaid
//                   next is the next payment date as text, where there is one
//   inCheckout      the ids of the plans a payment form is open for
//   closed          the account is past the Planning Phase
//
// The checkout decides all of this again when it is asked
// (lib/posterity/checkout.js). This is what the customer is shown first.
export async function readCart({ supabase, account, status }) {
  if (!account) return null
  await settleCart(supabase, account.id)

  const [plans, fees, held, subscriptions] = await Promise.all([
    supabase.from('plans').select('id, plan_year, tier, paid_at, additional_recipient_slots').eq('account_id', account.id),
    supabase.from('storage_fees').select('plan_year, paid_at').eq('account_id', account.id),
    plansHeld(supabase, account.id),
    supabase.from('subscriptions').select('status').eq('account_id', account.id).not('stripe_subscription_id', 'is', null),
  ])
  const cart = cartOf({ plans: plans.data ?? [], fees: fees.data ?? [] })

  const line = storageLine(status)
  const current = storageCurrent(status)
  const subscribed = (subscriptions.data ?? []).some((sub) => !ENDED.includes(sub.status))
  const trial = status?.storage_standing === 'trial'
  let next = null
  if (current) next = day(new Date(`${status.storage_paid_through}T00:00:00Z`))
  else if (trial && status.trial_ends_at) next = day(new Date(status.trial_ends_at))

  return {
    groups: cart.groups,
    loose: cart.loose,
    storage: { name: line.name, amount: line.unitAmount, state: current ? 'current' : subscribed ? 'owed' : 'joins', trial, next },
    inCheckout: [...held],
    closed: status?.storage_standing === 'ended',
  }
}
