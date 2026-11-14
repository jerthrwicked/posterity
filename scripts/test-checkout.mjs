#!/usr/bin/env node
// Posterity — the pricing page and the storage fee's checkout, Stripe test mode
/*
Runs the pricing page in a real browser, the way a customer would.

The pricing page sells one thing through a payment form of its own: the
storage fee (Horizon), bought alone. Basic, Premium and Legacy are plans. Each
of their buttons opens Add a plan, where the plan is placed on its year, and
the plan is paid for from the cart within User Profiles
(scripts/test-cart.mjs).

  - a throwaway user signs in through the login page
  - each plan's Get Started button leads to Add a plan, and a visitor who is
    signed out is sent to sign in on the way
  - Horizon's Get Started button opens Stripe's hosted page, which is paid
    with the 4242 test card
  - the browser must come back to /dashboard?success=true
  - the session is then read back from Stripe: paid, the catalog amount, a
    yearly subscription, carrying the account, under the account's one Stripe
    customer
  - a checkout that fails to open leaves a message on its card
  - Custom and Posterity Grace route to Contact Us, Grace shows Grace Storage at its
    catalog price, and the public checkout refuses every plan, Custom, Grace,
    and Grace Storage

Refuses to run unless STRIPE_SECRET_KEY is a test key. The throwaway user is
deleted at the end, and so is its sandbox Stripe customer, with its
subscription.

Start the dev server first, with the site address pointing at itself so Stripe
returns to it:
  NEXT_PUBLIC_SITE_URL=http://localhost:3150 npx next dev -p 3150
  CHECKOUT_BASE=http://localhost:3150 node scripts/test-checkout.mjs
CHROME_PATH chooses the browser if Puppeteer's own is not installed.

With STRIPE_WEBHOOK_SECRET set, it also checks the webhook: that the storage
subscription is recorded within Supabase once, that storage is paid through
the Horizon year, that the storage fee alone does not initiate the account,
that a resent event changes nothing, and that a write which fails answers
Stripe with an error. Forward the webhooks to the dev server and start it with
the same secret:
  stripe listen --api-key <test key> --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3150/api/webhooks/stripe
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { PLANS, GRACE_STORAGE } from '../lib/posterity/plans.js';
import { fillStripeForm } from './stripe-form.mjs';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.log('STRIPE_SECRET_KEY is not a test key. Stopping.');
  process.exit(1);
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.CHECKOUT_BASE || 'http://localhost:3000';
const TIERS = ['basic', 'premium', 'legacy']; // the plans, in the order of their cards on /pricing
const ADD_A_PLAN = '/dashboard/add-plan';
const EMAIL = `checkout-test-${Date.now()}@example.com`, PASSWORD = 'test-password-123';
// Set to the secret `stripe listen` prints, and give the dev server the same one,
// to also check what the webhook records within Supabase.
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_TYPES = ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted'];
const eventIds = [];

const admin = (path, opts = {}) => fetch(URL_ + path, {
  ...opts,
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
});

let passed = 0, failed = 0;
function check(label, cond, detail = '') {
  cond ? passed++ : failed++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

let uid, browser, customer;
try {
  const created = await (await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Checkout Test' } }),
  })).json();
  uid = created.id;
  const account = (await (await admin(`/rest/v1/accounts?user_id=eq.${uid}&select=id`)).json())[0].id;
  const started = Math.floor(Date.now() / 1000) - 60;

  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // React must hydrate before typing, or the controlled inputs drop the text.
  const hydrated = (pg, sel) => pg.waitForFunction((s) =>
    [...document.querySelectorAll(s)].some((b) => Object.keys(b).some((k) => k.startsWith('__reactProps'))), { timeout: 120000 }, sel);
  // The card a button or link sits on, by its heading.
  const cardOfControl = (pg, sel) => pg.$eval(sel, (el) => el.closest('div[class*="border"]')?.querySelector('h2')?.innerText);
  const HORIZON = 'main button[data-plan="horizon"]';

  console.log('A visitor who is signed out');
  const visitor = await browser.createBrowserContext();
  const out = await visitor.newPage();
  await out.setViewport({ width: 1280, height: 1000 });
  await out.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
  await Promise.all([out.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), out.click('main a[data-plan="basic"]')]);
  const sent = new URL(out.url());
  check("a plan's button sends them to sign in, with Add a plan next", sent.pathname === '/login' && sent.searchParams.get('next') === ADD_A_PLAN, sent.pathname + sent.search);
  await visitor.close();

  console.log('\nSigning in');
  await page.goto(`${BASE}/login?next=/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
  await hydrated(page, 'button');
  await page.type('input[type=email]', EMAIL);
  await page.type('input[type=password]', PASSWORD);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Log In').click());
  await page.waitForFunction(() => location.pathname === '/pricing', { timeout: 120000 });
  check('signed in through the login page', true);

  console.log('\nThe plans');
  await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
  await hydrated(page, HORIZON);
  const controls = await page.$$eval('main [data-plan]', (els) => els.map((el) => `${el.dataset.plan}:${el.tagName.toLowerCase()}`).join(' '));
  check('Horizon alone opens a checkout here; each plan is a link', controls === 'horizon:button basic:a premium:a legacy:a', controls);
  for (const tier of TIERS) {
    const sel = `main a[data-plan="${tier}"]`;
    const card = await cardOfControl(page, sel);
    const href = await page.$eval(sel, (a) => a.getAttribute('href'));
    const price = await page.$eval(sel, (a) => a.closest('div[class*="border"]')?.innerText ?? '');
    check(`${PLANS[tier].name}: Get Started sits on its own card, at the catalog price, and leads to Add a plan`,
      card === PLANS[tier].name && href === ADD_A_PLAN && price.includes(PLANS[tier].price), `${card} ${href}`);
  }
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }), page.click('main a[data-plan="premium"]')]);
  check('signed in, a plan\'s button opens Add a plan', new URL(page.url()).pathname === ADD_A_PLAN && (await page.$('#add-plan')) !== null, page.url());
  const noSession = (await stripe.checkout.sessions.list({ limit: 50, created: { gte: started } })).data.filter((s) => s.client_reference_id === account);
  check('and opens no payment form', noSession.length === 0, String(noSession.length));

  console.log(`\n${PLANS.horizon.name}`);
  try {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
    await hydrated(page, HORIZON);
    const card = await cardOfControl(page, HORIZON);
    check('the button sits on its own card', card === PLANS.horizon.name, card);
    await page.click(HORIZON);
    await page.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
    await page.waitForSelector('[data-testid="product-summary-total-amount"]', { timeout: 60000 });
    const total = await page.$eval('[data-testid="product-summary-total-amount"]', (e) => e.innerText.replace(/\s+/g, ' '));
    check('Stripe shows the catalog price', total.replace('.00', '').startsWith(PLANS.horizon.price), total);

    await fillStripeForm(page);
    await page.waitForFunction((b) => location.href.startsWith(b), { timeout: 120000 }, BASE);
    const back = new URL(page.url());
    check('returned to the dashboard', back.pathname + back.search === '/dashboard?success=true', back.pathname + back.search);
  } catch (e) {
    check('checkout completed', false, e.message.split('\n')[0]);
  }

  console.log('\nA checkout that fails to open');
  // The checkout route is made to fail for this one click, as an outage would.
  await page.setRequestInterception(true);
  const failOnce = (req) => req.url().endsWith('/api/create-checkout-session')
    ? req.respond({ status: 500, contentType: 'application/json', body: '{}' }) : req.continue();
  page.on('request', failOnce);
  try {
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
    await hydrated(page, HORIZON);
    await page.click(HORIZON);
    await page.waitForSelector('main [role=alert]', { timeout: 30000 });
    const shown = await page.$$eval('main [role=alert]', (els) => els.map((e) => e.closest('div[class*="border"]')?.querySelector('h2')?.innerText));
    const rest = await page.$eval(HORIZON, (b) => b.innerText.trim());
    check('the card says checkout did not open, and only that card', shown.length === 1 && shown[0] === 'Horizon', shown.join(', '));
    check('the button returns to rest', rest === 'Get Started', rest);
  } catch (e) {
    check('the failure message appeared', false, e.message.split('\n')[0]);
  } finally {
    page.off('request', failOnce);
    await page.setRequestInterception(false);
  }

  console.log('\nCustom and Posterity Grace');
  await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
  const cardOf = (name) => page.evaluate((n) => {
    const card = [...document.querySelectorAll('main h2')].find((h) => h.innerText.trim() === n)?.parentElement;
    return card && { text: card.innerText, href: card.querySelector('a')?.getAttribute('href') };
  }, name);
  for (const name of ['Custom', 'Posterity Grace']) {
    const card = await cardOf(name);
    check(`${name}: Contact Us writes to admin@yourposterity.com`, card?.href === 'mailto:admin@yourposterity.com', card?.href);
  }
  const grace = await cardOf('Posterity Grace');
  check(`Posterity Grace shows Grace Storage at ${GRACE_STORAGE.price}/year`, !!grace?.text.includes(`Grace Storage at ${GRACE_STORAGE.price}/year`));

  console.log('\nWhat the public checkout refuses');
  // A plan is paid for from the cart, and the rest have no public checkout, so
  // the route refuses each by name.
  for (const plan of [...TIERS, 'custom', 'grace', GRACE_STORAGE.id]) {
    const status = await page.evaluate(async (p) => (await fetch('/api/create-checkout-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: p }),
    })).status, plan);
    check(`${plan}: refused by the public checkout`, status === 400, `got ${status}`);
  }

  console.log('\nRecorded within Stripe');
  const all = (await stripe.checkout.sessions.list({ limit: 50, created: { gte: started } })).data.filter((s) => s.client_reference_id === account);
  const sessions = all.filter((s) => s.status === 'complete');
  check('one payment form was opened and paid, and it is Horizon\'s', all.length === 1 && sessions.length === 1 && sessions[0].metadata.plan === 'horizon',
    all.map((s) => `${s.metadata.plan}:${s.status}`).join(' '));
  const s = sessions.find((x) => x.metadata.plan === 'horizon');
  let sub = null;
  if (!s) {
    check('Horizon: a completed session', false);
  } else {
    const p = PLANS.horizon;
    check(`${p.name}: paid, ${s.mode}, $${(s.amount_total / 100).toFixed(2)}, carrying the account`,
      s.payment_status === 'paid' && s.mode === p.mode && `$${(s.amount_total / 100).toFixed(2)}` === p.price
      && s.metadata.account_id === account && s.customer_details?.email === EMAIL);
    sub = await stripe.subscriptions.retrieve(s.subscription);
    check(`${p.name}: the subscription renews yearly and carries the account`,
      sub.status === 'active' && sub.items.data[0].price.recurring?.interval === 'year' && sub.metadata.account_id === account);
  }
  // The account is one customer within Stripe (lib/posterity/stripe-customer.js).
  const [{ stripe_customer_id: held } = {}] = await (await admin(`/rest/v1/accounts?id=eq.${account}&select=stripe_customer_id`)).json();
  customer = held;
  check("the checkout belongs to the account's one Stripe customer",
    !!held && sessions.length === 1 && sessions.every((x) => x.customer === held), [...new Set(sessions.map((x) => x.customer))].join(' '));

  if (!WEBHOOK_SECRET) {
    console.log('\nRecorded within Supabase: skipped, STRIPE_WEBHOOK_SECRET is not set');
  } else {
    console.log('\nRecorded within Supabase');
    // Webhooks arrive on their own schedule; wait for the checkout to be handled.
    const ours = async () => (await stripe.events.list({ limit: 100, created: { gte: started }, types: WEBHOOK_TYPES })).data
      .filter((e) => e.data.object.client_reference_id === account || e.data.object.metadata?.account_id === account);
    let checkoutEvents = [], handled = [];
    for (let t = 0; t < 60; t++) {
      checkoutEvents = (await ours()).filter((e) => e.type === 'checkout.session.completed');
      handled = checkoutEvents.length ? await (await admin(`/rest/v1/stripe_events?id=in.(${checkoutEvents.map((e) => e.id)})&processed_at=not.is.null&select=id`)).json() : [];
      if (handled.length === 1) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    check('the checkout event was received and marked processed', handled.length === 1, `${handled.length} of 1`);

    const subscriptions = () => admin(`/rest/v1/subscriptions?account_id=eq.${account}&select=tier,status,stripe_subscription_id,current_period_end`).then((r) => r.json());
    const rows = await subscriptions();
    const end = sub && new Date(sub.items.data[0].current_period_end * 1000);
    check('Horizon recorded once, with its renewal date', rows.length === 1 && rows[0].tier === 'horizon' && rows[0].status === 'active'
      && rows[0].stripe_subscription_id === sub?.id && new Date(rows[0].current_period_end).getTime() === end?.getTime(), JSON.stringify(rows));

    const [acct] = await (await admin(`/rest/v1/accounts?id=eq.${account}&select=phase,initiated_at,storage_paid_through`)).json();
    check('storage is paid through the end of the Horizon year', acct.storage_paid_through === end?.toISOString().slice(0, 10), acct.storage_paid_through);
    // Initiation is the first payment that is not for storage.
    const moves = await (await admin(`/rest/v1/account_phase_events?account_id=eq.${account}&select=from_phase,to_phase`)).json();
    check('the storage fee alone does not initiate the account', acct.phase === 'horizon' && acct.initiated_at === null && moves.length === 0, `${acct.phase} ${JSON.stringify(moves)}`);
    const plans = await (await admin(`/rest/v1/plans?account_id=eq.${account}&select=id`)).json();
    const carts = await (await admin(`/rest/v1/checkouts?account_id=eq.${account}&select=id`)).json();
    check('and records no plan and no cart checkout', plans.length === 0 && carts.length === 0, `${plans.length} ${carts.length}`);

    // A retry: Stripe sends the same event again. It must change nothing.
    const send = async (payload) => {
      const body = JSON.stringify(payload);
      const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
      return fetch(`${BASE}/api/webhooks/stripe`, { method: 'POST', headers: { 'stripe-signature': header, 'Content-Type': 'application/json' }, body });
    };
    const horizonEvent = checkoutEvents.find((e) => e.data.object.metadata.plan === 'horizon');
    const again = await send(horizonEvent);
    const againBody = await again.json().catch(() => ({}));
    const after = await subscriptions();
    check('a resent event is acknowledged and recorded nothing new', again.status === 200 && againBody.duplicate === true && JSON.stringify(after) === JSON.stringify(rows), `${again.status} ${after.length} rows`);

    // A write that fails must reach Stripe as a failure, so Stripe retries it.
    // This event names an account that does not exist, so its write is refused.
    const broken = { ...horizonEvent, id: `evt_test_broken_${Date.now()}`, data: { object: { ...horizonEvent.data.object, client_reference_id: crypto.randomUUID(), metadata: {} } } };
    const failedWrite = await send(broken);
    check('a failed write answers Stripe with an error', failedWrite.status === 500, `got ${failedWrite.status}`);
    const [left] = await (await admin(`/rest/v1/stripe_events?id=eq.${broken.id}&select=processed_at`)).json();
    check('the failed event stays open for the retry', left && left.processed_at === null, JSON.stringify(left));
    check('and the subscription stays with its account', JSON.stringify(await subscriptions()) === JSON.stringify(rows));
    eventIds.push(broken.id, ...(await ours()).map((e) => e.id));
  }
} finally {
  if (browser) await browser.close();
  if (!customer && uid) {
    const [{ stripe_customer_id: held } = {}] = await (await admin(`/rest/v1/accounts?user_id=eq.${uid}&select=stripe_customer_id`)).json().catch(() => []);
    customer = held;
  }
  // Deleting the sandbox customer ends its subscription within Stripe.
  if (customer) console.log(`\nsandbox Stripe customer deleted: ${(await stripe.customers.del(customer).catch(() => ({}))).deleted === true}`);
  // The test's events are sandbox events; they come out of the live stripe_events table.
  if (eventIds.length) console.log(`\ntest events removed from stripe_events: ${(await admin(`/rest/v1/stripe_events?id=in.(${eventIds})`, { method: 'DELETE' })).status === 204}`);
  if (uid) console.log(`\ntest user deleted: ${(await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })).status === 200}`);
}
console.log(`\n${passed} passing, ${failed} failing`);
process.exit(failed ? 1 : 0);
