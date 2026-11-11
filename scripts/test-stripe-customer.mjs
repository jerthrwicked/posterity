#!/usr/bin/env node
// Posterity — the account's Stripe customer
/*
Exercises the account's one Stripe customer against Stripe's sandbox and the
live database as real signed-in users. With a local server it also opens real
checkouts through the checkout route.

  node scripts/test-stripe-customer.mjs                       the library and the database
  node scripts/test-stripe-customer.mjs --server http://localhost:3011
                                                              plus the checkout route on that server

The server must run with the same Stripe test key:
  NEXT_PUBLIC_SITE_URL=http://localhost:3011 npx next dev -p 3011

What matters most:
  - an account is one customer within Stripe: the first checkout opens it,
    carrying the account, and every later checkout reuses it
  - two checkouts opened at once for a new account leave one customer, and
    the one that lost is deleted within Stripe rather than left behind
  - a customer deleted within Stripe is replaced at the next checkout
  - the customer's email address within Stripe follows the account's
  - only Posterity sets it: the signed-in customer cannot point their account
    at another Stripe customer, or clear it, and the rest of their details
    stay theirs to change
  - one Stripe customer belongs to one account
  - nobody reads another account's

It refuses to run unless STRIPE_SECRET_KEY is a test key. The Stripe customers
it makes are sandbox customers, deleted at the end, and the checkouts it opens
are closed. The test users are deleted at the end.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) and, with --server, CHROME_PATH if
Puppeteer's own Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { stripeCustomerFor } from '../lib/posterity/stripe-customer.js';

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

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-sc-${stamp}-${tag}@yourposterity.com`;

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
const emails = [];
const opened = [];

// A signed-in customer. `own` is their own session, under row-level security.
async function signedInUser(tag) {
  const email = addr(tag);
  emails.push(email);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Stripe Customer Test' } },
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
  return { user: { id: r.id, email }, account, own };
}

// The account's Stripe customer as the database holds it.
const held = async (who) => must(await db.from('accounts').select('stripe_customer_id').eq('id', who.account.id).single()).stripe_customer_id;
// Every customer Stripe holds under an address. One deleted is not among them.
const underAddress = async (email) => (await stripe.customers.list({ email, limit: 100 })).data;
const inStripe = (id) => stripe.customers.retrieve(id);
const forAccount = (who, email = who.user.email) => stripeCustomerFor(db, stripe, { accountId: who.account.id, userId: who.user.id, email });
const thrown = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

let browser;
try {
  console.log('The first checkout opens the customer');
  const a = await signedInUser('a');
  check('a new account holds no Stripe customer', (await held(a)) === null, String(await held(a)));
  const first = await forAccount(a);
  const cusA = await inStripe(first);
  check('the customer is opened within Stripe', /^cus_/.test(first) && cusA.deleted !== true, first);
  check('the account holds it', (await held(a)) === first, String(await held(a)));
  check('it carries the account and the login', cusA.metadata?.account_id === a.account.id && cusA.metadata?.user_id === a.user.id,
    JSON.stringify(cusA.metadata));
  check("it carries the account's email address", cusA.email === a.user.email, cusA.email);

  console.log('\nEvery later checkout reuses it');
  const second = await forAccount(a);
  check('the same customer comes back', second === first, second);
  check('Stripe holds one customer for the account', (await underAddress(a.user.email)).length === 1, String((await underAddress(a.user.email)).length));
  check('an account is required', (await thrown(() => stripeCustomerFor(db, stripe, { accountId: null, email: a.user.email })))?.message?.includes('account is required') === true);

  console.log('\nTwo checkouts opened at once');
  const b = await signedInUser('b');
  const [one, two] = await Promise.all([forAccount(b), forAccount(b)]);
  check('both are given the same customer', one === two && /^cus_/.test(one), `${one} ${two}`);
  check('the account holds it', (await held(b)) === one, String(await held(b)));
  const underB = await underAddress(b.user.email);
  check('the customer that lost is deleted within Stripe, not left behind', underB.length === 1 && underB[0].id === one,
    underB.map((c) => c.id).join(' '));

  console.log('\nThe email address follows the account');
  const moved = addr('a-moved');
  emails.push(moved);
  const third = await forAccount(a, moved);
  check('the same customer comes back', third === first, third);
  check('its address within Stripe is the new one', (await inStripe(first)).email === moved, (await inStripe(first)).email);
  check('no second customer was opened', (await underAddress(moved)).length === 1 && (await underAddress(a.user.email)).length === 0);

  console.log('\nA customer deleted within Stripe');
  await stripe.customers.del(first);
  const replaced = await forAccount(a, moved);
  check('is replaced by a new one', /^cus_/.test(replaced) && replaced !== first, replaced);
  check('the account holds the new one', (await held(a)) === replaced, String(await held(a)));
  check('the new one carries the account', (await inStripe(replaced)).metadata?.account_id === a.account.id);
  check('and the next checkout reuses it', (await forAccount(a, moved)) === replaced);

  console.log('\nOnly Posterity sets it');
  const mine = must(await a.own.from('accounts').select('stripe_customer_id').eq('id', a.account.id));
  check('the customer reads their own', mine.length === 1 && mine[0].stripe_customer_id === replaced, JSON.stringify(mine));
  const take = await a.own.from('accounts').update({ stripe_customer_id: one }).eq('id', a.account.id).select('id');
  check("the customer cannot point their account at another account's Stripe customer",
    take.error?.code === '42501' && (await held(a)) === replaced, `${take.error?.code ?? 'no error'} ${take.error?.message ?? ''}`);
  const invent = await a.own.from('accounts').update({ stripe_customer_id: 'cus_invented123' }).eq('id', a.account.id).select('id');
  check('or at one they made up', invent.error?.code === '42501' && (await held(a)) === replaced, `${invent.error?.code ?? 'no error'}`);
  const clear = await a.own.from('accounts').update({ stripe_customer_id: null }).eq('id', a.account.id).select('id');
  check('or clear it', clear.error?.code === '42501' && (await held(a)) === replaced, `${clear.error?.code ?? 'no error'}`);
  const rename = await a.own.from('accounts').update({ name: 'Stripe Customer Renamed' }).eq('id', a.account.id).select('name');
  check('their own details stay theirs to change', !rename.error && rename.data?.[0]?.name === 'Stripe Customer Renamed', rename.error?.message);

  console.log('\nOne Stripe customer, one account');
  const shared = await db.from('accounts').update({ stripe_customer_id: one }).eq('id', a.account.id).select('id');
  check('a customer one account holds cannot be written to another', shared.error?.code === '23505' && (await held(a)) === replaced,
    `${shared.error?.code ?? 'no error'}`);
  const shape = await db.from('accounts').update({ stripe_customer_id: 'not-a-customer' }).eq('id', a.account.id).select('id');
  check('anything that is not a Stripe customer id is refused', shape.error?.code === '23514' && (await held(a)) === replaced,
    `${shape.error?.code ?? 'no error'}`);

  console.log("\nAnother account's");
  const theirs = must(await b.own.from('accounts').select('id, stripe_customer_id').eq('id', a.account.id));
  check('is not read', theirs.length === 0, JSON.stringify(theirs));
  const theirsAll = must(await b.own.from('accounts').select('id, stripe_customer_id'));
  check('a customer reading every account sees their own alone', theirsAll.length === 1 && theirsAll[0].id === b.account.id && theirsAll[0].stripe_customer_id === one,
    JSON.stringify(theirsAll));
  const reach = await b.own.from('accounts').update({ name: 'Reached' }).eq('id', a.account.id).select('id');
  check('and is not changed', (reach.data ?? []).length === 0
    && must(await db.from('accounts').select('name').eq('id', a.account.id).single()).name === 'Stripe Customer Renamed');

  if (!SERVER) {
    console.log('\nThe checkout route: skipped, no --server');
  } else {
    console.log('\nThe checkout route');
    const { default: puppeteer } = await import('puppeteer');
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
    const started = Math.floor(Date.now() / 1000) - 60;
    const c = await signedInUser('c');
    const page = await browser.newPage();
    await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.type('#email', c.user.email);
    await page.type('#password', PASSWORD);
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 }), page.keyboard.press('Enter')]);
    const checkout = (plan) => page.evaluate(async (p) => {
      const r = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: p }) });
      return { status: r.status, ...(await r.json().catch(() => ({}))) };
    }, plan);
    const sessionsOf = async (who) => (await stripe.checkout.sessions.list({ limit: 100, created: { gte: started } })).data
      .filter((s) => s.client_reference_id === who.account.id);

    const both = await Promise.all([checkout('horizon'), checkout('basic')]);
    check('two checkouts opened at once both open', both.every((r) => r.status === 200 && r.url?.startsWith('https://checkout.stripe.com/')),
      JSON.stringify(both.map((r) => r.status)));
    const later = await checkout('premium');
    check('and so does a later one', later.status === 200 && later.url?.startsWith('https://checkout.stripe.com/'), String(later.status));
    const sessions = await sessionsOf(c);
    for (const s of sessions) opened.push(s.id);
    const heldC = await held(c);
    check('the account holds one Stripe customer', /^cus_/.test(heldC ?? ''), String(heldC));
    check('all three checkouts belong to it', sessions.length === 3 && sessions.every((s) => s.customer === heldC),
      sessions.map((s) => s.customer).join(' '));
    check('each still carries the account and its plan', ['horizon', 'basic', 'premium'].every((plan) => sessions.some((s) => s.metadata?.plan === plan && s.metadata?.account_id === c.account.id)));
    check('Stripe holds one customer for the account', (await underAddress(c.user.email)).length === 1, String((await underAddress(c.user.email)).length));

    const out = await (await browser.createBrowserContext()).newPage();
    await out.goto(`${SERVER}/login`, { waitUntil: 'networkidle0', timeout: 120000 });
    const refused = await out.evaluate(async () => (await fetch('/api/create-checkout-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'horizon' }),
    })).status);
    check('with no customer signed in, no checkout opens', refused === 401, String(refused));
  }
} catch (e) {
  console.log(`  ✗ stopped: ${e.message}`);
  fails++;
} finally {
  if (browser) await browser.close();
  console.log('\nCleanup');
  for (const id of opened) await stripe.checkout.sessions.expire(id).catch(() => {});
  let gone = 0, left = 0;
  for (const email of emails) {
    for (const cus of await underAddress(email)) {
      const del = await stripe.customers.del(cus.id).catch((e) => ({ deleted: false, why: e.message }));
      if (del.deleted) gone++; else console.log(`  could not delete Stripe customer ${cus.id}: ${del.why}`);
    }
    left += (await underAddress(email)).length;
  }
  for (const uid of users) {
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const leftAccounts = users.length ? must(await db.from('accounts').select('id').in('user_id', users)) : [];
  console.log(`  ${users.length} test user(s) deleted; ${gone} sandbox customer(s) deleted; left: ${left} sandbox customer(s), ${leftAccounts.length} account(s)`);
  if (left || leftAccounts.length) fails++;
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
