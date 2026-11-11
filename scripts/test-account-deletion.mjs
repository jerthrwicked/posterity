#!/usr/bin/env node
// Posterity — account deletion and refunds
/*
Exercises account deletion against Stripe's sandbox and the live database with
throwaway signed-in users, and, with a local server, deletes an account from
the Settings page in a real browser.

  node scripts/test-account-deletion.mjs                    the library
  node scripts/test-account-deletion.mjs --server http://localhost:3011
                                                            plus the Settings page on that server

The server must run with the same Stripe test key, with a caller for what it
queues, and with senders, since a deletion's notices leave before the account
is removed. Postmark's own test token accepts a send and delivers nothing, and
no text is ever queued, so the Twilio values can be anything:
  DISPATCH_TEST_CALLER=test-account-deletion POSTMARK_SERVER_TOKEN=POSTMARK_API_TEST \
  TWILIO_ACCOUNT_SID=ACtest TWILIO_AUTH_TOKEN=test npx next dev -p 3011

What matters most:
  - deletion is open in the Horizon and Planning Phases only, and closed for
    thirty days after an account recovery
  - a plan paid within thirty days is refunded in full to the payment that
    paid it, once however often the deletion runs; one paid before that is
    not; a storage payment never is
  - the storage subscription ends and the account's Stripe customers go
  - every row and file tied to the account goes, and the sign-in with them
  - the event log stays, and gains the refunds and the deletion with a
    summary of what the account held, naming nobody else
  - the refund notice and the email confirming the deletion are sent before
    anything is removed; while one has still to go, nothing is removed
  - a deletion that stops partway carries on when it is run again
  - another customer's account, files, payments and messages are untouched

It refuses to run unless STRIPE_SECRET_KEY is a test key. The Stripe customers
it makes are sandbox customers, deleted at the end. The test users and their
files are deleted at the end. Rows it adds to the event log stay, as every row
there does, flagged as tests.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) and CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '../lib/posterity/plans.js';
import {
  planPayments, inRefundWindow, refundOwed, issueRefund, recordRefund, money, REFUND_WINDOW_DAYS, REFUND_COPY,
} from '../lib/posterity/refunds.js';
import {
  deleteAccount, deletionClosed, refundsOwedOnDeletion, accountFiles, accountHistory,
  DeletionRefused, DELETED_COPY, BUCKET,
} from '../lib/posterity/account-deletion.js';
import { deployChannels } from '../lib/dispatch/channels.js';
import { PURPOSES, CODE_COPY } from '../lib/auth/double-verification.js';

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
// What the server queues under, from its DISPATCH_TEST_CALLER.
const SERVER_CALLER = 'test-account-deletion';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const HORIZON = PLANS.horizon.priceId;
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const CALLER = `test-ad-${stamp}`;
const addr = (tag) => `test-ad-${stamp}-${tag}@yourposterity.com`;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRICE = { basic: 4900, premium: 12900 };
// Every table that holds rows by account, other than the event log.
const TABLES = [
  'account_phase_events', 'account_recoveries', 'checkin_notifications', 'checkins', 'content_items', 'deliveries',
  'dispatch_messages', 'legacies', 'legacy_guards', 'plans', 'recipients', 'recovery_emails', 'storage_fees',
  'subscriptions', 'text_switch_requests', 'trigger_confirmations', 'verification_codes',
];
// The smallest picture the bucket accepts.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

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
const accounts = [];
const customers = [];

async function signedInUser(tag) {
  const email = addr(tag);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Deletion Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id, name').eq('user_id', r.id).single());
  accounts.push(account.id);
  return { user: { id: r.id, email }, account, tag };
}

// The account's own Stripe customer, as the checkout route leaves it.
async function customerFor(who, { onAccount = true } = {}) {
  const cus = await stripe.customers.create({ email: who.user.email, metadata: { test: 'test-account-deletion' } });
  customers.push(cus.id);
  if (onAccount) must(await db.from('accounts').update({ stripe_customer_id: cus.id }).eq('id', who.account.id).select('id'));
  return cus;
}
// A payment as Checkout leaves one: paid by card, carrying the account and the
// plan in its details.
const pay = (cus, { accountId, plan, amount }) => stripe.paymentIntents.create({
  amount, currency: 'usd', customer: cus.id, payment_method: 'pm_card_visa', confirm: true,
  automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  metadata: { account_id: accountId, ...(plan ? { plan, tier: plan } : {}) },
});
// A storage subscription and the row the webhook writes for it.
async function subscribe(who, cus) {
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: cus.id });
  const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }], default_payment_method: pm.id });
  must(await db.from('subscriptions').insert({
    account_id: who.account.id, stripe_customer_id: cus.id, stripe_subscription_id: sub.id,
    stripe_price_id: HORIZON, tier: 'horizon', status: sub.status,
  }).select('id'));
  return sub;
}

// What an account holds before it is deleted: a recipient, a Legacy Guard, a
// plan with content, content on no plan, two check-ins, a line of phase
// history, and two files.
const NAMES = { recipient: 'Recipient Namedhere', guard: 'Guard Namedhere', title: 'A title kept private', body: 'A body kept private' };
async function fill(who, { phase = 'horizon' } = {}) {
  const id = who.account.id;
  if (phase !== 'horizon') must(await db.from('accounts').update({ phase }).eq('id', id).select('id'));
  const legacy = must(await db.from('legacies').select('id').eq('account_id', id).eq('is_primary', true).single());
  const recipient = must(await db.from('recipients').insert({ account_id: id, name: NAMES.recipient, email: `recipient-${stamp}@yourposterity.com` }).select('id').single());
  must(await db.from('legacy_guards').insert({ account_id: id, name: NAMES.guard, email: `guard-${stamp}@yourposterity.com`, phone: '+15045550123', is_primary: true }).select('id'));
  const plan = must(await db.from('plans').insert({ account_id: id, plan_year: 1, tier: 'basic', paid_at: new Date().toISOString() }).select('id').single());
  const paths = [`${id}/${legacy.id}/${randomUUID()}.png`, `${id}/${legacy.id}/${randomUUID()}.png`];
  for (const path of paths) must(await db.storage.from(BUCKET).upload(path, PNG, { contentType: 'image/png' }));
  const item = { legacy_id: legacy.id, account_id: id, title: NAMES.title, body: NAMES.body, recipient_id: recipient.id };
  must(await db.from('content_items').insert([
    { ...item, plan_id: plan.id, kind: 'message' },
    { ...item, plan_id: plan.id, kind: 'message' },
    { ...item, plan_id: plan.id, kind: 'photo', storage_path: paths[0], file_type: 'image/png', file_size_bytes: PNG.length },
    { ...item, kind: 'note' },
  ]).select('id'));
  must(await db.from('checkins').insert([
    { account_id: id, due_on: '2026-10-01', status: 'answered', answered_at: new Date().toISOString(), answered_via: 'email' },
    { account_id: id, due_on: '2027-01-01', status: 'due', answered_at: null, answered_via: null },
  ]).select('id'));
  must(await db.from('account_phase_events').insert({ account_id: id, from_phase: 'horizon', to_phase: 'planning', note: `test ${stamp}: first plan paid` }).select('id'));
  return { paths };
}

const count = async (table, accountId) => {
  const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true }).eq('account_id', accountId);
  if (error) throw error;
  return n;
};
const holdings = async (accountId) => Object.fromEntries(await Promise.all(TABLES.map(async (t) => [t, await count(t, accountId)])));
const events = (accountId, type) => db.from('dispatch_events').select().eq('account_id', accountId).eq('event_type', type).order('id').then(must);
const accountRow = (id) => db.from('accounts').select('id, phase').eq('id', id).maybeSingle().then(must);
const userExists = async (id) => (await rest(`/auth/v1/admin/users/${id}`))[0] === 200;
const canSignIn = async (email) => (await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email, password: PASSWORD } }))[0] === 200;
const customerGone = async (id) => (await stripe.customers.retrieve(id)).deleted === true;
const charge = async (intent) => (await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] })).latest_charge;
const refundsOn = async (intent) => (await stripe.refunds.list({ payment_intent: intent.id, limit: 100 })).data;

// Senders that send nothing and keep what they were handed. `email` may throw
// to stand in for a provider that fails.
function senders({ email } = {}) {
  const sent = [];
  return {
    sent,
    email: {
      async send({ message, rendered }) {
        if (email) await email({ message, rendered });
        sent.push({ to: message.destination, key: message.copy_key, subject: rendered.subject, text: rendered.text });
        return { providerMessageId: `test-${message.id}` };
      },
    },
    sms: { async send() { throw Object.assign(new Error('test: no text should be sent'), { retryable: false }); } },
  };
}
const outcome = async (fn) => { try { return { value: await fn() }; } catch (err) { return { err, reason: err instanceof DeletionRefused ? err.reason : null }; } };
const remove = (who, extra = {}) => deleteAccount(db, stripe, {
  accountId: who.account.id, user: who.user, caller: CALLER, refundCaller: CALLER, isTest: true, ...extra,
});
// A Stripe client whose one method fails, `times` times.
function failing(resource, method, times = Infinity) {
  let left = times;
  const broken = Object.create(stripe);
  broken[resource] = Object.create(stripe[resource]);
  broken[resource][method] = (...args) => {
    if (left-- > 0) return Promise.reject(new Error(`test: Stripe ${resource}.${method} failed`));
    return stripe[resource][method](...args);
  };
  return broken;
}

try {
  const copy = must(await db.from('dispatch_copy').select('key').in('key', [REFUND_COPY, DELETED_COPY]));
  const migrated = copy.length === 2;

  console.log('The rule');
  {
    const now = new Date('2026-11-11T12:00:00Z');
    const open = { phase: 'horizon', recovery_lock_until: null };
    check('deletion is open in Horizon and in Planning', deletionClosed(open, now) === null && deletionClosed({ ...open, phase: 'planning' }, now) === null);
    const later = ['interlude', 'active', 'reprise', 'posterity'].map((phase) => deletionClosed({ ...open, phase }, now));
    check('…and closed in every later phase', later.every((r) => r === 'phase'), later.join(','));
    check('closed while a recovery lock runs', deletionClosed({ ...open, recovery_lock_until: '2026-11-12T00:00:00Z' }, now) === 'recovery_lock');
    check('…and open once it has passed', deletionClosed({ ...open, recovery_lock_until: '2026-11-11T11:59:59Z' }, now) === null);
    check('an account whose status cannot be read is closed', deletionClosed(null, now) === 'no_account');

    const paid = (ms) => ({ amount: 4900, refunded: 0, paidAt: new Date(now.getTime() - ms) });
    check(`a payment is inside the window through day ${REFUND_WINDOW_DAYS}`, REFUND_WINDOW_DAYS === 30 && inRefundWindow(paid(30 * DAY_MS), now) && refundOwed(paid(30 * DAY_MS - 1000), now) === 4900);
    check('…and outside it a second later, when nothing is owed', !inRefundWindow(paid(30 * DAY_MS + 1000), now) && refundOwed(paid(30 * DAY_MS + 1000), now) === 0);
    check('what was already refunded is not owed again', refundOwed({ ...paid(DAY_MS), refunded: 1900 }, now) === 3000 && refundOwed({ ...paid(DAY_MS), refunded: 4900 }, now) === 0);
    check('an amount reads as money', money(4900) === '$49.00' && money(12900, 'usd') === '$129.00', money(4900));
    check('double verification knows the purpose', PURPOSES.has('account_deletion'));
    check('a deploy missing a sender key has no senders', deployChannels({ POSTMARK_SERVER_TOKEN: 'x', TWILIO_ACCOUNT_SID: 'x' }) === null && deployChannels({}) === null);
    const built = deployChannels({ POSTMARK_SERVER_TOKEN: 'x', TWILIO_ACCOUNT_SID: 'x', TWILIO_AUTH_TOKEN: 'x' });
    check('…and one holding all three has both', typeof built?.email?.send === 'function' && typeof built?.sms?.send === 'function');
  }

  console.log('\nFinding what was paid (Stripe sandbox)');
  const a = await signedInUser('a');
  const b = await signedInUser('b');
  const aFiles = await fill(a, { phase: 'planning' });
  const bFiles = await fill(b);
  const a1 = await customerFor(a);
  const a2 = await customerFor(a, { onAccount: false });
  const b1 = await customerFor(b);
  const aBasic = await pay(a1, { accountId: a.account.id, plan: 'basic', amount: PRICE.basic });
  const aSub = await subscribe(a, a1);
  const aStorage = await pay(a1, { accountId: a.account.id, amount: 999 });
  const aHorizon = await pay(a1, { accountId: a.account.id, plan: 'horizon', amount: 999 });
  const aOther = await pay(a1, { accountId: b.account.id, plan: 'basic', amount: PRICE.basic });
  await stripe.paymentIntents.create({ amount: PRICE.basic, currency: 'usd', customer: a1.id, metadata: { account_id: a.account.id, plan: 'basic' } });
  // A second customer the account paid through, named only on a row.
  must(await db.from('subscriptions').insert({ account_id: a.account.id, stripe_customer_id: a2.id, tier: 'premium', status: 'paid' }).select('id'));
  const aPremium = await pay(a2, { accountId: a.account.id, plan: 'premium', amount: PRICE.premium });
  const bBasic = await pay(b1, { accountId: b.account.id, plan: 'basic', amount: PRICE.basic });
  const bSub = await subscribe(b, b1);
  {
    const found = await planPayments(stripe, { accountId: a.account.id, customerIds: [a1.id, a2.id] });
    check('the plan payments are found across both of the account\'s customers, oldest first',
      found.length === 2 && found[0].paymentIntent === aBasic.id && found[1].paymentIntent === aPremium.id, JSON.stringify(found.map((f) => f.paymentIntent)));
    check('…each with its plan, its amount and when it was paid',
      found[0]?.plan === 'basic' && found[0]?.planName === 'Basic' && found[0]?.amount === PRICE.basic && found[1]?.amount === PRICE.premium
      && Math.abs(Date.now() - found[0]?.paidAt) < 10 * 60 * 1000);
    const ids = found.map((f) => f.paymentIntent);
    check('a storage payment is not one, whether it names no plan or names Horizon', !ids.includes(aStorage.id) && !ids.includes(aHorizon.id));
    check('…nor a payment carrying another account, nor one never completed', !ids.includes(aOther.id) && found.every((f) => f.amount > 0));

    const owed = await refundsOwedOnDeletion(db, stripe, { accountId: a.account.id });
    check('what deletion would refund is read from the account\'s own rows: both plans in full',
      owed.length === 2 && owed[0].amount === PRICE.basic && owed[1].amount === PRICE.premium && owed[1].planName === 'Premium', JSON.stringify(owed));
    const late = await refundsOwedOnDeletion(db, stripe, { accountId: a.account.id, now: new Date(Date.now() + 31 * DAY_MS) });
    check('…and nothing once thirty days have passed', late.length === 0, JSON.stringify(late));

    const gone = await stripe.customers.create({ email: addr('gone') });
    await pay(gone, { accountId: a.account.id, plan: 'basic', amount: PRICE.basic });
    await stripe.customers.del(gone.id);
    const r = await outcome(() => planPayments(stripe, { accountId: a.account.id, customerIds: [gone.id, 'cus_test_never_existed', a2.id] }));
    check('a customer Stripe no longer holds, or never held, stops nothing', !r.err && r.value?.some((f) => f.paymentIntent === aPremium.id), String(r.err?.message ?? r.value?.length));
    console.log(`    (a deleted customer's payments: ${r.value?.filter((f) => f.customer === gone.id).length ?? '-'} found)`);
  }

  console.log('\nWhat the account holds');
  {
    const files = await accountFiles(db, a.account.id);
    check('its files are found under its own folder', files.length === 2 && aFiles.paths.every((p) => files.includes(p)), JSON.stringify(files));
    const h = await accountHistory(db, a.account.id);
    check('the summary holds the phase history, the check-ins and the plans',
      h.phase_events.some((e) => e.note === `test ${stamp}: first plan paid`) && h.checkins.length === 2 && h.plans.length === 1 && h.account.phase === 'planning', JSON.stringify(h).slice(0, 300));
    check('…what each plan stored, by kind', h.plans[0]?.content?.items === 3 && h.plans[0]?.content?.kinds?.message === 2 && h.plans[0]?.content?.kinds?.photo === 1 && h.content_on_no_plan.items === 1, JSON.stringify(h.plans[0]?.content));
    check('…and how many recipients and Legacy Guards', h.recipients === 1 && h.legacy_guards.named === 1 && h.legacy_guards.accepted === 0);
    const text = JSON.stringify(h);
    check('it names no recipient and no Legacy Guard, and carries no content', !Object.values(NAMES).some((n) => text.includes(n)) && !text.includes(`recipient-${stamp}`) && !text.includes('+15045550123'));
  }

  console.log('\nRefused');
  {
    const c = await signedInUser('c');
    const cFiles = await fill(c, { phase: 'interlude' });
    const s = senders();
    let r = await outcome(() => remove(c, { channels: s }));
    check('an account in Interlude is refused', r.reason === 'phase', String(r.err?.message));
    must(await db.from('accounts').update({ phase: 'horizon', recovered_at: new Date().toISOString() }).eq('id', c.account.id).select('id'));
    r = await outcome(() => remove(c, { channels: s }));
    check('an account recovered today is refused', r.reason === 'recovery_lock', String(r.err?.message));
    must(await db.from('accounts').update({ recovered_at: new Date(Date.now() - 31 * DAY_MS).toISOString() }).eq('id', c.account.id).select('id'));
    const status = must(await db.rpc('account_status', { p_account_id: c.account.id }).maybeSingle());
    check('…and open again thirty-one days after it', deletionClosed(status) === null, JSON.stringify(status?.recovery_lock_until));
    must(await db.from('accounts').update({ recovered_at: new Date().toISOString() }).eq('id', c.account.id).select('id'));
    r = await outcome(() => remove(a, { user: c.user, channels: s }));
    check('one customer cannot delete another\'s account', r.reason === 'no_account', String(r.err?.message));
    r = await outcome(() => remove(a, { channels: null }));
    check('nothing starts without senders', !!r.err && r.reason === null && /senders/.test(r.err.message), String(r.err?.message));
    const left = await holdings(c.account.id);
    check('a refusal changes nothing: the account, its rows, its files and its sign-in stay',
      !!(await accountRow(c.account.id)) && left.recipients === 1 && left.plans === 1 && left.content_items === 4
      && (await accountFiles(db, c.account.id)).length === cFiles.paths.length && await userExists(c.user.id) && s.sent.length === 0, JSON.stringify(left));
    check('…and so does the account someone else tried to delete', !!(await accountRow(a.account.id)) && (await refundsOn(aBasic)).length === 0);
  }

  if (!migrated) {
    console.log('\nMigration 20261113000000_account_deletion is not applied: the deletion itself is not exercised.');
    fails++;
  } else {
    console.log('\nDeleting an account');
    {
      must(await db.from('dispatch_messages').insert({
        account_id: b.account.id, channel: 'email', destination: b.user.email, copy_key: CODE_COPY,
        params: { code: '000000', name: 'x' }, caller: `${CALLER}-bystander`, is_test: true,
      }).select('id'));
      const bBefore = await holdings(b.account.id);
      const aBefore = await holdings(a.account.id);
      const s = senders();
      const r = await outcome(() => remove(a, { channels: s, verificationId: 'test-verification' }));
      const done = r.value;
      check('the deletion runs to its end', !r.err, String(r.err?.message ?? r.err));
      check('it reports two refunds, one subscription ended and two files removed',
        done?.refunds.length === 2 && done?.subscriptionsEnded.length === 1 && done?.subscriptionsEnded[0] === aSub.id && done?.filesRemoved === 2, JSON.stringify(done ?? null).slice(0, 300));

      const [basic, premium] = [await charge(aBasic), await charge(aPremium)];
      check('each plan is refunded in full to the payment that paid it', basic.amount_refunded === PRICE.basic && premium.amount_refunded === PRICE.premium, `${basic.amount_refunded} ${premium.amount_refunded}`);
      const made = await refundsOn(aBasic);
      check('…by one refund that names the account and the reason', made.length === 1 && made[0].metadata.account_id === a.account.id && made[0].metadata.cause === 'account_deletion' && made[0].reason === 'requested_by_customer');
      const kept = [await charge(aStorage), await charge(aHorizon), await charge(aOther)];
      check('no storage payment is refunded, nor a payment carrying another account', kept.every((c) => c.amount_refunded === 0), kept.map((c) => c.amount_refunded).join(','));
      const subCharges = (await stripe.charges.list({ customer: a1.id, limit: 100 }).catch(() => ({ data: [] }))).data;
      check('the storage subscription is ended, its fee not refunded', (await stripe.subscriptions.retrieve(aSub.id)).status === 'canceled' && subCharges.filter((c) => c.amount === 999).every((c) => c.amount_refunded === 0));
      check('both of the account\'s Stripe customers are deleted', await customerGone(a1.id) && await customerGone(a2.id));

      const after = await holdings(a.account.id);
      check('the account is gone', !(await accountRow(a.account.id)));
      check(`…with every row tied to it, across ${TABLES.length} tables`, Object.values(after).every((n) => n === 0) && aBefore.content_items === 4 && aBefore.legacy_guards === 1,
        JSON.stringify(Object.fromEntries(Object.entries(after).filter(([, n]) => n))));
      check('…its files', (await accountFiles(db, a.account.id)).length === 0);
      check('…and its sign-in', !(await userExists(a.user.id)) && !(await canSignIn(a.user.email)));

      check('three emails went, all to the account\'s own address', s.sent.length === 3 && s.sent.every((m) => m.to === a.user.email), JSON.stringify(s.sent.map((m) => [m.to, m.key])));
      const notices = s.sent.filter((m) => m.key === REFUND_COPY).map((m) => m.text);
      check('a refund notice for each refund, naming its amount and its plan',
        notices.length === 2 && notices.some((t) => t.includes('$49.00') && t.includes('Basic')) && notices.some((t) => t.includes('$129.00') && t.includes('Premium')), JSON.stringify(notices).slice(0, 300));
      check('…and the email confirming the deletion', s.sent.filter((m) => m.key === DELETED_COPY).length === 1);

      const refunds = await events(a.account.id, 'refund');
      check('the event log keeps each refund: the payment, the amount, the plan, when it was paid and why',
        refunds.length === 2 && refunds.every((e) => e.outcome === 'issued' && e.destination === a.user.email && e.is_test && e.detail.cause === 'account_deletion' && e.detail.paid_at && e.detail.stripe_customer)
        && refunds.some((e) => e.detail.payment_intent === aBasic.id && e.detail.amount === PRICE.basic && e.detail.plan === 'basic' && e.detail.refund === made[0]?.id), JSON.stringify(refunds.map((e) => e.detail)).slice(0, 400));
      const [deleted, ...more] = await events(a.account.id, 'account_deleted');
      const d = deleted?.detail ?? {};
      check('…and the deletion, once', !!deleted && more.length === 0 && deleted.outcome === 'deleted' && deleted.destination === a.user.email && d.user_id === a.user.id && d.verification === 'test-verification');
      check('…with what it did: the refunds, the subscription ended, the customers, the files',
        d.refunds?.length === 2 && d.storage_subscriptions?.length === 1 && d.storage_subscriptions[0].subscription === aSub.id && !!d.storage_subscriptions[0].ended_at && d.stripe_customers?.length === 2 && d.files_removed === 2 && d.notices?.length === 3 && d.notices.every((n) => n.status === 'sent'), JSON.stringify({ ...d, history: undefined }).slice(0, 400));
      const h = d.history ?? {};
      check('…and what the account held: its phase history, check-ins, plans and what they stored',
        h.account?.phase === 'planning' && h.phase_events?.some((e) => e.note === `test ${stamp}: first plan paid`) && h.checkins?.length === 2
        && h.plans?.[0]?.content?.items === 3 && h.payments_recorded?.length === 2 && h.recipients === 1 && h.legacy_guards?.named === 1, JSON.stringify(h).slice(0, 400));
      const text = JSON.stringify(deleted ?? {});
      check('the record names nobody but the customer', !Object.values(NAMES).some((n) => text.includes(n)) && !text.includes(`recipient-${stamp}`) && !text.includes(`guard-${stamp}`));
      const sentEvents = await events(a.account.id, 'sent');
      check('the sends stay in the event log after the messages themselves are gone', sentEvents.length === 3 && after.dispatch_messages === 0, `${sentEvents.length}`);

      const bAfter = await holdings(b.account.id);
      check('another customer\'s account is untouched: its rows', JSON.stringify(bAfter) === JSON.stringify(bBefore) && bAfter.content_items === 4 && bAfter.dispatch_messages === 1, JSON.stringify(bAfter));
      check('…its files, its sign-in, its Stripe customer, its subscription and its payment',
        (await accountFiles(db, b.account.id)).length === bFiles.paths.length && await canSignIn(b.user.email) && !(await customerGone(b1.id))
        && (await stripe.subscriptions.retrieve(bSub.id)).status === 'active' && (await charge(bBasic)).amount_refunded === 0);
      check('…and it received nothing', !s.sent.some((m) => m.to === b.user.email) && (await events(b.account.id, 'refund')).length === 0);

      const again = await outcome(() => remove(a, { channels: s }));
      check('deleting it a second time finds no account', again.reason === 'no_account' && s.sent.length === 3, String(again.err?.message));
    }

    console.log('\nPaid more than thirty days ago');
    {
      const e = await signedInUser('e');
      const e1 = await customerFor(e);
      const ePaid = await pay(e1, { accountId: e.account.id, plan: 'basic', amount: PRICE.basic });
      const s = senders();
      const r = await outcome(() => remove(e, { channels: s, now: () => new Date(Date.now() + 31 * DAY_MS) }));
      check('the account is deleted', !r.err && !(await accountRow(e.account.id)), String(r.err?.message));
      check('…and nothing is refunded', r.value?.refunds.length === 0 && (await charge(ePaid)).amount_refunded === 0 && (await events(e.account.id, 'refund')).length === 0);
      check('…so the one email is the confirmation', s.sent.length === 1 && s.sent[0].key === DELETED_COPY, JSON.stringify(s.sent.map((m) => m.key)));
    }

    console.log('\nA notice that cannot go yet');
    {
      const f = await signedInUser('f');
      const fFiles = await fill(f);
      const f1 = await customerFor(f);
      const fPaid = await pay(f1, { accountId: f.account.id, plan: 'basic', amount: PRICE.basic });
      const fSub = await subscribe(f, f1);
      const down = senders({ email: async () => { throw new Error('test: provider is down'); } });
      let r = await outcome(() => remove(f, { channels: down }));
      check('the deletion stops and says the notices are waiting', r.reason === 'notices_waiting', String(r.err?.message));
      check('nothing is removed: the account, its rows, its files, its sign-in and its Stripe customer stay',
        !!(await accountRow(f.account.id)) && (await holdings(f.account.id)).content_items === 4 && (await accountFiles(db, f.account.id)).length === fFiles.paths.length
        && await canSignIn(f.user.email) && !(await customerGone(f1.id)) && (await events(f.account.id, 'account_deleted')).length === 0);
      check('…and its storage subscription runs on', (await stripe.subscriptions.retrieve(fSub.id)).status === 'active');
      check('the refund was issued, and its record kept', (await charge(fPaid)).amount_refunded === PRICE.basic && (await events(f.account.id, 'refund')).length === 1);
      const waiting = must(await db.from('dispatch_messages').select('status, copy_key, attempts').eq('account_id', f.account.id));
      check('both notices wait in the queue for their retry', waiting.length === 2 && waiting.every((m) => m.status === 'queued' && m.attempts === 1), JSON.stringify(waiting));

      const up = senders();
      r = await outcome(() => remove(f, { channels: up }));
      check('asked again at once, it stops again: the retry is not due, and no second refund is issued',
        r.reason === 'notices_waiting' && up.sent.length === 0 && (await refundsOn(fPaid)).length === 1 && (await events(f.account.id, 'refund')).length === 1, String(r.err?.message));

      // The retry's minute passes.
      must(await db.from('dispatch_messages').update({ next_attempt_at: new Date().toISOString() }).eq('account_id', f.account.id).select('id'));
      r = await outcome(() => remove(f, { channels: up }));
      check('once the notices can go, the same deletion finishes', !r.err && !(await accountRow(f.account.id)) && !(await userExists(f.user.id)) && await customerGone(f1.id), String(r.err?.message));
      check('…each notice sent once', up.sent.length === 2 && up.sent.filter((m) => m.key === REFUND_COPY).length === 1 && up.sent.filter((m) => m.key === DELETED_COPY).length === 1, JSON.stringify(up.sent.map((m) => m.key)));
      check('…one refund in all, and one record of it', (await refundsOn(fPaid)).length === 1 && (await charge(fPaid)).amount_refunded === PRICE.basic && (await events(f.account.id, 'refund')).length === 1);
      check('…its storage subscription ended, and its files gone', (await stripe.subscriptions.retrieve(fSub.id)).status === 'canceled' && (await accountFiles(db, f.account.id)).length === 0);
      const [deleted] = await events(f.account.id, 'account_deleted');
      check('…and the record holds the refund the first try issued', deleted?.detail.refunds?.length === 1 && deleted.detail.refunds[0].amount === PRICE.basic && deleted.detail.storage_subscriptions?.[0]?.subscription === fSub.id, JSON.stringify(deleted?.detail.refunds ?? null));
    }

    console.log('\nA notice its provider refuses for good');
    {
      const g = await signedInUser('g');
      const refused = senders({ email: async () => { throw Object.assign(new Error('test: address refused'), { retryable: false }); } });
      const r = await outcome(() => remove(g, { channels: refused }));
      check('the deletion goes ahead', !r.err && !(await accountRow(g.account.id)), String(r.err?.message));
      const failed = await events(g.account.id, 'failed');
      const [deleted] = await events(g.account.id, 'account_deleted');
      check('…and the event log holds the notice that failed and why', failed.length === 1 && failed[0].outcome === 'refused' && deleted?.detail.notices?.[0]?.status === 'failed', JSON.stringify(failed.map((e) => e.outcome)));
    }

    console.log('\nA refund Stripe refuses');
    {
      const h = await signedInUser('h');
      const hFiles = await fill(h);
      const h1 = await customerFor(h);
      const hPaid = await pay(h1, { accountId: h.account.id, plan: 'basic', amount: PRICE.basic });
      const hSub = await subscribe(h, h1);
      const s = senders();
      let r = await outcome(() => deleteAccount(db, failing('refunds', 'create'), { accountId: h.account.id, user: h.user, channels: s, caller: CALLER, refundCaller: CALLER, isTest: true }));
      check('the deletion fails', !!r.err && r.reason === null, String(r.err?.message));
      check('…with nothing changed: the account, its files, its subscription and its customer stay, and nothing is sent',
        !!(await accountRow(h.account.id)) && (await accountFiles(db, h.account.id)).length === hFiles.paths.length && (await stripe.subscriptions.retrieve(hSub.id)).status === 'active'
        && !(await customerGone(h1.id)) && s.sent.length === 0 && (await holdings(h.account.id)).dispatch_messages === 0 && (await events(h.account.id, 'refund')).length === 0);

      console.log('\nA fault after the files are removed');
      r = await outcome(() => deleteAccount(db, failing('customers', 'del', 1), { accountId: h.account.id, user: h.user, channels: s, caller: CALLER, refundCaller: CALLER, isTest: true }));
      check('the deletion fails partway, the account still held', !!r.err && r.reason === null && !!(await accountRow(h.account.id)) && await userExists(h.user.id), String(r.err?.message));
      check('…its refund issued, its notices sent, its files gone and the deletion recorded',
        (await charge(hPaid)).amount_refunded === PRICE.basic && s.sent.length === 2 && (await accountFiles(db, h.account.id)).length === 0 && (await events(h.account.id, 'account_deleted')).length === 1);
      r = await outcome(() => remove(h, { channels: s }));
      check('run again, it finishes', !r.err && !(await accountRow(h.account.id)) && !(await userExists(h.user.id)) && await customerGone(h1.id), String(r.err?.message));
      const [record] = await events(h.account.id, 'account_deleted');
      check('…the one record holding the subscription and the refund', record?.detail.storage_subscriptions?.[0]?.subscription === hSub.id && record.detail.refunds?.length === 1 && record.detail.files_removed === 2, JSON.stringify(record?.detail.storage_subscriptions ?? null));
      check('…with no second refund, no second notice and no second record',
        (await refundsOn(hPaid)).length === 1 && s.sent.length === 2 && (await events(h.account.id, 'account_deleted')).length === 1 && (await events(h.account.id, 'refund')).length === 1,
        `${s.sent.length} sent`);
    }

    console.log('\nA fault at the last step, after the Stripe customer is deleted');
    {
      const n = await signedInUser('n');
      await fill(n);
      const n1 = await customerFor(n);
      const nPaid = await pay(n1, { accountId: n.account.id, plan: 'basic', amount: PRICE.basic });
      await subscribe(n, n1);
      // A database client whose one call, deleting the sign-in, fails.
      const broken = Object.create(db);
      broken.auth = Object.create(db.auth);
      broken.auth.admin = Object.create(db.auth.admin);
      broken.auth.admin.deleteUser = async () => ({ data: null, error: new Error('test: the sign-in could not be deleted') });
      const s = senders();
      let r = await outcome(() => deleteAccount(broken, stripe, { accountId: n.account.id, user: n.user, channels: s, caller: CALLER, refundCaller: CALLER, isTest: true }));
      check('the deletion fails with the account still held and its Stripe customer gone',
        !!r.err && r.reason === null && !!(await accountRow(n.account.id)) && await userExists(n.user.id) && await customerGone(n1.id), String(r.err?.message));
      r = await outcome(() => remove(n, { channels: s }));
      check('run again, it finishes', !r.err && !(await accountRow(n.account.id)) && !(await userExists(n.user.id)), String(r.err?.message ?? JSON.stringify(r.err)));
      check('…with one refund, each notice once and one record',
        (await refundsOn(nPaid)).length === 1 && s.sent.length === 2 && (await events(n.account.id, 'account_deleted')).length === 1 && (await events(n.account.id, 'refund')).length === 1, `${s.sent.length} sent`);
    }

    console.log('\nA refund on its own (what a plan\'s move to a lower tier will ask for)');
    {
      const i = await signedInUser('i');
      const i1 = await customerFor(i);
      await pay(i1, { accountId: i.account.id, plan: 'premium', amount: PRICE.premium });
      const [payment] = await planPayments(stripe, { accountId: i.account.id, customerIds: [i1.id] });
      const payer = { email: i.user.email, name: 'Deletion Test' };
      const ask = (amount) => outcome(() => issueRefund(db, stripe, { accountId: i.account.id, payment, amount, cause: 'test_downgrade', payer, caller: CALLER, isTest: true }));
      let r = await ask(PRICE.premium + 1);
      check('more than the payment holds is refused', /more than is left/.test(r.err?.message ?? ''), String(r.err?.message));
      r = await ask(0);
      check('…and so is nothing', /above zero/.test(r.err?.message ?? ''), String(r.err?.message));
      const first = await ask(8000);
      const second = await ask(8000);
      check('the price difference is refunded', !first.err && first.value?.amount === 8000 && (await stripe.refunds.retrieve(first.value.refund)).amount === 8000, String(first.err?.message));
      check('…once, however often it is asked for', second.value?.refund === first.value?.refund && (await events(i.account.id, 'refund')).length === 1 && (await count('dispatch_messages', i.account.id)) === 1);
      const [queued] = must(await db.from('dispatch_messages').select('copy_key, destination, params, caller, status').eq('account_id', i.account.id));
      check('its notice is queued to whoever paid, with the amount and the plan', queued?.copy_key === REFUND_COPY && queued.destination === i.user.email && queued.params.amount === '$80.00' && queued.params.plan === 'Premium' && queued.status === 'queued', JSON.stringify(queued));
      const [now] = await planPayments(stripe, { accountId: i.account.id, customerIds: [i1.id] });
      check('what is left on the payment is what a later deletion would refund', refundOwed(now) === PRICE.premium - 8000, `${refundOwed(now)}`);

      // The database's rule, asked of it directly: the same record a second
      // time is refused, whoever writes it.
      const refundObject = await stripe.refunds.retrieve(first.value.refund);
      const again = await Promise.all([1, 2, 3, 4].map(() => outcome(() => recordRefund(db, { accountId: i.account.id, payment, refund: refundObject, cause: 'test_downgrade', payer, caller: CALLER, isTest: true }))));
      check('recorded four times at the same instant, the refund is still in the log once',
        again.every((a) => !a.err) && (await events(i.account.id, 'refund')).length === 1 && (await count('dispatch_messages', i.account.id)) === 1,
        again.map((a) => String(a.err?.message ?? 'ok')).join(' | '));
      const dupe = await db.from('dispatch_events').insert({ account_id: i.account.id, event_type: 'refund', destination: i.user.email, outcome: 'issued', detail: { refund: first.value.refund, cause: 'test_duplicate' }, is_test: true });
      check('…and a second refund record for the same refund is refused by the database', dupe.error?.code === '23505', JSON.stringify(dupe.error));
      const r2 = await outcome(() => remove(i, { channels: senders() }));
      const dupe2 = await db.from('dispatch_events').insert({ account_id: i.account.id, event_type: 'account_deleted', destination: i.user.email, outcome: 'deleted', detail: { requested_by: 'test_duplicate' }, is_test: true });
      check('a second deletion record for the same account is refused by the database',
        !r2.err && (await events(i.account.id, 'account_deleted')).length === 1 && dupe2.error?.code === '23505', `${String(r2.err?.message ?? 'deleted')} ${JSON.stringify(dupe2.error)}`);
    }

    if (SERVER) {
      console.log(`\nSettings on ${SERVER} (in a browser)`);
      const { default: puppeteer } = await import('puppeteer');
      const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
      try {
        const text = (page) => page.evaluate(() => document.body.innerText);
        const settle = (page, pattern) => page.waitForFunction((p) => new RegExp(p).test(document.body.innerText), { timeout: 30000 }, pattern).catch(() => {});
        const clickText = async (page, label, within = 'body') => {
          const els = await page.$$(`${within} button`);
          for (const el of els) {
            if ((await el.evaluate((n) => n.textContent.trim())) === label) {
              await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
              await el.click();
              return;
            }
          }
          throw new Error(`no button ${label}`);
        };
        const CARD = '[data-card="delete-account"]';
        const signIn = async (who) => {
          const context = await browser.createBrowserContext();
          const page = await context.newPage();
          await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
          await page.type('#email', who.user.email);
          await page.type('#password', PASSWORD);
          await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
          await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
          return page;
        };
        const codeFor = async (accountId) => must(await db.from('dispatch_messages').select('params, caller, destination')
          .eq('account_id', accountId).eq('copy_key', CODE_COPY).order('created_at', { ascending: false }).limit(1))[0];

        // Closed.
        const k = await signedInUser('k');
        must(await db.from('accounts').update({ phase: 'interlude' }).eq('id', k.account.id).select('id'));
        let page = await signIn(k);
        check('in Interlude the card says deletion is closed and offers nothing to press',
          !!(await page.$(`${CARD} [data-closed="phase"]`)) && (await page.$$(`${CARD} button`)).length === 0, (await text(page)).slice(-300));
        must(await db.from('accounts').update({ phase: 'horizon', recovered_at: new Date().toISOString() }).eq('id', k.account.id).select('id'));
        await page.reload({ waitUntil: 'networkidle0' });
        const until = new Date(Date.now() + 30 * DAY_MS).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        const lockNote = await page.$eval(`${CARD} [data-closed="recovery_lock"]`, (n) => n.textContent).catch(() => '');
        check('after a recovery it says until when, and offers nothing to press', lockNote.includes(until) && (await page.$$(`${CARD} button`)).length === 0, lockNote);
        await page.browserContext().close();

        // Open, then closed between the two steps.
        const m = await signedInUser('m');
        page = await signIn(m);
        await clickText(page, 'Delete account', CARD);
        await page.waitForSelector('#deletion_password');
        await page.type('#deletion_password', PASSWORD);
        await clickText(page, 'Send code', CARD);
        await page.waitForSelector('#deletion_code', { timeout: 30000 }).catch(() => {});
        must(await db.from('accounts').update({ phase: 'interlude' }).eq('id', m.account.id).select('id'));
        await page.type('#deletion_code', (await codeFor(m.account.id))?.params?.code ?? '');
        await clickText(page, 'Delete account', CARD);
        await settle(page, 'only during the Horizon and Planning Phases\\]\\s*$|error messages: the account can be deleted only');
        check('an account that left Planning before its code was entered is not deleted',
          (await text(page)).includes('error messages: the account can be deleted only during the Horizon and Planning Phases') && !!(await accountRow(m.account.id)) && await userExists(m.user.id)
          && (await events(m.account.id, 'account_deleted')).length === 0);
        await page.browserContext().close();

        // The deletion itself.
        const j = await signedInUser('j');
        const jFiles = await fill(j);
        const j1 = await customerFor(j);
        const jPaid = await pay(j1, { accountId: j.account.id, plan: 'basic', amount: PRICE.basic });
        const jSub = await subscribe(j, j1);
        page = await signIn(j);
        let t = await text(page);
        check('Settings shows the Delete account card, with what deleting does', !!(await page.$(CARD)) && t.includes('deleting the account removes everything it holds') && !(await page.$('#deletion_password')));
        await clickText(page, 'Delete account', CARD);
        await page.waitForSelector('#deletion_password');
        await clickText(page, 'Cancel', CARD);
        check('Cancel closes it again', !(await page.$('#deletion_password')));
        await clickText(page, 'Delete account', CARD);
        await page.waitForSelector('#deletion_password');
        await page.type('#deletion_password', 'not-it-999');
        await clickText(page, 'Send code', CARD);
        await settle(page, 'password re-entered for double verification is wrong');
        check('a wrong password is refused, and no code goes',
          (await text(page)).includes('the password re-entered for double verification is wrong') && (await count('verification_codes', j.account.id)) === 0);
        await page.$eval('#deletion_password', (el) => { el.value = ''; });
        await page.type('#deletion_password', PASSWORD);
        await clickText(page, 'Send code', CARD);
        await page.waitForSelector('#deletion_code', { timeout: 30000 }).catch(() => {});
        const sent = await codeFor(j.account.id);
        t = await text(page);
        check('the right password moves on to the code, sent to the account\'s address', !!(await page.$('#deletion_code')) && sent?.destination === j.user.email && t.includes(j.user.email), t.slice(-400));
        check('…queued under the server\'s test caller', sent?.caller === SERVER_CALLER, `${sent?.caller}`);
        const refundLine = await page.$eval(`${CARD} [data-refunds]`, (n) => n.textContent).catch(() => '');
        check('the code step says what will be refunded: $49.00 for the Basic plan', refundLine.includes('$49.00') && refundLine.includes('Basic'), refundLine);

        const good = sent?.params?.code ?? '', bad = good === '000000' ? '000001' : '000000';
        await page.type('#deletion_code', bad);
        await clickText(page, 'Delete account', CARD);
        await settle(page, 'confirmation code does not match');
        check('a wrong code is refused, the code step stays and nothing is deleted',
          (await text(page)).includes('the confirmation code does not match') && !!(await page.$('#deletion_code')) && !!(await accountRow(j.account.id)) && (await charge(jPaid)).amount_refunded === 0);

        await page.$eval('#deletion_code', (el) => { el.value = ''; });
        await page.type('#deletion_code', good);
        await Promise.all([
          page.waitForFunction(() => location.pathname === '/account-deleted', { timeout: 90000 }).catch(() => {}),
          clickText(page, 'Delete account', CARD),
        ]);
        await page.waitForNetworkIdle({ timeout: 15000 }).catch(() => {});
        t = await text(page);
        check('the right code deletes the account and lands on the page that says so', new URL(page.url()).pathname === '/account-deleted' && t.includes('the page shown once an account is deleted'), `${page.url()} ${t.slice(0, 300)}`);
        check('the account, its rows, its files and its sign-in are gone',
          !(await accountRow(j.account.id)) && Object.values(await holdings(j.account.id)).every((n) => n === 0) && (await accountFiles(db, j.account.id)).length === 0
          && jFiles.paths.length === 2 && !(await userExists(j.user.id)));
        check('the plan is refunded, the subscription ended and the Stripe customer deleted',
          (await charge(jPaid)).amount_refunded === PRICE.basic && (await stripe.subscriptions.retrieve(jSub.id)).status === 'canceled' && await customerGone(j1.id));
        const [deleted] = await events(j.account.id, 'account_deleted');
        const sends = await events(j.account.id, 'sent');
        check('the event log holds the deletion, flagged as a test, with the code that confirmed it',
          !!deleted && deleted.is_test === true && /^[0-9a-f-]{36}$/.test(deleted.detail.verification ?? '') && deleted.detail.history?.plans?.length === 1, JSON.stringify(deleted?.detail ?? null).slice(0, 200));
        check('…and the refund notice and the confirmation, sent through Postmark\'s test token',
          [REFUND_COPY, DELETED_COPY].every((key) => sends.some((e) => e.detail?.copy_key === key && e.provider_message_id && e.destination === j.user.email)) && deleted?.detail.notices?.length === 2 && deleted.detail.notices.every((n) => n.status === 'sent'),
          JSON.stringify(deleted?.detail.notices ?? null));

        await page.goto(`${SERVER}/dashboard`, { waitUntil: 'networkidle0' });
        check('the browser is signed out: the dashboard sends it to the sign-in page', new URL(page.url()).pathname === '/login', page.url());
        await page.type('#email', j.user.email);
        await page.type('#password', PASSWORD);
        await page.keyboard.press('Enter');
        await page.waitForNetworkIdle({ timeout: 15000 }).catch(() => {});
        check('…and signing in again is refused', new URL(page.url()).pathname === '/login' && !(await canSignIn(j.user.email)), page.url());
        await page.browserContext().close();
      } finally {
        await browser.close();
      }
    }
  }
} catch (err) {
  console.log(`\n  ✗ the run stopped: ${err?.stack ?? JSON.stringify(err)}`);
  fails++;
} finally {
  // Deleting a user by hand leaves their files, so those go first.
  for (const id of accounts) {
    try {
      const paths = await accountFiles(db, id);
      if (paths.length) await db.storage.from(BUCKET).remove(paths);
    } catch (err) { console.log(`  cleanup: files of ${id}: ${err.message}`); }
  }
  for (const id of users) await rest(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  for (const id of customers) await stripe.customers.del(id).catch(() => {});
  const left = must(await db.from('accounts').select('id').in('id', accounts.length ? accounts : ['00000000-0000-0000-0000-000000000000']));
  console.log(`\ncleanup: ${users.length} test users, ${customers.length} sandbox customers; ${left.length} accounts left behind`);
  if (left.length) fails++;
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
