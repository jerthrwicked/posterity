// Posterity — payment setup · Walker Brown
//
// Master Specification, Settings: "Payment setup - supports card and PayPal
// (both via Stripe)." Horizon Tier: "the storage fee is charged to the
// customer's saved payment method each year by default."
//
// Posterity holds no payment method of its own. The saved payment method is
// the one Stripe holds for the account's storage subscription, and Settings
// reads it from there and changes it there. Which subscriptions are the
// account's comes from storage-subscriptions.js, so no account can reach
// another's.
//
// A payment method is first saved by the first storage payment, which is what
// opens the storage subscription. Before that the account holds none, and
// there is nothing here to change: the trial asks for no payment method.
//
// Changing it runs through the payment form built within Stage 3.1, Stripe's
// hosted Checkout, opened to save a payment method rather than take a payment:
//
//   openPaymentSetup    opens the form for the account's Stripe customer
//   applyPaymentSetup   once the form is completed, makes the method it saved
//                       the one every renewal charges, removes the old one,
//                       and, with automatic payments on, charges any storage
//                       fee the account owes to it
//
// The form comes back two ways, the customer's browser returning to
// /api/payment-setup/return and Stripe's webhook, and both apply it. Applying
// the same form twice changes nothing.
//
// A storage fee is owed where a renewal's charge failed, or where automatic
// payments are off and a payment request is still unpaid. Either is an open
// invoice on the storage subscription within Stripe. A customer with
// automatic payments on who saves a payment method while one is open has it
// charged to that method at once, and the form says so before they save. With
// automatic payments off nothing is charged for them: the payment method is
// saved, and the fee stays theirs to pay (Walker, November 10).
//
// The form takes a card. PayPal joins it with the cart (Stage 4.3).

import { savedPaymentMethod, automaticPaymentsOn } from './storage-billing.js';
import { liveSubscriptions, READ } from './storage-subscriptions.js';
import { automaticPaymentsOf } from './automatic-payments.js';

// What marks a Checkout session as one this file opened.
export const PAYMENT_SETUP = 'payment_setup';

// Why a payment method was not opened for change, or not saved. reason:
//
//   no_subscription     the account holds no storage subscription
//   no_session          Stripe holds no such form
//   not_payment_setup   the form is not one openPaymentSetup opened
//   other_account       the form was opened for another account
//   not_complete        the form was left before a payment method was saved
//   superseded          the method the form saved has since been replaced
export class PaymentSetupRefused extends Error {
  constructor(reason) {
    super(`payment setup: ${reason}`);
    this.name = 'PaymentSetupRefused';
    this.reason = reason;
  }
}

const idOf = (x) => (x && typeof x === 'object' ? x.id : x) ?? null;

// What Settings shows of a payment method: for a card its brand, last four
// digits and expiry, and for anything else its type alone.
function shown(method) {
  if (!method) return null;
  if (typeof method !== 'object') return { type: null };
  const card = method.type === 'card' ? method.card : null;
  if (!card) return { type: method.type ?? null };
  return { type: 'card', brand: card.brand ?? null, last4: card.last4 ?? null, expMonth: card.exp_month ?? null, expYear: card.exp_year ?? null };
}

// The saved payment method of an account.
//
//   { held: false }           the account holds no storage subscription
//   { held: true, method }    method: what shown() gives, or null where the
//                             subscription has no saved payment method
//
// It is the method the account's first storage subscription would charge: the
// subscription's own, else its customer's default.
//
// subs: the account's storage subscriptions, from liveSubscriptions.
export function paymentSetupOf(subs) {
  if (!subs.length) return { held: false };
  return { held: true, method: shown(savedPaymentMethod(subs[0])) };
}

// The same, read for an account. Throws where Supabase or Stripe cannot be read.
export async function readPaymentSetup(db, stripe, { accountId }) {
  return paymentSetupOf(await liveSubscriptions(db, stripe, accountId, READ));
}

// Both payment cards on the Settings page from one reading of Stripe:
// { setup, automatic }, as paymentSetupOf and automaticPaymentsOf give them.
// Throws where Supabase or Stripe cannot be read.
export async function readPaymentSettings(db, stripe, { accountId }) {
  const subs = await liveSubscriptions(db, stripe, accountId, READ);
  return { setup: paymentSetupOf(subs), automatic: automaticPaymentsOf(subs) };
}

