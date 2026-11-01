#!/usr/bin/env node
// Posterity — Communication Dispatch System send-loop test
/*
Runs the enqueue helper and the scheduler's pass against the live database,
with stand-in senders in place of Postmark and Twilio, so nothing is delivered
and no keys are needed.

What matters most:
  - a message is sent once, never twice, even with two passes running at once
  - a failure that may pass is retried, then given up and recorded as exhausted
  - a failure no retry can fix (no agreement, a stopped number, copy that cannot
    render, an address refused) fails at once, without spending retries
  - a text outside its sending window waits, and is not an attempt
  - the frame, or another channel's copy, is refused at enqueue

Its messages carry the caller 'test-dispatch-run', and each pass claims only
those, so a real message queued meanwhile is left to the live scheduler, which
in turn leaves these alone (20261101020000). Every row it writes is flagged
is_test; its events stay in the append-only log permanently.

Run: node scripts/test-dispatch-run.mjs
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { enqueue } from '../lib/dispatch/enqueue.js';
import { runPass } from '../lib/dispatch/run.js';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

let fails = 0;
function check(label, cond, detail = '') {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail && !cond ? `  [${detail}]` : ''));
  if (!cond) fails++;
}
async function refused(fn) { try { await fn(); return false; } catch { return true; } }

// Stand-in senders. Each records what it was asked to send; an address or
// number can be set to fail.
const sends = [];
const behaviour = new Map(); // destination -> 'refuse' | 'flaky' | 'slow'
function sender(channel) {
  return {
    async send({ message, rendered }) {
      const b = behaviour.get(message.destination);
      if (b === 'slow') await new Promise((r) => setTimeout(r, 150));
      sends.push({ id: message.id, channel, rendered });
      if (b === 'refuse') throw Object.assign(new Error('provider refused the address'), { retryable: false });
      if (b === 'flaky') throw new Error('provider timed out');
      return { providerMessageId: `test-${channel}-${message.id}` };
    },
  };
}
const channels = { email: sender('email'), sms: sender('sms') };
const sentCount = (id) => sends.filter((s) => s.id === id).length;

const row = async (id) => must(await db.from('dispatch_messages').select().eq('id', id).single());
const events = async (id) => must(await db.from('dispatch_events').select('event_type,outcome,detail,provider_message_id,is_test').eq('message_id', id).order('id'));
const types = (evs) => evs.map((e) => e.event_type).join(',');

// Channel policy reads the clock it is given. A send runs at 2 PM Eastern today
// (11 AM Pacific, inside every US window); a hold runs at 3 AM Eastern tomorrow,
// so the time it waits for is still ahead of the real clock.
const today = new Date();
const at = (dayOffset, utcHour) => () => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + dayOffset, utcHour));
const DAYTIME = at(0, 18), NIGHT = at(1, 7);

const run = Date.now().toString(36);
const EMAIL_KEY = `test.run.${run}.email`, SMS_KEY = `test.run.${run}.sms`, BROKEN_KEY = `test.run.${run}.broken`;
const AGREED = '+15005550006', STOPPED = '+15005550009', NONE = '+15005550004';
let uid = null, newPhones = [];
const CALLER = 'test-dispatch-run';

try {
  const created = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `dispatch-run-${run}@posterity.app`, password: `x-${run}-${Math.random()}`, email_confirm: true, user_metadata: { legal_name: 'Dispatch Run Test' } }),
  }).then((r) => r.json());
  uid = created.id;
  if (!uid) throw new Error('could not create the test user');
  const accountId = must(await db.from('accounts').select('id').eq('user_id', uid).single()).id;
  const base = { accountId, caller: CALLER, isTest: true };

  must(await db.from('dispatch_copy').insert([
    { key: EMAIL_KEY, channel: 'email', subject: 'A note for {{name}}', text_body: 'Hello {{name}}.\n\nThis is a test.' },
    { key: SMS_KEY, channel: 'sms', sms_body: 'Hello {{name}}, this is a test.' },
    { key: BROKEN_KEY, channel: 'email', subject: 'S', text_body: 'Hello {{nobody_fills_this}}' },
  ]));
  const before = new Set(must(await db.from('text_agreements').select('phone').in('phone', [AGREED, STOPPED])).map((a) => a.phone));
  newPhones = [AGREED, STOPPED].filter((p) => !before.has(p));
  must(await db.rpc('dispatch_record_agreement', { p_phone: AGREED, p_account_id: accountId, p_is_test: true }));
  must(await db.rpc('dispatch_record_stop', { p_phone: STOPPED, p_via: 'test', p_account_id: accountId, p_is_test: true }));

  console.log('Enqueue');
  const both = await enqueue(db, { ...base, email: `both-${run}@example.com`, phone: AGREED,
    copy: { email: EMAIL_KEY, sms: SMS_KEY }, params: { name: 'Ana' }, idempotencyKey: `both-${run}` });
  check('an email and a number queue two messages, email first',
    both.length === 2 && both[0].channel === 'email' && both[1].channel === 'sms' && both.every((m) => m.status === 'queued'));
  const again = await enqueue(db, { ...base, email: `both-${run}@example.com`, phone: AGREED,
    copy: { email: EMAIL_KEY, sms: SMS_KEY }, params: { name: 'Ana' }, idempotencyKey: `both-${run}` });
  check('enqueueing again with the same key returns the same two messages',
    again.map((m) => m.id).join() === both.map((m) => m.id).join());
  const mine = must(await db.from('dispatch_messages').select('id').eq('account_id', accountId));
  check('and adds nothing to the queue', mine.length === 2, `${mine.length} rows`);
  check('the frame cannot be queued as a message',
    await refused(() => enqueue(db, { ...base, email: 'x@example.com', copy: { email: 'email.frame' } })));
  check('text copy cannot be queued as an email',
    await refused(() => enqueue(db, { ...base, email: 'x@example.com', copy: { email: SMS_KEY } })));
  check('copy that does not exist cannot be queued',
    await refused(() => enqueue(db, { ...base, email: 'x@example.com', copy: { email: 'no.such.key' } })));
  check('a number not in +1 5045551234 form is refused',
    await refused(() => enqueue(db, { ...base, phone: '504-555-1234', copy: { sms: SMS_KEY } })));
  check('a message with neither an address nor a number is refused',
    await refused(() => enqueue(db, { ...base, copy: { email: EMAIL_KEY } })));
  check('runPass refuses to run without both senders',
    await refused(() => runPass(db, { caller: CALLER, channels: { email: channels.email } })));

  console.log('\nA pass sends what is due');
  let tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  check('the pass claimed and sent both', tally.claimed === 2 && tally.sent === 2, JSON.stringify(tally));
  for (const m of both) {
    const r = await row(m.id), evs = await events(m.id);
    check(`the ${m.channel} is marked sent, once, with the provider's id`,
      r.status === 'sent' && r.attempts === 1 && r.sent_at && r.provider_message_id === `test-${m.channel}-${m.id}` && sentCount(m.id) === 1,
      JSON.stringify({ status: r.status, attempts: r.attempts, n: sentCount(m.id) }));
    check(`the ${m.channel}'s log reads queued, attempt, sent, all flagged test`,
      types(evs) === 'queued,attempt,sent' && evs.every((e) => e.is_test), types(evs));
  }
  const email = sends.find((s) => s.id === both[0].id).rendered;
  check('the email went out rendered, in the frame, with its plain text',
    email.subject === 'A note for Ana' && email.html.includes('Hello Ana.') && email.html.includes('[Placeholder:') && email.text.startsWith('Hello Ana.'));
  check('the text went out rendered', sends.find((s) => s.id === both[1].id).rendered.body === 'Hello Ana, this is a test.');
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  check('a second pass finds nothing left to send', tally.claimed === 0, JSON.stringify(tally));

  console.log('\nFailures no retry can fix');
  const [noAgreement] = await enqueue(db, { ...base, phone: NONE, copy: { sms: SMS_KEY }, params: { name: 'Ana' } });
  const [stopped] = await enqueue(db, { ...base, phone: STOPPED, copy: { sms: SMS_KEY }, params: { name: 'Ana' } });
  const [broken] = await enqueue(db, { ...base, email: `broken-${run}@example.com`, copy: { email: BROKEN_KEY } });
  const refuseTo = `refuse-${run}@example.com`; behaviour.set(refuseTo, 'refuse');
  const [refusedMsg] = await enqueue(db, { ...base, email: refuseTo, copy: { email: EMAIL_KEY }, params: { name: 'Ana' } });
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  check('all four fail in one pass', tally.failed === 4, JSON.stringify(tally));
  for (const [label, m, outcome, attempts, sent] of [
    ['a number with no agreement', noAgreement, 'no_agreement', 0, 0],
    ['a number that sent STOP', stopped, 'stopped', 0, 0],
    ['copy with a blank it cannot fill', broken, 'render_error', 0, 0],
    ['an address the provider refuses', refusedMsg, 'refused', 1, 1],
  ]) {
    const r = await row(m.id), evs = await events(m.id);
    check(`${label}: failed at once, ${attempts} attempt(s), logged ${outcome}`,
      r.status === 'failed' && r.attempts === attempts && sentCount(m.id) === sent && evs.at(-1).event_type === 'failed' && evs.at(-1).outcome === outcome,
      JSON.stringify({ status: r.status, attempts: r.attempts, sent: sentCount(m.id), log: evs.map((e) => e.outcome) }));
  }

  console.log('\nA failure that may pass is retried, then given up');
  const flaky = `flaky-${run}@example.com`; behaviour.set(flaky, 'flaky');
  const [retry] = await enqueue(db, { ...base, email: flaky, copy: { email: EMAIL_KEY }, params: { name: 'Ana' } });
  must(await db.from('dispatch_messages').update({ max_attempts: 2 }).eq('id', retry.id));
  const t0 = Date.now();
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  let r = await row(retry.id);
  const wait = new Date(r.next_attempt_at).getTime() - t0;
  check('the first failure puts it back in the queue, one attempt spent',
    tally.retrying === 1 && r.status === 'queued' && r.attempts === 1 && r.last_error === 'provider timed out', JSON.stringify({ tally, status: r.status }));
  check('it waits about a minute before the next try', wait > 55e3 && wait < 70e3, `${wait} ms`);
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  check('a pass before the wait is over leaves it alone', tally.claimed === 0, JSON.stringify(tally));
  must(await db.from('dispatch_messages').update({ next_attempt_at: new Date().toISOString() }).eq('id', retry.id));
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  r = await row(retry.id);
  check('out of attempts, it is failed for good', tally.exhausted === 1 && r.status === 'failed' && r.attempts === 2, JSON.stringify({ tally, status: r.status }));
  check('its log reads queued, attempt, failed (retrying), attempt, exhausted',
    (await events(retry.id)).map((e) => `${e.event_type}:${e.outcome}`).join() === 'queued:queued,attempt:attempt,failed:retrying,attempt:attempt,exhausted:exhausted');

  console.log('\nThe sending window');
  const [night] = await enqueue(db, { ...base, phone: AGREED, copy: { sms: SMS_KEY }, params: { name: 'Ana' } });
  tally = await runPass(db, { caller: CALLER, channels, now: NIGHT });
  r = await row(night.id);
  const held = (await events(night.id)).at(-1);
  check('a text due at 3 AM Eastern waits, and is not an attempt',
    tally.held === 1 && r.status === 'queued' && r.attempts === 0 && sentCount(night.id) === 0, JSON.stringify({ tally, status: r.status }));
  check('it waits for the window to open, ahead of the real clock, and says so in the log',
    new Date(r.next_attempt_at) > new Date() && held.event_type === 'held_window' && new Date(held.detail.until).getTime() === new Date(r.next_attempt_at).getTime(),
    JSON.stringify({ next: r.next_attempt_at, held }));
  // Hand it on so it does not wait in the queue past this test.
  must(await db.from('dispatch_messages').update({ status: 'cancelled' }).eq('id', night.id));

  console.log('\nTwo passes at once');
  const slow = Array.from({ length: 10 }, (_, i) => `slow-${i}-${run}@example.com`);
  slow.forEach((a) => behaviour.set(a, 'slow'));
  const batch = [];
  for (const a of slow) batch.push(...await enqueue(db, { ...base, email: a, copy: { email: EMAIL_KEY }, params: { name: 'Ana' } }));
  const [p1, p2] = await Promise.all([
    runPass(db, { caller: CALLER, channels, now: DAYTIME, limit: 6 }),
    runPass(db, { caller: CALLER, channels, now: DAYTIME, limit: 6 }),
  ]);
  const left = await runPass(db, { caller: CALLER, channels, now: DAYTIME });
  check('between them every message was sent', p1.sent + p2.sent + left.sent === 10, JSON.stringify({ p1, p2, left }));
  check('no message was sent twice', batch.every((m) => sentCount(m.id) === 1), batch.map((m) => sentCount(m.id)).join());

  console.log('\nA pass out of time');
  const [late] = await enqueue(db, { ...base, email: `late-${run}@example.com`, copy: { email: EMAIL_KEY }, params: { name: 'Ana' } });
  tally = await runPass(db, { caller: CALLER, channels, now: DAYTIME, budgetMs: -1 });
  r = await row(late.id);
  check('hands back what it claimed, unsent and with no attempt spent',
    tally.released === 1 && r.status === 'queued' && r.attempts === 0 && r.locked_at === null && sentCount(late.id) === 0, JSON.stringify({ tally, status: r.status }));
  must(await db.from('dispatch_messages').update({ status: 'cancelled' }).eq('id', late.id));
} catch (err) {
  fails++;
  console.log(`  ✗ test stopped: ${err.message}`);
} finally {
  console.log('\nCleanup');
  if (uid) {
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  }
  const leftover = must(await db.from('dispatch_messages').select('id').eq('caller', 'test-dispatch-run'));
  must(await db.from('dispatch_copy').delete().in('key', [EMAIL_KEY, SMS_KEY, BROKEN_KEY]));
  if (newPhones.length) must(await db.from('text_agreements').delete().in('phone', newPhones));
  console.log(`  test user deleted, ${leftover.length} test message(s) left, test copy and agreements removed`);
  console.log('  (its test events stay in the append-only log)');
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
