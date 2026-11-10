// Posterity — the automatic payments switch · Walker Brown
//
// Master Specification, Settings: "Automatic payments - on by default. The rule
// it follows is held within Horizon Tier." Horizon Tier: "the storage fee is
// charged to the customer's saved payment method each year by default, and the
// customer can turn automatic payments off."
//
// The switch holds nothing of its own. Whether a storage subscription renews
// by automatic payment or by payment request is a setting on the subscription
// within Stripe (lib/posterity/storage-billing.js), and the switch reads and
// writes that. Supabase's `subscriptions` table says only which Stripe
// subscriptions are the account's: the Stripe webhook writes those rows, and a
// customer can read their own and write none, so no account can point the
// switch at a subscription that is not its own.
//
// An account holds a storage subscription from its first storage payment.
// Before that there is nothing for the switch to move, and it reads as not
// held. Automatic payments are on by default because every storage
// subscription Checkout opens charges automatically.

import {
  setAutomaticPayments, automaticPaymentsOn, savedPaymentMethod, PaymentsRefused,
} from './storage-billing.js';

export { PaymentsRefused };

// Stripe's statuses for a subscription that is over: nothing will renew.
const ENDED = new Set(['canceled', 'incomplete_expired']);

// A Settings page waits on Stripe for this long and no longer, with no second try.
const READ = { timeout: 8000, maxNetworkRetries: 0 };

// The account's storage subscriptions as Stripe holds them now, those that
// are over left out. Stripe is asked for each rather than the row's `status`
// trusted, since the row is only as fresh as the last webhook.
//
// db: a Supabase client that can read the account's `subscriptions` rows, the
// customer's own or the service role's.
async function liveSubscriptions(db, stripe, accountId, options) {
  if (!accountId) throw new Error('automatic payments: the account is required');
  const { data, error } = await db.from('subscriptions')
    .select('stripe_subscription_id')
    .eq('account_id', accountId)
    .not('stripe_subscription_id', 'is', null)
    .order('created_at');
  if (error) throw error;

  const subs = await Promise.all(data.map(async (row) => {
    try {
      return await stripe.subscriptions.retrieve(row.stripe_subscription_id, { expand: ['customer'] }, options);
    } catch (err) {
      // A subscription Stripe no longer holds is over.
      if (err?.code === 'resource_missing') return null;
      throw err;
    }
  }));
  return subs.filter((sub) => sub && !ENDED.has(sub.status));
}

// Where the switch stands for an account.
//
//   { held: false }       the account holds no storage subscription
//   { held: true, on }    on: whether renewals are charged automatically
//
// An account holding more than one storage subscription reads on while any of
// them charges automatically, so the switch never reads off over a
// subscription that would still charge.
//
// Throws where Supabase or Stripe cannot be read.
export async function readAutomaticPayments(db, stripe, { accountId }) {
  const subs = await liveSubscriptions(db, stripe, accountId, READ);
  if (!subs.length) return { held: false };
  return { held: true, on: subs.some(automaticPaymentsOn) };
}

// Moves the switch for an account: every storage subscription it holds is set
// the same way. Returns { held: true, on } as Stripe then holds it.
//
// Refused (PaymentsRefused) with 'no_subscription' where the account holds no
// storage subscription, and with 'no_payment_method' where it is being turned
// on and a subscription has no saved payment method to charge. That is
// checked for every subscription before any is changed.
export async function setAccountAutomaticPayments(db, stripe, { accountId, on }) {
  if (typeof on !== 'boolean') throw new Error('automatic payments: on must be true or false');
  const subs = await liveSubscriptions(db, stripe, accountId);
  if (!subs.length) throw new PaymentsRefused('no_subscription');
  if (on && !subs.every(savedPaymentMethod)) throw new PaymentsRefused('no_payment_method');

  const after = [];
  for (const sub of subs) after.push(await setAutomaticPayments(stripe, sub.id, on));
  return { held: true, on: after.some(automaticPaymentsOn) };
}
