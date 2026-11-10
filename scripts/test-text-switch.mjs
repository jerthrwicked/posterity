#!/usr/bin/env node
// Posterity — the text message switch
/*
Exercises the text message switch against the live database as real signed-in
users, and, with a local server, the switch on the Settings page in a real
browser.

  node scripts/test-text-switch.mjs                         the library against the live database
  node scripts/test-text-switch.mjs --server http://localhost:3012
                                                            plus the Settings page on that server, which
                                                            must run with DISPATCH_TEST_CALLER=test-text-switch

What matters most:
  - the switch is off until the customer turns it on, and cannot be turned on
    without a phone number on file
  - turning it on for a number the account has not proven records nothing: it
    shows a code, and only a text carrying that code from that number records
    the agreement, confirms the number for the account, and queues the
    confirmation text. A wrong code, the code from another phone, a code past
    its time, a cancelled or replaced code all do nothing
  - so typing someone else's number neither agrees for them, queues a text to
    them, nor lets the typist end their agreement; and of two accounts waiting
    on one number, only the one whose code is texted turns on
  - the agreement keeps who, how, the disclosure exactly as the page showed
    it, and how the number was proven
  - a number already proven turns on at once; a changed number starts over
  - while texting is closed (policy's TEXTING_OPEN) the confirmation is failed
    without reaching the sender; once open it goes at once
  - the switch reads the agreement record: a STOP reply shows it as off, and
    the number cannot be turned on again until it has texted START
  - no customer can read or write the agreement record or a waiting code

Everything it queues carries the caller 'test-text-switch', which the live
scheduler skips, and stand-in senders take the place of Postmark and Twilio, so
nothing is sent. Texts "received" are handed straight to recordInbound, flagged
as tests. The test users are deleted at the end and their queued messages and
waiting codes go with them; the test numbers' agreements and inbound texts are
removed; its events stay in the append-only log, flagged is_test.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY); for the browser, CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import {
  readAccountTextSwitch, turnAccountTextsOn, turnAccountTextsOff, cancelAccountTextRequest,
  readTextSwitch, turnTextsOn, turnTextsOff, SwitchRefused, TEXT_DISCLOSURE, HOW_SETTINGS, CODE_MINUTES,
} from '../lib/dispatch/text-switch.js';
import { runPass } from '../lib/dispatch/run.js';
import { recordInbound } from '../lib/dispatch/reports.js';
import { TEXTING_OPEN } from '../lib/dispatch/policy.js';
import { displayPhone } from '../lib/posterity/phone.js';
import { SMS_FROM } from '../lib/dispatch/senders.js';

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
const serverArg = process.argv.indexOf('--server');
const SERVER = serverArg > -1 ? process.argv[serverArg + 1].replace(/\/$/, '') : null;

const CALLER = 'test-text-switch';
const PASSWORD = 'test-password-123';
// Numbers no one holds: 500 is not a geographic area code.
const ONE = '+15005550141', TWO = '+15005550142', PAGE = '+15005550143', THREE = '+15005550145';
const NUMBERS = [ONE, TWO, PAGE, THREE];
const stamp = Date.now();
const addr = (tag) => `test-ts-${stamp}-${tag}@yourposterity.com`;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
function must({ data, error }) { if (error) throw error; return data; }
const closedOut = (st) => st === 401 || st === 403 || st === 404;

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
const inboundSids = [];

async function signedInUser(tag) {
  const email = addr(tag);
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Text Switch Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id').eq('user_id', r.id).single());
  const [st2, session] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email, password: PASSWORD } });
  if (st2 !== 200) throw new Error(`sign in ${email}: ${st2}`);
  return { user: { id: r.id, email }, account, token: session.access_token };
}
// The customer's own write, as Settings makes it: signed in, under own_account.
const setPhone = (who, phone) => rest(`/rest/v1/accounts?id=eq.${who.account.id}`, { method: 'PATCH', key: ANON, token: who.token, body: { phone } });

const refusedAs = async (fn) => { try { await fn(); return 'passed'; } catch (e) { return e instanceof SwitchRefused ? e.reason : `error: ${e.message}`; } };
// The customer moves the switch. For a number the account has not proven,
// flip() answers { on: false, waiting: { code } } and records nothing.
const flip = (who, extra = {}) => turnAccountTextsOn(db, { accountId: who.account.id, userId: who.user.id, caller: CALLER, ...extra });
const off = (who) => turnAccountTextsOff(db, { accountId: who.account.id, userId: who.user.id, caller: CALLER });
const cancel = (who) => cancelAccountTextRequest(db, { accountId: who.account.id });
const sw = (who) => readAccountTextSwitch(db, { accountId: who.account.id });
const reads = async (who) => (await sw(who)).on;
const requestOf = async (who) => must(await db.from('text_switch_requests').select().eq('account_id', who.account.id))[0] ?? null;
const agreementOf = async (phone) => must(await db.from('text_agreements').select().eq('phone', phone))[0] ?? null;
const accountRow = async (who) => must(await db.from('accounts').select('phone, phone_confirmed_at').eq('id', who.account.id).single());
const startedAt = new Date(Date.now() - 2000).toISOString();
const eventsOf = async (phone, type) => must(await db.from('dispatch_events')
  .select('event_type,outcome,detail,is_test,account_id').eq('destination', phone).eq('event_type', type)
  .gte('occurred_at', startedAt).order('id'));
const agreements = async (phone) => (await eventsOf(phone, 'agreement')).length;
const messagesOf = async (who) => must(await db.from('dispatch_messages').select().eq('account_id', who.account.id).order('created_at'));
// A text arriving at Posterity's number from `phone`. Answers what
// recordInbound did with it, and the sid it was given.
let sidCount = 0;
async function inbound(phone, body, sid = `SMtest${stamp}${sidCount++}`) {
  if (!inboundSids.includes(sid)) inboundSids.push(sid);
  const r = await recordInbound(db, new URLSearchParams({ MessageSid: sid, From: phone, To: SMS_FROM, Body: body }), { isTest: true });
  return { sid, ...r };
}
// Turning on in full for an unproven number: flip, then the code from the phone.
async function prove(who, phone) {
  const asked = await flip(who);
  if (asked.on) return { asked, got: null };
  return { asked, got: await inbound(phone, asked.waiting.code) };
}
const notCode = (code) => (code === '000000' ? '111111' : '000000');

// Stand-in senders: each records what it was asked to send and delivers nothing.
const sends = [];
const sender = (channel) => ({ async send({ message, rendered }) { sends.push({ id: message.id, channel, rendered }); return { providerMessageId: `test-${channel}-${message.id}` }; } });
const channels = { email: sender('email'), sms: sender('sms') };
// 3 AM Eastern tomorrow: outside the sending window in every US zone.
const today = new Date();
const NIGHT = () => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 7));

const held = new Set();

try {
  for (const n of NUMBERS) if (await agreementOf(n)) held.add(n);
  if (held.size) throw new Error(`a test number already has an agreement on file (${[...held].join(', ')}); another run may be in progress`);

  const a = await signedInUser('a');
  const b = await signedInUser('b');
  const c = await signedInUser('c');
  const d = await signedInUser('d');

  console.log('Off until turned on, and not without a number');
  check('a new account\'s switch reads off', (await reads(a)) === false);
  check('with no phone number on file it cannot be turned on', (await refusedAs(() => flip(a))) === 'no_number');
  check('…and nothing is recorded, queued or left waiting', !(await messagesOf(a)).length && (await requestOf(a)) === null);
  let [st, dta] = await setPhone(a, ONE);
  check('the customer adds a phone number themselves', st === 200 && dta?.[0]?.phone === ONE, `${st} ${JSON.stringify(dta).slice(0, 160)}`);
  check('a number on file alone leaves the switch off', (await reads(a)) === false && (await agreementOf(ONE)) === null);
  [st, dta] = await rest(`/rest/v1/accounts?id=eq.${a.account.id}`, { method: 'PATCH', key: ANON, token: a.token, body: { phone_confirmed_at: new Date().toISOString() } });
  check('the customer cannot mark the number confirmed themselves', (await accountRow(a)).phone_confirmed_at === null && (await reads(a)) === false, `${st}`);

  console.log('\nTurning it on for a number not yet proven: a code, and nothing recorded');
  const asked = await flip(a);
  check('the switch answers with a six-digit code and stays off', asked.on === false && /^[0-9]{6}$/.test(asked.waiting?.code ?? '') && (await reads(a)) === false, JSON.stringify(asked));
  const minutes = (new Date(asked.waiting.expiresAt).getTime() - Date.now()) / 60000;
  check(`the code waits ${CODE_MINUTES} minutes`, minutes > CODE_MINUTES - 1 && minutes <= CODE_MINUTES, `${minutes}`);
  check('nothing is recorded for the number, confirmed for the account, or queued',
    (await agreementOf(ONE)) === null && (await accountRow(a)).phone_confirmed_at === null && !(await messagesOf(a)).length && (await agreements(ONE)) === 0);
  let req = await requestOf(a);
  check('what waits is who asked, the number, the disclosure as shown, where, and the test label',
    req?.user_id === a.user.id && req.phone === ONE && req.code === asked.waiting.code && req.disclosure === TEXT_DISCLOSURE &&
    req.how === HOW_SETTINGS && req.caller === CALLER, JSON.stringify(req));
  check('Settings reads the same code back', (await sw(a)).waiting?.code === asked.waiting.code);

  let hello = await inbound(ONE, 'hello');
  let wrong = await inbound(ONE, notCode(asked.waiting.code));
  let elsewhere = await inbound(TWO, asked.waiting.code);
  check('a text that is not the code, a wrong code, and the right code from another phone all do nothing',
    hello.textSwitch === null && wrong.textSwitch === null && elsewhere.textSwitch === null &&
    (await agreementOf(ONE)) === null && (await agreementOf(TWO)) === null && (await reads(a)) === false && (await requestOf(a))?.code === asked.waiting.code,
    JSON.stringify([hello.textSwitch, wrong.textSwitch, elsewhere.textSwitch]));

  let again = await flip(a);
  for (let i = 0; i < 3 && again.waiting.code === asked.waiting.code; i++) again = await flip(a);
  const stale = await inbound(ONE, asked.waiting.code);
  check('turning it on again shows a new code, and the old one stops counting',
    again.waiting.code !== asked.waiting.code && stale.textSwitch === null && (await agreementOf(ONE)) === null && (await requestOf(a))?.code === again.waiting.code);

  console.log('\nThe code arrives from the number');
  const body = `Posterity code: ${again.waiting.code}`;
  req = await requestOf(a);
  const arrived = await inbound(ONE, body);
  let agreement = await agreementOf(ONE);
  let row = await accountRow(a);
  check('the text turns the switch on for the account that was shown the code',
    arrived.textSwitch?.result === 'on' && arrived.textSwitch.accountId === a.account.id && (await reads(a)) === true, JSON.stringify(arrived));
  check('the number is agreed', agreement?.status === 'agreed', JSON.stringify(agreement));
  check('the account\'s number is confirmed as of the agreement',
    !!row.phone_confirmed_at && new Date(row.phone_confirmed_at).getTime() === new Date(agreement.agreed_at).getTime(), `${row.phone_confirmed_at} ${agreement?.agreed_at}`);
  check('the code is forgotten', (await requestOf(a)) === null && (await sw(a)).waiting === null);
  let [ag] = (await eventsOf(ONE, 'agreement')).slice(-1);
  check('the log keeps who agreed, how, and the disclosure exactly as shown',
    ag?.detail?.who?.role === 'customer' && ag.detail.who.user_id === a.user.id && ag.detail.how === HOW_SETTINGS &&
    ag.detail.disclosure === TEXT_DISCLOSURE && ag.account_id === a.account.id && ag.is_test === true, JSON.stringify(ag));
  check('…and how the number was proven: by which text, answering a code shown when',
    ag?.detail?.evidence?.by === 'text_from_number' && ag.detail.evidence.twilio_sid === arrived.sid &&
    new Date(ag.detail.evidence.code_shown_at).getTime() === new Date(req.requested_at).getTime(),
    JSON.stringify(ag?.detail?.evidence));
  const [heard] = (await eventsOf(ONE, 'inbound')).slice(-1);
  check('the text\'s own log entry says what it did', heard?.detail?.text_switch === 'on', JSON.stringify(heard));
  let queued = await messagesOf(a);
  const first = { confirmation: queued[0] };
  check('one confirmation text is queued to the number, as one the person set off',
    queued.length === 1 && first.confirmation.channel === 'sms' && first.confirmation.destination === ONE && first.confirmation.copy_key === 'sms.agreement_confirmation' &&
    first.confirmation.self_initiated === true && first.confirmation.caller === CALLER && first.confirmation.is_test === true,
    JSON.stringify(queued.map((m) => [m.channel, m.copy_key, m.caller, m.is_test, m.self_initiated])));
  const resent = await inbound(ONE, body, arrived.sid);
  const twice = await inbound(ONE, body);
  check('the same text delivered again, or the code texted a second time, records nothing more',
    resent.result === 'duplicate' && twice.textSwitch === null && (await agreements(ONE)) === 1 && (await messagesOf(a)).length === 1,
    JSON.stringify([resent.result, twice.textSwitch]));

  console.log('\nWhile texting is closed, as the live scheduler runs');
  check('texting is closed as shipped', TEXTING_OPEN === false);
  let tally = await runPass(db, { caller: CALLER, channels, now: NIGHT });
  let msg = must(await db.from('dispatch_messages').select().eq('id', first.confirmation.id).single());
  check('the confirmation is failed as texting_closed and never handed to the sender',
    msg.status === 'failed' && msg.last_error === 'texting_closed' && msg.attempts === 0 && !sends.length, JSON.stringify({ tally, status: msg.status, last_error: msg.last_error }));
  check('the agreement stands and the switch still reads on', (await agreementOf(ONE)).status === 'agreed' && (await reads(a)) === true);

  console.log('\nTurning it off');
  await off(a);
  agreement = await agreementOf(ONE);
  check('the number is stopped, by the switch', agreement.status === 'stopped' && agreement.stopped_via === HOW_SETTINGS, JSON.stringify(agreement));
  check('the switch reads off, and the number stays this account\'s own', (await reads(a)) === false && !!(await accountRow(a)).phone_confirmed_at);
  let stops = await eventsOf(ONE, 'stop');
  check('the log keeps who turned it off and where',
    stops.length === 1 && stops[0].detail.who?.user_id === a.user.id && stops[0].detail.how === HOW_SETTINGS && stops[0].detail.via === HOW_SETTINGS &&
    stops[0].account_id === a.account.id && stops[0].is_test === true, JSON.stringify(stops));
  check('a switch already off cannot be turned off again', (await refusedAs(() => off(a))) === 'not_on' && (await eventsOf(ONE, 'stop')).length === 1);

  console.log('\nOn again for a number already proven, once texting is open');
  const second = await flip(a);
  check('it turns on at once, with no code and no START', second.on === true && second.agreement?.status === 'agreed' && (await reads(a)) === true && (await requestOf(a)) === null, JSON.stringify(second));
  [ag] = (await eventsOf(ONE, 'agreement')).slice(-1);
  check('with a fresh agreement in the log, saying the number was proven earlier, and a confirmation of its own',
    (await agreements(ONE)) === 2 && ag.detail.evidence?.by === 'number_proven_earlier' && !!ag.detail.evidence.confirmed_at &&
    second.confirmation.id !== first.confirmation.id && second.confirmation.status === 'queued', JSON.stringify(ag?.detail?.evidence));
  tally = await runPass(db, { caller: CALLER, channels, now: NIGHT, textingOpen: true });
  msg = must(await db.from('dispatch_messages').select().eq('id', second.confirmation.id).single());
  const stored = must(await db.from('dispatch_copy').select('sms_body').eq('key', 'sms.agreement_confirmation').single()).sms_body;
  check('the confirmation goes at once, even at 3 AM, carrying the stored copy',
    msg.status === 'sent' && sends.length === 1 && sends[0].id === second.confirmation.id && sends[0].rendered.body === stored, JSON.stringify({ tally, status: msg.status }));

  console.log('\nA STOP reply');
  await inbound(ONE, 'STOP');
  agreement = await agreementOf(ONE);
  check('the switch reads off', agreement.status === 'stopped' && agreement.stopped_via === 'stop_reply' && (await reads(a)) === false, JSON.stringify(agreement));
  const before = (await messagesOf(a)).length;
  check('it cannot be turned on until the number texts START', (await refusedAs(() => flip(a))) === 'needs_start');
  check('…and the refusal recorded and queued nothing',
    (await agreementOf(ONE)).status === 'stopped' && (await agreements(ONE)) === 2 && (await messagesOf(a)).length === before);
  await inbound(ONE, 'START');
  check('a START alone agrees to nothing: the switch still reads off', (await agreementOf(ONE)).status === 'stopped' && (await reads(a)) === false);
  const third = await flip(a);
  check('after it, the customer can turn the switch on, against the disclosure again',
    third.on === true && (await reads(a)) === true && (await eventsOf(ONE, 'agreement')).at(-1)?.detail?.disclosure === TEXT_DISCLOSURE);
  await inbound(ONE, 'STOP');
  await inbound(ONE, 'hello?');
  check('a later STOP needs a START of its own; an earlier one does not count', (await refusedAs(() => flip(a))) === 'needs_start');
  await inbound(ONE, 'START');
  await flip(a);

  console.log('\nA STOP while a code waits');
  await setPhone(c, THREE);
  const cAsked = await flip(c);
  await inbound(THREE, 'STOP');
  let got = await inbound(THREE, cAsked.waiting.code);
  check('the code from a number that has since replied STOP turns nothing on, and keeps waiting',
    got.textSwitch?.result === 'needs_start' && (await agreementOf(THREE))?.status === 'stopped' && (await reads(c)) === false &&
    (await requestOf(c))?.code === cAsked.waiting.code && (await agreements(THREE)) === 0 && (await accountRow(c)).phone_confirmed_at === null, JSON.stringify(got.textSwitch));
  await inbound(THREE, 'START');
  got = await inbound(THREE, cAsked.waiting.code);
  check('after START the same code turns it on', got.textSwitch?.result === 'on' && (await reads(c)) === true && (await requestOf(c)) === null, JSON.stringify(got.textSwitch));

  console.log('\nA changed number starts over');
  [st] = await setPhone(a, TWO);
  row = await accountRow(a);
  check('the new number is unconfirmed and the switch reads off', st === 200 && row.phone === TWO && row.phone_confirmed_at === null && (await reads(a)) === false);
  check('the agreement stays with the number it was given for', (await agreementOf(ONE)).status === 'agreed' && (await agreementOf(TWO)) === null);
  const moved = await flip(a);
  check('turning it on for the new number waits on a code of its own', moved.on === false && (await requestOf(a))?.phone === TWO && (await agreementOf(TWO)) === null, JSON.stringify(moved));
  [st] = await setPhone(a, ONE);
  check('going back to the old number does not bring its agreement along, and the other number\'s code no longer shows',
    st === 200 && (await reads(a)) === false && (await sw(a)).waiting === null);
  got = await inbound(TWO, moved.waiting.code);
  check('that code, texted from the number the account no longer holds, records nothing',
    got.textSwitch?.result === 'number_changed' && (await agreementOf(TWO)) === null && (await requestOf(a)) === null &&
    (await accountRow(a)).phone_confirmed_at === null && (await reads(a)) === false, JSON.stringify(got.textSwitch));
  let n = await agreements(ONE);
  const back = await prove(a, ONE);
  check('the old number is proven again by its own text, which records a new agreement',
    back.asked.on === false && back.got?.textSwitch?.result === 'on' && (await reads(a)) === true && (await agreements(ONE)) === n + 1, JSON.stringify(back.got?.textSwitch));

  console.log('\nA code past its time, and a cancelled one');
  await setPhone(b, TWO);
  const old = await flip(b, { now: new Date(Date.now() - (CODE_MINUTES + 1) * 60 * 1000) });
  check('a code past its time no longer shows', old.on === false && (await requestOf(b))?.code === old.waiting.code && (await sw(b)).waiting === null);
  got = await inbound(TWO, old.waiting.code);
  check('…and texting it turns nothing on', got.textSwitch === null && (await agreementOf(TWO)) === null && (await reads(b)) === false);
  const dropped = await flip(b);
  await cancel(b);
  got = await inbound(TWO, dropped.waiting.code);
  check('a cancelled code is forgotten, and texting it turns nothing on',
    (await requestOf(b)) === null && (await sw(b)).waiting === null && got.textSwitch === null && (await agreementOf(TWO)) === null);

  console.log('\nTwo accounts waiting on one number');
  await setPhone(d, TWO);
  const bAsk = await flip(b);
  const dAsk = await flip(d);
  check('each is shown a code of its own', bAsk.waiting.code !== dAsk.waiting.code && (await requestOf(b))?.phone === TWO && (await requestOf(d))?.phone === TWO);
  got = await inbound(TWO, dAsk.waiting.code);
  [ag] = (await eventsOf(TWO, 'agreement')).slice(-1);
  check('the code texted turns on the account that was shown it, and only that one',
    got.textSwitch?.accountId === d.account.id && (await reads(d)) === true && ag?.account_id === d.account.id && ag.detail.who.user_id === d.user.id &&
    (await reads(b)) === false && (await accountRow(b)).phone_confirmed_at === null && (await requestOf(b))?.code === bAsk.waiting.code && !(await messagesOf(b)).length,
    JSON.stringify(got.textSwitch));
  got = await inbound(TWO, bAsk.waiting.code);
  check('the other turns on only by its own code', got.textSwitch?.accountId === b.account.id && (await reads(b)) === true);

  console.log('\nA number another account agreed for');
  [st] = await setPhone(c, ONE);
  check('typed into a second account, it does not arrive switched on', st === 200 && (await agreementOf(ONE)).status === 'agreed' && (await reads(c)) === false);
  check('that account cannot end the agreement', (await refusedAs(() => off(c))) === 'not_on' && (await agreementOf(ONE)).status === 'agreed' && (await reads(a)) === true);
  n = await agreements(ONE);
  const cMessages = (await messagesOf(c)).length;
  const aStamp = (await accountRow(a)).phone_confirmed_at;
  const agreedAt = (await agreementOf(ONE)).agreed_at;
  const tried = await flip(c);
  check('turning the switch on there only shows a code: nothing is recorded or queued for the number, and its holder\'s switch is untouched',
    tried.on === false && (await agreements(ONE)) === n && (await messagesOf(c)).length === cMessages && (await reads(c)) === false &&
    (await accountRow(c)).phone_confirmed_at === null && (await agreementOf(ONE)).agreed_at === agreedAt && (await accountRow(a)).phone_confirmed_at === aStamp && (await reads(a)) === true,
    JSON.stringify(tried));
  got = await inbound(THREE, tried.waiting.code);
  check('texting that code from their own phone does nothing', got.textSwitch === null && (await reads(c)) === false && (await agreements(ONE)) === n);

  console.log('\nThe switch for any holder');
  check('reads off with no number, with an unconfirmed one, and with nothing a phone number',
    !(await readTextSwitch(db, { phone: null, confirmedAt: null })).on && !(await readTextSwitch(db, { phone: ONE, confirmedAt: null })).on &&
    !(await readTextSwitch(db, { phone: '504-555-1234', confirmedAt: new Date().toISOString() })).on);
  check('reads on for a confirmed number whose agreement stands', (await readTextSwitch(db, { phone: ONE, confirmedAt: new Date().toISOString() })).on === true);
  check('turning off is refused without who and where',
    (await refusedAs(() => turnTextsOff(db, { phone: ONE, accountId: a.account.id, who: null, how: 'x', caller: CALLER }))).startsWith('error') &&
    (await refusedAs(() => turnTextsOff(db, { phone: ONE, accountId: a.account.id, who: { role: 'x' }, how: '', caller: CALLER }))).startsWith('error') &&
    (await agreementOf(ONE)).status === 'agreed');
  check('turning on is refused without how the number was proven, and with a caller label that is not a test\'s',
    (await refusedAs(() => turnTextsOn(db, { phone: ONE, accountId: a.account.id, who: { role: 'x' }, how: 'x', disclosure: 'x', caller: CALLER }))).startsWith('error') &&
    (await refusedAs(() => turnTextsOn(db, { phone: ONE, accountId: a.account.id, who: { role: 'x' }, how: 'x', disclosure: 'x', evidence: { by: 'x' }, caller: 'scheduler' }))).startsWith('error') &&
    (await agreements(ONE)) === n);

  console.log('\nThe agreement record and the waiting codes are closed to customers');
  const asA = { key: ANON, token: a.token };
  const asC = { key: ANON, token: c.token };
  [st, dta] = await rest(`/rest/v1/text_agreements?phone=eq.${encodeURIComponent(ONE)}`, asA);
  check('a signed-in customer cannot read the agreement record', closedOut(st) || (Array.isArray(dta) && !dta.length), `${st} ${JSON.stringify(dta).slice(0, 120)}`);
  [st, dta] = await rest('/rest/v1/text_agreements', { method: 'POST', ...asA, body: { phone: PAGE, status: 'agreed', agreed_at: new Date().toISOString(), last_confirmed_at: new Date().toISOString() } });
  check('…nor write an agreement into it', closedOut(st) && (await agreementOf(PAGE)) === null, `${st} ${JSON.stringify(dta).slice(0, 120)}`);
  for (const [fn, args] of [
    ['dispatch_record_agreement', { p_phone: PAGE, p_account_id: a.account.id, p_detail: {} }],
    ['dispatch_record_stop', { p_phone: ONE, p_via: 'evil', p_account_id: a.account.id }],
  ]) {
    [st, dta] = await rest(`/rest/v1/rpc/${fn}`, { method: 'POST', ...asA, body: args });
    const [stOut] = await rest(`/rest/v1/rpc/${fn}`, { method: 'POST', key: ANON, body: args });
    check(`${fn}() cannot be called, signed in or out`, closedOut(st) && closedOut(stOut), `${st} ${stOut} ${JSON.stringify(dta).slice(0, 120)}`);
  }
  check('and neither attempt changed anything', (await agreementOf(PAGE)) === null && (await agreementOf(ONE)).status === 'agreed');
  check('an account is waiting on a code, for the checks that follow', (await requestOf(c))?.code === tried.waiting.code);
  [st, dta] = await rest(`/rest/v1/text_switch_requests?account_id=eq.${c.account.id}`, asC);
  const [stOut, dOut] = await rest('/rest/v1/text_switch_requests', { key: ANON });
  check('a customer cannot read a waiting code, their own included, signed in or out',
    (closedOut(st) || (Array.isArray(dta) && !dta.length)) && (closedOut(stOut) || (Array.isArray(dOut) && !dOut.length)), `${st} ${stOut} ${JSON.stringify(dta).slice(0, 120)}`);
  [st, dta] = await rest(`/rest/v1/text_switch_requests?account_id=eq.${c.account.id}`, { method: 'PATCH', ...asC, body: { phone: THREE } });
  const [stDel] = await rest(`/rest/v1/text_switch_requests?account_id=eq.${c.account.id}`, { method: 'DELETE', ...asA });
  const [stIns] = await rest('/rest/v1/text_switch_requests', {
    method: 'POST', ...asA,
    body: { account_id: a.account.id, user_id: a.user.id, phone: PAGE, code: '123456', disclosure: 'x', how: 'x', caller: 'agreement', expires_at: new Date(Date.now() + 3600000).toISOString() },
  });
  req = await requestOf(c);
  check('…nor point one at another number, remove one, or write one of their own',
    closedOut(st) && closedOut(stDel) && closedOut(stIns) && req?.phone === ONE && req.code === tried.waiting.code && (await requestOf(a)) === null, `${st} ${stDel} ${stIns}`);

  if (SERVER) {
    console.log(`\nThe Settings page on ${SERVER}`);
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
    try {
      const p = await signedInUser('p');
      const page = await browser.newPage();
      const text = () => page.evaluate(() => document.body.innerText);
      const swAt = () => page.$eval('button[role="switch"]', (el) => ({ on: el.getAttribute('aria-checked') === 'true', disabled: el.disabled }));
      const codeShown = () => page.$eval('#text_code', (el) => el.textContent.trim()).catch(() => null);
      const until = (fn, arg, timeout = 20000) => page.waitForFunction(fn, { timeout }, arg).then(() => true).catch(() => false);
      const untilSwitch = (want) => until((w) => {
        const el = document.querySelector('button[role="switch"]');
        return el?.getAttribute('aria-checked') === String(w) && !el.disabled;
      }, want);
      const press = () => page.click('button[role="switch"]');
      const settings = () => page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      const saveNumber = async (phone) => {
        await page.$eval('#phone', (el) => { el.value = ''; });
        await page.type('#phone', displayPhone(phone));
        const [save] = await page.$$('xpath/.//button[normalize-space(.)="Save"]');
        await save.click();
      };

      await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
      await page.type('#email', p.user.email);
      await page.type('#password', PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.keyboard.press('Enter')]);
      await settings();
      let s = await swAt();
      let t = await text();
      const shown = await page.$eval('#text_disclosure', (el) => el.textContent);
      check('with no phone number the switch is off and cannot be moved', s.on === false && s.disabled === true, JSON.stringify(s));
      check('the disclosure sits beside it, as the library holds it', shown === TEXT_DISCLOSURE, shown);
      check('the page says texts are not being sent yet', TEXTING_OPEN || t.includes('Posterity is not sending texts yet'));
      check('email has no switch', (await page.$$('button[role="switch"]')).length === 1);

      await saveNumber(PAGE);
      await until(() => !document.querySelector('button[role="switch"]')?.disabled);
      s = await swAt();
      check('with a number saved the switch can be moved, and is still off', s.on === false && s.disabled === false && (await agreementOf(PAGE)) === null, JSON.stringify(s));

      await press();
      await until(() => !!document.querySelector('#text_code'));
      let code = await codeShown();
      req = await requestOf(p);
      t = await text();
      s = await swAt();
      check('turning it on shows a six-digit code, the one kept for this account under the test label',
        /^[0-9]{6}$/.test(code ?? '') && req?.code === code && req.phone === PAGE && req.user_id === p.user.id && req.disclosure === shown && req.caller === CALLER, `${code} ${JSON.stringify(req)}`);
      check('the page says which number to text it from and which to text it to',
        t.includes(displayPhone(PAGE)) && t.includes(`to ${displayPhone(SMS_FROM)}`) && t.includes(`${CODE_MINUTES} minutes`), t.slice(-600));
      const href = await page.$eval('#text_code_link', (el) => el.getAttribute('href')).catch(() => null);
      check('…with a link that opens a text to Posterity\'s number carrying the code', href === `sms:${SMS_FROM}?&body=${code}`, `${href}`);
      check('the switch stays off and holds still while the code waits, and nothing is recorded yet',
        s.on === false && s.disabled === true && (await agreementOf(PAGE)) === null && (await accountRow(p)).phone_confirmed_at === null && !(await messagesOf(p)).length, JSON.stringify(s));
      await settings();
      check('the code is still showing when the page is loaded again', (await codeShown()) === code);

      const [cancelButton] = await page.$$('xpath/.//*[@id="text_waiting"]//button[normalize-space(.)="Cancel"]');
      await cancelButton.click();
      await until(() => !document.querySelector('#text_code'));
      s = await swAt();
      check('Cancel takes the code away and frees the switch', (await codeShown()) === null && s.on === false && s.disabled === false && (await requestOf(p)) === null, JSON.stringify(s));
      got = await inbound(PAGE, code);
      check('…and the cancelled code, texted, turns nothing on', got.textSwitch === null && (await agreementOf(PAGE)) === null);

      await press();
      await until(() => !!document.querySelector('#text_code'));
      code = await codeShown();
      check('turning it on again shows a code', /^[0-9]{6}$/.test(code ?? '') && (await requestOf(p))?.code === code, `${code}`);
      // The customer's text arrives. Nothing touches the page from here: it
      // has to find the switch on by itself.
      got = await inbound(PAGE, code);
      const turned = await untilSwitch(true);
      s = await swAt();
      check('when the text arrives the page turns the switch on by itself',
        got.textSwitch?.result === 'on' && turned && s.on === true && (await codeShown()) === null && (await text()).includes(`On · ${displayPhone(PAGE)}`), JSON.stringify({ got: got.textSwitch, s }));
      [ag] = (await eventsOf(PAGE, 'agreement')).slice(-1);
      queued = (await messagesOf(p)).filter((m) => m.copy_key === 'sms.agreement_confirmation');
      check('the agreement is recorded for this customer, with the disclosure exactly as the page showed it and the text that proved the number',
        ag?.detail?.disclosure === shown && ag.detail.who?.user_id === p.user.id && ag.detail.how === HOW_SETTINGS && ag.account_id === p.account.id &&
        ag.is_test === true && ag.detail.evidence?.by === 'text_from_number' && ag.detail.evidence.twilio_sid === got.sid, JSON.stringify(ag));
      check('the number is confirmed for the account and the confirmation is queued under the test caller',
        !!(await accountRow(p)).phone_confirmed_at && queued.length === 1 && queued[0].caller === CALLER && queued[0].is_test === true && queued[0].destination === PAGE,
        JSON.stringify(queued.map((m) => [m.caller, m.is_test, m.status])));
      await settings();
      check('it is still on when the page is loaded again', (await swAt()).on === true);

      await press();
      await untilSwitch(false);
      check('turning it off shows it off and records the stop',
        (await swAt()).on === false && (await agreementOf(PAGE)).stopped_via === HOW_SETTINGS && (await eventsOf(PAGE, 'stop')).at(-1)?.detail?.who?.user_id === p.user.id);
      await press();
      await untilSwitch(true);
      check('and it turns on again at once, with no code, since the number is already proven',
        (await swAt()).on === true && (await codeShown()) === null && (await agreementOf(PAGE)).status === 'agreed' && (await requestOf(p)) === null);

      await inbound(PAGE, 'STOP');
      await settings();
      check('after a STOP reply the page shows it off', (await swAt()).on === false);
      await press();
      await until(() => document.body.innerText.includes('replied STOP'));
      t = await text();
      check('turning it on is refused, and the page says to text START to Posterity\'s number',
        (await swAt()).on === false && t.includes(`text START to ${displayPhone(SMS_FROM)}`) && (await agreementOf(PAGE)).status === 'stopped' && (await codeShown()) === null, t.slice(-400));
      await inbound(PAGE, 'START');
      await press();
      await untilSwitch(true);
      check('after START it turns on', (await swAt()).on === true && (await agreementOf(PAGE)).status === 'agreed');

      await saveNumber(TWO);
      await until(() => document.querySelector('button[role="switch"]')?.getAttribute('aria-checked') === 'false');
      check('a number changed in the form above turns the switch off',
        (await swAt()).on === false && (await accountRow(p)).phone === TWO && (await accountRow(p)).phone_confirmed_at === null);
      n = await agreements(TWO);
      await press();
      await until(() => !!document.querySelector('#text_code'));
      check('and turning it on for the new number asks for a text from that number, recording nothing',
        /^[0-9]{6}$/.test((await codeShown()) ?? '') && (await requestOf(p))?.phone === TWO && (await agreements(TWO)) === n && (await swAt()).on === false);
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
  for (const uid of users) {
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const mine = NUMBERS.filter((n) => !held.has(n));
  if (mine.length) await db.from('text_agreements').delete().in('phone', mine);
  if (inboundSids.length) await db.from('dispatch_inbound').delete().in('twilio_sid', inboundSids);
  const leftMessages = must(await db.from('dispatch_messages').select('id').eq('caller', CALLER));
  const leftAgreements = must(await db.from('text_agreements').select('phone').in('phone', NUMBERS));
  const leftInbound = must(await db.from('dispatch_inbound').select('id').in('from_phone', NUMBERS));
  const leftCodes = must(await db.from('text_switch_requests').select('account_id').eq('caller', CALLER));
  console.log(`  ${users.length} test user(s) deleted; left: ${leftMessages.length} message(s) under ${CALLER}, ${leftAgreements.length} test agreement(s), ${leftInbound.length} inbound text(s), ${leftCodes.length} waiting code(s) (its events stay in the append-only log, flagged is_test)`);
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