// The invoices of these subscriptions, oldest first, each as
// { invoice, automatic }: automatic is whether its subscription renews by
// automatic payment now. A storage subscription raises one a year.
async function billsOf(stripe, subs) {
  const lists = await Promise.all(subs.map(async (sub) => {
    const list = await stripe.invoices.list({ subscription: sub.id, limit: 100 });
    return list.data.map((invoice) => ({ invoice, automatic: automaticPaymentsOn(sub) }));
  }));
  return lists.flat().sort((x, y) => x.invoice.created - y.invoice.created);
}

// A storage fee owed: an open invoice with anything left to pay.
const owed = (invoice) => invoice.status === 'open' && invoice.amount_remaining > 0;

// A storage fee that saving a payment method charges: one owed on a
// subscription with automatic payments on. It follows the switch as it stands
// now, not as it stood when the fee was raised.
const toCharge = (bill) => bill.automatic && owed(bill.invoice);

// What the payment form says beside its button where a storage fee is owed.
const OWED_NOTE = '[Placeholder: Product surface copy — payment form: the storage fee owed is charged to this payment method once it is saved]';

// Opens the payment form for an account to save a payment method. Returns
// { id, url }: the form's Stripe id and the address to send the customer to.
//
// The form belongs to the Stripe customer of the account's first storage
// subscription, and carries the account so that applyPaymentSetup can refuse
// it for any other. Nothing changes until the form is completed and applied.
// Where saving would charge a storage fee the account owes, the form says so.
//
// siteUrl: where the site is served, for the way back.
// Refused (PaymentSetupRefused) with 'no_subscription' where the account
// holds no storage subscription.
export async function openPaymentSetup(db, stripe, { accountId, userId, siteUrl }) {
  if (!siteUrl) throw new Error('payment setup: the site address is required');
  const subs = await liveSubscriptions(db, stripe, accountId);
  if (!subs.length) throw new PaymentSetupRefused('no_subscription');

  const customer = idOf(subs[0].customer);
  const owes = (await billsOf(stripe, subs.filter((sub) => idOf(sub.customer) === customer))).some(toCharge);
  const metadata = { purpose: PAYMENT_SETUP, account_id: accountId, ...(userId ? { user_id: userId } : {}) };
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer,
    ...(owes ? { custom_text: { submit: { message: OWED_NOTE } } } : {}),
    payment_method_types: ['card'],
    client_reference_id: accountId,
    metadata,
    setup_intent_data: { metadata },
    success_url: `${siteUrl}/api/payment-setup/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/settings`,
  });
  return { id: session.id, url: session.url };
}

// Removes a payment method from its customer. One already removed is left.
async function detach(stripe, id) {
  try {
    await stripe.paymentMethods.detach(id);
  } catch (err) {
    const now = await stripe.paymentMethods.retrieve(id).catch(() => null);
    if (!now || now.customer) throw err;
  }
}

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// Charges a storage fee owed to the payment method a form saved. Returns
// whether it is paid.
//
// A charge that does not go through leaves the fee owed and is not an error
// here: the payment method is saved either way. The fee is first marked with
// the form, so that whichever of the browser and the webhook applies the form
// second can tell the fee was paid by it. The charge is keyed by the fee and
// the method, so the two ask the card once and both hear the one answer.
async function charge(stripe, invoice, methodId, formId) {
  try {
    if (invoice.metadata?.[PAYMENT_SETUP] !== formId) await stripe.invoices.update(invoice.id, { metadata: { [PAYMENT_SETUP]: formId } });
    const paid = await stripe.invoices.pay(invoice.id, { payment_method: methodId }, { idempotencyKey: `payment_setup_${invoice.id}_${methodId}` });
    return paid.status === 'paid';
  } catch (err) {
    // Asked a second time while the first is still being answered: wait for it.
    const tries = err?.statusCode === 409 || err?.statusCode === 429 || err?.type === 'StripeIdempotencyError' ? 5 : 1;
    for (let t = 0; t < tries; t++) {
      if (t) await pause(1500);
      const now = await stripe.invoices.retrieve(invoice.id).catch(() => null);
      if (now?.status === 'paid') return true;
    }
    console.log(`payment setup: ${invoice.id} not charged: ${String(err?.code ?? err?.message ?? err).slice(0, 120)}`);
    return false;
  }
}

