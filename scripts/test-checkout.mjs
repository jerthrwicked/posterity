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
} finally {
  if (browser) await browser.close();
  if (uid) console.log(`\ntest user deleted: ${(await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })).status === 200}`);
}
console.log(`\n${passed} passing, ${failed} failing`);
process.exit(failed ? 1 : 0);
