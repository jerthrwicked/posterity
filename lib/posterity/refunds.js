// Posterity — refunds · Walker Brown
//
// Refunds through Stripe, under the refund policy held within Legal and
// Compliance (Master Specification): "a plan deleted within 30 days of its
// payment is refunded in full, and a plan moved to a lower tier within that
// window is refunded the price difference. Nothing is refunded after."
// "Storage fees are non-refundable. A skipped plan year's fee is the
// exception, and it is refunded with its plan." "Every refund issued sends a
// notice to whoever paid."
//
// Account deletion is the first thing to issue one (Founder Build Roadmap,
// Stage 3.1 and Stage 4.2). A paid plan's own deletion and its move to a
// lower tier issue theirs through issueRefund here.
//
// A plan payment is a paid checkout (lib/posterity/checkout.js): the cart's
// record of one payment, with a line for each plan it funded, each plan's
// Additional Recipient slots, each skipped plan year's storage fee, and the
// storage fee itself where the payment opened the storage subscription.
// Stripe holds the money, so what was charged and what has already been
// returned are read from Stripe. What of a payment can be returned is read
// from its lines: everything but the storage fee, for as long as the plan a
// line belongs to is inside the window.
//
// A refund goes back to the payment method that paid. Each one is written to
// the event log, which outlives the account, and queues its notice through
// the Communication Dispatch System.

import { PLANS, STORAGE_FEE } from './plans.js';
import { enqueue } from '../dispatch/enqueue.js';

export const REFUND_WINDOW_DAYS = 30;
export const REFUND_COPY = 'email.refund_notice';
export const CALLER = 'refunds';

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-), so the notices it queues into the live database carry a caller
// the scheduler skips. The Worker never sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;

// Stripe's statuses for a refund that returned nothing.
const NOT_ISSUED = new Set(['failed', 'canceled']);

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// An insert the database lets in once, through a unique index: a second copy
// is refused with 23505, which means the record is already written.
export function once({ error }) {
  if (error && error.code !== '23505') throw error;
}

