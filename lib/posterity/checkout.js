// Posterity — the cart's checkout · Walker Brown
//
// Master Specification, User Profiles: "Plans can be paid for individually or
// all at once, and only the plan (not its added inclusions) can be selected
// for payment within a cart." Horizon Tier: "Paying for a plan without a
// current storage fee automatically adds the storage fee at checkout." Plan
// Year System: "Paying for the first plan initiates the account and moves it
// into the Planning Phase". Legal and Compliance: "The refund policy is shown
// at checkout, and the customer accepts it before paying."
//
// The cart is read from the unpaid plans (cart.js). A payment is a record: a
// `checkouts` row with its `checkout_lines`, each line priced as it stood
// when the payment form was opened (20261116000000). The payment form is the
// one built within Stage 3.1, Stripe's hosted Checkout.
//
//   openCheckout        opens the payment form for the plans chosen, with
//                       everything that travels with them
//   closeOpenCheckout   closes the account's open payment form, so a plan it
//                       was opened for can be changed. A form already paid is
//                       applied instead
//   settleCheckout      reads what became of the open payment form and
//                       applies it where it was paid, leaving a form that
//                       can still be paid open
//   applyCheckout       once the form is paid, marks each plan paid, records
//                       each skipped year's storage fee, and initiates the
//                       account at its first paid plan
//
// A paid form is applied by whichever of these comes first: the customer's
// browser returning to /api/cart/return, Stripe's webhook, or the customer's
// next page (settleCheckout). Applying the same form twice changes nothing.
//
// The storage fee is current while a paid storage year holds. Where it is
// not, and a plan is being paid for, the storage subscription opens with the
// same payment and its paid year starts that day. That holds for an account
// within its free trial too (Walker, November 12; flagged to Jeremy). An
// account whose storage subscription is still open with its renewal unpaid
// owes that renewal instead, and the payment is refused until it is settled
// (Stage 4.7).
//
// Every function takes a Supabase client with the service role: plans are
// read-only to the customer, and so is every record here.
//
// The form takes a card. PayPal joins it once Jeremy decides how.

import { PLANS, GRACE_STORAGE } from './plans.js'
import { cartOf, linesFor, totalOf, stripeItems, storageLine, storageCurrent } from './cart.js'
import { liveSubscriptions, recordSubscription } from './storage-subscriptions.js'
import { stripeCustomerFor } from './stripe-customer.js'

// What marks a Checkout session as one this file opened.
export const CART = 'cart'

// Why a payment form was not opened, or a payment not applied. reason:
//
//   policy_not_accepted   the refund policy was not accepted
//   no_account            there is no such account
//   building_closed       the account is past the Planning Phase
//   nothing_to_pay        no plan was chosen and no fee stands alone
//   storage_owed          the account's storage renewal is unpaid
//   cart_changed          the cart is no longer what the customer was shown
//   price_mismatch        Stripe's total is not the catalog's
//   superseded            another payment form was opened in the meantime
//   no_checkout           Stripe or Posterity holds no such payment form
//   not_cart              the form is not one openCheckout opened
//   other_account         the form was opened for another account
//   not_complete          the form was left before it was paid
export class CheckoutRefused extends Error {
  constructor(reason) {
    super(`checkout: ${reason}`)
    this.name = 'CheckoutRefused'
    this.reason = reason
  }
}

const idOf = (x) => (x && typeof x === 'object' ? x.id : x) ?? null

function must({ data, error }) {
  if (error) throw error
  return data
}

// Stripe's statuses for a subscription that is over.
const ENDED = new Set(['canceled', 'incomplete_expired'])
const STORAGE_PRICES = new Set([PLANS.horizon.priceId, GRACE_STORAGE.priceId])

async function statusOf(db, accountId) {
  return must(await db.rpc('account_status', { p_account_id: accountId }).maybeSingle())
}

// The lines a payment for these plans takes, read fresh: the chosen plans
// with what travels with them, and every loose skipped-year fee. The storage
// fee is decided apart (storageOwing).
async function chosenLines(db, accountId, planIds) {
  const [plans, fees] = await Promise.all([
    db.from('plans').select('id, plan_year, tier, paid_at, additional_recipient_slots').eq('account_id', accountId),
    db.from('storage_fees').select('plan_year, paid_at').eq('account_id', accountId),
  ])
  return linesFor(cartOf({ plans: must(plans), fees: must(fees) }), planIds)
}

