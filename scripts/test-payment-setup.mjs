#!/usr/bin/env node
// Posterity — payment setup
/*
Exercises payment setup against Stripe's sandbox and the live database as real
signed-in users. Saving a payment method runs through Stripe's hosted payment
form, so every run drives that form in a real browser. With a local server it
also exercises the Settings page, the way back from the form, and the webhook.

  node scripts/test-payment-setup.mjs                       the library
  node scripts/test-payment-setup.mjs --server http://localhost:3011
                                                            plus the Settings page on that server
  ... --shots <directory>                                   also saves pictures of the card there

The server must run with the same Stripe test key and with the site address
pointing at itself, so Stripe returns to it:
  NEXT_PUBLIC_SITE_URL=http://localhost:3011 npx next dev -p 3011
To check the webhook as well, give the server and this script the same made-up
STRIPE_WEBHOOK_SECRET. The script signs its own events with it.

What matters most:
  - Posterity holds no payment method of its own: Settings reads the saved
    payment method from the account's storage subscription within Stripe
  - an account with no storage subscription has none to change, and the form
    does not open for it
  - nothing changes until the form is completed and applied. Applying it makes
    the new method the one every renewal charges, on the customer, on each
    subscription and through a subscription's prepaid years, and removes the
    old one, so the account holds one
  - it changes nothing else: the automatic payments switch, the subscription's
    standing and its renewal date stay as they were
  - an account with automatic payments on that owes a storage fee has it
    charged to the payment method it saves, and the form says so first. A
    card that declines is still saved and the fee stays owed, and applying
    the same form twice asks the card once
  - with automatic payments off nothing is charged for the customer: the
    payment method is saved, the form says nothing of a charge, and the fee
    owed stays theirs to pay. It follows the switch as it stands now
  - a customer whose session ended while they were on Stripe's page loses
    nothing: the form is applied for the account it was opened for, and they
    reach Settings once they sign in
  - a form opened for one account cannot be applied by another, a form left
    unfinished saves nothing, an older form cannot be applied over a newer
    one, and applying the same form twice changes nothing
  - the webhook never records a payment setup form as a plan payment and never
    initiates the account over one

It refuses to run unless STRIPE_SECRET_KEY is a test key. The Stripe customers
it makes are sandbox customers, deleted at the end with their subscriptions,
and so is the test clock one of them lives on.
The test users are deleted at the end and their `subscriptions` rows go with
them, and the events it sends the webhook come out of `stripe_events`.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) and CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '../lib/posterity/plans.js';
import { prepayYears } from '../lib/posterity/storage-billing.js';
import { setAccountAutomaticPayments, PaymentsRefused } from '../lib/posterity/automatic-payments.js';
import {
  readPaymentSetup, readPaymentSettings, openPaymentSetup, applyPaymentSetup, applyPaymentSetupAsOpened,
  PaymentSetupRefused, PAYMENT_SETUP,
} from '../lib/posterity/payment-setup.js';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('missing Supabase values in ~/posterity/.env.local'); process.exit(2); }
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.log('STRIPE_SECRET_KEY is not a test key. Not running.');
  process.exit(1);
}
const flag = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const SERVER = flag('--server')?.replace(/\/$/, '') ?? null;
const SHOTS = flag('--shots');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const HORIZON = PLANS.horizon.priceId;
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-ps-${stamp}-${tag}@yourposterity.com`;
// Where a form opened by this script alone returns to: nowhere. The form is
// complete within Stripe before the browser is sent back.
const NOWHERE = 'https://posterity.invalid';
const CARDS = {
  mastercard: { number: '5555555555554444', cvc: '123', last4: '4444' },
  amex: { number: '378282246310005', cvc: '1234', last4: '0005' },
  discover: { number: '6011111111111117', cvc: '123', last4: '1117' },
  visa: { number: '4242424242424242', cvc: '123', last4: '4242' },
  // Saves, and declines every charge.
  declines: { number: '4000000000000341', cvc: '123', last4: '0341' },
};
const DAY = 86400;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
function must({ data, error }) { if (error) throw error; return data; }

async function rest(path, { method = 'GET', body, key = SERVICE, token } = {}) {
  const r = await fetch(URL_ + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
}

const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const users = [];
const customers = [];
const clocks = [];
const opened = [];
const eventIds = [];

// A signed-in customer. `own` is the Supabase client the Settings page, its
// action and the way back from the form use: the customer's own session,
// under row-level security.
async function signedInUser(tag) {
  const email = addr(tag);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Payment Setup Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id').eq('user_id', r.id).single());
  const [st2, session] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email, password: PASSWORD } });
  if (st2 !== 200) throw new Error(`sign in ${email}: ${st2}`);
  const own = createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + session.access_token } },
  });
  return { user: { id: r.id, email }, account, token: session.access_token, own };
}

// A sandbox customer and storage subscription as Checkout leaves them: the
// card saved on the subscription, and the customer with no default. With
// `card` false, a customer with no card whose subscription renews by payment
// request.
async function customerFor(who) {
  const cus = await stripe.customers.create({ email: who.user.email, metadata: { test: 'test-payment-setup' } });
  customers.push(cus.id);
  return cus;
}
async function subscribe(cus, card = true) {
  if (!card) return stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }], collection_method: 'send_invoice', days_until_due: 0 });
  const held = (await stripe.paymentMethods.list({ customer: cus.id, limit: 1 })).data[0];
  const pm = held ?? await stripe.paymentMethods.attach('pm_card_visa', { customer: cus.id });
  return stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }], default_payment_method: pm.id });
}
// The row the Stripe webhook writes on checkout.session.completed.
const record = (who, cus, sub) => db.from('subscriptions').insert({
  account_id: who.account.id, stripe_customer_id: cus.id, stripe_subscription_id: sub.id,
  stripe_price_id: HORIZON, tier: 'horizon', status: sub.status,
}).select().single().then(must);

const idOf = (x) => (x && typeof x === 'object' ? x.id : x) ?? null;
const inStripe = (sub) => stripe.subscriptions.retrieve(sub.id, { expand: ['default_payment_method'] });
const periodEnd = (sub) => sub.items.data[0].current_period_end;
const last4Of = async (sub) => (await inStripe(sub)).default_payment_method?.card?.last4 ?? null;
const methodsOf = async (cus) => (await stripe.paymentMethods.list({ customer: cus.id, limit: 100 })).data;
const defaultOf = async (cus) => idOf((await stripe.customers.retrieve(cus.id)).invoice_settings.default_payment_method);
const read = (who, as = who) => readPaymentSetup(as.own, stripe, { accountId: who.account.id });
const open = async (who, as = who, siteUrl = NOWHERE) => {
  const s = await openPaymentSetup(as.own, stripe, { accountId: who.account.id, userId: as.user.id, siteUrl });
  opened.push(s.id);
  return s;
};
const apply = (who, sessionId, as = who) => applyPaymentSetup(as.own, stripe, { accountId: who.account.id, sessionId });
const refusedAs = async (fn) => {
  try { await fn(); return 'passed'; } catch (e) {
    return e instanceof PaymentSetupRefused || e instanceof PaymentsRefused ? e.reason : `error: ${e.message}`;
  }
};
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const asOpened = (sessionId) => applyPaymentSetupAsOpened(db, stripe, { sessionId });
const openBills = async (sub) => (await stripe.invoices.list({ subscription: sub.id, status: 'open', limit: 10 })).data;
const bill = (id) => stripe.invoices.retrieve(id);
const noteOf = async (s) => (await stripe.checkout.sessions.retrieve(s.id)).custom_text?.submit?.message ?? null;
// Every time a card of this customer's was asked for money, whatever it answered.
const asked = async (cus) => (await stripe.charges.list({ customer: cus.id, limit: 100 })).data.map((ch) => ch.status);
const none = (owed) => owed?.charged === 0 && owed?.failed === 0;
const paidOne = (owed) => owed?.charged === 1 && owed?.failed === 0;
const failedOne = (owed) => owed?.charged === 0 && owed?.failed === 1;
// A subscription's standing, once Stripe has settled it.
async function standingOf(sub, want) {
  let now;
  for (let t = 0; t < 10; t++) {
    now = await inStripe(sub);
    if (now.status === want) break;
    await pause(1500);
  }
  return now;
}
// Moves a test clock to `to` and waits until Stripe has run everything due.
async function advance(clock, to) {
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: to });
  for (let i = 0; i < 90; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (c.status === 'ready') return;
    if (c.status === 'internal_failure') throw new Error(`test clock ${clock.id} failed to advance`);
    await pause(2000);
  }
  throw new Error(`test clock ${clock.id} still advancing after three minutes`);
}
// A subscription whose first storage payment did not go through: its bill is
// open, and the card it holds declines.
async function subscribeUnpaid(cus) {
  const bad = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: cus.id });
  return stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }], default_payment_method: bad.id, payment_behavior: 'allow_incomplete' });
}
// A subscription that renews by payment request, with its request sent and
// unpaid. Stripe holds a new request as a draft for an hour before sending it.
async function subscribeRequested(cus) {
  const sub = await subscribe(cus, false);
  const [draft] = (await stripe.invoices.list({ subscription: sub.id, status: 'draft', limit: 1 })).data;
  await stripe.invoices.finalizeInvoice(draft.id);
  return sub;
}

// Fills Stripe's hosted payment form with a test card and submits it. The
// page must already be on its way to the form.
async function fillForm(page, card) {
  await page.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
  await page.waitForSelector('#cardNumber, [data-testid="card-accordion-item-button"]', { timeout: 60000 });
  await page.evaluate(() => document.querySelector('[data-testid="card-accordion-item-button"]')?.click());
  await page.waitForSelector('#cardNumber', { visible: true, timeout: 30000 });
  await page.type('#cardNumber', card.number);
  await page.type('#cardExpiry', '1234');
  await page.type('#cardCvc', card.cvc);
  if (await page.$('#billingName')) await page.type('#billingName', 'Payment Setup Test');
  if (await page.$('#billingPostalCode')) await page.type('#billingPostalCode', '70112');
  await page.evaluate(() => { const c = document.getElementById('enableStripePass'); if (c?.checked) c.click(); });
  await page.evaluate(() => document.querySelector('[data-testid="hosted-payment-submit-button"]').click());
}
// Completes a form opened by this script: Stripe is asked until it says so.
async function complete(page, session, card) {
  await page.goto(session.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await fillForm(page, card);
  for (let t = 0; t < 60; t++) {
    if ((await stripe.checkout.sessions.retrieve(session.id)).status === 'complete') return;
    await pause(1500);
  }
  throw new Error(`the payment form ${session.id} did not complete`);
}

let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const form = await browser.newPage();
  await form.setViewport({ width: 1100, height: 1000 });
  const [a, b, c, d] = await Promise.all([signedInUser('a'), signedInUser('b'), signedInUser('c'), signedInUser('d')]);

  console.log('\nAn account with no storage subscription');
  let r = await read(a);
  check('holds no saved payment method to show', r.held === false && !('method' in r), JSON.stringify(r));
  check('and the payment form does not open for it', (await refusedAs(() => open(a))) === 'no_subscription');

  console.log('\nAn account with a storage subscription');
  // b holds two storage subscriptions with one Stripe customer, and a third
  // with another customer, as two separate checkouts would leave it.
  const cusB = await customerFor(b);
  const subB = await subscribe(cusB);
  await record(b, cusB, subB);
  const subB2 = await subscribe(cusB);
  await record(b, cusB, subB2);
  const cusB2 = await customerFor(b);
  const subB3 = await subscribe(cusB2);
  await record(b, cusB2, subB3);
  const visaB = idOf(subB.default_payment_method);
  const visa = await stripe.paymentMethods.retrieve(visaB);
  r = await read(b);
  check('the saved payment method reads from the subscription: the card, its last four digits and its expiry',
    r.held === true && r.method?.type === 'card' && r.method.brand === 'visa' && r.method.last4 === '4242'
    && r.method.expMonth === visa.card.exp_month && r.method.expYear === visa.card.exp_year, JSON.stringify(r));
  check('and nothing that identifies it to Stripe is handed to the page', !JSON.stringify(r).includes(visaB));
  const both = await readPaymentSettings(b.own, stripe, { accountId: b.account.id });
  check('Settings reads the saved payment method and the automatic payments switch together',
    both.setup.method?.last4 === '4242' && both.automatic.held === true && both.automatic.on === true, JSON.stringify(both));

  console.log('\nOpening the payment form');
  const s1 = await open(b);
  let held = await stripe.checkout.sessions.retrieve(s1.id);
  check('the form is opened to save a payment method, not to take a payment', held.mode === 'setup' && new URL(s1.url).host === 'checkout.stripe.com', held.mode);
  check("it belongs to the Stripe customer of the account's first storage subscription", held.customer === cusB.id, held.customer);
  check('it carries the account, and takes a card', held.client_reference_id === b.account.id && held.metadata.account_id === b.account.id
    && held.metadata.purpose === PAYMENT_SETUP && held.metadata.user_id === b.user.id && held.payment_method_types.join() === 'card', JSON.stringify(held.metadata));
  check('it returns to the way back, and to Settings if it is left',
    held.success_url === `${NOWHERE}/api/payment-setup/return?session_id={CHECKOUT_SESSION_ID}` && held.cancel_url === `${NOWHERE}/dashboard/settings`, held.success_url);
  check('opening it changes nothing', (await last4Of(subB)) === '4242' && (await methodsOf(cusB)).length === 1);
  check('with no storage fee owed, the form says nothing of a charge', (await noteOf(s1)) === null, await noteOf(s1));
  check('a form left unfinished saves nothing', (await refusedAs(() => apply(b, s1.id))) === 'not_complete' && (await last4Of(subB)) === '4242');

  console.log('\nSaving a new card');
  await complete(form, s1, CARDS.mastercard);
  check('completing the form changes nothing until it is applied', (await last4Of(subB)) === '4242' && (await defaultOf(cusB)) === null);
  const before = await inStripe(subB);
  let after = await apply(b, s1.id);
  check('applying it gives back the new card', after.held === true && after.method?.brand === 'mastercard' && after.method.last4 === '4444', JSON.stringify(after));
  check('with nothing owed, nothing is charged', none(after.owed) && (await asked(cusB)).length === 2, JSON.stringify([after.owed, await asked(cusB)]));
  const newB = idOf((await inStripe(subB)).default_payment_method);
  check('both subscriptions with that customer now charge it', (await last4Of(subB)) === '4444' && idOf((await inStripe(subB2)).default_payment_method) === newB);
  check("it is the customer's default", (await defaultOf(cusB)) === newB);
  let methods = await methodsOf(cusB);
  check('the old card is removed, so the account holds one', methods.length === 1 && methods[0].id === newB
    && (await stripe.paymentMethods.retrieve(visaB)).customer === null, methods.map((m) => m.card?.last4).join());
  let now = await inStripe(subB);
  check('nothing else about the subscription changed: active, automatic payments on, same renewal date',
    now.status === 'active' && now.collection_method === 'charge_automatically' && periodEnd(now) === periodEnd(before), `${now.status} ${now.collection_method}`);
  check('a subscription held with another Stripe customer is left alone',
    (await last4Of(subB3)) === '4242' && (await methodsOf(cusB2)).length === 1);
  r = await read(b);
  check('Settings then reads the new card', r.method?.brand === 'mastercard' && r.method.last4 === '4444', JSON.stringify(r));
  after = await apply(b, s1.id);
  check('applying the same form again changes nothing', after.method?.last4 === '4444' && (await last4Of(subB)) === '4444'
    && (await methodsOf(cusB)).length === 1 && (await defaultOf(cusB)) === newB);

  console.log('\nAnother account');
  const cusC = await customerFor(c);
  const subC = await subscribe(cusC);
  await record(c, cusC, subC);
  check("cannot read this account's saved payment method: it sees no subscription", (await read(b, c)).held === false);
  check('cannot open the payment form for it', (await refusedAs(() => open(b, c))) === 'no_subscription');
  check("cannot apply this account's form to its own", (await refusedAs(() => apply(c, s1.id))) === 'other_account' && (await last4Of(subC)) === '4242');
  check('nor apply it in this account\'s name', (await refusedAs(() => apply(b, s1.id, c))) === 'no_subscription');
  const sC = await open(c);
  check("and its own form cannot be applied to this account", (await refusedAs(() => apply(b, sC.id))) === 'other_account');

  console.log('\nWhat is not a payment setup form');
  check('no form at all', (await refusedAs(() => apply(b, null))) === 'no_session' && (await refusedAs(() => apply(b, ''))) === 'no_session');
  check('a form Stripe does not hold', (await refusedAs(() => apply(b, `cs_test_${stamp}`))) === 'no_session');
  const bare = await stripe.checkout.sessions.create({
    mode: 'setup', customer: cusB.id, payment_method_types: ['card'], client_reference_id: b.account.id,
    metadata: { account_id: b.account.id }, success_url: `${NOWHERE}/x`, cancel_url: `${NOWHERE}/x`,
  });
  opened.push(bare.id);
  check('a form to save a payment method that Settings did not open', (await refusedAs(() => apply(b, bare.id))) === 'not_payment_setup');
  const nameless = await stripe.checkout.sessions.create({
    mode: 'setup', customer: cusB.id, payment_method_types: ['card'],
    metadata: { purpose: PAYMENT_SETUP }, success_url: `${NOWHERE}/x`, cancel_url: `${NOWHERE}/x`,
  });
  opened.push(nameless.id);
  check('a form that carries no account is not applied for anyone', (await refusedAs(() => asOpened(nameless.id))) === 'not_payment_setup');
  const paying = await stripe.checkout.sessions.create({
    mode: 'payment', customer: cusB.id, line_items: [{ price: PLANS.basic.priceId, quantity: 1 }], client_reference_id: b.account.id,
    metadata: { account_id: b.account.id, purpose: PAYMENT_SETUP }, success_url: `${NOWHERE}/x`, cancel_url: `${NOWHERE}/x`,
  });
  opened.push(paying.id);
  check('a form that takes a payment, whatever it carries', (await refusedAs(() => apply(b, paying.id))) === 'not_payment_setup');

  console.log('\nPrepaid years, and an older form');
  const schedule = await prepayYears(stripe, subB.id, 2, `test_ps_${stamp}`);
  const s2 = await open(b);
  const s3 = await open(b);
  await complete(form, s2, CARDS.amex);
  await complete(form, s3, CARDS.discover);
  check('two forms completed and neither applied: both cards wait, and the saved one is unchanged',
    (await methodsOf(cusB)).length === 3 && (await last4Of(subB)) === '4444');
  after = await apply(b, s3.id);
  const newest = idOf((await inStripe(subB)).default_payment_method);
  const sched = await stripe.subscriptionSchedules.retrieve(schedule.id);
  check('applying the newer one reaches a subscription with prepaid years', after.method?.brand === 'discover' && (await last4Of(subB)) === '1117');
  check("and its schedule, so the card holds through them and after", idOf(sched.default_settings.default_payment_method) === newest
    && sched.phases.length === 3 && sched.phases.every((p) => !p.default_payment_method), JSON.stringify(sched.phases.map((p) => idOf(p.default_payment_method))));
  methods = await methodsOf(cusB);
  check('every other card is removed, the unapplied one with them', methods.length === 1 && methods[0].id === newest, methods.map((m) => m.card?.last4).join());
  check('the older form can no longer be applied over it', (await refusedAs(() => apply(b, s2.id))) === 'superseded' && (await last4Of(subB)) === '1117');
  check('nor the one before that', (await refusedAs(() => apply(b, s1.id))) === 'superseded' && (await last4Of(subB2)) === '1117');

  console.log('\nAn account with no saved payment method');
  const cusD = await customerFor(d);
  const subD = await subscribe(cusD, false);
  await record(d, cusD, subD);
  r = await read(d);
  check('reads as holding a subscription and no payment method', r.held === true && r.method === null, JSON.stringify(r));
  const turnOn = () => setAccountAutomaticPayments(d.own, stripe, { accountId: d.account.id, on: true });
  check('automatic payments cannot be turned on', (await refusedAs(turnOn)) === 'no_payment_method');
  const s4 = await open(d);
  await complete(form, s4, CARDS.visa);
  after = await apply(d, s4.id);
  now = await inStripe(subD);
  check('saving a card gives it one', after.method?.last4 === '4242' && now.default_payment_method?.card?.last4 === '4242' && (await read(d)).method?.last4 === '4242');
  check('and does not move the automatic payments switch: still off', now.collection_method === 'send_invoice');
  check('a payment request Stripe has not sent yet is not owed, and is left alone', none(after.owed) && (await asked(cusD)).length === 0
    && (await stripe.invoices.list({ subscription: subD.id, limit: 10 })).data.map((i) => i.status).join() === 'draft', JSON.stringify([after.owed, await asked(cusD)]));
  check('which can now be turned on', (await refusedAs(turnOn)) === 'passed' && (await inStripe(subD)).collection_method === 'charge_automatically');
  const s4b = await open(d);
  check('with automatic payments on, a payment request not yet sent is still not owed: the form says nothing of a charge',
    (await noteOf(s4b)) === null && (await stripe.invoices.list({ subscription: subD.id, limit: 10 })).data.map((i) => i.status).join() === 'draft', await noteOf(s4b));
  await stripe.subscriptions.cancel(subD.id);
  check('once the subscription has ended there is nothing to apply a form to',
    (await refusedAs(() => apply(d, s4.id))) === 'no_subscription' && (await read(d)).held === false);

  console.log('\nWith no customer signed in');
  // c's own form, opened above and never completed, and one more left open.
  check('a form left unfinished is refused', (await refusedAs(() => asOpened(sC.id))) === 'not_complete' && (await last4Of(subC)) === '4242');
  await complete(form, sC, CARDS.amex);
  after = await asOpened(sC.id);
  check('a completed form is applied for the account it was opened for', after.method?.last4 === '0005' && (await last4Of(subC)) === '0005'
    && (await methodsOf(cusC)).length === 1, JSON.stringify(after));
  check('and for no other: every other account holds what it held', (await last4Of(subB)) === '1117' && (await last4Of(subB3)) === '4242');
  check('what is not a payment setup form is refused the same', (await refusedAs(() => asOpened(bare.id))) === 'not_payment_setup'
    && (await refusedAs(() => asOpened(paying.id))) === 'not_payment_setup' && (await refusedAs(() => asOpened(`cs_test_${stamp}`))) === 'no_session'
    && (await refusedAs(() => asOpened(null))) === 'no_session');
  check('an older form is still refused over a newer one', (await refusedAs(() => asOpened(s2.id))) === 'superseded' && (await last4Of(subB)) === '1117');

  console.log('\nA storage fee owed: a renewal whose charge failed');
  const [e, f, g] = await Promise.all([signedInUser('e'), signedInUser('f'), signedInUser('g')]);
  // e paid a year ago, on a test clock. The card it holds now declines, and
  // the clock moves past the renewal.
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `payment-setup ${stamp}` });
  clocks.push(clock.id);
  const cusE = await stripe.customers.create({ test_clock: clock.id, email: e.user.email, metadata: { test: 'test-payment-setup' } });
  customers.push(cusE.id);
  const subE = await subscribe(cusE);
  const declining = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: cusE.id });
  await stripe.subscriptions.update(subE.id, { default_payment_method: declining.id });
  await record(e, cusE, subE);
  await advance(clock, periodEnd(subE) + DAY);
  const [billE] = await openBills(subE);
  now = await inStripe(subE);
  check("the renewal's charge was declined, and the year's storage fee is owed", now.status === 'past_due' && billE?.amount_remaining === 999
    && billE.billing_reason === 'subscription_cycle', `${now.status} ${JSON.stringify(billE && [billE.status, billE.amount_remaining, billE.billing_reason])}`);
  const switchE = (on) => setAccountAutomaticPayments(e.own, stripe, { accountId: e.account.id, on });
  await switchE(false);
  const sE0 = await open(e);
  check('with automatic payments turned off since, the form says nothing of a charge', (await noteOf(sE0)) === null
    && (await bill(billE.id)).status === 'open', await noteOf(sE0));
  await switchE(true);
  const sE = await open(e);
  check('with them on, the form says the fee owed is charged to the payment method saved', (await noteOf(sE))?.includes('the storage fee owed is charged to this payment method'), await noteOf(sE));
  let askedE = await asked(cusE);
  await complete(form, sE, CARDS.visa);
  check('completing the form charges nothing until it is applied', (await bill(billE.id)).status === 'open' && (await asked(cusE)).length === askedE.length);
  after = await apply(e, sE.id);
  let paid = await bill(billE.id);
  check('applying it saves the card and charges the fee owed to it', after.method?.last4 === '4242' && paidOne(after.owed)
    && paid.status === 'paid' && paid.amount_paid === 999 && paid.amount_remaining === 0, JSON.stringify([after, paid.status]));
  now = await standingOf(subE, 'active');
  check('the subscription is in good standing again, on the new card', now.status === 'active' && now.default_payment_method?.card?.last4 === '4242'
    && (await methodsOf(cusE)).length === 1, now.status);
  askedE = await asked(cusE);
  check('the card was asked once', askedE.filter((x) => x === 'succeeded').length === 2 && askedE.filter((x) => x === 'failed').length === 1, askedE.join());
  after = await apply(e, sE.id);
  check('applying the same form again gives the same answer and asks the card for nothing more',
    paidOne(after.owed) && (await asked(cusE)).length === askedE.length, JSON.stringify([after.owed, await asked(cusE)]));
  after = await asOpened(sE.id);
  check('as it does applied with no customer signed in', paidOne(after.owed) && (await asked(cusE)).length === askedE.length, JSON.stringify(after.owed));

  console.log('\nA storage fee owed: a card that declines it');
  const cusF = await customerFor(f);
  const subF = await subscribeUnpaid(cusF);
  await record(f, cusF, subF);
  const [billF] = await openBills(subF);
  check('the fee is owed', billF?.amount_remaining === 999 && (await inStripe(subF)).status === 'incomplete', JSON.stringify(billF && [billF.status, billF.amount_remaining]));
  const sF = await open(f);
  await complete(form, sF, CARDS.declines);
  let askedF = await asked(cusF);
  after = await apply(f, sF.id);
  check('the card is saved all the same', after.held === true && after.method?.last4 === '0341' && (await last4Of(subF)) === '0341' && (await methodsOf(cusF)).length === 1, JSON.stringify(after));
  check('it was asked, it declined, and the fee is still owed', failedOne(after.owed) && (await bill(billF.id)).status === 'open'
    && (await asked(cusF)).length === askedF.length + 1, JSON.stringify([after.owed, await asked(cusF)]));
  askedF = await asked(cusF);
  after = await apply(f, sF.id);
  check('applying the same form again gives the same answer without asking the card again',
    failedOne(after.owed) && (await asked(cusF)).length === askedF.length && (await bill(billF.id)).status === 'open', JSON.stringify([after.owed, await asked(cusF)]));
  const sF2 = await open(f);
  check('the next form still says the fee is owed', (await noteOf(sF2))?.includes('the storage fee owed is charged'), await noteOf(sF2));
  await complete(form, sF2, CARDS.mastercard);
  after = await apply(f, sF2.id);
  now = await standingOf(subF, 'active');
  check('and a card that works pays it', after.method?.last4 === '4444' && paidOne(after.owed) && (await bill(billF.id)).status === 'paid' && now.status === 'active',
    JSON.stringify([after, now.status]));

  console.log('\nAutomatic payments off: a payment request left unpaid');
  const cusG = await customerFor(g);
  const subG = await subscribeRequested(cusG);
  await record(g, cusG, subG);
  const [billG] = await openBills(subG);
  check('the request is owed', billG?.amount_remaining === 999 && billG.collection_method === 'send_invoice', JSON.stringify(billG && [billG.status, billG.collection_method]));
  const sG = await open(g);
  check('the form says nothing of a charge', (await noteOf(sG)) === null, await noteOf(sG));
  await complete(form, sG, CARDS.visa);
  after = await apply(g, sG.id);
  check('saving a card saves it and charges nothing: the request stays owed, and the card is not asked', after.method?.last4 === '4242' && none(after.owed)
    && (await last4Of(subG)) === '4242' && (await bill(billG.id)).status === 'open' && (await asked(cusG)).length === 0, JSON.stringify([after, await asked(cusG)]));
  after = await asOpened(sG.id);
  check('nor with no customer signed in', none(after.owed) && (await bill(billG.id)).status === 'open' && (await asked(cusG)).length === 0, JSON.stringify([after.owed, await asked(cusG)]));
  check('and automatic payments stay off', (await inStripe(subG)).collection_method === 'send_invoice');
  await setAccountAutomaticPayments(g.own, stripe, { accountId: g.account.id, on: true });
  check('turning automatic payments on charges nothing by itself', (await bill(billG.id)).status === 'open' && (await asked(cusG)).length === 0);
  const sG2 = await open(g);
  check('with them on, the next form says the request owed is charged', (await noteOf(sG2))?.includes('the storage fee owed is charged'), await noteOf(sG2));
  await complete(form, sG2, CARDS.mastercard);
  after = await apply(g, sG2.id);
  check('and saving a card then pays it', after.method?.last4 === '4444' && paidOne(after.owed) && (await bill(billG.id)).status === 'paid'
    && (await asked(cusG)).join() === 'succeeded', JSON.stringify([after, await asked(cusG)]));

  console.log('\nWhere Stripe cannot be read');
  const down = { subscriptions: { retrieve: async () => { throw new Error('Stripe is not answering'); } } };
  const failed = await readPaymentSettings(b.own, down, { accountId: b.account.id }).then(() => 'answered', (e) => e.message);
  check('the read fails rather than guessing', failed === 'Stripe is not answering', failed);

  if (SERVER && WEBHOOK_SECRET) {
    console.log(`\nThe webhook on ${SERVER}`);
    const w = await signedInUser('w');
    const cusW = await customerFor(w);
    const subW = await subscribe(cusW);
    await record(w, cusW, subW);
    const send = async (payload) => {
      const body = JSON.stringify(payload);
      const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
      const res = await fetch(`${SERVER}/api/webhooks/stripe`, { method: 'POST', headers: { 'stripe-signature': header, 'Content-Type': 'application/json' }, body });
      return [res.status, await res.json().catch(() => ({}))];
    };
    const event = async (tag, sessionId) => {
      const id = `evt_test_ps_${stamp}_${tag}`;
      eventIds.push(id);
      return { id, object: 'event', type: 'checkout.session.completed', data: { object: await stripe.checkout.sessions.retrieve(sessionId) } };
    };
    const standing = async () => {
      const rows = must(await db.from('subscriptions').select('status, stripe_subscription_id').eq('account_id', w.account.id));
      const acct = must(await db.from('accounts').select('phase, initiated_at').eq('id', w.account.id).single());
      const moves = must(await db.from('account_phase_events').select('id').eq('account_id', w.account.id));
      return { rows: rows.length, paid: rows.filter((x) => x.status === 'paid').length, phase: acct.phase, initiated: !!acct.initiated_at, moves: moves.length };
    };
    // Signing up records the account's first phase, so the count of phase
    // events is compared with what it was before any event was sent.
    const base = await standing();
    const untouched = (s) => s.rows === 1 && s.paid === 0 && s.phase === 'horizon' && !s.initiated && s.moves === base.moves;

    const sW = await open(w);
    await complete(form, sW, CARDS.mastercard);
    const evW = await event('setup', sW.id);
    let [status, body] = await send(evW);
    check('a completed payment setup form is received', status === 200 && body.received === true, `${status} ${JSON.stringify(body)}`);
    check('and the webhook saves its card, with no browser returning', (await last4Of(subW)) === '4444' && (await methodsOf(cusW)).length === 1);
    let st = await standing();
    check('it is not recorded as a plan payment, and the account is not initiated', untouched(st), JSON.stringify(st));
    const [seen] = must(await db.from('stripe_events').select('processed_at').eq('id', evW.id));
    check('the event is marked processed', !!seen?.processed_at);
    [status, body] = await send(evW);
    check('sent again, it is acknowledged and skipped', status === 200 && body.duplicate === true, `${status} ${JSON.stringify(body)}`);

    const bareW = await stripe.checkout.sessions.create({
      mode: 'setup', customer: cusW.id, payment_method_types: ['card'], client_reference_id: w.account.id,
      metadata: { account_id: w.account.id, tier: 'legacy' }, success_url: `${NOWHERE}/x`, cancel_url: `${NOWHERE}/x`,
    });
    opened.push(bareW.id);
    [status] = await send(await event('bare', bareW.id));
    st = await standing();
    check('a form that saves a payment method is never a plan payment, whoever opened it', status === 200 && untouched(st), `${status} ${JSON.stringify(st)}`);
    const sW2 = await open(w);
    [status] = await send(await event('unfinished', sW2.id));
    st = await standing();
    check('a form the webhook cannot apply is acknowledged, and changes nothing', status === 200 && untouched(st) && (await last4Of(subW)) === '4444', `${status}`);

    // x owes a first storage payment whose charge was declined, with
    // automatic payments on, and its browser never returns.
    const x = await signedInUser('x');
    const cusX = await customerFor(x);
    const subX = await subscribeUnpaid(cusX);
    await record(x, cusX, subX);
    const [billX] = await openBills(subX);
    const sX = await open(x);
    await complete(form, sX, CARDS.visa);
    const askedX = await asked(cusX);
    [status] = await send(await event('owed', sX.id));
    const nowX = await asked(cusX);
    check('the webhook charges a storage fee owed to the card it saves', status === 200 && (await bill(billX.id)).status === 'paid'
      && (await last4Of(subX)) === '4242' && nowX.length === askedX.length + 1 && nowX.filter((s) => s === 'succeeded').length === 1, `${status} ${(await bill(billX.id)).status} ${nowX}`);
    after = await apply(x, sX.id);
    check('and the browser, returning after it, hears that the fee was charged and asks the card for nothing more',
      paidOne(after.owed) && (await asked(cusX)).length === nowX.length, JSON.stringify([after.owed, await asked(cusX)]));
  } else if (SERVER) {
    console.log('\n(no STRIPE_WEBHOOK_SECRET: the webhook was not exercised)');
  }

  if (SERVER) {
    console.log(`\nThe Settings page on ${SERVER}`);
    const p = await signedInUser('p');
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900 });
    const text = (sel) => page.$eval(sel, (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
    const settings = () => page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
    const where = () => { const u = new URL(page.url()); return u.pathname + u.search; };
    const shot = async (name) => {
      if (!SHOTS) return;
      await page.$eval('#payment_setup', (el) => el.scrollIntoView({ block: 'center' }));
      await pause(600);
      await page.screenshot({ path: `${SHOTS}/${name}.png` });
    };
    const signIn = async (pg, who) => {
      await pg.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
      await pg.type('#email', who.user.email);
      await pg.type('#password', PASSWORD);
      await Promise.all([pg.waitForNavigation({ waitUntil: 'networkidle0' }), pg.keyboard.press('Enter')]);
    };

    await signIn(page, p);
    await settings();
    check('the card is named Payment setup, and sits above Automatic payments',
      (await text('#payment_setup_label')) === 'Payment setup'
      && await page.evaluate(() => !!(document.querySelector('#payment_setup').compareDocumentPosition(document.querySelector('#automatic_payments')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    check('with no storage subscription it says a payment method is saved with the first storage payment',
      (await text('#payment_setup'))?.includes('saved with the first storage payment'), await text('#payment_setup'));
    check('and offers nothing to press', (await page.$('#payment_setup_open')) === null && (await page.$('#payment_setup_method')) === null);
    await shot('1-no-subscription');

    const cusP = await customerFor(p);
    const subP = await subscribe(cusP);
    await record(p, cusP, subP);
    const cardP = (await inStripe(subP)).default_payment_method;
    await settings();
    check('with a storage subscription it shows the saved card', (await text('#payment_setup_method')) === 'Visa •••• 4242', await text('#payment_setup_method'));
    check('and when it expires', (await text('#payment_setup_expiry')) === `Expires ${String(cardP.card.exp_month).padStart(2, '0')}/${cardP.card.exp_year}`, await text('#payment_setup_expiry'));
    check('with a way to change it', (await text('#payment_setup_open')) === 'Change payment method', await text('#payment_setup_open'));
    await shot('2-saved-card');

    await page.click('#payment_setup_open');
    await fillForm(page, CARDS.mastercard);
    await page.waitForFunction((base) => location.href.startsWith(base) && location.pathname === '/dashboard/settings', { timeout: 120000 }, SERVER);
    await page.waitForSelector('#payment_setup_method', { timeout: 60000 });
    check("pressing it opens Stripe's payment form, which returns to Settings", where() === '/dashboard/settings?payment=saved', where());
    check('Settings then shows the new card', (await text('#payment_setup_method')) === 'Mastercard •••• 4444', await text('#payment_setup_method'));
    check('and says it is saved', (await text('#payment_setup_notice'))?.includes('the payment method is saved'), await text('#payment_setup_notice'));
    check('Stripe holds it on the subscription, and the old card is removed', (await last4Of(subP)) === '4444'
      && (await methodsOf(cusP)).length === 1 && (await stripe.paymentMethods.retrieve(cardP.id)).customer === null);
    await shot('3-changed');
    await settings();
    check('opened again, Settings still shows it, with no notice', (await text('#payment_setup_method')) === 'Mastercard •••• 4444' && (await page.$('#payment_setup_notice')) === null);

    const back = (sessionId) => page.goto(`${SERVER}/api/payment-setup/return${sessionId ? `?session_id=${sessionId}` : ''}`, { waitUntil: 'networkidle0' });
    const unfinished = await open(p, p, SERVER);
    await back(unfinished.id);
    check('coming back from a form left unfinished, Settings says nothing was saved',
      where() === '/dashboard/settings?payment=not_saved' && (await text('#payment_setup_notice'))?.includes('was not saved'), where());
    check('and the card held before stands', (await text('#payment_setup_method')) === 'Mastercard •••• 4444' && (await last4Of(subP)) === '4444');
    await shot('4-not-saved');
    await back(s3.id);
    check("coming back with another account's completed form saves nothing", where() === '/dashboard/settings?payment=not_saved' && (await last4Of(subP)) === '4444', where());
    await back(null);
    check('nor does coming back with no form', where() === '/dashboard/settings?payment=not_saved', where());

    // v's session ends while they are on Stripe's page: a browser with no
    // session completes the form v opened, and comes back.
    const v = await signedInUser('v');
    const cusV = await customerFor(v);
    const subV = await subscribe(cusV);
    await record(v, cusV, subV);
    const visitor = await browser.createBrowserContext();
    const out = await visitor.newPage();
    await out.setViewport({ width: 1100, height: 900 });
    const outWhere = () => { const u = new URL(out.url()); return u.pathname + u.search; };
    const outText = (sel) => out.$eval(sel, (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
    const unfinishedV = await open(v, v, SERVER);
    await out.goto(`${SERVER}/api/payment-setup/return?session_id=${unfinishedV.id}`, { waitUntil: 'networkidle0' });
    check('someone signed out coming back from an unfinished form is sent to sign in, and nothing is saved',
      outWhere() === `/login?next=${encodeURIComponent('/dashboard/settings?payment=not_saved')}` && (await last4Of(subV)) === '4242', outWhere());
    const sV = await open(v, v, SERVER);
    await out.goto(sV.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await fillForm(out, CARDS.mastercard);
    await out.waitForFunction((base) => location.href.startsWith(base) && location.pathname === '/login', { timeout: 120000 }, SERVER);
    check('someone signed out coming back from a completed form is sent to sign in',
      outWhere() === `/login?next=${encodeURIComponent('/dashboard/settings?payment=saved')}`, outWhere());
    check('and the card is saved for the account that opened the form, before they do', (await last4Of(subV)) === '4444' && (await methodsOf(cusV)).length === 1);
    check('coming back signs nobody in', (await visitor.cookies()).every((ck) => !ck.name.includes('auth-token')), (await visitor.cookies()).map((ck) => ck.name).join());
    await out.waitForSelector('#email');
    await out.type('#email', v.user.email);
    await out.type('#password', PASSWORD);
    await Promise.all([out.waitForNavigation({ waitUntil: 'networkidle0' }), out.keyboard.press('Enter')]);
    await out.waitForSelector('#payment_setup_method', { timeout: 60000 });
    check('once they sign in they land on Settings, which shows the new card and says it is saved',
      outWhere() === '/dashboard/settings?payment=saved' && (await outText('#payment_setup_method')) === 'Mastercard •••• 4444'
      && (await outText('#payment_setup_notice'))?.includes('the payment method is saved'), outWhere());
    await visitor.close();

    await page.setViewport({ width: 390, height: 844 });
    await settings();
    check('at phone width the card reads the same', (await text('#payment_setup_method')) === 'Mastercard •••• 4444');
    await shot('5-phone-width');
    await page.setViewport({ width: 1100, height: 900 });

    // q holds a subscription with no card: the page offers to add one, and the
    // form saves it.
    const q = await signedInUser('q');
    const cusQ = await customerFor(q);
    const subQ = await subscribe(cusQ, false);
    await record(q, cusQ, subQ);
    const other = await browser.createBrowserContext();
    const qPage = await other.newPage();
    await qPage.setViewport({ width: 1100, height: 900 });
    await signIn(qPage, q);
    await qPage.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
    const qText = (sel) => qPage.$eval(sel, (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
    check('a subscription with no saved payment method says so, and offers to add one',
      (await qText('#payment_setup_method'))?.includes('no payment method is saved') && (await qText('#payment_setup_open')) === 'Add a payment method', await qText('#payment_setup'));
    if (SHOTS) {
      await qPage.$eval('#payment_setup', (el) => el.scrollIntoView({ block: 'center' }));
      await pause(600);
      await qPage.screenshot({ path: `${SHOTS}/6-none-saved.png` });
    }
    await other.close();

    // A customer signed in on a browser of their own, at Settings.
    const at = async (who) => {
      const ctx = await browser.createBrowserContext();
      const pg = await ctx.newPage();
      await pg.setViewport({ width: 1100, height: 900 });
      await signIn(pg, who);
      await pg.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      return {
        ctx, pg,
        text: (sel) => pg.$eval(sel, (el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null),
        where: () => { const u = new URL(pg.url()); return u.pathname + u.search; },
        // Presses the card's button, reads what Stripe's form says, saves `card`, and waits for Settings.
        save: async (card) => {
          await pg.$eval('#payment_setup_open', (el) => el.scrollIntoView({ block: 'center' }));
          await pg.click('#payment_setup_open');
          await pg.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
          await pg.waitForSelector('[data-testid="hosted-payment-submit-button"]', { timeout: 60000 });
          const said = await pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
          await fillForm(pg, card);
          await pg.waitForFunction((base) => location.href.startsWith(base) && location.pathname === '/dashboard/settings', { timeout: 120000 }, SERVER);
          await pg.waitForSelector('#payment_setup_method', { timeout: 60000 });
          return said;
        },
        shot: async (name) => {
          if (!SHOTS) return;
          await pg.$eval('#payment_setup', (el) => el.scrollIntoView({ block: 'center' }));
          await pause(600);
          await pg.screenshot({ path: `${SHOTS}/${name}.png` });
        },
      };
    };

    // y owes a first storage payment whose charge was declined, with
    // automatic payments on.
    const y = await signedInUser('y');
    const cusY = await customerFor(y);
    const subY = await subscribeUnpaid(cusY);
    await record(y, cusY, subY);
    const [billY] = await openBills(subY);
    const askedY = await asked(cusY);
    const yAt = await at(y);
    let said = await yAt.save(CARDS.visa);
    check("where a storage fee is owed, Stripe's form says it is charged to the payment method saved", said.includes('the storage fee owed is charged to this payment method'), said.slice(-400));
    check('saving a card returns to Settings, which says the fee owed was charged to it',
      yAt.where() === '/dashboard/settings?payment=saved_paid' && (await yAt.text('#payment_setup_notice'))?.includes('the storage fee owed was charged to it'), `${yAt.where()} ${await yAt.text('#payment_setup_notice')}`);
    const nowY = await asked(cusY);
    check('and it was', (await bill(billY.id)).status === 'paid' && nowY.length === askedY.length + 1 && nowY.filter((s) => s === 'succeeded').length === 1
      && (await yAt.text('#payment_setup_method')) === 'Visa •••• 4242', `${(await bill(billY.id)).status} ${nowY}`);
    await yAt.shot('7-fee-charged');
    await yAt.ctx.close();

    // z owes a first storage payment, and saves a card that declines it.
    const z = await signedInUser('z');
    const cusZ = await customerFor(z);
    const subZ = await subscribeUnpaid(cusZ);
    await record(z, cusZ, subZ);
    const [billZ] = await openBills(subZ);
    const zAt = await at(z);
    said = await zAt.save(CARDS.declines);
    check('a card that declines the fee owed is saved, and Settings says the fee could not be charged and is still owed',
      zAt.where() === '/dashboard/settings?payment=saved_unpaid' && (await zAt.text('#payment_setup_notice'))?.includes('could not be charged to it and is still owed')
      && (await zAt.text('#payment_setup_method')) === 'Visa •••• 0341', `${zAt.where()} ${await zAt.text('#payment_setup_notice')}`);
    check('and it is', (await bill(billZ.id)).status === 'open' && (await last4Of(subZ)) === '0341');
    await zAt.shot('8-fee-not-charged');
    await zAt.ctx.close();
  } else {
    console.log('\n(no --server: the Settings page, the way back and the webhook were not exercised)');
  }
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  console.log('\nCleanup');
  for (const id of opened) await stripe.checkout.sessions.expire(id).catch(() => {});
  let gone = 0;
  for (const id of customers) {
    const del = await stripe.customers.del(id).catch((e) => ({ deleted: false, why: e.message }));
    if (del.deleted) gone++; else console.log(`  could not delete Stripe customer ${id}: ${del.why}`);
  }
  let clocksLeft = 0;
  for (const id of clocks) {
    const del = await stripe.testHelpers.testClocks.del(id).catch((e) => ({ deleted: false, why: e.message }));
    if (!del.deleted) { clocksLeft++; console.log(`  could not delete test clock ${id}: ${del.why}`); }
  }
  if (eventIds.length) must(await db.from('stripe_events').delete().in('id', eventIds));
  const leftEvents = eventIds.length ? must(await db.from('stripe_events').select('id').in('id', eventIds)) : [];
  const accounts = [];
  for (const uid of users) {
    const acct = must(await db.from('accounts').select('id').eq('user_id', uid))[0];
    if (acct) accounts.push(acct.id);
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const leftRows = accounts.length ? must(await db.from('subscriptions').select('id').in('account_id', accounts)) : [];
  const leftByCustomer = customers.length ? must(await db.from('subscriptions').select('id').in('stripe_customer_id', customers)) : [];
  console.log(`  ${users.length} test user(s) deleted; ${gone} of ${customers.length} sandbox customer(s) deleted with their subscriptions; left: ${leftRows.length + leftByCustomer.length} subscription row(s), ${leftEvents.length} webhook event(s)`);
  if (gone !== customers.length || clocksLeft || leftRows.length || leftByCustomer.length || leftEvents.length) fails++;
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
