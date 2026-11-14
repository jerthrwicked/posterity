#!/usr/bin/env node
// Posterity — the cart and its checkout
/*
Exercises the cart against Stripe's sandbox and the live database as real
signed-in users. Paying runs through Stripe's hosted payment form, so every
run drives that form in a real browser. With a local server it also exercises
the cart on the User Profiles pages, the Pay button, the way back from the
form, and the webhook.

  node scripts/test-cart.mjs --pure                         how the cart is read, with no database and no Stripe
  node scripts/test-cart.mjs                                plus the checkout, against Stripe and the database
  node scripts/test-cart.mjs --server http://localhost:3012 plus the pages on that server

The server must run with the same Stripe test key and with the site address
pointing at itself, so Stripe returns to it:
  NEXT_PUBLIC_SITE_URL=http://localhost:3012 npx next dev -p 3012
To check the webhook as well, give the server and this script the same made-up
STRIPE_WEBHOOK_SECRET. The script signs its own events with it.

What matters most:
  - the cart is the account's unpaid plans, each with its Additional Recipient
    slots and the skipped years before it. A paid plan, a paid skipped year
    and a plan Posterity placed are not in it
  - only a plan can be chosen. What travels with it is charged with it, and a
    skipped year no unpaid plan carries joins every payment
  - the storage fee joins a payment for a plan where no paid storage year
    holds, a free trial included, and opens the storage subscription. It is
    not added where one holds, nor to a payment for skipped years alone
  - an account whose storage renewal is unpaid is refused, and a storage
    subscription Stripe holds that Posterity had not recorded is recorded
    rather than sold again
  - the refund policy is accepted before the form opens, and the time is kept
  - nobody is charged a total they were not shown
  - an account has one payment form open at a time, and its plans cannot
    change while it is open. Closing the form frees them
  - nothing is paid until the form is paid and applied. Applying it marks each
    plan paid against that checkout, records each skipped year's fee, and the
    first plan paid initiates the account. Applying it twice changes nothing
  - a paid form is applied whichever way it is found: the way back, the next
    page the customer opens, a change to a plan, or the webhook
  - a form opened for one account cannot be applied by another
  - a customer reads their own checkouts and nobody else's, and can write
    none: not a checkout, not a line, not a skipped year's fee, and cannot
    mark anything paid

It refuses to run unless STRIPE_SECRET_KEY is a test key. The Stripe customers
it makes are sandbox customers, deleted at the end with their subscriptions.
The test users are deleted at the end and their plans, checkouts, storage
fees and subscriptions go with them, and the events it sends the webhook come
out of `stripe_events`.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) and CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS, GRACE_STORAGE, STORAGE_FEE, RECIPIENT_SLOTS } from '../lib/posterity/plans.js';
import { fillStripeForm } from './stripe-form.mjs';
import {
  cents, dollars, totalOf, cartOf, linesFor, storageLine, storageCurrent, stripeItems, plansInCheckout,
} from '../lib/posterity/cart.js';
import {
  openCheckout, closeOpenCheckout, settleCheckout, applyCheckout, applyCheckoutAsOpened, CheckoutRefused, CART,
} from '../lib/posterity/checkout.js';
import {
  placePlan, setSkips, setSlots, setTimeZone, setTier, deletePlan, PlanRefused,
} from '../lib/posterity/plan-records.js';

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
function finish() {
  console.log();
  if (fails) {
    console.log(`✗ ${fails} check(s) FAILED`);
    process.exit(1);
  }
  console.log('✓ all checks passed');
}

const BASIC = cents(PLANS.basic.price), PREMIUM = cents(PLANS.premium.price), LEGACY = cents(PLANS.legacy.price);
const FEE = cents(STORAGE_FEE.price), STORAGE = cents(PLANS.horizon.price);
const SLOT = { basic: cents(RECIPIENT_SLOTS.basic.price), premium: cents(RECIPIENT_SLOTS.premium.price) };

// ------------------------------------------------------------ how the cart is read
{
  const T = '2026-11-01T00:00:00Z';
  const P = (id, plan_year, tier, extra = {}) => ({ id, plan_year, tier, paid_at: null, additional_recipient_slots: 0, ...extra });
  const kinds = (lines) => lines.map((l) => (l.kind === 'plan' ? `plan${l.planYear}` : l.kind === 'recipient_slots' ? `slots×${l.quantity}` : `fee${l.planYear}`)).join(' ');

  console.log('\nPrices');
  check('a catalog price reads in cents', cents('$9.99') === 999 && cents('$49') === 4900 && cents('$399') === 39900);
  check('and cents read back as the catalog writes them', dollars(5899) === '$58.99' && dollars(4900) === '$49' && dollars(905) === '$9.05' && dollars(0) === '$0');
  let threw = false;
  try { cents('49'); } catch { threw = true; }
  check('a price that cannot be read is a fault, never a zero', threw);

  console.log('\nThe cart, read from the plans');
  let cart = cartOf({ plans: [] });
  check('an account with no plan has an empty cart', cart.groups.length === 0 && cart.loose.length === 0 && cart.total === 0);

  cart = cartOf({ plans: [P('a', 1, 'basic')] });
  check('one unpaid Basic plan is one line at the catalog price',
    cart.groups.length === 1 && kinds(cart.groups[0].lines) === 'plan1' && cart.groups[0].lines[0].unitAmount === BASIC
    && cart.groups[0].lines[0].priceId === PLANS.basic.priceId && cart.total === BASIC, JSON.stringify(cart));

  cart = cartOf({ plans: [P('a', 1, 'basic', { paid_at: T }), P('b', 4, 'premium', { additional_recipient_slots: 2 })] });
  check('a paid plan is not in the cart', cart.groups.length === 1 && cart.groups[0].planId === 'b', JSON.stringify(cart.groups.map((g) => g.planId)));
  check('a plan carries its slots and each skipped year before it, the plan first',
    kinds(cart.groups[0].lines) === 'plan4 slots×2 fee2 fee3', kinds(cart.groups[0].lines));
  check('slots are priced by the plan\'s tier, and each skipped year at the storage fee',
    cart.groups[0].total === PREMIUM + 2 * SLOT.premium + 2 * FEE && cart.total === cart.groups[0].total
    && cart.groups[0].lines[1].priceId === RECIPIENT_SLOTS.premium.priceId && cart.groups[0].lines[2].priceId === STORAGE_FEE.priceId,
    String(cart.groups[0].total));
  check('every line of a plan names that plan', cart.groups[0].lines.every((l) => l.planId === 'b'));

  cart = cartOf({
    plans: [P('a', 1, 'basic', { paid_at: T }), P('b', 4, 'premium', { additional_recipient_slots: 2 })],
    fees: [{ plan_year: 2, paid_at: T }, { plan_year: 3, paid_at: null }],
  });
  check('a skipped year already paid for is not charged again', kinds(cart.groups[0].lines) === 'plan4 slots×2 fee3', kinds(cart.groups[0].lines));

  cart = cartOf({ plans: [P('c', 4, 'legacy'), P('b', 3, 'premium', { paid_at: T }), P('a', 1, 'basic', { paid_at: T })] });
  check('a skipped year before a paid plan stands alone', cart.loose.length === 1 && cart.loose[0].planYear === 2 && cart.loose[0].planId === 'b'
    && cart.loose[0].unitAmount === FEE, JSON.stringify(cart.loose));
  check('and is part of the total', cart.groups.length === 1 && cart.total === LEGACY + FEE, String(cart.total));
  check('it joins a payment whatever is chosen', kinds(linesFor(cart, [])) === 'fee2' && kinds(linesFor(cart, ['c'])) === 'plan4 fee2'
    && kinds(linesFor(cart, ['nothing'])) === 'fee2' && kinds(linesFor(cart, null)) === 'fee2');

  cart = cartOf({ plans: [P('a', 1, 'basic'), P('b', 2, 'basic', { additional_recipient_slots: 1 }), P('c', 5, 'premium')] });
  check('plans come in plan year order', cart.groups.map((g) => g.planYear).join() === '1,2,5');
  check('choosing one plan takes that plan and what travels with it, and nothing of the others',
    kinds(linesFor(cart, ['c'])) === 'plan5 fee3 fee4' && kinds(linesFor(cart, ['b'])) === 'plan2 slots×1'
    && totalOf(linesFor(cart, ['a', 'c'])) === BASIC + PREMIUM + 2 * FEE);
  check('choosing them all comes to the cart\'s total', totalOf(linesFor(cart, ['a', 'b', 'c'])) === cart.total);

  cart = cartOf({ plans: [P('g', 3, 'grace'), P('a', 4, 'basic'), P('x', 6, 'custom')] });
  check('a plan Posterity placed is left out, with the skipped years before it',
    cart.groups.length === 1 && kinds(cart.groups[0].lines) === 'plan4' && cart.loose.length === 0 && cart.total === BASIC, JSON.stringify(cart));

  console.log('\nWhat Stripe is asked for');
  cart = cartOf({ plans: [P('a', 1, 'basic'), P('b', 4, 'basic', { additional_recipient_slots: 3 })] });
  const items = stripeItems(linesFor(cart, ['a', 'b']));
  const qty = (price) => items.find((i) => i.price === price)?.quantity;
  check('one entry per price: two plans on a tier are one entry of two',
    items.length === 3 && qty(PLANS.basic.priceId) === 2 && qty(RECIPIENT_SLOTS.basic.priceId) === 3 && qty(STORAGE_FEE.priceId) === 2, JSON.stringify(items));

  console.log('\nThe storage fee');
  const at = (iso) => new Date(iso);
  check('is current while a paid storage year holds, until that day has ended everywhere',
    storageCurrent({ storage_paid_through: '2026-11-13' }, at('2026-11-13T23:00:00Z'))
    && storageCurrent({ storage_paid_through: '2026-11-13' }, at('2026-11-14T11:59:00Z'))
    && !storageCurrent({ storage_paid_through: '2026-11-13' }, at('2026-11-14T12:00:00Z')));
  check('a free trial is not a paid year', !storageCurrent({ storage_standing: 'trial', storage_paid_through: null, trial_ends_at: '2027-01-01T00:00:00Z' }, at('2026-11-13T00:00:00Z')));
  check('nor is an account the status check cannot read', !storageCurrent(null) && !storageCurrent({}));
  let line = storageLine({ storage_product: 'horizon' });
  check('its line is the Horizon subscription at its catalog price', line.kind === 'storage' && line.tier === 'horizon' && line.unitAmount === STORAGE
    && line.priceId === PLANS.horizon.priceId && line.planId === null && line.planYear === null, JSON.stringify(line));
  line = storageLine({ storage_product: 'grace' });
  check('and Grace Storage for an account that holds it', line.tier === 'grace' && line.unitAmount === cents(GRACE_STORAGE.price) && line.priceId === GRACE_STORAGE.priceId, JSON.stringify(line));

  console.log('\nThe plans a payment form is open for');
  const soon = new Date(Date.now() + 3600e3).toISOString(), past = new Date(Date.now() - 1000).toISOString();
  const held = plansInCheckout([
    { status: 'open', expires_at: soon, checkout_lines: [{ kind: 'plan', plan_id: 'a' }, { kind: 'skipped_year', plan_id: 'b' }, { kind: 'storage', plan_id: null }] },
    { status: 'expired', expires_at: soon, checkout_lines: [{ kind: 'plan', plan_id: 'c' }] },
    { status: 'open', expires_at: past, checkout_lines: [{ kind: 'plan', plan_id: 'd' }] },
    { status: 'open', expires_at: null, checkout_lines: [{ kind: 'plan', plan_id: 'e' }] },
  ]);
  check('are the plans of each form still open, and no others', [...held].sort().join() === 'a,e', [...held].join());
  check('with nothing open, none', plansInCheckout([]).size === 0 && plansInCheckout(null).size === 0);
}

if (process.argv.includes('--pure')) {
  finish();
  process.exit(0);
}

// ------------------------------------------------------------ against Stripe and the database
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
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const HORIZON = PLANS.horizon.priceId;
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-cart-${stamp}-${tag}@yourposterity.com`;
// Where a form opened by this script alone returns to: nowhere. The form is
// complete within Stripe before the browser is sent back.
const NOWHERE = 'https://posterity.invalid';
const DAY_MS = 86400e3;

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
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
const users = [];
const customers = [];
const opened = [];
const eventIds = [];

{
  const { error } = await db.from('checkouts').select('id').limit(1);
  if (error) {
    console.log(`\nThe checkouts table cannot be read (${error.message}). Migration 20261116000000_cart_checkouts is not applied. Not running.`);
    process.exit(1);
  }
}

// A signed-in customer. `own` is the Supabase client the pages use: the
// customer's own session, under row-level security.
async function signedInUser(tag) {
  const email = addr(tag);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Cart Test' } },
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

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const idOf = (x) => (x && typeof x === 'object' ? x.id : x) ?? null;
const place = (who, tier, planYear = null) => placePlan(db, { accountId: who.account.id, tier, planYear, timeZone: 'America/Chicago' });
const planOf = async (id) => must(await db.from('plans').select('*').eq('id', id).maybeSingle());
const accountOf = async (who) => must(await db.from('accounts').select('phase, initiated_at, stripe_customer_id, storage_paid_through').eq('id', who.account.id).single());
const statusOf = async (who) => must(await db.rpc('account_status', { p_account_id: who.account.id }).maybeSingle());
const movesOf = async (who) => must(await db.from('account_phase_events').select('from_phase, to_phase, note').eq('account_id', who.account.id).eq('to_phase', 'planning').order('id'));
const rowOf = async (id) => must(await db.from('checkouts').select('*, checkout_lines(*)').eq('id', id).single());
const rowsOf = async (who) => must(await db.from('checkouts').select('id, status, stripe_session_id').eq('account_id', who.account.id).order('created_at'));
const feesOf = async (who) => must(await db.from('storage_fees').select('*').eq('account_id', who.account.id).order('plan_year'));
const subsOf = async (who) => must(await db.from('subscriptions').select('*').eq('account_id', who.account.id));
const inStripe = (sessionId) => stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
// The cart as the page reads it: the customer's own rows, under row-level security.
const cartFor = async (who) => cartOf({
  plans: must(await who.own.from('plans').select('id, plan_year, tier, paid_at, additional_recipient_slots').eq('account_id', who.account.id)),
  fees: must(await who.own.from('storage_fees').select('plan_year, paid_at').eq('account_id', who.account.id)),
});
const heldFor = async (who) => plansInCheckout(must(await who.own.from('checkouts')
  .select('status, expires_at, checkout_lines(plan_id, kind)').eq('account_id', who.account.id).eq('status', 'open')));
const lineKinds = (row) => row.checkout_lines
  .map((l) => `${l.kind}${l.plan_year ?? ''}${l.quantity > 1 ? `×${l.quantity}` : ''}:${l.unit_amount_cents}`).sort().join(' ');

// Opens the payment form as the cart's Pay button does. The form's id within
// Stripe is read from the checkout's record.
async function open(who, planIds, extra = {}) {
  const o = await openCheckout(db, stripe, {
    accountId: who.account.id, userId: who.user.id, email: who.user.email, planIds, accepted: true, siteUrl: NOWHERE, ...extra,
  });
  o.sessionId = (await rowOf(o.checkoutId)).stripe_session_id;
  opened.push(o.sessionId);
  return o;
}
const refusedAs = async (fn) => {
  try { await fn(); return 'passed'; } catch (e) {
    return e instanceof CheckoutRefused || e instanceof PlanRefused ? e.reason : `error: ${e.message}`;
  }
};

async function paid(sessionId) {
  for (let t = 0; t < 60; t++) {
    if ((await stripe.checkout.sessions.retrieve(sessionId)).status === 'complete') return;
    await pause(1500);
  }
  throw new Error(`the payment form ${sessionId} did not complete`);
}
// Pays a form opened by this script: Stripe is asked until it says so.
async function complete(page, o) {
  await page.goto(o.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await fillStripeForm(page);
  await paid(o.sessionId);
}

let browser;
try {
  const { default: puppeteer } = await import('puppeteer');
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const form = await browser.newPage();
  await form.setViewport({ width: 1100, height: 1000 });
  const [a, b, c, d, e] = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(signedInUser));
  const of = (who) => ({ accountId: who.account.id });

  // ---------------------------------------------------------- refusals
  console.log('\nBefore a payment form opens');
  const a1 = await place(a, 'basic');
  const b1 = await place(b, 'basic');
  check('a Horizon account in its free trial holds one unpaid plan and no paid storage year',
    a1.plan_year === 1 && a1.paid_at === null && (await statusOf(a)).storage_standing === 'trial' && !storageCurrent(await statusOf(a)), JSON.stringify(await statusOf(a)));
  check('the refund policy must be accepted', (await refusedAs(() => open(a, [a1.id], { accepted: false }))) === 'policy_not_accepted'
    && (await refusedAs(() => open(a, [a1.id], { accepted: 'on' }))) === 'policy_not_accepted');
  check('with no plan chosen there is nothing to pay', (await refusedAs(() => open(a, []))) === 'nothing_to_pay'
    && (await refusedAs(() => open(a, ['not-a-plan']))) === 'nothing_to_pay');
  check("another account's plan cannot be chosen", (await refusedAs(() => open(a, [b1.id]))) === 'nothing_to_pay');
  check('a total that is not what the cart comes to is refused', (await refusedAs(() => open(a, [a1.id], { expectedTotal: BASIC }))) === 'cart_changed');
  check('an account that does not exist is refused', (await refusedAs(() => openCheckout(db, stripe, {
    accountId: randomUUID(), userId: a.user.id, email: a.user.email, planIds: [a1.id], accepted: true, siteUrl: NOWHERE,
  }))) === 'no_account');
  check('none of that left a checkout behind', (await rowsOf(a)).length === 0, JSON.stringify(await rowsOf(a)));

  // ---------------------------------------------------------- opening
  console.log('\nOpening the payment form');
  const began = Date.now();
  const o1 = await open(a, [a1.id], { expectedTotal: BASIC + STORAGE });
  check('with no paid storage year, the storage fee joins the plan and the form opens the storage subscription',
    o1.mode === 'subscription' && o1.total === BASIC + STORAGE && new URL(o1.url).host === 'checkout.stripe.com', JSON.stringify({ mode: o1.mode, total: o1.total }));
  let row = await rowOf(o1.checkoutId);
  check('the checkout is recorded open, for the account, by whoever opened it',
    row.status === 'open' && row.account_id === a.account.id && row.opened_by === a.user.id && row.mode === 'subscription'
    && row.amount_cents === BASIC + STORAGE && row.currency === 'usd' && row.paid_at === null && /^cs_test_/.test(row.stripe_session_id ?? ''), JSON.stringify({ ...row, checkout_lines: undefined }));
  const acceptedAt = Date.parse(row.refund_policy_accepted_at);
  check('with the time the refund policy was accepted', acceptedAt >= began - 5000 && acceptedAt <= Date.now() + 5000, row.refund_policy_accepted_at);
  check('and when the form closes on its own, about a day on', Date.parse(row.expires_at) - Date.now() > 20 * 3600e3 && Date.parse(row.expires_at) - Date.now() < 25 * 3600e3, row.expires_at);
  check('its lines are the plan and the storage fee, each priced as the catalog prices it',
    lineKinds(row) === `plan1:${BASIC} storage:${STORAGE}`, lineKinds(row));
  const planLine = row.checkout_lines.find((l) => l.kind === 'plan'), storageRow = row.checkout_lines.find((l) => l.kind === 'storage');
  check('the plan line names the plan, and the storage line names none',
    planLine?.plan_id === a1.id && planLine.tier === 'basic' && planLine.stripe_price_id === PLANS.basic.priceId && planLine.account_id === a.account.id
    && storageRow?.plan_id === null && storageRow.plan_year === null && storageRow.tier === 'horizon' && storageRow.stripe_price_id === HORIZON, JSON.stringify(row.checkout_lines));
  let held = await inStripe(row.stripe_session_id);
  const customerA = (await accountOf(a)).stripe_customer_id;
  check("Stripe's form charges that total to the account's one Stripe customer",
    held.mode === 'subscription' && held.amount_total === BASIC + STORAGE && /^cus_/.test(customerA ?? '') && held.customer === customerA
    && row.stripe_customer_id === customerA, `${held.mode} ${held.amount_total} ${held.customer}`);
  check('it carries the account, the checkout, and takes a card',
    held.client_reference_id === a.account.id && held.metadata.purpose === CART && held.metadata.account_id === a.account.id
    && held.metadata.user_id === a.user.id && held.metadata.checkout_id === o1.checkoutId && held.payment_method_types.join() === 'card', JSON.stringify(held.metadata));
  check('it sells the catalog prices and no others',
    held.line_items.data.map((i) => `${i.price.id}×${i.quantity}`).sort().join() === [`${PLANS.basic.priceId}×1`, `${HORIZON}×1`].sort().join(),
    held.line_items.data.map((i) => `${i.price.id}×${i.quantity}`).join());
  check('it returns to the way back, and to the Plans tab if it is left',
    held.success_url === `${NOWHERE}/api/cart/return?session_id={CHECKOUT_SESSION_ID}` && held.cancel_url === `${NOWHERE}/dashboard`, held.success_url);
  check('opening it pays for nothing', (await planOf(a1.id)).paid_at === null && (await accountOf(a)).phase === 'horizon' && (await subsOf(a)).length === 0);

  // ---------------------------------------------------------- row-level security
  console.log('\nWho reads and writes a checkout');
  const mine = must(await a.own.from('checkouts').select('id, status, checkout_lines(id, kind)').eq('account_id', a.account.id));
  check('the customer reads their own checkout and its lines', mine.length === 1 && mine[0].id === o1.checkoutId && mine[0].checkout_lines.length === 2, JSON.stringify(mine));
  check('and the plan a form is open for', [...(await heldFor(a))].join() === a1.id);
  const theirs = must(await b.own.from('checkouts').select('id'));
  const theirLines = must(await b.own.from('checkout_lines').select('id'));
  check('a second customer reads none of the first one\'s checkouts or lines', theirs.length === 0 && theirLines.length === 0, `${theirs.length} ${theirLines.length}`);
  check('nor does someone signed out', !(await anon.from('checkouts').select('id')).data?.length && !(await anon.from('checkout_lines').select('id')).data?.length);
  const nowIso = new Date().toISOString();
  let w = await b.own.from('checkouts').insert({ account_id: b.account.id, opened_by: b.user.id, refund_policy_accepted_at: nowIso, mode: 'payment', amount_cents: 1 });
  check('a customer cannot write a checkout of their own', w.error?.code === '42501' && (await rowsOf(b)).length === 0, JSON.stringify(w.error));
  w = await a.own.from('checkouts').update({ status: 'paid', paid_at: nowIso }).eq('id', o1.checkoutId).select('id');
  check('cannot mark their checkout paid', w.error?.code === '42501' && (await rowOf(o1.checkoutId)).status === 'open', JSON.stringify(w.error ?? w.data));
  w = await a.own.from('checkouts').delete().eq('id', o1.checkoutId).select('id');
  check('cannot remove it', w.error?.code === '42501' && (await rowsOf(a)).length === 1, JSON.stringify(w.error ?? w.data));
  w = await a.own.from('checkout_lines').insert({
    checkout_id: o1.checkoutId, account_id: a.account.id, kind: 'plan', plan_id: a1.id, plan_year: 1, tier: 'basic', quantity: 1, unit_amount_cents: 1, stripe_price_id: PLANS.basic.priceId,
  });
  check('cannot add a line to it', w.error?.code === '42501' && (await rowOf(o1.checkoutId)).checkout_lines.length === 2, JSON.stringify(w.error));
  w = await a.own.from('checkout_lines').update({ unit_amount_cents: 1 }).eq('checkout_id', o1.checkoutId).select('id');
  check('cannot reprice a line', w.error?.code === '42501' && lineKinds(await rowOf(o1.checkoutId)) === `plan1:${BASIC} storage:${STORAGE}`, JSON.stringify(w.error ?? w.data));
  w = await a.own.from('storage_fees').insert({ account_id: a.account.id, plan_year: 2, amount_cents: FEE, paid_at: nowIso });
  check("cannot write a skipped year's fee as paid", Boolean(w.error) && (await feesOf(a)).length === 0, JSON.stringify(w.error));
  const applyArgs = { p_checkout_id: o1.checkoutId, p_payment_intent: 'pi_test_none', p_subscription: null, p_paid_at: nowIso };
  w = await a.own.rpc('apply_checkout', applyArgs);
  const w2 = await anon.rpc('apply_checkout', applyArgs);
  check('and cannot apply a checkout as paid, signed in or out', Boolean(w.error) && Boolean(w2.error)
    && (await rowOf(o1.checkoutId)).status === 'open' && (await planOf(a1.id)).paid_at === null, JSON.stringify([w.error ?? w.data, w2.error ?? w2.data]));

  // ---------------------------------------------------------- plans hold still
  console.log('\nWhile a payment form is open, the plans hold still');
  check('a change of time zone, which costs nothing, goes through',
    (await refusedAs(() => setTimeZone(db, { ...of(a), planId: a1.id, timeZone: 'Europe/Paris' }))) === 'passed' && (await planOf(a1.id)).delivery_time_zone === 'Europe/Paris');
  check('slots cannot be added', (await refusedAs(() => setSlots(db, { ...of(a), planId: a1.id, slots: 2 }))) === 'checkout_open');
  check('the tier cannot change', (await refusedAs(() => setTier(db, { ...of(a), planId: a1.id, tier: 'premium' }))) === 'checkout_open');
  check('the plan cannot move', (await refusedAs(() => setSkips(db, { ...of(a), planId: a1.id, skips: 1 }))) === 'checkout_open');
  check('the plan cannot be deleted', (await refusedAs(() => deletePlan(db, { ...of(a), planId: a1.id }))) === 'checkout_open');
  w = await db.from('plans').insert({ account_id: a.account.id, plan_year: 9, tier: 'basic', delivery_time_zone: 'America/Chicago', standard_deliveries: 4, feature_deliveries: 1, social_posts: 1 });
  check('and no plan can be added, even with the service role', w.error?.message === 'checkout_open', JSON.stringify(w.error));
  let plan = await planOf(a1.id);
  check('the plan is as it was', plan.tier === 'basic' && plan.plan_year === 1 && plan.additional_recipient_slots === 0 && plan.paid_at === null, JSON.stringify(plan));

  // ---------------------------------------------------------- closing
  console.log('\nClosing the payment form');
  check('a form left unpaid cannot be applied', (await refusedAs(() => applyCheckout(db, stripe, { ...of(a), sessionId: o1.sessionId }))) === 'not_complete');
  check('while Stripe holds it open, reading it leaves it open', (await settleCheckout(db, stripe, of(a))).settled === 'open' && (await rowOf(o1.checkoutId)).status === 'open');
  let closed = await closeOpenCheckout(db, stripe, of(a));
  row = await rowOf(o1.checkoutId);
  check('closing it closes the form within Stripe and marks the checkout expired',
    closed.closed === 'expired' && row.status === 'expired' && row.paid_at === null && (await inStripe(o1.sessionId)).status === 'expired', `${closed.closed} ${row.status}`);
  check('its lines are kept as the record of what it was opened for', row.checkout_lines.length === 2);
  check('with none open, closing and reading change nothing', (await closeOpenCheckout(db, stripe, of(a))).closed === null && (await settleCheckout(db, stripe, of(a))).settled === null);
  check('a closed form cannot be applied', (await refusedAs(() => applyCheckout(db, stripe, { ...of(a), sessionId: o1.sessionId }))) === 'not_complete'
    && (await planOf(a1.id)).paid_at === null);
  check('the plan can change again', (await refusedAs(() => setSlots(db, { ...of(a), planId: a1.id, slots: 2 }))) === 'passed' && (await planOf(a1.id)).additional_recipient_slots === 2);
  check('and no plan is held', (await heldFor(a)).size === 0);

  console.log('\nOne payment form at a time');
  const total1 = BASIC + 2 * SLOT.basic + STORAGE;
  const o2 = await open(a, [a1.id]);
  const o3 = await open(a, [a1.id], { expectedTotal: total1 });
  let rows = await rowsOf(a);
  check('opening another closes the one before it', rows.filter((r) => r.status === 'open').length === 1 && (await rowOf(o2.checkoutId)).status === 'expired'
    && (await rowOf(o3.checkoutId)).status === 'open' && (await inStripe(o2.sessionId)).status === 'expired', rows.map((r) => r.status).join());
  check('the new form charges the plan as it now stands, slots included', o3.total === total1 && (await inStripe(o3.sessionId)).amount_total === total1
    && lineKinds(await rowOf(o3.checkoutId)) === `plan1:${BASIC} recipient_slots1×2:${SLOT.basic} storage:${STORAGE}`, lineKinds(await rowOf(o3.checkoutId)));
  w = await db.from('checkouts').insert({ account_id: a.account.id, opened_by: a.user.id, refund_policy_accepted_at: nowIso, mode: 'payment', amount_cents: 1 });
  check('the database holds an account to one open checkout', w.error?.code === '23505', JSON.stringify(w.error));
  w = await db.from('checkouts').update({ status: 'paid' }).eq('id', o2.checkoutId).select('id');
  check('and a checkout is never marked paid without the time it was paid', Boolean(w.error) && (await rowOf(o2.checkoutId)).status === 'expired', JSON.stringify(w.error ?? w.data));

  console.log('\nWhose form it is');
  check('a form opened for one account cannot be applied by another', (await refusedAs(() => applyCheckout(db, stripe, { ...of(b), sessionId: o3.sessionId }))) === 'other_account');
  check('a form Stripe does not hold is refused', (await refusedAs(() => applyCheckout(db, stripe, { ...of(a), sessionId: 'cs_test_nothing' }))) === 'no_checkout'
    && (await refusedAs(() => applyCheckout(db, stripe, { ...of(a), sessionId: null }))) === 'no_checkout');
  const stray = await stripe.checkout.sessions.create({
    mode: 'payment', customer: customerA, client_reference_id: a.account.id, line_items: [{ price: PLANS.basic.priceId, quantity: 1 }],
    metadata: { account_id: a.account.id }, success_url: NOWHERE,
  });
  opened.push(stray.id);
  check('a form the cart did not open is refused', (await refusedAs(() => applyCheckout(db, stripe, { ...of(a), sessionId: stray.id }))) === 'not_cart'
    && (await refusedAs(() => applyCheckoutAsOpened(db, stripe, { sessionId: stray.id }))) === 'not_cart');

  // ---------------------------------------------------------- the first plan paid
  console.log('\nPaying for the first plan');
  await complete(form, o3);
  check('paying the form changes nothing until it is applied', (await planOf(a1.id)).paid_at === null && (await accountOf(a)).phase === 'horizon' && (await rowOf(o3.checkoutId)).status === 'open');
  check('a paid form is still refused to another account', (await refusedAs(() => applyCheckout(db, stripe, { ...of(b), sessionId: o3.sessionId }))) === 'other_account'
    && (await planOf(a1.id)).paid_at === null);
  let applied = await applyCheckout(db, stripe, { ...of(a), sessionId: o3.sessionId });
  check('applying it marks one plan paid and initiates the account', applied.already === false && applied.plans === 1 && applied.fees === 0 && applied.initiated === true, JSON.stringify(applied));
  plan = await planOf(a1.id);
  row = await rowOf(o3.checkoutId);
  check('the checkout is paid, against its payment and its storage subscription within Stripe',
    row.status === 'paid' && /^pi_/.test(row.stripe_payment_intent_id ?? '') && /^sub_/.test(row.stripe_subscription_id ?? ''), JSON.stringify({ ...row, checkout_lines: undefined }));
  const intent1 = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id, { expand: ['latest_charge'] });
  check('the payment took the form\'s whole total', intent1.status === 'succeeded' && intent1.amount === total1 && intent1.customer === customerA, `${intent1.status} ${intent1.amount}`);
  check('the plan is paid at the moment the card was charged', plan.paid_at !== null && Date.parse(plan.paid_at) === Date.parse(row.paid_at)
    && Date.parse(plan.paid_at) === intent1.latest_charge.created * 1000, `${plan.paid_at} ${row.paid_at}`);
  let acct = await accountOf(a);
  let moves = await movesOf(a);
  check('the account is initiated and in the Planning Phase', acct.phase === 'planning' && acct.initiated_at !== null && Date.parse(acct.initiated_at) === Date.parse(row.paid_at), JSON.stringify(acct));
  check('with one record of the move, naming the checkout', moves.length === 1 && moves[0].from_phase === 'horizon' && moves[0].to_phase === 'planning'
    && moves[0].note?.includes(o3.checkoutId), JSON.stringify(moves));
  const sub1 = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
  let subs = await subsOf(a);
  check('the storage subscription is the account\'s', subs.length === 1 && subs[0].stripe_subscription_id === sub1.id && subs[0].tier === 'horizon'
    && subs[0].status === 'active' && subs[0].stripe_customer_id === customerA && subs[0].stripe_price_id === HORIZON, JSON.stringify(subs));
  check('within Stripe it is active and carries the account', sub1.status === 'active' && sub1.metadata.account_id === a.account.id && sub1.metadata.tier === 'horizon'
    && sub1.items.data[0].price.id === HORIZON, JSON.stringify(sub1.metadata));
  let status = await statusOf(a);
  const year = Date.parse(`${status.storage_paid_through}T00:00:00Z`) - Date.now();
  check('and its paid storage year starts that day', storageCurrent(status) && status.storage_standing === 'current' && year > 360 * DAY_MS && year < 368 * DAY_MS, JSON.stringify(status));

  console.log('\nApplying the same form twice');
  applied = await applyCheckout(db, stripe, { ...of(a), sessionId: o3.sessionId });
  const again = await applyCheckoutAsOpened(db, stripe, { sessionId: o3.sessionId });
  check('changes nothing', applied.already === true && applied.plans === 0 && applied.initiated === false && again.already === true, JSON.stringify([applied, again]));
  check('one record of the move, one subscription, the same paid time', (await movesOf(a)).length === 1 && (await subsOf(a)).length === 1
    && (await planOf(a1.id)).paid_at === plan.paid_at && (await rowOf(o3.checkoutId)).paid_at === row.paid_at);
  check('nothing is left open', (await closeOpenCheckout(db, stripe, of(a))).closed === null && (await rowsOf(a)).every((r) => r.status !== 'open'));
  check('a paid plan is no longer changed here', (await refusedAs(() => setSlots(db, { ...of(a), planId: a1.id, slots: 0 }))) === 'plan_paid');
  check('and is out of the cart', (await cartFor(a)).groups.length === 0 && (await cartFor(a)).total === 0);

  // ---------------------------------------------------------- one plan of several
  console.log('\nPaying for one plan of several');
  const a2 = await place(a, 'legacy');
  const a4 = await place(a, 'premium', 4);
  let cart = await cartFor(a);
  check('the cart holds both plans, the later one with the skipped year before it',
    cart.groups.length === 2 && cart.groups[0].planId === a2.id && cart.groups[0].total === LEGACY
    && cart.groups[1].planId === a4.id && cart.groups[1].total === PREMIUM + FEE && cart.total === LEGACY + PREMIUM + FEE, JSON.stringify(cart.groups.map((g) => [g.planYear, g.total])));
  const o4 = await open(a, [a4.id], { expectedTotal: PREMIUM + FEE });
  row = await rowOf(o4.checkoutId);
  check('with a paid storage year holding, the storage fee is not added and the form takes one payment',
    o4.mode === 'payment' && o4.total === PREMIUM + FEE && row.mode === 'payment', `${o4.mode} ${o4.total}`);
  check('its lines are that plan and its skipped year, and nothing of the other plan', lineKinds(row) === `plan4:${PREMIUM} skipped_year3:${FEE}`
    && row.checkout_lines.every((l) => l.plan_id === a4.id), lineKinds(row));
  check('only the plan chosen shows as in checkout', [...(await heldFor(a))].join() === a4.id);
  check('the other plan holds still as well', (await refusedAs(() => setSlots(db, { ...of(a), planId: a2.id, slots: 1 }))) === 'checkout_open');
  await complete(form, o4);
  check("the customer's next page finds the form paid and applies it", (await settleCheckout(db, stripe, of(a))).settled === 'applied');
  row = await rowOf(o4.checkoutId);
  check('the plan chosen is paid and the other is not', (await planOf(a4.id)).paid_at !== null && (await planOf(a2.id)).paid_at === null && row.status === 'paid'
    && row.stripe_subscription_id === null, row.status);
  const intent2 = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
  check('the payment carries the account and the checkout', intent2.amount === PREMIUM + FEE && intent2.metadata.purpose === CART && intent2.metadata.checkout_id === o4.checkoutId
    && intent2.metadata.account_id === a.account.id, JSON.stringify(intent2.metadata));
  let fees = await feesOf(a);
  check("the skipped year's fee is recorded as paid, with the checkout and the plan it was paid with",
    fees.length === 1 && fees[0].plan_year === 3 && fees[0].amount_cents === FEE && fees[0].checkout_id === o4.checkoutId && fees[0].plan_id === a4.id
    && Date.parse(fees[0].paid_at) === Date.parse(row.paid_at), JSON.stringify(fees));
  check('the customer reads it, and a second customer does not', must(await a.own.from('storage_fees').select('id')).length === 1 && must(await b.own.from('storage_fees').select('id')).length === 0);
  check('a later plan paid initiates nothing again', (await movesOf(a)).length === 1 && (await accountOf(a)).initiated_at === acct.initiated_at);
  check('and no second storage subscription opens', (await subsOf(a)).length === 1
    && (await stripe.subscriptions.list({ customer: customerA, status: 'all' })).data.length === 1);
  check('the plan left unpaid can change again', (await refusedAs(() => setSlots(db, { ...of(a), planId: a2.id, slots: 1 }))) === 'passed');

  // ---------------------------------------------------------- a skipped year alone
  console.log('\nA skipped year no unpaid plan carries');
  await deletePlan(db, { ...of(a), planId: a2.id });
  cart = await cartFor(a);
  check('deleting the unpaid plan leaves its year skipped before a paid plan: its fee stands alone in the cart',
    cart.groups.length === 0 && cart.loose.length === 1 && cart.loose[0].planYear === 2 && cart.loose[0].planId === a4.id && cart.total === FEE, JSON.stringify(cart));
  const o5 = await open(a, [], { expectedTotal: FEE });
  row = await rowOf(o5.checkoutId);
  check('it can be paid alone, with no storage fee added', o5.mode === 'payment' && o5.total === FEE && lineKinds(row) === `skipped_year2:${FEE}`, lineKinds(row));
  await complete(form, o5);
  closed = await closeOpenCheckout(db, stripe, of(a));
  check('a change to a plan that finds the form paid applies it instead of closing it', closed.closed === 'applied' && (await rowOf(o5.checkoutId)).status === 'paid');
  fees = await feesOf(a);
  check('the fee is recorded as paid', fees.length === 2 && fees[0].plan_year === 2 && fees[0].paid_at !== null && fees[0].checkout_id === o5.checkoutId && fees[0].plan_id === a4.id, JSON.stringify(fees));
  check('the cart is empty, and there is nothing left to pay', (await cartFor(a)).total === 0 && (await refusedAs(() => open(a, []))) === 'nothing_to_pay');
  check('three payments, three paid checkouts, each with its own payment', (await rowsOf(a)).filter((r) => r.status === 'paid').length === 3
    && new Set(must(await db.from('checkouts').select('stripe_payment_intent_id').eq('account_id', a.account.id).eq('status', 'paid')).map((r) => r.stripe_payment_intent_id)).size === 3);

  // ---------------------------------------------------------- storage owed
  console.log('\nAn account whose storage renewal is unpaid');
  const cusC = await stripe.customers.create({ email: c.user.email, metadata: { test: 'test-cart' } });
  customers.push(cusC.id);
  must(await db.from('accounts').update({ stripe_customer_id: cusC.id }).eq('id', c.account.id).select('id'));
  const subC = await stripe.subscriptions.create({ customer: cusC.id, items: [{ price: HORIZON }], collection_method: 'send_invoice', days_until_due: 0 });
  must(await db.from('subscriptions').insert({
    account_id: c.account.id, stripe_customer_id: cusC.id, stripe_subscription_id: subC.id, stripe_price_id: HORIZON, tier: 'horizon', status: subC.status,
  }).select('id'));
  const c1 = await place(c, 'basic');
  check('holds a storage subscription and no paid storage year', !storageCurrent(await statusOf(c)) && (await subsOf(c)).length === 1);
  check('is refused until the storage fee is settled', (await refusedAs(() => open(c, [c1.id]))) === 'storage_owed');
  check('and no checkout is left behind, nor a second subscription sold', (await rowsOf(c)).length === 0
    && (await stripe.subscriptions.list({ customer: cusC.id, status: 'all' })).data.length === 1);

  console.log('\nA storage subscription Stripe holds that Posterity had not recorded');
  const cusD = await stripe.customers.create({ email: d.user.email, metadata: { test: 'test-cart' } });
  customers.push(cusD.id);
  must(await db.from('accounts').update({ stripe_customer_id: cusD.id }).eq('id', d.account.id).select('id'));
  const pmD = await stripe.paymentMethods.attach('pm_card_visa', { customer: cusD.id });
  const subD = await stripe.subscriptions.create({ customer: cusD.id, items: [{ price: HORIZON }], default_payment_method: pmD.id });
  const d1 = await place(d, 'basic');
  check('the account reads as having no paid storage year', subD.status === 'active' && (await subsOf(d)).length === 0 && !storageCurrent(await statusOf(d)));
  const oD = await open(d, [d1.id]);
  subs = await subsOf(d);
  check('opening a payment records it as the account\'s, with its paid year', subs.length === 1 && subs[0].stripe_subscription_id === subD.id && subs[0].tier === 'horizon'
    && storageCurrent(await statusOf(d)), JSON.stringify(subs));
  check('and the storage fee is not sold again', oD.mode === 'payment' && oD.total === BASIC && lineKinds(await rowOf(oD.checkoutId)) === `plan1:${BASIC}`, `${oD.mode} ${oD.total}`);

  console.log('\nAn account past the Planning Phase');
  const e1 = await place(e, 'basic');
  must(await db.from('accounts').update({ phase: 'interlude' }).eq('id', e.account.id).select('id'));
  check('cannot open a payment form', (await statusOf(e)).storage_standing === 'ended' && (await refusedAs(() => open(e, [e1.id]))) === 'building_closed'
    && (await rowsOf(e)).length === 0, JSON.stringify(await statusOf(e)));

  // ---------------------------------------------------------- the pages
  if (!SERVER) {
    console.log('\nThe cart on the page: skipped, no --server');
  } else {
    const signIn = async (pg, who) => {
      await pg.goto(`${SERVER}/login`, { waitUntil: 'networkidle0', timeout: 120000 });
      await pg.type('#email', who.user.email);
      await pg.type('#password', PASSWORD);
      await Promise.all([pg.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), pg.keyboard.press('Enter')]);
    };
    const go = (pg, path) => pg.goto(`${SERVER}${path}`, { waitUntil: 'networkidle0', timeout: 120000 });
    const where = (pg) => { const u = new URL(pg.url()); return u.pathname + u.search; };
    // The cart as the page shows it.
    const shown = (pg) => pg.evaluate(() => {
      const text = (sel) => document.querySelector(sel)?.textContent.trim() ?? null;
      const cart = document.querySelector('#cart');
      if (!cart) return null;
      return {
        open: cart.open,
        plans: cart.dataset.plans,
        summary: text('#cart-summary'),
        empty: Boolean(document.querySelector('#cart-empty')),
        lines: [...document.querySelectorAll('#cart-plans [data-line-kind]')].map((el) => `${el.dataset.lineKind}${el.dataset.lineYear}`).join(' '),
        loose: [...document.querySelectorAll('#cart-loose [data-line-kind]')].length,
        inCheckout: document.querySelectorAll('#cart [data-in-checkout]').length,
        storage: document.querySelector('#cart-storage')?.dataset.state ?? null,
        added: document.querySelector('#cart-storage')?.dataset.added ?? null,
        storageText: text('#cart-storage'),
        next: text('#cart-next-payment'),
        total: document.querySelector('#cart-total')?.dataset.total ?? null,
        hidden: document.querySelector('#cart-form input[name=total]')?.value ?? null,
        policy: text('#refund-policy'),
        pay: text('#cart-pay'),
        error: text('#cart-error'),
        year1: document.querySelector('#plan-year-list a[data-year="1"]')?.dataset.status ?? null,
        year2: document.querySelector('#plan-year-list a[data-year="2"]')?.dataset.status ?? null,
        result: document.querySelector('#payment-result')?.dataset.payment ?? null,
      };
    });

    console.log('\nThe cart on the page');
    const p = await signedInUser('p');
    const pg = await browser.newPage();
    await pg.setViewport({ width: 1280, height: 1000 });
    await signIn(pg, p);
    await go(pg, '/dashboard');
    let s = await shown(pg);
    check('a new account sees an empty cart, unfolded on the Plans tab', s?.open === true && s.plans === '0' && s.empty && s.total === '0' && s.pay === null, JSON.stringify(s));
    check('with the storage fee as its own line, within the free trial', s?.storage === 'joins' && s.added === 'false' && s.storageText?.includes('Storage fee') && s.storageText.includes('Free trial')
      && s.next?.startsWith('Next payment '), JSON.stringify(s));

    const p1 = await place(p, 'basic');
    await go(pg, '/dashboard');
    s = await shown(pg);
    check('a plan being built is in the cart, with the storage fee added to its payment',
      s.plans === '1' && s.lines === 'plan1' && s.storage === 'joins' && s.added === 'true' && s.total === String(BASIC + STORAGE) && s.hidden === s.total
      && s.summary === `1 plan · ${dollars(BASIC + STORAGE)}` && s.pay === `Pay ${dollars(BASIC + STORAGE)}`, JSON.stringify(s));
    check('the refund policy is shown before paying', Boolean(s.policy) && (await pg.$('#cart-accept')) !== null);
    for (const tab of ['/dashboard/people', '/dashboard/social-media', '/dashboard/account']) {
      await go(pg, tab);
      const t = await shown(pg);
      check(`the cart is on ${tab}, folded, with the same total`, t?.open === false && t.plans === '1' && t.total === String(BASIC + STORAGE), JSON.stringify(t));
    }

    await go(pg, '/dashboard');
    await pg.click('#cart-plans input[name="plan"]');
    s = await shown(pg);
    check('unticking the plan takes it and the storage fee out of the total, and there is nothing to pay', s.total === '0' && s.added === 'false' && s.pay === null, JSON.stringify(s));
    await pg.click('#cart-plans input[name="plan"]');
    s = await shown(pg);
    check('ticking it again brings both back', s.total === String(BASIC + STORAGE) && s.added === 'true' && s.pay === `Pay ${dollars(BASIC + STORAGE)}`, JSON.stringify(s));
    await pg.click('#cart-pay');
    await pause(2500);
    check('Pay does nothing until the refund policy is accepted', new URL(pg.url()).origin === new URL(SERVER).origin && (await rowsOf(p)).length === 0, pg.url());

    console.log('\nPaying from the cart');
    const before = Date.now();
    await pg.click('#cart-accept');
    await pg.click('#cart-pay');
    await pg.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
    rows = await rowsOf(p);
    row = rows.length === 1 ? await rowOf(rows[0].id) : null;
    check('Pay opens Stripe\'s form for what the cart showed', row?.status === 'open' && row.amount_cents === BASIC + STORAGE && row.opened_by === p.user.id
      && Date.parse(row.refund_policy_accepted_at) >= before - 5000 && lineKinds(row) === `plan1:${BASIC} storage:${STORAGE}`, JSON.stringify(rows));
    const first = row.stripe_session_id;
    opened.push(first);
    check('which returns to this site', (await inStripe(first)).success_url === `${SERVER}/api/cart/return?session_id={CHECKOUT_SESSION_ID}`);

    const pg2 = await browser.newPage();
    await pg2.setViewport({ width: 1280, height: 1000 });
    await go(pg2, '/dashboard?year=1');
    s = await shown(pg2);
    check('while it is open, the plan shows as in checkout, in the cart and on the calendar', s.inCheckout === 1 && s.year1 === 'in_checkout', JSON.stringify(s));
    check('and looking at the page leaves the form open', (await rowOf(row.id)).status === 'open' && (await inStripe(first)).status === 'open');
    await pg2.select('#plan-slots-input', '1');
    await pg2.click('#plan-slots button[type="submit"]');
    for (let t = 0; t < 40 && (await planOf(p1.id)).additional_recipient_slots !== 1; t++) await pause(500);
    check('changing the plan closes the open form first, then makes the change',
      (await planOf(p1.id)).additional_recipient_slots === 1 && (await rowOf(row.id)).status === 'expired' && (await inStripe(first)).status === 'expired',
      `${(await planOf(p1.id)).additional_recipient_slots} ${(await rowOf(row.id)).status}`);
    await go(pg2, '/dashboard?year=1');
    s = await shown(pg2);
    const total2 = BASIC + SLOT.basic + STORAGE;
    check('and the cart shows the new total, with nothing in checkout', s.inCheckout === 0 && s.year1 === 'configured' && s.total === String(total2)
      && s.lines === 'plan1 recipient_slots1', JSON.stringify(s));
    await pg2.close();

    await go(pg, '/dashboard');
    await pg.click('#cart-accept');
    await pg.click('#cart-pay');
    await fillStripeForm(pg);
    await pg.waitForFunction((base) => location.href.startsWith(base) && location.pathname === '/dashboard', { timeout: 180000 }, SERVER);
    await pg.waitForSelector('#payment-result', { timeout: 60000 });
    s = await shown(pg);
    check('paying returns to the Plans tab, which says the payment went through', where(pg) === '/dashboard?payment=paid' && s.result === 'paid', where(pg));
    rows = await rowsOf(p);
    row = await rowOf(rows.at(-1).id);
    check('the plan is paid against that checkout, and the account is initiated', (await planOf(p1.id)).paid_at !== null && row.status === 'paid' && row.amount_cents === total2
      && (await accountOf(p)).phase === 'planning' && (await movesOf(p)).length === 1 && rows.length === 2, JSON.stringify(rows));
    check('the cart is empty, the storage fee reads as current with its next payment date, and the calendar shows the plan paid',
      s.plans === '0' && s.total === '0' && s.storage === 'current' && s.storageText?.includes('Current') && s.next?.startsWith('Next payment ') && s.year1 === 'paid' && s.pay === null, JSON.stringify(s));

    console.log('\nComing back another way');
    const p2 = await place(p, 'premium');
    const oP = await open(p, [p2.id]);
    await complete(form, oP);
    check('a form paid with no return to the site is still unpaid here', (await planOf(p2.id)).paid_at === null);
    await go(pg, '/dashboard?year=2');
    s = await shown(pg);
    check('the next page the customer opens finds it paid and shows it so', (await planOf(p2.id)).paid_at !== null && (await rowOf(oP.checkoutId)).status === 'paid'
      && s.plans === '0' && s.year2 === 'paid', JSON.stringify(s));
    await go(pg, `/api/cart/return?session_id=${oP.sessionId}`);
    check('coming back twice changes nothing', where(pg) === '/dashboard?payment=paid' && (await movesOf(p)).length === 1
      && must(await db.from('checkouts').select('id').eq('account_id', p.account.id).eq('status', 'paid')).length === 2);
    await go(pg, '/api/cart/return?session_id=cs_test_nothing');
    s = await shown(pg);
    check('coming back from no form at all says nothing was paid', where(pg) === '/dashboard?payment=not_paid' && s.result === 'not_paid', where(pg));
    await go(pg, `/api/cart/return?session_id=${o3.sessionId}`);
    check("coming back with another account's form says nothing was paid", where(pg) === '/dashboard?payment=not_paid', where(pg));
    await go(pg, '/dashboard?payment=anything');
    check('an address that makes up a result shows none', (await shown(pg)).result === null);

    console.log('\nA customer whose session ended while they were paying');
    const q = await signedInUser('q');
    const q1 = await place(q, 'basic');
    const oQ = await open(q, [q1.id], { siteUrl: SERVER });
    const visitor = await browser.createBrowserContext();
    const out = await visitor.newPage();
    await out.setViewport({ width: 1280, height: 1000 });
    await out.goto(oQ.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await fillStripeForm(out);
    await out.waitForFunction((base) => location.href.startsWith(base) && location.pathname === '/login', { timeout: 180000 }, SERVER);
    check('is sent to sign in', where(out) === `/login?next=${encodeURIComponent('/dashboard?payment=paid')}`, where(out));
    check('and loses nothing: the plan is paid for the account that opened the form', (await planOf(q1.id)).paid_at !== null && (await accountOf(q)).phase === 'planning'
      && (await rowOf(oQ.checkoutId)).status === 'paid');
    check('coming back signs nobody in', (await visitor.cookies()).every((ck) => !ck.name.includes('auth-token')), (await visitor.cookies()).map((ck) => ck.name).join());
    await out.waitForSelector('#email');
    await out.type('#email', q.user.email);
    await out.type('#password', PASSWORD);
    await Promise.all([out.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), out.keyboard.press('Enter')]);
    await out.waitForSelector('#cart', { timeout: 60000 });
    s = await shown(out);
    check('once they sign in they land on the Plans tab, which shows the plan paid', where(out) === '/dashboard?payment=paid' && s.result === 'paid' && s.year1 === 'paid' && s.plans === '0', where(out));
    await out.goto(`${SERVER}/api/cart/return?session_id=cs_test_nothing`, { waitUntil: 'networkidle0', timeout: 120000 });
    await visitor.close();

    if (!WEBHOOK_SECRET) {
      console.log('\nThe webhook: skipped, no STRIPE_WEBHOOK_SECRET');
    } else {
      console.log('\nThe webhook');
      const send = async (payload) => {
        const body = JSON.stringify(payload);
        const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
        const res = await fetch(`${SERVER}/api/webhooks/stripe`, { method: 'POST', headers: { 'stripe-signature': header, 'Content-Type': 'application/json' }, body });
        return [res.status, await res.json().catch(() => ({}))];
      };
      const event = async (tag, sessionId) => {
        const id = `evt_test_cart_${stamp}_${tag}`;
        eventIds.push(id);
        return { id, object: 'event', type: 'checkout.session.completed', data: { object: await stripe.checkout.sessions.retrieve(sessionId) } };
      };
      const v = await signedInUser('v');
      const v1 = await place(v, 'basic');
      const oV = await open(v, [v1.id]);
      const unpaid = await event('unpaid', oV.sessionId);
      let [st, body] = await send(unpaid);
      check('a form that was not paid is acknowledged and applies nothing', st === 200 && (await planOf(v1.id)).paid_at === null && (await rowOf(oV.checkoutId)).status === 'open', `${st} ${JSON.stringify(body)}`);
      await complete(form, oV);
      const done = await event('paid', oV.sessionId);
      [st, body] = await send(done);
      check('a paid form is applied: the plan paid, the account initiated, the storage subscription recorded',
        st === 200 && body.received === true && (await planOf(v1.id)).paid_at !== null && (await accountOf(v)).phase === 'planning'
        && (await rowOf(oV.checkoutId)).status === 'paid' && (await subsOf(v)).length === 1 && storageCurrent(await statusOf(v)), `${st} ${JSON.stringify(body)}`);
      [st, body] = await send(done);
      check('the same event sent again is skipped', st === 200 && body.duplicate === true, `${st} ${JSON.stringify(body)}`);
      [st, body] = await send({ ...(await event('again', oV.sessionId)) });
      check('and another event for the same form changes nothing', st === 200 && (await movesOf(v)).length === 1 && (await subsOf(v)).length === 1
        && must(await db.from('checkouts').select('id').eq('account_id', v.account.id).eq('status', 'paid')).length === 1, `${st}`);
      const before2 = JSON.stringify([await subsOf(a), await rowsOf(a), await feesOf(a)]);
      [st, body] = await send(await event('stray', stray.id));
      check('a one-time payment the cart did not open records nothing', st === 200 && JSON.stringify([await subsOf(a), await rowsOf(a), await feesOf(a)]) === before2, `${st}`);
      const bad = JSON.stringify(done);
      const res = await fetch(`${SERVER}/api/webhooks/stripe`, { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad', 'Content-Type': 'application/json' }, body: bad });
      check('an event that is not signed by Stripe is refused', res.status === 400, String(res.status));
    }
  }
} catch (e) {
  console.log(`  ✗ stopped: ${e.stack ?? e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  console.log('\nCleanup');
  const accounts = [];
  for (const uid of users) {
    const acct = must(await db.from('accounts').select('id, stripe_customer_id').eq('user_id', uid))[0];
    if (!acct) continue;
    accounts.push(acct.id);
    if (acct.stripe_customer_id) customers.push(acct.stripe_customer_id);
  }
  if (accounts.length) {
    for (const r of must(await db.from('checkouts').select('stripe_session_id, stripe_customer_id').in('account_id', accounts))) {
      if (r.stripe_session_id) opened.push(r.stripe_session_id);
      if (r.stripe_customer_id) customers.push(r.stripe_customer_id);
    }
  }
  for (const id of new Set(opened)) await stripe.checkout.sessions.expire(id).catch(() => {});
  const all = [...new Set(customers)];
  let gone = 0;
  for (const id of all) {
    const del = await stripe.customers.del(id).catch((err) => ({ deleted: false, why: err.message }));
    if (del.deleted) gone++; else console.log(`  could not delete Stripe customer ${id}: ${del.why}`);
  }
  if (eventIds.length) must(await db.from('stripe_events').delete().in('id', eventIds));
  const leftEvents = eventIds.length ? must(await db.from('stripe_events').select('id').in('id', eventIds)) : [];
  for (const uid of users) {
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  let left = 0;
  const leftIn = [];
  for (const table of ['checkouts', 'checkout_lines', 'plans', 'storage_fees', 'subscriptions', 'accounts']) {
    const col = table === 'accounts' ? 'id' : 'account_id';
    const n = accounts.length ? must(await db.from(table).select('id').in(col, accounts)).length : 0;
    if (n) { left += n; leftIn.push(`${n} in ${table}`); }
  }
  console.log(`  ${users.length} test user(s) deleted; ${gone} of ${all.length} sandbox customer(s) deleted with their subscriptions; left: ${left} row(s)${leftIn.length ? ` (${leftIn.join(', ')})` : ''}, ${leftEvents.length} webhook event(s)`);
  if (gone !== all.length || left || leftEvents.length) fails++;
}

finish();