// One line as text, so two readings of the cart can be told apart.
const marks = (lines) => lines
  .map((l) => [l.kind, l.planId, l.planYear, l.priceId, l.quantity, l.unitAmount].join(':'))
  .sort()
  .join('|')

// Whether this payment must open the storage subscription: the storage fee is
// not current and the account holds no storage subscription.
//
// Stripe is asked as well as the account's own rows. A storage subscription
// bought alone is written to the account by the Stripe webhook, and one the
// webhook has not yet written is still the account's: it is recorded here, so
// the account is never sold a second.
//
// Refused with storage_owed where a subscription is held and the storage fee
// is still not current: its renewal is unpaid.
async function storageOwing(db, stripe, { accountId, customer, status, now }) {
  if (storageCurrent(status, now)) return false

  const known = await liveSubscriptions(db, stripe, accountId)
  const seen = new Set(known.map((sub) => sub.id))
  let found = 0
  for await (const sub of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
    if (seen.has(sub.id) || ENDED.has(sub.status)) continue
    const price = sub.items?.data?.[0]?.price?.id
    if (!STORAGE_PRICES.has(price)) continue
    await recordSubscription(db, {
      accountId, customerId: customer, sub,
      tier: price === GRACE_STORAGE.priceId ? 'grace' : 'horizon', priceId: price,
    })
    found += 1
  }
  if (!known.length && !found) return true
  if (found && storageCurrent(await statusOf(db, accountId), now)) return false
  throw new CheckoutRefused('storage_owed')
}

async function expireRow(db, checkoutId) {
  must(await db.from('checkouts').update({ status: 'expired' }).eq('id', checkoutId).eq('status', 'open'))
}

async function dropRow(db, checkoutId) {
  must(await db.from('checkouts').delete().eq('id', checkoutId).eq('status', 'open'))
}

// Opens the payment form for an account. Returns { url, checkoutId, total,
// mode }: the address to send the customer to, the checkout's record, what
// the form charges in cents, and whether it opens the storage subscription
// ('subscription') or takes the plans alone ('payment').
//
// planIds: the plans ticked within the cart. Each takes its Additional
//   Recipient slots and the skipped years before it along, and every loose
//   skipped-year fee joins the payment whatever is ticked.
// accepted: true once the customer has accepted the refund policy on the
//   page. The time is recorded with the checkout.
// expectedTotal: what the page showed, in cents. The form is refused as
//   cart_changed where the cart has since come to something else, so nobody
//   is charged a total they were not shown.
// siteUrl: where the site is served, for the way back.
//
// An account has one open payment form at a time: opening another closes the
// one before it. While one is open the plans cannot change under it (the
// trigger on plans), which is what makes the lines recorded here the lines
// paid for.
export async function openCheckout(db, stripe, { accountId, userId, email, planIds, accepted, expectedTotal, siteUrl, now = new Date() }) {
  if (!accountId || !userId) throw new Error('checkout: the account and its sign-in are required')
  if (!siteUrl) throw new Error('checkout: the site address is required')
  if (accepted !== true) throw new CheckoutRefused('policy_not_accepted')

  const status = await statusOf(db, accountId)
  if (!status) throw new CheckoutRefused('no_account')
  if (status.storage_standing === 'ended') throw new CheckoutRefused('building_closed')

  // A form left open is closed first. One that was paid is applied by this,
  // and the cart read below no longer holds what it paid for.
  await closeOpenCheckout(db, stripe, { accountId })

  const ids = Array.isArray(planIds) ? planIds.filter((id) => typeof id === 'string') : []
  const chosen = await chosenLines(db, accountId, ids)
  if (!chosen.length) throw new CheckoutRefused('nothing_to_pay')

  const customer = await stripeCustomerFor(db, stripe, { accountId, userId, email })
  const storage = chosen.some((line) => line.kind === 'plan') && await storageOwing(db, stripe, { accountId, customer, status, now })
    ? storageLine(status)
    : null
  const lines = storage ? [...chosen, storage] : chosen
  const total = totalOf(lines)
  if (Number.isInteger(expectedTotal) && expectedTotal !== total) throw new CheckoutRefused('cart_changed')
  const mode = storage ? 'subscription' : 'payment'

  const opened = await db.from('checkouts').insert({
    account_id: accountId,
    opened_by: userId,
    refund_policy_accepted_at: now.toISOString(),
    mode,
    amount_cents: total,
    stripe_customer_id: customer,
  }).select('id').single()
  // The one-open index: another form was opened for the account just now.
  if (opened.error?.code === '23505') throw new CheckoutRefused('superseded')
  const checkoutId = must(opened).id

  let session
  try {
    // From here the plans cannot change. Read once more: a plan changed
    // between the first reading and the row is caught rather than charged.
    if (marks(await chosenLines(db, accountId, ids)) !== marks(chosen)) throw new CheckoutRefused('cart_changed')

    must(await db.from('checkout_lines').insert(lines.map((line) => ({
      checkout_id: checkoutId,
      account_id: accountId,
      kind: line.kind,
      plan_id: line.planId,
      plan_year: line.planYear,
      tier: line.tier,
      quantity: line.quantity,
      unit_amount_cents: line.unitAmount,
      stripe_price_id: line.priceId,
    }))))

    const metadata = { purpose: CART, account_id: accountId, user_id: userId, checkout_id: checkoutId }
    session = await stripe.checkout.sessions.create({
      mode,
      customer,
      client_reference_id: accountId,
      payment_method_types: ['card'],
      line_items: stripeItems(lines),
      metadata,
      ...(storage
        ? { subscription_data: { metadata: { ...metadata, tier: storage.tier } } }
        : { payment_intent_data: { metadata } }),
      success_url: `${siteUrl}/api/cart/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard`,
    }, { idempotencyKey: `cart:${checkoutId}` })

    if (session.amount_total !== total) {
      await stripe.checkout.sessions.expire(session.id)
      throw new CheckoutRefused('price_mismatch')
    }
  } catch (err) {
    await dropRow(db, checkoutId)
    throw err
  }

  const held = must(await db.from('checkouts')
    .update({ stripe_session_id: session.id, expires_at: new Date(session.expires_at * 1000).toISOString() })
    .eq('id', checkoutId).eq('status', 'open')
    .select('id'))
  if (!held.length) {
    // Closed while Stripe was opening the form. The form is closed with it;
    // its address is never handed out.
    await stripe.checkout.sessions.expire(session.id)
    throw new CheckoutRefused('superseded')
  }
  return { url: session.url, checkoutId, total, mode }
}

