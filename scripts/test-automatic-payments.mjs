#!/usr/bin/env node
// Posterity — the automatic payments switch
/*
Exercises the automatic payments switch against Stripe's sandbox and the live
database as real signed-in users, and, with a local server, the switch on the
Settings page in a real browser.

  node scripts/test-automatic-payments.mjs                  the library
  node scripts/test-automatic-payments.mjs --server http://localhost:3011
                                                            plus the Settings page on that server, which
                                                            must run with the same Stripe test key
  ... --shots <directory>                                   also saves pictures of the switch there

What matters most:
  - the switch holds nothing of its own: it reads on or off from the account's
    storage subscription within Stripe, and moving it changes that
    subscription and nothing else about it
  - an account with no storage subscription has nothing to move: the switch
    reads as not held and a change is refused. A subscription that has ended,
    one Stripe no longer holds, and a one-time plan payment all count as none
  - turning it on with no saved payment method is refused, and where an
    account holds two subscriptions it is refused before either is changed
  - an account holding two reads on while either charges automatically, and
    both move together
  - no customer can read or move another account's switch, and no customer
    can write a `subscriptions` row, so none can point the switch at a
    subscription that is not theirs
  - where Stripe cannot be read, the read fails rather than guessing

It refuses to run unless STRIPE_SECRET_KEY is a test key. The Stripe customers
it makes are sandbox customers, deleted at the end with their subscriptions.
The test users are deleted at the end and their `subscriptions` rows go with
them.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY); for the browser, CHROME_PATH if
Puppeteer's own Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '../lib/posterity/plans.js';
import { setAutomaticPayments, automaticPaymentsOn } from '../lib/posterity/storage-billing.js';
import {
  readAutomaticPayments, setAccountAutomaticPayments, PaymentsRefused,
} from '../lib/posterity/automatic-payments.js';

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

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const HORIZON = PLANS.horizon.priceId;
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-ap-${stamp}-${tag}@yourposterity.com`;

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

// A signed-in customer. `own` is the Supabase client the Settings page and its
// action use: the customer's own session, under row-level security.
async function signedInUser(tag) {
  const email = addr(tag);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Automatic Payments Test' } },
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

// A sandbox customer, with a saved card unless `card` is false.
async function customerFor(who, card = true) {
  const cus = await stripe.customers.create({
    email: who.user.email,
    metadata: { test: 'test-automatic-payments' },
    ...(card ? { payment_method: 'pm_card_visa', invoice_settings: { default_payment_method: 'pm_card_visa' } } : {}),
  });
  customers.push(cus.id);
  return cus;
}
// A storage subscription as Checkout opens it, or, for a customer with no
// saved card, one that renews by payment request.
const subscribe = (cus, card = true) => stripe.subscriptions.create({
  customer: cus.id, items: [{ price: HORIZON }],
  ...(card ? {} : { collection_method: 'send_invoice', days_until_due: 0 }),
});
// The row the Stripe webhook writes on checkout.session.completed.
const record = (who, cus, sub) => db.from('subscriptions').insert({
  account_id: who.account.id, stripe_customer_id: cus.id, stripe_subscription_id: sub.id,
  stripe_price_id: HORIZON, tier: 'horizon', status: sub.status,
}).select().single().then(must);

const inStripe = (sub) => stripe.subscriptions.retrieve(sub.id);
const periodEnd = (sub) => sub.items.data[0].current_period_end;
const read = (who, as = who) => readAutomaticPayments(as.own, stripe, { accountId: who.account.id });
const turn = (who, on, as = who) => setAccountAutomaticPayments(as.own, stripe, { accountId: who.account.id, on });
const refusedAs = async (fn) => { try { await fn(); return 'passed'; } catch (e) { return e instanceof PaymentsRefused ? e.reason : `error: ${e.message}`; } };
const rowOf = async (id) => must(await db.from('subscriptions').select().eq('id', id))[0] ?? null;

try {
  const [a, b, c, d] = await Promise.all([signedInUser('a'), signedInUser('b'), signedInUser('c'), signedInUser('d')]);

  console.log('\nAn account with no storage subscription');
  let r = await read(a);
  check('the switch reads as not held', r.held === false && !('on' in r), JSON.stringify(r));
  check('turning it off is refused: there is nothing to move', (await refusedAs(() => turn(a, false))) === 'no_subscription');
  check('and so is turning it on', (await refusedAs(() => turn(a, true))) === 'no_subscription');

  console.log('\nAn account with a storage subscription');
  const cusA = await customerFor(a);
  const subA = await subscribe(cusA);
  const rowA = await record(a, cusA, subA);
  r = await read(a);
  check('the subscription opens charging automatically, and the switch reads on', automaticPaymentsOn(subA) && r.held === true && r.on === true, JSON.stringify(r));

  let after = await turn(a, false);
  let now = await inStripe(subA);
  check('turning it off sets the subscription to payment requests, due the day they are raised',
    after.on === false && now.collection_method === 'send_invoice' && now.days_until_due === 0, JSON.stringify({ method: now.collection_method, due: now.days_until_due }));
  check('and changes nothing else: still active, same renewal date', now.status === 'active' && periodEnd(now) === periodEnd(subA), now.status);
  r = await read(a);
  check('the switch then reads off', r.held === true && r.on === false, JSON.stringify(r));

  after = await turn(a, true);
  now = await inStripe(subA);
  check('turning it back on sets the subscription to charge automatically',
    after.on === true && now.collection_method === 'charge_automatically' && now.status === 'active' && periodEnd(now) === periodEnd(subA), now.collection_method);
  check('the switch reads what Stripe holds, however it was changed',
    (await setAutomaticPayments(stripe, subA.id, false)) && (await read(a)).on === false
    && (await setAutomaticPayments(stripe, subA.id, true)) && (await read(a)).on === true);

  console.log('\nAnother account');
  r = await read(a, b);
  check("cannot read this account's switch: it sees no subscription", r.held === false, JSON.stringify(r));
  check('cannot move it', (await refusedAs(() => turn(a, false, b))) === 'no_subscription'
    && (await inStripe(subA)).collection_method === 'charge_automatically');
  r = await readAutomaticPayments(db, stripe, { accountId: b.account.id });
  check("nor does the server's own client, asked for one account, find another's", r.held === false, JSON.stringify(r));
  const [stIns] = await rest('/rest/v1/subscriptions', {
    method: 'POST', key: ANON, token: b.token,
    body: { account_id: b.account.id, stripe_customer_id: cusA.id, stripe_subscription_id: `${subA.id}_x`, tier: 'horizon', status: 'active' },
  });
  const mineB = must(await db.from('subscriptions').select('id').eq('account_id', b.account.id));
  check('cannot write a subscription row of its own, so cannot point its switch anywhere',
    stIns >= 400 && mineB.length === 0 && (await read(b)).held === false, `${stIns} ${mineB.length}`);
  await rest(`/rest/v1/subscriptions?id=eq.${rowA.id}`, { method: 'PATCH', key: ANON, token: b.token, body: { account_id: b.account.id } });
  await rest(`/rest/v1/subscriptions?id=eq.${rowA.id}`, { method: 'DELETE', key: ANON, token: b.token });
  let row = await rowOf(rowA.id);
  check("cannot take or remove this account's row", row?.account_id === a.account.id && row.stripe_subscription_id === subA.id, JSON.stringify(row));
  await rest(`/rest/v1/subscriptions?id=eq.${rowA.id}`, { method: 'PATCH', key: ANON, token: a.token, body: { stripe_subscription_id: 'sub_someone_elses' } });
  await rest(`/rest/v1/subscriptions?id=eq.${rowA.id}`, { method: 'DELETE', key: ANON, token: a.token });
  row = await rowOf(rowA.id);
  check('the account itself can read its row but not change or remove it', row?.stripe_subscription_id === subA.id
    && must(await a.own.from('subscriptions').select('id').eq('id', rowA.id)).length === 1, JSON.stringify(row));

  console.log('\nNo saved payment method');
  const cusC = await customerFor(c, false);
  const subC = await subscribe(cusC, false);
  await record(c, cusC, subC);
  r = await read(c);
  check('a subscription paid by request reads off', r.held === true && r.on === false, JSON.stringify(r));
  check('turning automatic payments on is refused', (await refusedAs(() => turn(c, true))) === 'no_payment_method');
  check('and the subscription stays on payment requests', (await inStripe(subC)).collection_method === 'send_invoice');

  console.log('\nAn account holding two storage subscriptions');
  // A second subscription for c, this one with a saved card, turned off.
  const cusC2 = await customerFor(c);
  const subC2 = await subscribe(cusC2);
  await record(c, cusC2, subC2);
  r = await read(c);
  check('the switch reads on while either charges automatically', r.held === true && r.on === true, JSON.stringify(r));
  after = await turn(c, false);
  check('turning it off turns both off', after.on === false
    && (await inStripe(subC)).collection_method === 'send_invoice' && (await inStripe(subC2)).collection_method === 'send_invoice');
  check('turning it on is refused while one has no saved payment method', (await refusedAs(() => turn(c, true))) === 'no_payment_method');
  check('and neither was changed', (await inStripe(subC2)).collection_method === 'send_invoice'
    && (await inStripe(subC)).collection_method === 'send_invoice' && (await read(c)).on === false);
  // The other way round for d: the one with a card is the older, so it is the
  // first the switch would reach.
  const cusD = await customerFor(d);
  const subD = await subscribe(cusD);
  await record(d, cusD, subD);
  await turn(d, false);
  const cusD2 = await customerFor(d, false);
  const subD2 = await subscribe(cusD2, false);
  await record(d, cusD2, subD2);
  check('whichever is the older, on is refused before either is changed', (await refusedAs(() => turn(d, true))) === 'no_payment_method'
    && (await inStripe(subD)).collection_method === 'send_invoice' && (await inStripe(subD2)).collection_method === 'send_invoice');
  // The same for a, whose two subscriptions both have a card.
  const subA2 = await subscribe(cusA);
  await record(a, cusA, subA2);
  await turn(a, false);
  check('with a card behind both, off turns both off', (await inStripe(subA)).collection_method === 'send_invoice'
    && (await inStripe(subA2)).collection_method === 'send_invoice');
  after = await turn(a, true);
  check('and on turns both on', after.on === true && (await inStripe(subA)).collection_method === 'charge_automatically'
    && (await inStripe(subA2)).collection_method === 'charge_automatically');

  console.log('\nWhat does not count as a storage subscription');
  await stripe.subscriptions.cancel(subA2.id);
  await turn(a, false);
  check('a cancelled subscription is left alone, and the live one still moves',
    (await inStripe(subA)).collection_method === 'send_invoice' && (await inStripe(subA2)).status === 'canceled' && (await read(a)).on === false);
  await stripe.subscriptions.cancel(subA.id);
  r = await read(a);
  check('once every subscription has ended the switch is not held', r.held === false, JSON.stringify(r));
  check('and a change is refused', (await refusedAs(() => turn(a, true))) === 'no_subscription');
  // The row still says active, as it would until the webhook caught up.
  check('whatever the row still says', (await rowOf(rowA.id)).status === 'active');
  must(await db.from('subscriptions').insert({ account_id: b.account.id, stripe_customer_id: cusA.id, stripe_price_id: 'price_plan', tier: 'legacy', status: 'paid' }));
  r = await read(b);
  check('a one-time plan payment is not one', r.held === false, JSON.stringify(r));
  must(await db.from('subscriptions').insert({ account_id: b.account.id, stripe_customer_id: cusA.id, stripe_subscription_id: `sub_gone_${stamp}`, tier: 'horizon', status: 'active' }));
  r = await read(b);
  check('nor is a subscription Stripe no longer holds', r.held === false && (await refusedAs(() => turn(b, false))) === 'no_subscription', JSON.stringify(r));

  console.log('\nWhere Stripe cannot be read');
  const down = { subscriptions: { retrieve: async () => { throw new Error('Stripe is not answering'); } } };
  const failed = await readAutomaticPayments(c.own, down, { accountId: c.account.id }).then(() => 'answered', (e) => e.message);
  check('the read fails rather than guessing', failed === 'Stripe is not answering', failed);

  if (SERVER) {
    console.log(`\nThe Settings page on ${SERVER}`);
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
    try {
      const p = await signedInUser('p');
      const page = await browser.newPage();
      await page.setViewport({ width: 1100, height: 900 });
      const sel = '#automatic_payments_switch';
      const swAt = () => page.$eval(sel, (el) => ({ on: el.getAttribute('aria-checked') === 'true', disabled: el.disabled }));
      const stateShown = () => page.$eval('#automatic_payments_state', (el) => el.textContent.trim());
      const formText = () => page.$eval('#automatic_payments', (el) => el.innerText);
      const until = (fn, arg, timeout = 30000) => page.waitForFunction(fn, { timeout }, arg).then(() => true).catch(() => false);
      const untilSwitch = (want) => until(([s, w]) => {
        const el = document.querySelector(s);
        return el?.getAttribute('aria-checked') === String(w) && !el.disabled;
      }, [sel, want]);
      const settings = () => page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      const shot = async (name) => {
        if (!SHOTS) return;
        await page.$eval('#automatic_payments', (el) => el.scrollIntoView({ block: 'center' }));
        await new Promise((done) => setTimeout(done, 600));
        await page.screenshot({ path: `${SHOTS}/${name}.png` });
      };

      await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
      await page.type('#email', p.user.email);
      await page.type('#password', PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
      await settings();
      let s = await swAt();
      check('with no storage subscription the switch reads on, the default, and cannot be moved',
        s.on === true && s.disabled === true && (await stateShown()) === 'On', JSON.stringify(s));
      check('and the page says why', (await formText()).includes('begin with the first storage payment'));
      const label = await page.$eval(sel, (el) => document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
      check('the switch is named Automatic payments', label === 'Automatic payments', label);
      await shot('1-no-subscription');

      const cusP = await customerFor(p);
      const subP = await subscribe(cusP);
      await record(p, cusP, subP);
      await settings();
      s = await swAt();
      check('with a storage subscription it reads on and can be moved', s.on === true && s.disabled === false && (await stateShown()) === 'On', JSON.stringify(s));
      await shot('2-on');

      await page.click(sel);
      check('pressing it turns it off on the page', (await untilSwitch(false)) && (await stateShown()) === 'Off');
      check('and in Stripe', (await inStripe(subP)).collection_method === 'send_invoice');
      check('the page says what off means', (await formText()).includes('payment request on the due date'));
      await shot('3-off');
      await page.setViewport({ width: 390, height: 844 });
      await settings();
      s = await swAt();
      check('it still reads off when the page is opened again', s.on === false && s.disabled === false, JSON.stringify(s));
      await shot('4-off-phone-width');
      await page.setViewport({ width: 1100, height: 900 });
      await settings();

      await page.click(sel);
      check('pressing it again turns it on on the page', (await untilSwitch(true)) && (await stateShown()) === 'On');
      check('and in Stripe', (await inStripe(subP)).collection_method === 'charge_automatically');

      // The card is removed while the switch is off: on is refused, and says so.
      await page.click(sel);
      await untilSwitch(false);
      const fresh = await stripe.customers.retrieve(cusP.id);
      await stripe.paymentMethods.detach(fresh.invoice_settings.default_payment_method);
      await page.click(sel);
      const said = await until(() => document.querySelector('#automatic_payments')?.innerText.includes('need a saved payment method'));
      s = await swAt();
      check('with no saved payment method, turning it on is refused and the page says so', said && s.on === false, JSON.stringify(s));
      check('and Stripe still holds payment requests', (await inStripe(subP)).collection_method === 'send_invoice');
      await shot('5-refused');

      const ids = await page.$$eval('[role=switch]', (els) => els.map((el) => el.id));
      check('Settings holds two switches, each with its own name', ids.join() === 'text_switch,automatic_payments_switch', ids.join());
    } finally {
      await browser.close();
    }
  } else {
    console.log('\n(no --server: the Settings page was not exercised)');
  }
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  console.log('\nCleanup');
  let gone = 0;
  for (const id of customers) {
    const d = await stripe.customers.del(id).catch((e) => ({ deleted: false, why: e.message }));
    if (d.deleted) gone++; else console.log(`  could not delete Stripe customer ${id}: ${d.why}`);
  }
  const accounts = [];
  for (const uid of users) {
    const acct = must(await db.from('accounts').select('id').eq('user_id', uid))[0];
    if (acct) accounts.push(acct.id);
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const leftRows = accounts.length ? must(await db.from('subscriptions').select('id').in('account_id', accounts)) : [];
  const leftByCustomer = customers.length ? must(await db.from('subscriptions').select('id').in('stripe_customer_id', customers)) : [];
  console.log(`  ${users.length} test user(s) deleted; ${gone} of ${customers.length} sandbox customer(s) deleted with their subscriptions; left: ${leftRows.length + leftByCustomer.length} subscription row(s)`);
  if (gone !== customers.length || leftRows.length || leftByCustomer.length) fails++;
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
