#!/usr/bin/env node
// Posterity — end-to-end checkout test, Stripe test mode
/*
Runs every tier's checkout in a real browser, the way a customer would.

  - a throwaway user signs in through the login page
  - each Get Started button on /pricing is clicked in turn
  - Stripe's hosted page is paid with the 4242 test card
  - the browser must come back to /dashboard?success=true
  - each session is then read back from Stripe: paid, the right amount, the right
    mode (Horizon a subscription, the plans one-time), and carrying the account

Refuses to run unless STRIPE_SECRET_KEY is a test key. The throwaway user is
deleted at the end. The paid test sessions and the Horizon test subscription stay
within the Stripe sandbox.

Start the dev server first, with the site address pointing at itself so Stripe
returns to it:
  NEXT_PUBLIC_SITE_URL=http://localhost:3150 npx next dev -p 3150
  CHECKOUT_BASE=http://localhost:3150 node scripts/test-checkout.mjs
CHROME_PATH chooses the browser if Puppeteer's own is not installed.

With STRIPE_WEBHOOK_SECRET set, it also checks the webhook: that each payment is
recorded within Supabase once, that storage is paid through the Horizon year, that
the account moves to Planning with the move logged, that a resent event changes
nothing, and that a write which fails answers Stripe with an error. Forward the
webhooks to the dev server and start it with the same secret:
  stripe listen --api-key <test key> --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3150/api/webhooks/stripe
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { PLANS } from '../lib/posterity/plans.js';

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
const ORDER = ['horizon', 'basic', 'premium', 'legacy']; // the order of the cards on /pricing
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

let uid, browser;
try {
  const created = await (await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'Checkout Test' } }),
  })).json();
  uid = created.id;
  const account = (await (await admin(`/rest/v1/accounts?user_id=eq.${uid}&select=id`)).json())[0].id;
  const started = Math.floor(Date.now() / 1000) - 60;

  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // React must hydrate before typing, or the controlled inputs drop the text.
  const hydrated = (sel) => page.waitForFunction((s) =>
    [...document.querySelectorAll(s)].some((b) => Object.keys(b).some((k) => k.startsWith('__reactProps'))), { timeout: 120000 }, sel);

  await page.goto(`${BASE}/login?next=/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
  await hydrated('button');
  await page.type('input[type=email]', EMAIL);
  await page.type('input[type=password]', PASSWORD);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Log In').click());
  await page.waitForFunction(() => location.pathname === '/pricing', { timeout: 120000 });
  check('signed in through the login page', true);

  for (const [i, plan] of ORDER.entries()) {
    console.log(`\n${PLANS[plan].name}`);
    try {
      await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle2', timeout: 120000 });
      await hydrated('main button');
      const button = (await page.$$('main button'))[i];
      const card = await button.evaluate((b) => b.closest('div[class*="border"]')?.querySelector('h2')?.innerText);
      check('the button sits on its own card', card === PLANS[plan].name, card);
      await button.click();
      await page.waitForFunction(() => location.host === 'checkout.stripe.com', { timeout: 180000 });
      await page.waitForSelector('[data-testid="product-summary-total-amount"]', { timeout: 60000 });
      const total = await page.$eval('[data-testid="product-summary-total-amount"]', (e) => e.innerText.replace(/\s+/g, ' '));
      check('Stripe shows the catalog price', total.replace('.00', '').startsWith(PLANS[plan].price), total);

      await page.evaluate(() => document.querySelector('[data-testid="card-accordion-item-button"]')?.click());
      await page.waitForSelector('#cardNumber', { visible: true, timeout: 30000 });
      await page.type('#cardNumber', '4242424242424242');
      await page.type('#cardExpiry', '1234');
      await page.type('#cardCvc', '123');
      if (await page.$('#billingName')) await page.type('#billingName', 'Checkout Test');
      if (await page.$('#billingPostalCode')) await page.type('#billingPostalCode', '70112');
      await page.evaluate(() => { const c = document.getElementById('enableStripePass'); if (c?.checked) c.click(); });
      await page.evaluate(() => document.querySelector('[data-testid="hosted-payment-submit-button"]').click());
      await page.waitForFunction((b) => location.href.startsWith(b), { timeout: 120000 }, BASE);
      const back = new URL(page.url());
      check('returned to the dashboard', back.pathname + back.search === '/dashboard?success=true', back.pathname + back.search);
    } catch (e) {
      check('checkout completed', false, e.message.split('\n')[0]);
    }
  }

  console.log('\nRecorded within Stripe');
  const sessions = (await stripe.checkout.sessions.list({ limit: 50, created: { gte: started } }))
    .data.filter((s) => s.client_reference_id === account && s.status === 'complete');
  for (const plan of ORDER) {
    const p = PLANS[plan], s = sessions.find((x) => x.metadata.plan === plan);
    if (!s) { check(`${p.name}: a completed session`, false); continue; }
    check(`${p.name}: paid, ${s.mode}, $${(s.amount_total / 100).toFixed(2)}, carrying the account`,
      s.payment_status === 'paid' && s.mode === p.mode && s.metadata.account_id === account && s.customer_details?.email === EMAIL);
    if (s.mode === 'subscription') {
      const sub = await stripe.subscriptions.retrieve(s.subscription);
      check(`${p.name}: the subscription renews yearly and carries the account`,
        sub.status === 'active' && sub.items.data[0].price.recurring?.interval === 'year' && sub.metadata.account_id === account);
    }
  }

  if (!WEBHOOK_SECRET) {
    console.log('\nRecorded within Supabase: skipped, STRIPE_WEBHOOK_SECRET is not set');
  } else {
    console.log('\nRecorded within Supabase');
    // Webhooks arrive on their own schedule; wait for all four checkouts to be handled.
    const ours = async () => (await stripe.events.list({ limit: 100, created: { gte: started }, types: WEBHOOK_TYPES })).data
      .filter((e) => e.data.object.client_reference_id === account || e.data.object.metadata?.account_id === account);
    let checkoutEvents = [], handled = [];
    for (let t = 0; t < 60; t++) {
      checkoutEvents = (await ours()).filter((e) => e.type === 'checkout.session.completed');
      handled = checkoutEvents.length ? await (await admin(`/rest/v1/stripe_events?id=in.(${checkoutEvents.map((e) => e.id)})&processed_at=not.is.null&select=id`)).json() : [];
      if (handled.length === ORDER.length) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    check('every checkout event was received and marked processed', handled.length === ORDER.length, `${handled.length} of ${ORDER.length}`);

    const rows = await (await admin(`/rest/v1/subscriptions?account_id=eq.${account}&select=tier,status,stripe_subscription_id,current_period_end`)).json();
    const horizonSession = sessions.find((x) => x.metadata.plan === 'horizon');
    const sub = horizonSession && await stripe.subscriptions.retrieve(horizonSession.subscription);
    const end = sub && new Date(sub.items.data[0].current_period_end * 1000);
    const hz = rows.filter((r) => r.stripe_subscription_id);
    check('Horizon recorded once, with its renewal date', hz.length === 1 && hz[0].status === 'active' && new Date(hz[0].current_period_end).getTime() === end?.getTime(), JSON.stringify(hz));
    const paid = rows.filter((r) => r.status === 'paid').map((r) => r.tier).sort();
    check('each plan payment recorded once', JSON.stringify(paid) === JSON.stringify(['basic', 'legacy', 'premium']), paid.join(', '));

    const [acct] = await (await admin(`/rest/v1/accounts?id=eq.${account}&select=phase,initiated_at,storage_paid_through`)).json();
    check('storage is paid through the end of the Horizon year', acct.storage_paid_through === end?.toISOString().slice(0, 10), acct.storage_paid_through);
    check('the account moved to Planning and was initiated', acct.phase === 'planning' && !!acct.initiated_at, acct.phase);
    const moves = await (await admin(`/rest/v1/account_phase_events?account_id=eq.${account}&to_phase=eq.planning&select=from_phase,to_phase`)).json();
    check('the move was logged once in the phase history', moves.length === 1 && moves[0].from_phase === 'horizon' && moves[0].to_phase === 'planning', JSON.stringify(moves));

    // A retry: Stripe sends the same event again. It must change nothing.
    const send = async (payload) => {
      const body = JSON.stringify(payload);
      const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
      return fetch(`${BASE}/api/webhooks/stripe`, { method: 'POST', headers: { 'stripe-signature': header, 'Content-Type': 'application/json' }, body });
    };
    const basicEvent = checkoutEvents.find((e) => e.data.object.metadata.plan === 'basic');
    const again = await send(basicEvent);
    const againBody = await again.json().catch(() => ({}));
    const after = await (await admin(`/rest/v1/subscriptions?account_id=eq.${account}&status=eq.paid&select=id`)).json();
    check('a resent payment is acknowledged and recorded nothing new', again.status === 200 && againBody.duplicate === true && after.length === 3, `${again.status} ${after.length} rows`);

    // A write that fails must reach Stripe as a failure, so Stripe retries it.
    // This payment names an account that does not exist, so its insert is refused.
    const broken = { ...basicEvent, id: `evt_test_broken_${Date.now()}`, data: { object: { ...basicEvent.data.object, client_reference_id: crypto.randomUUID(), metadata: {} } } };
    const failed = await send(broken);
    check('a failed write answers Stripe with an error', failed.status === 500, `got ${failed.status}`);
    const [left] = await (await admin(`/rest/v1/stripe_events?id=eq.${broken.id}&select=processed_at`)).json();
    check('the failed event stays open for the retry', left && left.processed_at === null, JSON.stringify(left));
    eventIds.push(broken.id, ...(await ours()).map((e) => e.id));
  }
} finally {
  if (browser) await browser.close();
  // The test's events are sandbox events; they come out of the live stripe_events table.
  if (eventIds.length) console.log(`\ntest events removed from stripe_events: ${(await admin(`/rest/v1/stripe_events?id=in.(${eventIds})`, { method: 'DELETE' })).status === 204}`);
  if (uid) console.log(`\ntest user deleted: ${(await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })).status === 200}`);
}
console.log(`\n${passed} passing, ${failed} failing`);
process.exit(failed ? 1 : 0);