// Closes the account's open payment form, where it holds one. Returns
// { closed }: null where none was open, 'expired' where the form was closed
// unpaid, 'applied' where it had been paid and is now applied.
//
// Called before anything that changes what a plan costs, and before another
// form is opened. A form Stripe has closed can no longer be paid, so once
// this returns 'expired' the plans are free to change.
export async function closeOpenCheckout(db, stripe, { accountId }) {
  if (!accountId) throw new Error('checkout: the account is required')
  const open = must(await db.from('checkouts').select('id, stripe_session_id').eq('account_id', accountId).eq('status', 'open').maybeSingle())
  if (!open) return { closed: null }
  if (!open.stripe_session_id) {
    await expireRow(db, open.id)
    return { closed: 'expired' }
  }

  const read = async () => {
    try {
      return await stripe.checkout.sessions.retrieve(open.stripe_session_id)
    } catch (err) {
      if (err?.code === 'resource_missing') return null
      throw err
    }
  }
  let session = await read()
  if (session?.status === 'open') {
    try {
      session = await stripe.checkout.sessions.expire(session.id)
    } catch (err) {
      // Paid or closed in the same moment: read what became of it.
      session = await read()
      if (session?.status === 'open') throw err
    }
  }
  if (session?.status === 'complete') {
    await applyForm(db, stripe, session, accountId)
    return { closed: 'applied' }
  }
  await expireRow(db, open.id)
  return { closed: 'expired' }
}

// Brings the account's open payment form up to date with Stripe, without
// closing a form that can still be paid. Returns { settled }: null where no
// form is open, 'open' where Stripe still holds it open, 'applied' where it
// had been paid and is now applied, 'expired' where Stripe has closed it.
//
// The pages call this as they load, so a customer who paid and never came
// back through /api/cart/return still finds their plans paid, whether or not
// Stripe's webhook has arrived.
export async function settleCheckout(db, stripe, { accountId }) {
  if (!accountId) throw new Error('checkout: the account is required')
  const open = must(await db.from('checkouts').select('id, stripe_session_id').eq('account_id', accountId).eq('status', 'open').maybeSingle())
  // A row with no form yet is one being opened right now: left alone.
  if (!open?.stripe_session_id) return { settled: null }

  let session = null
  try {
    session = await stripe.checkout.sessions.retrieve(open.stripe_session_id)
  } catch (err) {
    if (err?.code !== 'resource_missing') throw err
  }
  if (session?.status === 'open') return { settled: 'open' }
  if (session?.status === 'complete') {
    await applyForm(db, stripe, session, accountId)
    return { settled: 'applied' }
  }
  await expireRow(db, open.id)
  return { settled: 'expired' }
}