// A payment form as Stripe holds it, with the payment method it saved.
// Refused (PaymentSetupRefused) unless it is one openPaymentSetup opened.
async function formOf(stripe, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') throw new PaymentSetupRefused('no_session');
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['setup_intent.payment_method'] });
  } catch (err) {
    if (err?.code === 'resource_missing') throw new PaymentSetupRefused('no_session');
    throw err;
  }
  if (session.mode !== 'setup' || session.metadata?.purpose !== PAYMENT_SETUP) throw new PaymentSetupRefused('not_payment_setup');
  return session;
}

// Applies a completed payment form: the payment method it saved becomes the
// customer's default and the saved method of every storage subscription the
// account holds with that customer, and every other payment method the
// customer held is removed, so the account holds one. Any storage fee owed
// on those of them with automatic payments on is then charged to it. Returns
// { held: true, method, owed: { charged, failed } }: how many fees owed were
// paid by this, and how many could not be charged and are still owed. A fee
// owed with automatic payments off is neither: it is left as it was.
//
// A subscription with prepaid years takes the change as any other does:
// Stripe carries it onto the schedule.
//
// It does not move the automatic payments switch or touch a subscription held
// with another Stripe customer. Paying a fee owed moves the paid-through date
// the way any storage payment does, through the Stripe webhook.
//
// Refused (PaymentSetupRefused) unless the form is one openPaymentSetup
// opened for this account, was completed, and saved a method the customer
// still holds. An older form's method is removed when a newer one is applied,
// so an old form cannot be applied over a newer one. Applying the same form
// again changes nothing, and does not ask a card that declined a second time.
//
// db: a Supabase client that can read the account's `subscriptions` rows.
export async function applyPaymentSetup(db, stripe, { accountId, sessionId }) {
  if (!accountId) throw new Error('payment setup: the account is required');
  return applyForm(db, stripe, accountId, await formOf(stripe, sessionId));
}

// The same, for the account the form itself was opened for. For a caller
// with no customer signed in: the Stripe webhook, and the way back from the
// form where the customer's session has ended in the meantime. The form's
// id is known only to Stripe and to the browser it was opened in, and
// applying it does only what the customer completed on Stripe's page.
//
// db: a Supabase client with the service role.
export async function applyPaymentSetupAsOpened(db, stripe, { sessionId }) {
  const session = await formOf(stripe, sessionId);
  if (!session.metadata.account_id) throw new PaymentSetupRefused('not_payment_setup');
  return applyForm(db, stripe, session.metadata.account_id, session);
}

async function applyForm(db, stripe, accountId, session) {
  if (session.metadata.account_id !== accountId || session.client_reference_id !== accountId) throw new PaymentSetupRefused('other_account');

  const intent = session.setup_intent;
  const method = intent?.payment_method;
  if (session.status !== 'complete' || intent?.status !== 'succeeded' || !method?.id) throw new PaymentSetupRefused('not_complete');

  const customer = idOf(session.customer);
  if (!customer || idOf(method.customer) !== customer) throw new PaymentSetupRefused('superseded');

  const subs = (await liveSubscriptions(db, stripe, accountId)).filter((sub) => idOf(sub.customer) === customer);
  if (!subs.length) throw new PaymentSetupRefused('no_subscription');

  if (idOf(subs[0].customer.invoice_settings?.default_payment_method) !== method.id) {
    await stripe.customers.update(customer, { invoice_settings: { default_payment_method: method.id } });
  }
  for (const sub of subs) {
    if (idOf(sub.default_payment_method) !== method.id) {
      await stripe.subscriptions.update(sub.id, { default_payment_method: method.id });
    }
  }
  for await (const other of stripe.paymentMethods.list({ customer, limit: 100 })) {
    if (other.id !== method.id) await detach(stripe, other.id);
  }

  // Fees this form has already paid count as charged, so applying it again
  // gives the same answer.
  const bills = await billsOf(stripe, subs);
  const result = { charged: bills.filter(({ invoice }) => invoice.status === 'paid' && invoice.metadata?.[PAYMENT_SETUP] === session.id).length, failed: 0 };
  for (const { invoice } of bills.filter(toCharge)) {
    if (await charge(stripe, invoice, method.id, session.id)) result.charged++; else result.failed++;
  }
  return { held: true, method: shown(method), owed: result };
}