// An amount in the currency's smallest unit, as a person reads it: 4900 in
// usd is $49.00.
export function money(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

const WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// The account's plan payments, oldest first: each paid checkout, with what
// Stripe holds of its payment.
//
//   checkout, paymentIntent, charge, customer
//   plan, planName   the tiers it funded and their names, for the record and
//                    the notice. A payment for skipped plan years alone is
//                    named for the storage fee
//   paid             what the payment charged, the storage fee included
//   amount           what of it can be returned as of `now`: every line but
//                    the storage fee whose plan was paid within the window
//   refunded         what Stripe has already returned
//   paidAt           when it was paid
//
// A skipped plan year's fee is returned with its plan, so its window is its
// plan's, wherever the two were paid apart.
//
// db: a Supabase client with the service role.
export async function planPayments(db, stripe, { accountId, now = new Date() }) {
  if (!accountId) throw new Error('refunds: the account is required');
  const [checkouts, plans] = await Promise.all([
    db.from('checkouts')
      .select('id, paid_at, stripe_payment_intent_id, stripe_customer_id, checkout_lines(kind, plan_id, tier, quantity, unit_amount_cents)')
      .eq('account_id', accountId).eq('status', 'paid').not('stripe_payment_intent_id', 'is', null)
      .order('paid_at'),
    db.from('plans').select('id, paid_at').eq('account_id', accountId),
  ]);
  const planPaidAt = new Map(must(plans).filter((plan) => plan.paid_at).map((plan) => [plan.id, Date.parse(plan.paid_at)]));

  const found = [];
  for (const checkout of must(checkouts)) {
    let intent;
    try {
      intent = await stripe.paymentIntents.retrieve(checkout.stripe_payment_intent_id, { expand: ['latest_charge'] });
    } catch (err) {
      // A payment Stripe no longer holds has nothing to return.
      if (err?.code === 'resource_missing') continue;
      throw err;
    }
    const charge = intent.latest_charge;
    if (intent.status !== 'succeeded' || !charge || typeof charge !== 'object') continue;

    const paidAt = new Date(checkout.paid_at);
    const lines = checkout.checkout_lines ?? [];
    const returnable = lines
      .filter((line) => line.kind !== 'storage')
      .filter((line) => now.getTime() - (planPaidAt.get(line.plan_id) ?? paidAt.getTime()) <= WINDOW_MS)
      .reduce((sum, line) => sum + line.quantity * line.unit_amount_cents, 0);
    const tiers = lines.filter((line) => line.kind === 'plan').map((line) => line.tier);
    found.push({
      checkout: checkout.id,
      paymentIntent: intent.id,
      charge: charge.id,
      customer: checkout.stripe_customer_id,
      plan: tiers.length ? tiers.join(', ') : STORAGE_FEE.id,
      planName: tiers.length ? tiers.map((tier) => PLANS[tier]?.name ?? tier).join(', ') : STORAGE_FEE.name,
      paid: charge.amount,
      amount: Math.min(returnable, charge.amount),
      refunded: charge.amount_refunded,
      currency: charge.currency,
      paidAt,
    });
  }
  return found;
}

// Whether a payment is still inside the refund window: thirty days from the
// moment it was paid.
export function inRefundWindow(payment, now = new Date()) {
  return now.getTime() - payment.paidAt.getTime() <= WINDOW_MS;
}

// What deleting everything a payment funded returns: all of it that can be
// returned and has not been already, while the payment is inside the window,
// and nothing after it.
export function refundOwed(payment, now = new Date()) {
  if (!inRefundWindow(payment, now)) return 0;
  return Math.max(payment.amount - payment.refunded, 0);
}

// Issues one refund, records it and queues its notice.
//
// db: a Supabase client with the service role.
// payment: one of planPayments().
// amount: in the currency's smallest unit. The whole of what is left on the
//   payment for a plan's deletion; the price difference for a lower tier.
// cause: what the refund is for, such as 'account_deletion'. It is kept on the
//   refund within Stripe and in the event log.
// payer: { email, name }, whoever paid, who receives the notice.
//
// The same refund asked for twice is issued once: Stripe is given a key made
// of the cause, the payment and the amount, and answers the second request
// with the first one's refund.
export async function issueRefund(db, stripe, {
  accountId, payment, amount, cause, payer,
  caller = TEST_CALLER ?? CALLER, isTest = !!TEST_CALLER,
}) {
  if (!accountId || !payment?.paymentIntent) throw new Error('refunds: the account and the payment are required');
  if (!cause) throw new Error('refunds: what the refund is for is required');
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('refunds: the amount must be a whole number above zero');
  if (amount > payment.amount - payment.refunded) throw new Error('refunds: the amount is more than is left on the payment');

  const refund = await stripe.refunds.create({
    payment_intent: payment.paymentIntent,
    amount,
    reason: 'requested_by_customer',
    metadata: { account_id: accountId, cause },
  }, { idempotencyKey: `refund:${cause}:${payment.paymentIntent}:${amount}` });
  if (NOT_ISSUED.has(refund.status)) throw new Error(`refunds: Stripe did not issue the refund (${refund.status})`);

  return recordRefund(db, { accountId, payment, refund, cause, payer, caller, isTest });
}

// The refunds already issued on a payment for one cause, as Stripe holds them.
export async function refundsIssued(stripe, { accountId, payment, cause }) {
  const issued = [];
  for await (const refund of stripe.refunds.list({ payment_intent: payment.paymentIntent, limit: 100 })) {
    if (NOT_ISSUED.has(refund.status)) continue;
    if (refund.metadata?.account_id !== accountId || refund.metadata?.cause !== cause) continue;
    issued.push(refund);
  }
  return issued;
}

// Writes a refund to the event log and queues its notice, each once however
// often this runs for the same refund. A refund Stripe issued whose record or
// notice was then lost to a fault is completed by running this again.
//
// Returns { refund, amount, currency, plan, paymentIntent, messages }, the
// messages being the notice's rows within the queue.
export async function recordRefund(db, {
  accountId, payment, refund, cause, payer,
  caller = TEST_CALLER ?? CALLER, isTest = !!TEST_CALLER,
}) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  if (!payer?.email) throw new Error('refunds: the address of whoever paid is required');

  // One record per refund is the database's rule (dispatch_events_refund_once),
  // so two requests at the same instant still leave one.
  once(await db.from('dispatch_events').insert({
    account_id: accountId,
    event_type: 'refund',
    destination: payer.email,
    outcome: 'issued',
    detail: {
      refund: refund.id,
      payment_intent: payment.paymentIntent,
      charge: payment.charge,
      stripe_customer: payment.customer,
      checkout: payment.checkout ?? null,
      amount: refund.amount,
      currency: refund.currency,
      plan: payment.plan,
      paid_at: payment.paidAt.toISOString(),
      paid_amount: payment.paid ?? payment.amount,
      cause,
      status: refund.status,
    },
    is_test: isTest,
  }));

  const messages = await enqueue(db, {
    accountId,
    email: payer.email,
    copy: { email: REFUND_COPY },
    params: { name: payer.name || payer.email, amount: money(refund.amount, refund.currency), plan: payment.planName },
    caller,
    idempotencyKey: `refund-notice:${refund.id}`,
    isTest,
  });

  return {
    refund: refund.id, amount: refund.amount, currency: refund.currency,
    plan: payment.plan, paymentIntent: payment.paymentIntent, messages,
  };
}
