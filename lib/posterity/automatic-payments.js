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
// writes that. Which subscriptions are the account's comes from
// storage-subscriptions.js, so no account can point the switch at a
// subscription that is not its own.
//
// An account holds a storage subscription from its first storage payment.
// Before that there is nothing for the switch to move, and it reads as not
// held. Automatic payments are on by default because every storage
// subscription Checkout opens charges automatically.

import {
  setAutomaticPayments, automaticPaymentsOn, savedPaymentMethod, PaymentsRefused,
} from './storage-billing.js';
import { liveSubscriptions, READ } from './storage-subscriptions.js';

export { PaymentsRefused };

// Where the switch stands for an account.
//
//   { held: false }       the account holds no storage subscription
//   { held: true, on }    on: whether renewals are charged automatically
//
// An account holding more than one storage subscription reads on while any of
// them charges automatically, so the switch never reads off over a
// subscription that would still charge.
//
// subs: the account's storage subscriptions, from liveSubscriptions.
export function automaticPaymentsOf(subs) {
  if (!subs.length) return { held: false };
  return { held: true, on: subs.some(automaticPaymentsOn) };
}

// The same, read for an account. Throws where Supabase or Stripe cannot be read.
export async function readAutomaticPayments(db, stripe, { accountId }) {
  return automaticPaymentsOf(await liveSubscriptions(db, stripe, accountId, READ));
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
