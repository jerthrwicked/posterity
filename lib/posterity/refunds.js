// Posterity — refunds · Walker Brown
//
// Refunds through Stripe, under the refund policy held within Legal and
// Compliance (Master Specification): "a plan deleted within 30 days of its
// payment is refunded in full, and a plan moved to a lower tier within that
// window is refunded the price difference. Nothing is refunded after." Storage
// fees are not refunded. "Every refund issued sends a notice to whoever paid."
//
// Account deletion is the first thing to issue one (Founder Build Roadmap,
// Stage 3.1 and Stage 4.2). A plan's own deletion and its move to a lower tier
// arrive with the cart (Stage 4.3) and issue theirs through issueRefund here.
//
// Stripe is the record of what was paid. Until the cart records each payment
// on its plan, a plan payment is found within Stripe: a payment that
// succeeded, belongs to one of the account's customers, and carries the
// account and a one-time plan in the details the checkout route set on it. A
// storage subscription's payments carry no plan, so none of them is ever
// found here.
//
// A refund goes back to the payment method that paid. Each one is written to
// the event log, which outlives the account, and queues its notice through
// the Communication Dispatch System.

import { getPlan } from './plans.js';
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

// An amount in the currency's smallest unit, as a person reads it: 4900 in
// usd is $49.00.
export function money(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

// The account's plan payments as Stripe holds them, oldest first.
//
// customerIds: every Stripe customer that is the account's. An account is one
// customer (stripe-customer.js); one that paid before that was so may hold
// more, named on its `subscriptions` rows. A customer Stripe no longer holds
// has nothing to find.
export async function planPayments(stripe, { accountId, customerIds }) {
  if (!accountId) throw new Error('refunds: the account is required');
  const found = [];
  for (const customer of new Set((customerIds ?? []).filter(Boolean))) {
    try {
      for await (const intent of stripe.paymentIntents.list({ customer, limit: 100, expand: ['data.latest_charge'] })) {
        const charge = intent.latest_charge;
        const plan = getPlan(intent.metadata?.plan);
        if (intent.status !== 'succeeded' || !charge || typeof charge !== 'object') continue;
        if (intent.metadata?.account_id !== accountId) continue;
        if (!plan || plan.mode !== 'payment') continue;
        found.push({
          paymentIntent: intent.id,
          charge: charge.id,
          customer,
          plan: plan.id,
          planName: plan.name,
          amount: charge.amount,
          refunded: charge.amount_refunded,
          currency: charge.currency,
          paidAt: new Date(charge.created * 1000),
        });
      }
    } catch (err) {
      if (err?.code === 'resource_missing') continue;
      throw err;
    }
  }
  return found.sort((a, b) => a.paidAt - b.paidAt);
}

// Whether a payment is still inside the refund window: thirty days from the
// moment it was paid.
export function inRefundWindow(payment, now = new Date()) {
  return now.getTime() - payment.paidAt.getTime() <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

// What a plan's deletion returns: everything not already refunded while the
// payment is inside the window, and nothing after it.
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

  const logged = must(await db.from('dispatch_events').select('id')
    .eq('event_type', 'refund').eq('account_id', accountId).eq('detail->>refund', refund.id).limit(1));
  if (!logged.length) {
    must(await db.from('dispatch_events').insert({
      account_id: accountId,
      event_type: 'refund',
      destination: payer.email,
      outcome: 'issued',
      detail: {
        refund: refund.id,
        payment_intent: payment.paymentIntent,
        charge: payment.charge,
        stripe_customer: payment.customer,
        amount: refund.amount,
        currency: refund.currency,
        plan: payment.plan,
        paid_at: payment.paidAt.toISOString(),
        paid_amount: payment.amount,
        cause,
        status: refund.status,
      },
      is_test: isTest,
    }));
  }

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