// A payment form as Stripe holds it. Refused with no_checkout where Stripe
// holds none.
async function formOf(stripe, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') throw new CheckoutRefused('no_checkout')
  try {
    return await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    if (err?.code === 'resource_missing') throw new CheckoutRefused('no_checkout')
    throw err
  }
}

// Applies a paid payment form for the account that opened it: each plan it
// was opened for is marked paid, each skipped year's storage fee is recorded,
// the storage subscription it opened becomes the account's with its paid
// year, and the first plan paid initiates the account. Returns { already,
// plans, fees, initiated }: whether it had been applied before, how many
// plans and fees this marked paid, and whether it initiated the account.
//
// Refused (CheckoutRefused) unless the form is one openCheckout opened for
// this account and was paid. Applying the same form again changes nothing.
export async function applyCheckout(db, stripe, { accountId, sessionId }) {
  if (!accountId) throw new Error('checkout: the account is required')
  return applyForm(db, stripe, await formOf(stripe, sessionId), accountId)
}

// The same, for the account the form itself was opened for. For a caller
// with no customer signed in: the Stripe webhook, and the way back from the
// form where the customer's session has ended in the meantime. The form's id
// is known only to Stripe and to the browser it was opened in, and applying
// it does only what the customer paid for on Stripe's page.
export async function applyCheckoutAsOpened(db, stripe, { sessionId }) {
  const session = await formOf(stripe, sessionId)
  if (session.metadata?.purpose !== CART || !session.metadata?.account_id) throw new CheckoutRefused('not_cart')
  return applyForm(db, stripe, session, session.metadata.account_id)
}

// The payment a paid form took: { id, paidAt }. A form that opened the
// storage subscription was paid through the subscription's first invoice,
// which holds its payment.
async function paymentOf(stripe, session) {
  let id = idOf(session.payment_intent)
  if (!id && session.invoice) {
    const payments = await stripe.invoicePayments.list({ invoice: idOf(session.invoice), limit: 10 })
    id = idOf(payments.data.find((p) => p.status === 'paid' && p.payment?.payment_intent)?.payment?.payment_intent)
  }
  // Stripe has not yet joined the payment to the form. A fault, so that the
  // webhook is sent again and the customer's return can be tried again.
  if (!id) throw new Error(`checkout: no payment found yet for ${session.id}`)

  const intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] })
  const made = intent.latest_charge?.created ?? intent.created
  return { id, paidAt: new Date(made * 1000) }
}

async function applyForm(db, stripe, session, accountId) {
  const checkoutId = session.metadata?.checkout_id
  if (session.metadata?.purpose !== CART || !checkoutId) throw new CheckoutRefused('not_cart')
  if (session.metadata.account_id !== accountId || session.client_reference_id !== accountId) throw new CheckoutRefused('other_account')
  if (session.status !== 'complete' || session.payment_status !== 'paid') throw new CheckoutRefused('not_complete')

  const checkout = must(await db.from('checkouts').select('id, account_id, status, stripe_session_id').eq('id', checkoutId).maybeSingle())
  if (!checkout || checkout.stripe_session_id !== session.id) throw new CheckoutRefused('no_checkout')
  if (checkout.account_id !== accountId) throw new CheckoutRefused('other_account')
  if (checkout.status === 'paid') return { already: true, plans: 0, fees: 0, initiated: false }

  // The storage subscription first: once the plans are marked paid nothing
  // here runs again, so the storage year is on the account before they are.
  let subscription = null
  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(idOf(session.subscription))
    await recordSubscription(db, { accountId, customerId: idOf(session.customer), sub, tier: sub.metadata?.tier })
    subscription = sub.id
  }

  const payment = await paymentOf(stripe, session)
  return must(await db.rpc('apply_checkout', {
    p_checkout_id: checkoutId,
    p_payment_intent: payment.id,
    p_subscription: subscription,
    p_paid_at: payment.paidAt.toISOString(),
  }))
}
