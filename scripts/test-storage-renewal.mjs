#!/usr/bin/env node
// Posterity — storage renewal, Stripe test mode, on test clocks
/*
Runs the Horizon storage subscription forward through its renewals on Stripe test
clocks, which move a sandbox customer's time a year at a stroke without waiting.

What matters most:
  - with automatic payments on, the default, a renewal charges the saved card
    and the paid year begins exactly where the last one ended
  - a renewal charge that fails is tried once more, three days after the first
    attempt, and not again (Master Specification, Storage Lapse Grace Period)
  - with automatic payments off, a renewal charges nothing and leaves a payment
    request due the same day, and paying it renews the year
  - turning automatic payments back on charges the next renewal, and turning
    them on with no saved card is refused
  - storage years paid in advance are years: each one is a renewal that charges
    nothing, more bought partway are added after them, one payment applied twice
    adds its years once, and afterward automatic payments or payment requests
    resume as the customer left them
  - ending the subscription at Interlude ends any unused prepaid years

The retry checks read Stripe's retry setting, which lives in the dashboard
(Billing, then Revenue recovery, then Retries) and cannot be set through the API,
so they fail until that setting reads one retry three days on, with the
subscription marked unpaid, which pauses it, once the retry fails.

Refuses to run unless STRIPE_SECRET_KEY is a test key. Each scenario runs on its
own test clock, and deleting the clock at the end deletes its customers and
subscriptions with it. Nothing is written to Supabase.

Run: node scripts/test-storage-renewal.mjs
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import Stripe from 'stripe';
import { PLANS } from '../lib/posterity/plans.js';
import { setAutomaticPayments, automaticPaymentsOn, prepayYears } from '../lib/posterity/storage-billing.js';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.log('STRIPE_SECRET_KEY is not a test key. Not running.');
  process.exit(1);
}
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const HORIZON = PLANS.horizon.priceId;
const DAY = 86400;

let fails = 0;
async function refused(fn) { try { await fn(); return false; } catch { return true; } }
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);
const periodOf = (sub) => ({ start: sub.items.data[0].current_period_start, end: sub.items.data[0].current_period_end });

// Moves a clock to `to` and waits until Stripe has run everything due by then.
async function advance(clock, to) {
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: to });
  for (let i = 0; i < 90; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (c.status === 'ready') return;
    if (c.status === 'internal_failure') throw new Error(`test clock ${clock.id} failed to advance`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`test clock ${clock.id} still advancing after three minutes`);
}

async function customer(clock, paymentMethod) {
  return stripe.customers.create({
    test_clock: clock.id,
    email: `storage-renewal-${clock.id.slice(-6)}@yourposterity.com`,
    ...(paymentMethod ? { payment_method: paymentMethod, invoice_settings: { default_payment_method: paymentMethod } } : {}),
  });
}

const invoicesOf = async (sub) => (await stripe.invoices.list({ subscription: sub.id, limit: 10 })).data;
const renewalOf = async (sub) => (await invoicesOf(sub)).find((i) => i.billing_reason === 'subscription_cycle');

// Each scenario runs on its own clock, so the three run side by side. The
// lines each prints are held and shown together, in order, once all finish.
async function scenario(name, body) {
  const lines = [];
  const say = (s) => lines.push(s);
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `storage-renewal ${name}` });
  try {
    await body(clock, say);
  } catch (err) {
    say(`  ✗ test stopped: ${err.message}`);
    fails++;
  } finally {
    await stripe.testHelpers.testClocks.del(clock.id).catch(() => {});
  }
  return [name, lines];
}

// Each scenario collects its checks through say(), since the three interleave.
function checker(say) {
  return (label, cond, detail = '') => {
    say((cond ? '  ✓ ' : '  ✗ ') + label + (detail && !cond ? `  [${detail}]` : ''));
    if (!cond) fails++;
  };
}

const results = await Promise.all([
  scenario('A renewal by automatic payment', async (clock, say) => {
    const ok = checker(say);
    const cus = await customer(clock, 'pm_card_visa');
    const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }] });
    ok('the storage subscription opens with automatic payments on', sub.status === 'active' && automaticPaymentsOn(sub), sub.status);
    const first = periodOf(sub);

    await advance(clock, first.end + DAY);
    const renewed = await stripe.subscriptions.retrieve(sub.id);
    const inv = await renewalOf(sub);
    ok('the renewal charged the saved card for the year', inv?.status === 'paid' && inv.amount_paid === 999 && inv.attempt_count === 1,
      JSON.stringify({ status: inv?.status, paid: inv?.amount_paid, attempts: inv?.attempt_count }));
    const next = periodOf(renewed);
    ok('the new year begins where the last one ended, and runs a year',
      renewed.status === 'active' && next.start === first.end && day(next.end) > day(first.end + 364 * DAY) && day(next.end) < day(first.end + 367 * DAY),
      `${day(first.end)} → ${day(next.start)}–${day(next.end)}`);
  }),

  scenario('B a renewal charge that fails', async (clock, say) => {
    const ok = checker(say);
    const cus = await customer(clock, 'pm_card_visa');
    const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }] });
    // A card that saves but declines every charge, made the default before renewal.
    const failing = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: cus.id });
    await stripe.customers.update(cus.id, { invoice_settings: { default_payment_method: failing.id } });
    const first = periodOf(sub);

    await advance(clock, first.end + DAY);
    let inv = await renewalOf(sub);
    ok('the renewal charge is attempted and declined, and the bill stays open',
      inv?.status === 'open' && inv.attempt_count === 1, JSON.stringify({ status: inv?.status, attempts: inv?.attempt_count }));
    const firstTry = inv?.status_transitions?.finalized_at ?? first.end;
    const gap = inv?.next_payment_attempt ? (inv.next_payment_attempt - firstTry) / DAY : null;
    ok('one retry is set for three days after the first attempt',
      gap !== null && gap > 2.5 && gap < 3.5, gap === null ? 'no retry scheduled' : `retry ${gap.toFixed(1)} days later`);

    await advance(clock, first.end + 5 * DAY);
    inv = await stripe.invoices.retrieve(inv.id);
    ok('the retry was made and declined', inv.attempt_count === 2 && inv.status === 'open',
      JSON.stringify({ status: inv.status, attempts: inv.attempt_count }));
    ok('and no further attempt is scheduled', !inv.next_payment_attempt,
      inv.next_payment_attempt ? `next attempt ${day(inv.next_payment_attempt)}` : '');

    await advance(clock, first.end + 40 * DAY);
    inv = await stripe.invoices.retrieve(inv.id);
    const after = await stripe.subscriptions.retrieve(sub.id);
    ok('a month on, nothing more was tried and the subscription is paused, not cancelled',
      inv.attempt_count === 2 && after.status === 'unpaid',
      JSON.stringify({ attempts: inv.attempt_count, subscription: after.status }));
  }),

  scenario('D storage years paid in advance', async (clock, say) => {
    const ok = checker(say);
    const cus = await customer(clock, 'pm_card_visa');
    const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }] });
    const first = periodOf(sub);

    ok('refused without a whole number of years', await refused(() => prepayYears(stripe, sub.id, 0, 'test-none')));
    await prepayYears(stripe, sub.id, 2, 'test-pay-1');

    // Year by year: the two bought, one more bought partway, then a charge.
    let end = first.end;
    const renewals = [];
    for (let year = 1; year <= 4; year++) {
      await advance(clock, end + DAY);
      if (year === 1) {
        await prepayYears(stripe, sub.id, 1, 'test-pay-2');
        await prepayYears(stripe, sub.id, 1, 'test-pay-2'); // the same payment again
      }
      const now = await stripe.subscriptions.retrieve(sub.id);
      const inv = (await invoicesOf(sub)).filter((i) => i.billing_reason === 'subscription_cycle').sort((a, b) => b.created - a.created)[0];
      renewals.push({ year, start: periodOf(now).start, status: inv?.status, total: inv?.total, paid: inv?.amount_paid, attempts: inv?.attempt_count, sub: now.status, before: end });
      end = periodOf(now).end;
    }
    const [y1, y2, y3, y4] = renewals;
    const freeYear = (r) => r.status === 'paid' && r.total === 0 && r.attempts === 0 && r.sub === 'active' && r.start === r.before;
    ok('the first prepaid renewal charges nothing and renews the year', freeYear(y1), JSON.stringify(y1));
    ok('so does the second', freeYear(y2), JSON.stringify(y2));
    ok('a year bought partway through is added after them, once though its payment came twice', freeYear(y3), JSON.stringify(y3));
    ok('then automatic payments resume and charge the saved card', y4.status === 'paid' && y4.paid === 999 && y4.sub === 'active', JSON.stringify(y4));
    ok('the renewal date never moved', renewals.every((r) => day(r.start).slice(5) === day(first.end).slice(5)),
      renewals.map((r) => day(r.start)).join(', '));
  }),

  scenario('E prepaid years with automatic payments off, and Interlude', async (clock, say) => {
    const ok = checker(say);
    const cus = await customer(clock, 'pm_card_visa');
    const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }] });
    const first = periodOf(sub);
    await prepayYears(stripe, sub.id, 1, 'test-pay-1');
    const off = await setAutomaticPayments(stripe, sub.id, false);
    ok('automatic payments turn off while prepaid years are held', !automaticPaymentsOn(off), off.collection_method);

    await advance(clock, first.end + DAY);
    let inv = await renewalOf(sub);
    ok('the prepaid renewal needs no payment request', inv?.status === 'paid' && inv.total === 0,
      JSON.stringify({ status: inv?.status, total: inv?.total }));
    const mid = await stripe.subscriptions.retrieve(sub.id);
    ok('and automatic payments are still off after it', !automaticPaymentsOn(mid), mid.collection_method);

    await advance(clock, periodOf(mid).end + 2 * 3600);
    inv = (await invoicesOf(sub)).filter((i) => i.billing_reason === 'subscription_cycle').sort((a, b) => b.created - a.created)[0];
    ok('once the prepaid year is used, the renewal sends a payment request',
      inv?.status === 'open' && inv.collection_method === 'send_invoice' && inv.amount_due === 999 && inv.attempt_count === 0,
      JSON.stringify({ status: inv?.status, method: inv?.collection_method, due: inv?.amount_due }));

    // A second customer prepays three years and the account then enters Interlude.
    const other = await customer(clock, 'pm_card_visa');
    const otherSub = await stripe.subscriptions.create({ customer: other.id, items: [{ price: HORIZON }] });
    const schedule = await prepayYears(stripe, otherSub.id, 3, 'test-pay-3');
    const ended = await stripe.subscriptions.cancel(otherSub.id);
    const after = await stripe.subscriptionSchedules.retrieve(schedule.id);
    ok('ending the subscription at Interlude ends its unused prepaid years with it',
      ended.status === 'canceled' && ['canceled', 'released', 'completed'].includes(after.status),
      JSON.stringify({ subscription: ended.status, schedule: after.status }));
  }),

  scenario('C automatic payments off, then back on', async (clock, say) => {
    const ok = checker(say);
    const cus = await customer(clock, 'pm_card_visa');
    const sub = await stripe.subscriptions.create({ customer: cus.id, items: [{ price: HORIZON }] });
    const first = periodOf(sub);

    const off = await setAutomaticPayments(stripe, sub.id, false);
    ok('turning automatic payments off keeps the subscription and its renewal date',
      !automaticPaymentsOn(off) && off.status === 'active' && periodOf(off).end === first.end, JSON.stringify({ method: off.collection_method, status: off.status }));

    await advance(clock, first.end + 2 * 3600);
    let inv = await renewalOf(sub);
    ok('the renewal charged nothing and sent a payment request for the year',
      inv?.status === 'open' && inv.collection_method === 'send_invoice' && inv.amount_due === 999 && inv.attempt_count === 0 && !inv.charge,
      JSON.stringify({ status: inv?.status, method: inv?.collection_method, due: inv?.amount_due, attempts: inv?.attempt_count }));
    ok('due on the renewal date', inv?.due_date && day(inv.due_date) === day(first.end),
      inv?.due_date ? `due ${day(inv.due_date)}, renewal ${day(first.end)}` : 'no due date');

    // The customer pays the request.
    inv = await stripe.invoices.pay(inv.id, { payment_method: cus.invoice_settings.default_payment_method });
    const paid = await stripe.subscriptions.retrieve(sub.id);
    ok('paying it renews the year from the same date',
      inv.status === 'paid' && paid.status === 'active' && periodOf(paid).start === first.end,
      JSON.stringify({ invoice: inv.status, subscription: paid.status }));

    const on = await setAutomaticPayments(stripe, sub.id, true);
    ok('turning automatic payments back on', automaticPaymentsOn(on));
    const second = periodOf(on);
    await advance(clock, second.end + DAY);
    const all = (await invoicesOf(sub)).filter((i) => i.billing_reason === 'subscription_cycle');
    const latest = all.sort((a, b) => b.created - a.created)[0];
    ok('charges the next renewal to the saved card',
      all.length === 2 && latest.status === 'paid' && latest.collection_method === 'charge_automatically' && latest.amount_paid === 999,
      JSON.stringify({ renewals: all.length, status: latest?.status, method: latest?.collection_method }));

    // A customer who pays by request with no card saved.
    const bare = await customer(clock, null);
    const bareSub = await stripe.subscriptions.create({
      customer: bare.id, items: [{ price: HORIZON }], collection_method: 'send_invoice', days_until_due: 0,
    });
    ok('turning automatic payments on with no saved card is refused',
      await refused(() => setAutomaticPayments(stripe, bareSub.id, true)));
    ok('and the subscription stays on payment requests',
      !automaticPaymentsOn(await stripe.subscriptions.retrieve(bareSub.id)));
  }),
]);

for (const [name, lines] of results) {
  console.log(`\n${name}`);
  for (const line of lines) console.log(line);
}
console.log('\n(each scenario\'s test clock was deleted, with its customers and subscriptions)');

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
