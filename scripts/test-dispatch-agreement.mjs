#!/usr/bin/env node
// Posterity — agreement to texts and its confirmation text
/*
Runs recordAgreement and the scheduler's pass against the live database, with
stand-in senders in place of Postmark and Twilio, so nothing is delivered and no
keys are needed.

What matters most:
  - an agreement is never recorded without who agreed, how, and the disclosure
    they were shown, and all three reach the append-only event log
  - every agreement queues its confirmation text, and the confirmation goes
    immediately, even at 3 AM, since the person has just set it off themselves
  - the confirmation carries the copy stored for it, read at send
  - a number that sent STOP and agrees again is texted again, with a fresh
    confirmation

Its confirmations carry the caller 'test-dispatch-agreement', and each pass
claims only those, so a real message queued meanwhile is left to the live
scheduler, which in turn leaves these alone (20261101020000). Every row it
writes is flagged is_test; its events stay in the append-only log permanently.

Run: node scripts/test-dispatch-agreement.mjs
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { recordAgreement } from '../lib/dispatch/agreement.js';
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

// Stand-in senders: each records what it was asked to send and delivers nothing.
const sends = [];
function sender(channel) {
  return {
    async send({ message, rendered }) {
      sends.push({ id: message.id, channel, rendered });
      return { providerMessageId: `test-${channel}-${message.id}` };
    },
  };
}
const channels = { email: sender('email'), sms: sender('sms') };

// 3 AM Eastern tomorrow: outside the sending window in every US zone, so a
// text that goes at this hour went because the person set it off.
const today = new Date();
const NIGHT = () => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 7));

const run = Date.now().toString(36);
const PHONE = '+15005550006';
const CALLER = 'test-dispatch-agreement';
const WHO = { role: 'customer', note: 'test-dispatch-agreement' };
const HOW = 'profile_text_switch';
const DISCLOSURE = '[test] The disclosure shown beside the text message switch.';
let uid = null, accountId = null, phoneWasNew = false;

const eventsFor = async (type, since) => must(await db.from('dispatch_events')
  .select('event_type,outcome,detail,is_test,account_id').eq('destination', PHONE).eq('event_type', type)
  .gte('occurred_at', since).order('id'));

try {

  const created = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `dispatch-agreement-${run}@posterity.app`, password: `x-${run}-${Math.random()}`, email_confirm: true, user_metadata: { legal_name: 'Dispatch Agreement Test' } }),
  }).then((r) => r.json());
  uid = created.id;
  if (!uid) throw new Error('could not create the test user');
  accountId = must(await db.from('accounts').select('id').eq('user_id', uid).single()).id;
  phoneWasNew = !must(await db.from('text_agreements').select('phone').eq('phone', PHONE)).length;
  const base = { phone: PHONE, accountId, who: WHO, how: HOW, disclosure: DISCLOSURE, isTest: true, caller: CALLER };
  const stored = must(await db.from('dispatch_copy').select('sms_body').eq('key', 'sms.agreement_confirmation').single()).sms_body;

  console.log('Refused without what the record needs');
  check('without who agreed', await refused(() => recordAgreement(db, { ...base, who: null })));
  check('without how they agreed', await refused(() => recordAgreement(db, { ...base, how: '' })));
  check('without the disclosure shown', await refused(() => recordAgreement(db, { ...base, disclosure: '' })));
  check('without the account', await refused(() => recordAgreement(db, { ...base, accountId: null })));
  check('a number not in +1 5045551234 form', await refused(() => recordAgreement(db, { ...base, phone: '504-555-1234' })));
  check('and none of those wrote a confirmation',
    !must(await db.from('dispatch_messages').select('id').eq('account_id', accountId)).length);

  console.log('\nAn agreement is recorded and its confirmation queued');
  const since = new Date(Date.now() - 5000).toISOString();
  const { agreement, confirmation } = await recordAgreement(db, base);
  check('the number is agreed, and confirmed as of the agreement',
    agreement.status === 'agreed' && agreement.agreed_at && agreement.last_confirmed_at === agreement.agreed_at && !agreement.stopped_at,
    JSON.stringify(agreement));
  const [ag] = await eventsFor('agreement', since);
  check('the log records who agreed, how, and the disclosure shown',
    ag && ag.detail.how === HOW && ag.detail.disclosure === DISCLOSURE && ag.detail.who?.role === 'customer' && ag.account_id === accountId && ag.is_test,
    JSON.stringify(ag));
  const [cf] = await eventsFor('confirmed', since);
  check('and that the agreement confirmed the number', cf?.detail?.via === 'agreement' && cf.is_test, JSON.stringify(cf));
  check('one confirmation text is queued to the number, as one the person set off',
    confirmation.channel === 'sms' && confirmation.destination === PHONE && confirmation.copy_key === 'sms.agreement_confirmation' &&
    confirmation.self_initiated === true && confirmation.status === 'queued' && confirmation.caller === CALLER && confirmation.is_test,
    JSON.stringify(confirmation));

  console.log('\nThe confirmation goes at once, even at 3 AM');
  let tally = await runPass(db, { caller: CALLER, channels, now: NIGHT });
  const sent = must(await db.from('dispatch_messages').select().eq('id', confirmation.id).single());
  const mineSent = sends.filter((s) => s.id === confirmation.id);
  check('the pass sent it, once, without waiting for the window',
    tally.sent >= 1 && sent.status === 'sent' && sent.attempts === 1 && mineSent.length === 1, JSON.stringify({ tally, status: sent.status }));
  check('it carries the copy stored for the confirmation', mineSent[0]?.rendered?.body === stored,
    JSON.stringify(mineSent[0]?.rendered));

  console.log('\nA number that stopped and agrees again');
  must(await db.rpc('dispatch_record_stop', { p_phone: PHONE, p_via: 'test', p_account_id: accountId, p_is_test: true }));
  const again = await recordAgreement(db, base);
  check('is agreed again, with the stop cleared',
    again.agreement.status === 'agreed' && !again.agreement.stopped_at && !again.agreement.stopped_via, JSON.stringify(again.agreement));
  check('and gets a fresh confirmation of its own', again.confirmation.id !== confirmation.id && again.confirmation.status === 'queued');
  tally = await runPass(db, { caller: CALLER, channels, now: NIGHT });
  check('which goes at once as well',
    must(await db.from('dispatch_messages').select('status').eq('id', again.confirmation.id).single()).status === 'sent', JSON.stringify(tally));
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
  const leftover = accountId ? must(await db.from('dispatch_messages').select('id').eq('account_id', accountId)) : [];
  if (phoneWasNew) must(await db.from('text_agreements').delete().eq('phone', PHONE));
  console.log(`  test user deleted, ${leftover.length} test message(s) left, ${phoneWasNew ? 'test agreement removed' : 'test number had an agreement before this run, left in place'}`);
  console.log('  (its test events stay in the append-only log)');
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
