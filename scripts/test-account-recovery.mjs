#!/usr/bin/env node
// Posterity — account recovery
/*
Exercises account recovery against the live database as real users, and, with a
local server, the sign-in page's request, the two link pages and the browser
marker in a real browser.

  node scripts/test-account-recovery.mjs                    the library against the live database
  node scripts/test-account-recovery.mjs --server http://localhost:3011
                                                            plus the pages and the proxy on that server, which
                                                            must run with DISPATCH_TEST_CALLER=test-account-recovery

What matters most:
  - a request opens only from a browser that has signed into that login before,
    and the page says the same thing whatever it found
  - nothing happens and no one is told until the new address uses its link,
    which works once, within an hour, and only by its button
  - the seven days count from when the last notice left; with a notice still
    waiting the request holds, and with none sent at all it closes
  - any notice's link cancels, and a cancelled request moves nothing
  - on the day, the new address signs in, the old one does not, every session
    ends, and the thirty-day lock shows in account_status()
  - no customer can read or write either table or call either function

Every request this test makes carries the caller 'test-account-recovery', which
the scheduler and the scheduled recovery pass both skip, so nothing is sent and
the live pass never touches a test request. Time is moved by handing the
library a clock, never by waiting. The test users are deleted at the end, and
their rows and queued messages go with them.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY); for the browser, CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import {
  requestRecovery, peekConfirm, confirmRecovery, peekCancel, cancelRecovery, completeDue,
  CONFIRM_COPY, NOTICE_COPY, NOTICE_SMS_COPY, COMPLETE_COPY, MAX_LINKS_PER_HOUR, WAIT_DAYS, LOCK_DAYS,
} from '../lib/auth/account-recovery.js';
import {
  rememberBrowser, isKnownBrowser, isFresh, parseCookie, cookieName, cookieOptions,
  COOKIE_PREFIX, KEEP_DAYS, RENEW_DAYS, MAX_BROWSERS,
} from '../lib/auth/known-browser.js';
import { hashToken } from '../lib/auth/recovery-email.js';
import { VerificationRefused } from '../lib/auth/double-verification.js';
import { renderEmail, renderSms } from '../lib/dispatch/render.js';

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

const CALLER = 'test-account-recovery';
const OTHER_CALLER = 'test-account-recovery-other';
const PASSWORD = 'test-password-123';
const PHONE = '+15045550137';
const DAY = 24 * 60 * 60 * 1000;
const stamp = Date.now();
const addr = (tag) => `test-ar-${stamp}-${tag}@yourposterity.com`;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
const note = (text) => console.log(`  · ${text}`);
function must({ data, error }) { if (error) throw error; return data; }
const sha = (text) => createHash('sha256').update(String(text)).digest('hex');
const closedOut = (st) => st === 401 || st === 403 || st === 404;

async function rest(path, { method = 'GET', body, key = SERVICE, token } = {}) {
  const r = await fetch(URL_ + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
}

const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const users = [];

async function adminCreate(email) {
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Account Recovery Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id, name').eq('user_id', r.id).single());
  return { user: { id: r.id, email }, account };
}
const signIn = (email) => rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email, password: PASSWORD } });
const signInAddress = async (who) => (await db.auth.admin.getUserById(who.user.id)).data?.user?.email;

async function outcome(fn) {
  try { const v = await fn(); return { reason: 'passed', value: v }; }
  catch (e) { return { reason: e instanceof VerificationRefused ? e.reason : `error: ${e.message}` }; }
}

// This browser, for the library: a cookie jar holding one value under the
// login's own cookie name.
async function jar(who, value) {
  const name = await cookieName(who.user.id);
  return (asked) => (asked === name ? value : undefined);
}
// Marks a browser for the login, as the proxy does, and returns its jar.
async function knownJar(who) {
  return jar(who, await rememberBrowser(db, { userId: who.user.id }));
}
const request = (who, newEmail, readCookie, extra = {}) =>
  requestRecovery(db, { email: who.user.email, newEmail, readCookie, caller: CALLER, ...extra });
const pass = (now = () => new Date()) => completeDue(db, { onlyCaller: CALLER, now });
const clock = (ms) => () => new Date(Date.now() + ms);

const requests = async (accountId) => must(await db.from('account_recoveries').select().eq('account_id', accountId).order('created_at'));
const requestRow = async (id) => must(await db.from('account_recoveries').select().eq('id', id).single());
const messages = async (accountId, copy) => must(await db.from('dispatch_messages')
  .select('id, params, copy_key, channel, destination, caller, is_test, self_initiated, status, sent_at, idempotency_key')
  .eq('account_id', accountId).eq('copy_key', copy).order('created_at'));
const notices = async (id) => must(await db.from('dispatch_messages')
  .select('id, params, copy_key, channel, destination, caller, is_test, self_initiated, status, sent_at, idempotency_key')
  .like('idempotency_key', `account-recovery-notice:${id}:%`).order('idempotency_key'));
const setNotices = async (id, which, fields) => must(await db.from('dispatch_messages').update(fields)
  .like('idempotency_key', `account-recovery-notice:${id}:${which}%`).select('id')).length;
const tokenOf = (msg) => new URL(msg?.params?.link ?? 'http://x').searchParams.get('token');
const browsers = async (userId) => must(await db.from('known_browsers').select().eq('user_id', userId).order('last_seen_at'));

// A request taken as far as its seven days: asked from a known browser and
// confirmed by its link. Returns { id, cancelToken }.
async function waiting(who, newEmail, extra = {}) {
  const r = await request(who, newEmail, await knownJar(who), extra);
  if (!r.sent) throw new Error(`request for ${who.user.email} not sent: ${r.reason}`);
  const [msg] = (await messages(who.account.id, CONFIRM_COPY)).slice(-1);
  const c = await confirmRecovery(db, { token: tokenOf(msg) });
  if (c.outcome !== 'waiting') throw new Error(`request for ${who.user.email} not confirmed: ${c.outcome}`);
  const [first] = await notices(r.id);
  return { id: r.id, cancelToken: tokenOf(first) };
}

try {
  const t1 = await db.from('account_recoveries').select('id').limit(1);
  const t2 = await db.from('known_browsers').select('user_id').limit(1);
  const copy = must(await db.from('dispatch_copy').select()
    .or(`key.in.(${CONFIRM_COPY},${NOTICE_COPY},${NOTICE_SMS_COPY},${COMPLETE_COPY}),kind.eq.frame`));
  const applied = !t1.error && !t2.error && [CONFIRM_COPY, NOTICE_COPY, NOTICE_SMS_COPY, COMPLETE_COPY].every((k) => copy.some((r) => r.key === k));
  check('both tables and the four copy rows are in the database (20261110000000)', applied, 'not applied: nothing else can run');
  if (!applied) throw new Error('migration not applied');
  const frame = copy.find((x) => x.kind === 'frame');
  const copyRow = (key) => copy.find((x) => x.key === key);

  console.log('\nThe browser marker (live database)');
  const k1 = await adminCreate(addr('k1'));
  const k2 = await adminCreate(addr('k2'));
  const v1 = await rememberBrowser(db, { userId: k1.user.id });
  const held1 = parseCookie(v1);
  let rows = await browsers(k1.user.id);
  check('marking a browser stores a hash of its marker and not the marker', !!held1 && rows.length === 1 && rows[0].marker_hash === sha(held1.marker) && !JSON.stringify(rows).includes(held1.marker), JSON.stringify(rows).slice(0, 200));
  check('that browser is known for its login', await isKnownBrowser(db, { userId: k1.user.id, cookieValue: v1 }));
  const madeUp = `${'A'.repeat(43)}.${Math.floor(Date.now() / 1000)}`;
  check('a marker the server never issued is not', !(await isKnownBrowser(db, { userId: k1.user.id, cookieValue: madeUp })));
  check('nor is one login\'s marker for another login', !(await isKnownBrowser(db, { userId: k2.user.id, cookieValue: v1 })));
  check('nor a value that is no marker, or none', !(await isKnownBrowser(db, { userId: k1.user.id, cookieValue: 'nope' })) && !(await isKnownBrowser(db, { userId: k1.user.id, cookieValue: undefined })));
  check(`nor a browser unseen for ${KEEP_DAYS + 1} days`, !(await isKnownBrowser(db, { userId: k1.user.id, cookieValue: v1, now: clock((KEEP_DAYS + 1) * DAY) })));
  const planted = await rememberBrowser(db, { userId: k1.user.id, cookieValue: madeUp });
  rows = await browsers(k1.user.id);
  check('a planted marker is replaced with a new one, never adopted', parseCookie(planted).marker !== 'A'.repeat(43) && rows.length === 2 && !rows.some((r) => r.marker_hash === sha('A'.repeat(43))), `${rows.length} rows`);
  const later = clock((RENEW_DAYS + 1) * DAY);
  const renewed = await rememberBrowser(db, { userId: k1.user.id, cookieValue: v1, now: later });
  rows = await browsers(k1.user.id);
  const kept = rows.find((r) => r.marker_hash === sha(held1.marker));
  check('a marker already recorded is kept, and its last-seen time moves', parseCookie(renewed).marker === held1.marker && rows.length === 2 && new Date(kept.last_seen_at) > new Date(kept.first_seen_at), JSON.stringify(kept));
  check(`a cookie is fresh for ${RENEW_DAYS} days and then due a write`, isFresh(v1) && !isFresh(v1, new Date(Date.now() + (RENEW_DAYS + 1) * DAY)) && !isFresh('nope') && !isFresh(undefined));
  const n1 = await cookieName(k1.user.id), n2 = await cookieName(k2.user.id);
  check('each login has its own cookie name, which does not carry the login\'s id', n1 !== n2 && n1.startsWith(COOKIE_PREFIX) && !n1.includes(k1.user.id));
  const o = cookieOptions({ secure: true });
  check('the cookie is httpOnly, lax, secure, and kept 400 days', o.httpOnly === true && o.sameSite === 'lax' && o.secure === true && o.path === '/' && o.maxAge === KEEP_DAYS * 86400, JSON.stringify(o));
  // Sixty rows written directly for the second login, five of them unseen for
  // over 400 days; the next marking prunes.
  const old = (days) => new Date(Date.now() - days * DAY).toISOString();
  must(await db.from('known_browsers').insert(Array.from({ length: 60 }, (_, i) => ({
    user_id: k2.user.id, marker_hash: sha(`seed-${i}`), first_seen_at: old(i < 5 ? 500 : 100), last_seen_at: old(i < 5 ? 401 + i : 1 + i),
  }))));
  const v2 = await rememberBrowser(db, { userId: k2.user.id });
  rows = await browsers(k2.user.id);
  check(`a login keeps its newest ${MAX_BROWSERS} browsers, and none unseen for 400 days`, rows.length === MAX_BROWSERS && rows.every((r) => new Date(r.last_seen_at) > new Date(Date.now() - KEEP_DAYS * DAY)) && rows.some((r) => r.marker_hash === sha(parseCookie(v2).marker)), `${rows.length} rows`);

  console.log('\nThe request (caller test-account-recovery, nothing sent)');
  const a = await adminCreate(addr('a'));
  const b = await adminCreate(addr('b'));
  const none = async () => undefined;
  let r = await outcome(() => requestRecovery(db, { email: 'not-an-address', newEmail: addr('a-new'), readCookie: none, caller: CALLER }));
  check('a sign-in address that cannot be read is refused with bad_email', r.reason === 'bad_email', r.reason);
  r = await outcome(() => request(a, 'nope', none));
  check('a new address that cannot be read is refused with bad_new_email', r.reason === 'bad_new_email', r.reason);
  r = await outcome(() => request(a, `  ${a.user.email.toUpperCase()} `, none));
  check('the same address twice is refused with same_address', r.reason === 'same_address', r.reason);
  r = await outcome(() => requestRecovery(db, { email: addr('nobody'), newEmail: addr('a-new'), readCookie: none, caller: CALLER }));
  check('an address no one signs in with is quiet: no_login', r.value?.sent === false && r.value.reason === 'no_login', JSON.stringify(r));
  r = await outcome(() => request(a, addr('a-new'), () => undefined));
  check('a browser with no marker is quiet: unknown_browser', r.value?.sent === false && r.value.reason === 'unknown_browser', JSON.stringify(r));
  r = await outcome(async () => request(a, addr('a-new'), await jar(a, v1)));
  check('so is a browser holding another login\'s marker', r.value?.reason === 'unknown_browser', JSON.stringify(r));
  check('…and nothing is stored or queued', (await requests(a.account.id)).length === 0 && (await messages(a.account.id, CONFIRM_COPY)).length === 0);

  const jarA = await knownJar(a);
  r = await outcome(() => request(a, b.user.email, jarA));
  check('from a known browser, a new address another login signs in with is quiet: new_email_taken', r.value?.reason === 'new_email_taken' && (await requests(a.account.id)).length === 0, JSON.stringify(r));
  r = await outcome(() => request({ user: { email: `  ${a.user.email.toUpperCase()}` } }, ` ${addr('a-new1').toUpperCase()} `, jarA));
  check('from a known browser the request is sent', r.value?.sent === true && !!r.value.id, JSON.stringify(r));
  const id1 = r.value?.id;
  let row = await requestRow(id1);
  let [msg] = await messages(a.account.id, CONFIRM_COPY);
  const token1 = tokenOf(msg);
  check('…stored with the new address in lower case, and a hash of the link\'s token, not the token', row.new_email === addr('a-new1') && row.confirm_token_hash === hashToken(token1) && !JSON.stringify(row).includes(token1) && row.caller === CALLER && !row.confirmed_at && !row.due_at && !row.closed_at, JSON.stringify(row));
  check('…and one email queued to the new address, flagged as a test', msg?.destination === addr('a-new1') && msg.caller === CALLER && msg.is_test === true && msg.self_initiated === true && (await messages(a.account.id, CONFIRM_COPY)).length === 1, JSON.stringify(msg));
  const link1 = new URL(msg.params.link);
  check('…whose link is on www.yourposterity.com/account-recovery/confirm', link1.origin === 'https://www.yourposterity.com' && link1.pathname === '/account-recovery/confirm', msg.params.link);
  let rendered = null, err = null;
  try { rendered = renderEmail(copyRow(CONFIRM_COPY), msg.params, frame); } catch (e) { err = e; }
  check('the email renders with its link and the placeholder marker', rendered && rendered.text.includes(msg.params.link) && rendered.subject.startsWith('[Placeholder:') && !/\{\{/.test(rendered.html + rendered.text), err?.message);
  check('no one on file is told yet', (await messages(a.account.id, NOTICE_COPY)).length === 0 && (await messages(a.account.id, NOTICE_SMS_COPY)).length === 0);

  r = await outcome(() => request(a, addr('a-new2'), jarA));
  const id2 = r.value?.id;
  row = await requestRow(id1);
  check('asking again replaces the earlier request', r.value?.sent === true && row.outcome === 'superseded' && !!row.closed_at, JSON.stringify(row));
  check('…whose link no longer works', (await peekConfirm(db, { token: token1 })) === null && (await confirmRecovery(db, { token: token1 })).outcome === 'invalid');
  for (let i = 2; i < MAX_LINKS_PER_HOUR; i++) await request(a, addr(`a-new${i + 1}`), jarA);
  r = await outcome(() => request(a, addr('a-over'), jarA));
  const open = (await requests(a.account.id)).filter((x) => !x.closed_at);
  check(`a link past ${MAX_LINKS_PER_HOUR} within an hour is quiet: too_many_links, and the request before it stays`, r.value?.reason === 'too_many_links' && open.length === 1 && open[0].new_email === addr(`a-new${MAX_LINKS_PER_HOUR}`) && (await messages(a.account.id, CONFIRM_COPY)).length === MAX_LINKS_PER_HOUR, `${r.value?.reason} ${open.length}`);
  const idA = open[0].id;
  const newA = open[0].new_email;
  const tokenA = tokenOf((await messages(a.account.id, CONFIRM_COPY)).slice(-1)[0]);

  console.log('\nThe link to the new address');
  // A's other routes: a confirmed recovery email address and a phone number.
  must(await db.from('recovery_emails').insert({ account_id: a.account.id, email: addr('a-rec'), confirmed_at: new Date().toISOString() }));
  must(await db.from('accounts').update({ phone: PHONE }).eq('id', a.account.id));
  let peek = await peekConfirm(db, { token: tokenA });
  row = await requestRow(idA);
  check('reading the link shows the new address and uses nothing', peek?.newEmail === newA && !row.confirmed_at && row.confirm_token_hash === hashToken(tokenA), JSON.stringify(peek));
  check('an hour and a minute on, the link is refused', (await peekConfirm(db, { token: tokenA, now: clock(61 * 60000) })) === null && (await confirmRecovery(db, { token: tokenA, now: clock(61 * 60000) })).outcome === 'invalid');
  check('a made-up token does nothing', (await confirmRecovery(db, { token: 'x'.repeat(43) })).outcome === 'invalid' && (await confirmRecovery(db, { token: '' })).outcome === 'invalid' && (await confirmRecovery(db, { token: 'x'.repeat(101) })).outcome === 'invalid');
  const both = await Promise.all([confirmRecovery(db, { token: tokenA }), confirmRecovery(db, { token: tokenA })]);
  const started = both.find((x) => x.outcome === 'waiting');
  check('the button starts the request once, even pressed twice at once', both.filter((x) => x.outcome === 'waiting').length === 1 && both.filter((x) => x.outcome === 'invalid').length === 1, JSON.stringify(both));
  row = await requestRow(idA);
  const wait = new Date(row.due_at).getTime() - new Date(row.confirmed_at).getTime();
  check(`…which sets the day access moves ${WAIT_DAYS} days on, and holds a cancel token's hash and no link`, !!row.confirmed_at && wait === WAIT_DAYS * DAY && !!row.cancel_token_hash && row.confirm_token_hash === null && row.link_sent_at === null && started?.newEmail === newA && started?.dueAt && new Date(started.dueAt).getTime() === new Date(row.due_at).getTime(), JSON.stringify(row));
  let sentNotices = await notices(idA);
  const byKey = (suffix) => sentNotices.find((n) => n.idempotency_key === `account-recovery-notice:${idA}:${suffix}`);
  check('a notice is queued to the address the account signs in with', byKey('sign-in:email')?.destination === a.user.email && byKey('sign-in:email').copy_key === NOTICE_COPY);
  check('…to its confirmed recovery email address', byKey('recovery:email')?.destination === addr('a-rec') && byKey('recovery:email').copy_key === NOTICE_COPY);
  check('…and to its phone number, as a text', byKey('phone:sms')?.destination === PHONE && byKey('phone:sms').channel === 'sms' && byKey('phone:sms').copy_key === NOTICE_SMS_COPY);
  check('…three in all, each flagged as a test, queued, and not self-initiated, so a text keeps to the texting hours', sentNotices.length === 3 && sentNotices.every((n) => n.caller === CALLER && n.is_test === true && n.self_initiated === false && n.status === 'queued'), JSON.stringify(sentNotices.map((n) => [n.idempotency_key, n.status])));
  const cancelA = tokenOf(sentNotices[0]);
  const cancelLink = new URL(sentNotices[0].params.link);
  check('each carries the same cancel link, on www.yourposterity.com/account-recovery/cancel, whose token is stored only as a hash', sentNotices.every((n) => n.params.link === sentNotices[0].params.link && n.params.new_email === newA) && cancelLink.origin === 'https://www.yourposterity.com' && cancelLink.pathname === '/account-recovery/cancel' && row.cancel_token_hash === hashToken(cancelA) && !JSON.stringify(row).includes(cancelA), sentNotices[0].params.link);
  rendered = null; err = null;
  try { rendered = renderEmail(copyRow(NOTICE_COPY), byKey('sign-in:email').params, frame); } catch (e) { err = e; }
  check('the notice email renders with the cancel link and the new address', rendered && rendered.text.includes(cancelLink.href) && rendered.text.includes(newA) && !/\{\{/.test(rendered.html + rendered.text), err?.message);
  let sms = null; err = null;
  try { sms = renderSms(copyRow(NOTICE_SMS_COPY), byKey('phone:sms').params); } catch (e) { err = e; }
  check('the notice text renders with the cancel link', sms && sms.body.includes(cancelLink.href) && !/\{\{/.test(sms.body), err?.message);
  check('the link to the new address does nothing a second time', (await confirmRecovery(db, { token: tokenA })).outcome === 'invalid' && (await notices(idA)).length === 3);
  r = await outcome(() => request(a, addr('a-again'), jarA));
  check('another request while one is waiting is quiet: already_waiting', r.value?.reason === 'already_waiting' && (await requests(a.account.id)).filter((x) => !x.closed_at).length === 1, JSON.stringify(r));
  peek = await peekCancel(db, { token: cancelA });
  check('reading a notice\'s link shows the waiting request and changes nothing', peek?.state === 'waiting' && peek.newEmail === newA && !(await requestRow(idA)).closed_at, JSON.stringify(peek));

  console.log('\nThe seven days (the clock is handed to the pass)');
  let tally = await pass();
  check('a pass before the day does nothing', tally.due === 0 && tally.completed === 0 && !(await requestRow(idA)).closed_at, JSON.stringify(tally));
  tally = await pass(clock(8 * DAY));
  check('on the day, with notices still waiting to send, the request holds', tally.due === 1 && tally.held === 1 && tally.completed === 0 && !(await requestRow(idA)).closed_at && (await signInAddress(a)) === a.user.email, JSON.stringify(tally));
  // The notices as the Dispatch System would leave them: one email out an hour
  // on, one two days on, and the text refused with no agreement on file.
  const lastOut = new Date(Date.now() + 2 * DAY);
  const marked = (await setNotices(idA, 'recovery', { status: 'sent', sent_at: new Date(Date.now() + 3600000).toISOString() }))
    + (await setNotices(idA, 'sign-in', { status: 'sent', sent_at: lastOut.toISOString() }))
    + (await setNotices(idA, 'phone', { status: 'failed', last_error: 'no_agreement' }));
  check('(the test marks its own three notices as sent, sent and failed)', marked === 3, `${marked}`);
  tally = await pass(clock(8 * DAY));
  row = await requestRow(idA);
  check('the seven days count from when the last notice left: the day moves, and the request holds', tally.held === 1 && !row.closed_at && new Date(row.due_at).getTime() === lastOut.getTime() + WAIT_DAYS * DAY, `${JSON.stringify(tally)} ${row.due_at}`);
  tally = await pass(clock(8 * DAY));
  check('…so the same pass again finds nothing due', tally.due === 0, JSON.stringify(tally));

  const [, before] = await signIn(a.user.email);
  let [st, d] = await rest('/auth/v1/user', { key: ANON, token: before?.access_token });
  check('(A is signed in on a browser, with the old address)', st === 200 && d?.id === a.user.id, `${st}`);
  const moveClock = () => new Date(lastOut.getTime() + WAIT_DAYS * DAY + 60000);
  tally = await pass(moveClock);
  row = await requestRow(idA);
  check('seven days after the last notice, the pass moves access', tally.completed === 1 && row.outcome === 'completed' && !!row.closed_at, `${JSON.stringify(tally)} ${row.outcome}`);
  check('the new address is the address the account signs in with', (await signInAddress(a)) === newA, await signInAddress(a));
  [st, d] = await signIn(a.user.email);
  check('the old address no longer signs in', st >= 400 && !d?.access_token, `${st}`);
  const [stNew, after] = await signIn(newA);
  check('the new address signs in, with the password the account had (the link to choose a new one is what replaces it)', stNew === 200 && after?.user?.id === a.user.id, `${stNew}`);
  [st, d] = await rest('/auth/v1/user', { key: ANON, token: before?.access_token });
  check('the browser signed in before is signed out: its session is refused', st >= 400, `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st, d] = await rest('/auth/v1/token?grant_type=refresh_token', { method: 'POST', key: ANON, body: { refresh_token: before?.refresh_token } });
  check('…and it cannot be renewed', st >= 400 && !d?.access_token, `${st}`);
  [st, d] = await rest('/rest/v1/accounts?select=id', { key: ANON, token: before?.access_token });
  note(`the old browser's access token, sent straight to the data interface until it runs out (an hour at most): ${st}, ${Array.isArray(d) ? d.length : 0} row(s)`);

  const account = must(await db.from('accounts').select('recovered_at').eq('id', a.account.id).single());
  check('the account records when it was recovered', !!account.recovered_at && new Date(account.recovered_at).getTime() === moveClock().getTime(), account.recovered_at);
  const status = async (token) => {
    const [s, v] = await rest('/rest/v1/rpc/account_status', { method: 'POST', key: ANON, token, body: { p_account_id: a.account.id } });
    return s === 200 ? (Array.isArray(v) ? v[0] : v) : { error: s };
  };
  let seen = await status(after?.access_token);
  check(`signed in, account_status() gives the lock's end ${LOCK_DAYS} days after the recovery`, !!seen?.recovery_lock_until && new Date(seen.recovery_lock_until).getTime() === new Date(account.recovered_at).getTime() + LOCK_DAYS * DAY, JSON.stringify(seen).slice(0, 300));
  [st, d] = await rest(`/rest/v1/accounts?id=eq.${a.account.id}`, { method: 'PATCH', key: ANON, token: after?.access_token, body: { recovered_at: null } });
  const still = must(await db.from('accounts').select('recovered_at').eq('id', a.account.id).single());
  check('the customer cannot clear or change it', st >= 400 && still.recovered_at === account.recovered_at, `${st} ${JSON.stringify(d).slice(0, 160)}`);
  must(await db.from('accounts').update({ recovered_at: new Date(Date.now() - (LOCK_DAYS + 1) * DAY).toISOString() }).eq('id', a.account.id));
  seen = await status(after?.access_token);
  check(`${LOCK_DAYS + 1} days after a recovery, the lock has ended`, seen && !seen.error && seen.recovery_lock_until === null, JSON.stringify(seen).slice(0, 300));

  const done = await messages(a.account.id, COMPLETE_COPY);
  check('one email goes to the new address, flagged as a test', done.length === 1 && done[0].destination === newA && done[0].caller === CALLER && done[0].is_test === true, JSON.stringify(done.map((m) => m.destination)));
  const resetLink = new URL(done[0]?.params?.link ?? 'http://x');
  check('…whose link goes to /auth/confirm as a recovery, on to /reset-password', resetLink.origin === 'https://www.yourposterity.com' && resetLink.pathname === '/auth/confirm' && resetLink.searchParams.get('type') === 'recovery' && resetLink.searchParams.get('next') === '/reset-password', done[0]?.params?.link);
  rendered = null; err = null;
  try { rendered = renderEmail(copyRow(COMPLETE_COPY), done[0].params, frame); } catch (e) { err = e; }
  check('…and renders with that link', rendered && rendered.text.includes(done[0].params.link) && !/\{\{/.test(rendered.html + rendered.text), err?.message);
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({ type: 'recovery', token_hash: resetLink.searchParams.get('token_hash') });
  check('the link\'s token gives a session for the recovered account', !vErr && verified?.user?.id === a.user.id && verified.user.email === newA, vErr?.message ?? verified?.user?.id);
  const rec = must(await db.from('recovery_emails').select('email').eq('account_id', a.account.id).maybeSingle());
  check('the recovery email address stays, as it is a different address', rec?.email === addr('a-rec'));
  check('the browsers the login has used are still known', await isKnownBrowser(db, { userId: a.user.id, cookieValue: jarA(await cookieName(a.user.id)) }));
  tally = await pass(clock(40 * DAY));
  check('a later pass does nothing more', tally.due === 0 && (await messages(a.account.id, COMPLETE_COPY)).length === 1, JSON.stringify(tally));
  peek = await peekCancel(db, { token: cancelA });
  const lateCancel = await cancelRecovery(db, { token: cancelA });
  check('a notice\'s link used afterwards says access has already moved, and changes nothing', peek?.state === 'closed' && peek.outcome === 'completed' && lateCancel.outcome === 'completed' && lateCancel.already === true && (await signInAddress(a)) === newA, JSON.stringify([peek, lateCancel]));

  console.log('\nThe new address was the account\'s recovery email address; no phone number');
  const dd = await adminCreate(addr('d'));
  must(await db.from('recovery_emails').insert({ account_id: dd.account.id, email: addr('d-rec'), confirmed_at: new Date().toISOString() }));
  const wd = await waiting(dd, addr('d-rec'));
  sentNotices = await notices(wd.id);
  check('notices go to the sign-in address and the recovery address, and no text', sentNotices.length === 2 && sentNotices.every((n) => n.channel === 'email') && sentNotices.map((n) => n.destination).sort().join() === [dd.user.email, addr('d-rec')].sort().join(), JSON.stringify(sentNotices.map((n) => n.destination)));
  await setNotices(wd.id, '', { status: 'sent', sent_at: new Date().toISOString() });
  tally = await pass(clock(WAIT_DAYS * DAY + 60000));
  check('access moves to it', tally.completed === 1 && (await signInAddress(dd)) === addr('d-rec'), JSON.stringify(tally));
  check('…and it is no longer held as a recovery email address, which is never the sign-in address', must(await db.from('recovery_emails').select('email').eq('account_id', dd.account.id).maybeSingle()) === null);

  console.log('\nCancelling');
  const c = await adminCreate(addr('c'));
  must(await db.from('accounts').update({ phone: PHONE }).eq('id', c.account.id));
  const wc = await waiting(c, addr('c-new'));
  await setNotices(wc.id, 'sign-in', { status: 'sent', sent_at: new Date().toISOString() });
  check('a made-up cancel token matches nothing', (await peekCancel(db, { token: 'x'.repeat(43) })) === null && (await cancelRecovery(db, { token: 'x'.repeat(43) })).outcome === 'invalid' && (await cancelRecovery(db, { token: '' })).outcome === 'invalid');
  const pair = await Promise.all([cancelRecovery(db, { token: wc.cancelToken }), cancelRecovery(db, { token: wc.cancelToken })]);
  row = await requestRow(wc.id);
  check('a notice\'s link cancels the request, once, even pressed twice at once', pair.every((x) => x.outcome === 'cancelled') && pair.filter((x) => x.already).length === 1 && row.outcome === 'cancelled' && !!row.closed_at, JSON.stringify(pair));
  sentNotices = await notices(wc.id);
  check('a notice still waiting to send is withdrawn; one already sent stays as it was', sentNotices.find((n) => n.channel === 'sms')?.status === 'cancelled' && sentNotices.find((n) => n.channel === 'email')?.status === 'sent', JSON.stringify(sentNotices.map((n) => [n.channel, n.status])));
  const again = await cancelRecovery(db, { token: wc.cancelToken });
  check('the link a second time says it was already cancelled', again.outcome === 'cancelled' && again.already === true && (await peekCancel(db, { token: wc.cancelToken }))?.outcome === 'cancelled', JSON.stringify(again));
  tally = await pass(clock(30 * DAY));
  const cAccount = must(await db.from('accounts').select('recovered_at').eq('id', c.account.id).single());
  check('a pass long after moves nothing', tally.due === 0 && (await signInAddress(c)) === c.user.email && cAccount.recovered_at === null && (await messages(c.account.id, COMPLETE_COPY)).length === 0, JSON.stringify(tally));
  r = await outcome(async () => request(c, addr('c-new2'), await knownJar(c)));
  check('a new request can be made after a cancel', r.value?.sent === true, JSON.stringify(r));
  const unusedToken = tokenOf((await messages(c.account.id, CONFIRM_COPY)).slice(-1)[0]);
  tally = await pass(clock(61 * 60000));
  row = await requestRow(r.value.id);
  check('a request whose link is never used is closed as expired by the pass', tally.expired === 1 && row.outcome === 'expired' && (await confirmRecovery(db, { token: unusedToken })).outcome === 'invalid', `${JSON.stringify(tally)} ${row.outcome}`);

  console.log('\nNo notice could be sent');
  const e = await adminCreate(addr('e'));
  const we = await waiting(e, addr('e-new'));
  await setNotices(we.id, '', { status: 'failed', last_error: 'test: refused address' });
  tally = await pass(clock(8 * DAY));
  row = await requestRow(we.id);
  check('the request closes as failed and access stays where it is', tally.failed === 1 && row.outcome === 'failed' && (await signInAddress(e)) === e.user.email, `${JSON.stringify(tally)} ${row.outcome}`);

  console.log('\nThe new address is taken while the request waits');
  const f = await adminCreate(addr('f'));
  r = await request(f, addr('f-new'), await knownJar(f));
  await adminCreate(addr('f-new'));
  const taken = await confirmRecovery(db, { token: tokenOf((await messages(f.account.id, CONFIRM_COPY)).slice(-1)[0]) });
  row = await requestRow(r.id);
  check('taken before the link is used: the button refuses, the request closes, and no one is told', taken.outcome === 'address_taken' && row.outcome === 'failed' && (await notices(r.id)).length === 0, `${taken.outcome} ${row.outcome}`);
  const h = await adminCreate(addr('h'));
  const wh = await waiting(h, addr('h-new'));
  await setNotices(wh.id, '', { status: 'sent', sent_at: new Date().toISOString() });
  await adminCreate(addr('h-new'));
  tally = await pass(clock(WAIT_DAYS * DAY + 60000));
  row = await requestRow(wh.id);
  check('taken during the seven days: the request closes as failed and access stays where it is', tally.failed === 1 && row.outcome === 'failed' && (await signInAddress(h)) === h.user.email, `${JSON.stringify(tally)} ${row.outcome}`);

  console.log('\nWhich requests a pass takes');
  const s = await adminCreate(addr('s'));
  const ws = await waiting(s, addr('s-new'), { caller: OTHER_CALLER });
  await setNotices(ws.id, '', { status: 'sent', sent_at: new Date('2001-05-01T00:00:00Z').toISOString() });
  must(await db.from('account_recoveries').update({ due_at: '2001-06-01T00:00:00Z' }).eq('id', ws.id));
  check('(another test caller\'s request, its notices under that caller, long past its day)', (await notices(ws.id)).every((n) => n.caller === OTHER_CALLER));
  tally = await pass(clock(8 * DAY));
  check('a test script\'s pass takes only its own caller\'s requests', tally.due === 0 && !(await requestRow(ws.id)).closed_at, JSON.stringify(tally));
  // The scheduled pass, with its clock set to 2002: nothing real can be due or
  // expired then, and the test request, due in 2001, would be if it were taken.
  tally = await completeDue(db, { onlyCaller: null, now: () => new Date('2002-01-01T00:00:00Z') });
  check('the scheduled pass skips every test request', tally.due === 0 && tally.expired === 0 && !(await requestRow(ws.id)).closed_at && (await signInAddress(s)) === s.user.email, JSON.stringify(tally));
  r = await outcome(() => completeDue(db, { onlyCaller: 'account-recovery' }));
  check('a pass cannot be limited to a caller that is not a test\'s', r.reason.startsWith('error:'), r.reason);
  r = await outcome(() => requestRecovery(db, { email: s.user.email, newEmail: addr('s-x'), readCookie: () => undefined, caller: '' }));
  check('a request needs a caller', r.reason.startsWith('error:'), r.reason);

  console.log('\nRow-level security (as user B, signed in)');
  const [, sb] = await signIn(b.user.email);
  check('user B signs in', !!sb?.access_token);
  const asB = { key: ANON, token: sb?.access_token };
  for (const table of ['account_recoveries', 'known_browsers']) {
    [st, d] = await rest(`/rest/v1/${table}?select=*`, asB);
    check(`user B cannot read ${table}`, closedOut(st) || (st === 200 && Array.isArray(d) && d.length === 0), `${st} ${JSON.stringify(d).slice(0, 120)}`);
    [st] = await rest(`/rest/v1/${table}?select=*`, { key: ANON });
    check('…nor can anyone signed out', closedOut(st), `${st}`);
  }
  [st, d] = await rest('/rest/v1/account_recoveries', { method: 'POST', ...asB, body: { account_id: b.account.id, new_email: addr('evil'), confirmed_at: new Date().toISOString(), due_at: new Date().toISOString(), cancel_token_hash: 'h' } });
  check('user B cannot write a request for their own account', closedOut(st), `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st, d] = await rest(`/rest/v1/account_recoveries?id=eq.${ws.id}`, { method: 'PATCH', ...asB, body: { new_email: addr('evil') } });
  check('…nor change another account\'s', closedOut(st) && (await requestRow(ws.id)).new_email === addr('s-new'), `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st, d] = await rest('/rest/v1/known_browsers', { method: 'POST', ...asB, body: { user_id: a.user.id, marker_hash: sha('evil') } });
  check('…nor mark a browser as known for anyone', closedOut(st) && !(await browsers(a.user.id)).some((x) => x.marker_hash === sha('evil')), `${st} ${JSON.stringify(d).slice(0, 120)}`);
  for (const [fn, args] of [['login_id_for_email', { p_email: a.user.email }], ['end_login_sessions', { p_user_id: a.user.id }]]) {
    [st, d] = await rest(`/rest/v1/rpc/${fn}`, { method: 'POST', ...asB, body: args });
    const [stOut] = await rest(`/rest/v1/rpc/${fn}`, { method: 'POST', key: ANON, body: args });
    check(`${fn}() cannot be called, signed in or out`, closedOut(st) && closedOut(stOut), `${st} ${stOut} ${JSON.stringify(d).slice(0, 120)}`);
  }
  const at = new Date().toISOString();
  const refused = async (name, fields, code = '23514') => {
    const res = await db.from('account_recoveries').insert({ account_id: b.account.id, new_email: addr('x'), caller: CALLER, ...fields }).select('id');
    check(`the table refuses ${name}`, res.error?.code === code, res.error ? `${res.error.code} ${res.error.message}` : 'inserted');
    if (!res.error) await db.from('account_recoveries').delete().eq('id', res.data[0].id);
  };
  await refused('an open request with neither a link nor a confirmation', {});
  await refused('a link\'s token with no sent time', { confirm_token_hash: 'h' });
  await refused('a confirmed request with no day to move on', { confirmed_at: at, cancel_token_hash: 'h' });
  await refused('a confirmed request still holding its link', { confirmed_at: at, due_at: at, cancel_token_hash: 'h', confirm_token_hash: 'h', link_sent_at: at });
  await refused('a closed request with no outcome', { closed_at: at, confirm_token_hash: 'h', link_sent_at: at });
  await refused('an outcome it does not know', { closed_at: at, outcome: 'approved' });
  await refused('a new address not in lower case', { new_email: addr('X').toUpperCase(), confirm_token_hash: 'h', link_sent_at: at });
  await refused('a second open request for an account', { account_id: s.account.id, confirm_token_hash: sha(`second-${stamp}`), link_sent_at: at }, '23505');
  // No default stands in for a missing caller (20261110000001): the scheduled
  // pass would take an unlabelled test row for a real request.
  const unnamed = await db.from('account_recoveries').insert({ account_id: b.account.id, new_email: addr('x'), confirm_token_hash: sha(`unnamed-${stamp}`), link_sent_at: at }).select('id');
  check('the table refuses a request that names no caller', unnamed.error?.code === '23502', unnamed.error ? `${unnamed.error.code} ${unnamed.error.message}` : 'inserted');
  if (!unnamed.error) await db.from('account_recoveries').delete().eq('id', unnamed.data[0].id);

  if (SERVER) {
    console.log(`\nThe pages on ${SERVER}`);
    const get = (path, init = {}) => fetch(`${SERVER}${path}`, { redirect: 'manual', ...init });
    let res = await get('/login');
    check('the sign-in page links to account recovery', res.status === 200 && (await res.text()).includes('href="/account-recovery"'), `${res.status}`);
    res = await get('/api/account-recovery/run', { method: 'POST' });
    check('the scheduled pass\'s address refuses a call without the secret', res.status === 401 || res.status === 503, `${res.status}`);
    res = await get('/api/account-recovery/run', { method: 'POST', headers: { Authorization: 'Bearer not-the-secret' } });
    check('…and with a wrong one', res.status === 401 || res.status === 503, `${res.status}`);
    res = await get('/api/account-recovery/run');
    check('…and is not a page', res.status === 405 || res.status === 404, `${res.status}`);

    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
    try {
      const p = await adminCreate(addr('p'));
      const kb = await cookieName(p.user.id);
      const tools = (page) => ({
        text: () => page.evaluate(() => document.body.innerText),
        settle: async (pattern) => { await page.waitForFunction((x) => new RegExp(x).test(document.body.innerText), { timeout: 20000 }, pattern).catch(() => {}); },
        clickText: async (label) => { const [el] = await page.$$(`xpath/.//button[normalize-space(.)="${label}"]`); if (!el) throw new Error(`no button ${label}`); await el.click(); },
      });
      const ask = async (page, email, newEmail) => {
        const t = tools(page);
        await page.goto(`${SERVER}/account-recovery`, { waitUntil: 'networkidle0' });
        await page.type('#email', email);
        await page.type('#new_email', newEmail);
        await t.clickText('Send link');
        await t.settle('a link is on its way to|error messages');
        return t.text();
      };

      // A browser that has never signed in.
      const stranger = await (await browser.createBrowserContext()).newPage();
      let t = await ask(stranger, p.user.email, addr('p-new'));
      check('from a browser that has never signed in, the page says a link is on its way', t.includes(`a link is on its way to ${addr('p-new')}`), t.slice(0, 300));
      check('…and nothing is stored or queued', (await requests(p.account.id)).length === 0 && (await messages(p.account.id, CONFIRM_COPY)).length === 0);
      t = await ask(stranger, addr('nobody'), addr('p-new'));
      check('it says the same for an address no one signs in with', t.includes(`a link is on its way to ${addr('p-new')}`), t.slice(0, 300));
      t = await ask(stranger, p.user.email, p.user.email);
      check('the same address twice is refused on the page', t.includes('the new address is the address the account already signs in with') && !t.includes('a link is on its way'), t.slice(0, 300));

      // The customer's own browser: signing in marks it.
      const page = await browser.newPage();
      const own = tools(page);
      await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
      await page.type('#email', p.user.email);
      await page.type('#password', PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), own.clickText('Log In').catch(async () => { await page.keyboard.press('Enter'); })]);
      await page.goto(`${SERVER}/dashboard`, { waitUntil: 'networkidle0' });
      let cookies = await page.cookies();
      const marker = cookies.find((x) => x.name === kb);
      rows = await browsers(p.user.id);
      check('signing in gives the browser its marker, in a cookie scripts cannot read', !!marker && marker.httpOnly === true && !!parseCookie(marker.value) && (await page.evaluate(() => document.cookie)).includes(kb) === false, JSON.stringify(cookies.map((x) => x.name)));
      check('…recorded for the login as a hash', rows.length === 1 && rows[0].marker_hash === sha(parseCookie(marker?.value)?.marker), `${rows.length} rows`);
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      await page.goto(`${SERVER}/dashboard`, { waitUntil: 'networkidle0' });
      cookies = await page.cookies();
      check('later pages write nothing more and keep the cookie', (await browsers(p.user.id)).length === 1 && cookies.find((x) => x.name === kb)?.value === marker?.value);

      // The session is lost; the marker stays.
      await page.deleteCookie(...cookies.filter((x) => x.name.startsWith('sb-')));
      await page.goto(`${SERVER}/dashboard`, { waitUntil: 'networkidle0' });
      check('(signed out: the dashboard sends the browser to the sign-in page)', page.url().includes('/login'), page.url());
      t = await ask(page, p.user.email, addr('p-new'));
      let asked = (await requests(p.account.id)).filter((x) => !x.closed_at);
      const link = (await messages(p.account.id, CONFIRM_COPY)).slice(-1)[0];
      check('from that browser, signed out, the page says the same thing and the link is queued under the test caller', t.includes(`a link is on its way to ${addr('p-new')}`) && asked.length === 1 && asked[0].caller === CALLER && link?.destination === addr('p-new') && link.caller === CALLER && link.is_test === true, `${asked.length} ${JSON.stringify(link)?.slice(0, 200)}`);

      // The link to the new address, opened somewhere else entirely.
      const confirmPath = `/account-recovery/confirm?token=${tokenOf(link)}`;
      res = await get(confirmPath);
      const body = await res.text();
      check('opening the link, as a mail scanner would, starts nothing', res.status === 200 && body.includes('Start account recovery') && !(await requestRow(asked[0].id)).confirmed_at, `${res.status}`);
      const elsewhere = await (await browser.createBrowserContext()).newPage();
      const el = tools(elsewhere);
      await elsewhere.goto(`${SERVER}${confirmPath}`, { waitUntil: 'networkidle0' });
      check('the page names the new address', (await el.text()).includes(addr('p-new')));
      await el.clickText('Start account recovery');
      await el.settle('the request has started');
      row = await requestRow(asked[0].id);
      sentNotices = await notices(asked[0].id);
      check('its button starts the seven days and queues the notice', (await el.text()).includes('the request has started') && !!row.confirmed_at && sentNotices.length === 1 && sentNotices[0].destination === p.user.email && sentNotices[0].caller === CALLER, `${row.confirmed_at} ${sentNotices.length}`);
      await elsewhere.goto(`${SERVER}${confirmPath}`, { waitUntil: 'networkidle0' });
      check('the link opened again says it was already used', (await el.text()).includes('has expired or was already used'));
      await elsewhere.goto(`${SERVER}/account-recovery/confirm?token=bad`, { waitUntil: 'networkidle0' });
      check('so does a link that matches nothing', (await el.text()).includes('has expired or was already used'));

      // A notice's link.
      const cancelPath = `/account-recovery/cancel?token=${tokenOf(sentNotices[0])}`;
      res = await get(cancelPath);
      check('opening a notice\'s link cancels nothing', res.status === 200 && (await res.text()).includes('Cancel this request') && !(await requestRow(asked[0].id)).closed_at, `${res.status}`);
      await elsewhere.goto(`${SERVER}${cancelPath}`, { waitUntil: 'networkidle0' });
      await el.clickText('Cancel this request');
      await el.settle('the request is cancelled');
      row = await requestRow(asked[0].id);
      check('its button cancels the request, with no session', (await el.text()).includes('the request is cancelled') && row.outcome === 'cancelled', `${row.outcome}`);
      await elsewhere.goto(`${SERVER}${cancelPath}`, { waitUntil: 'networkidle0' });
      check('the link opened again says it was already cancelled', (await el.text()).includes('was already cancelled'));
      await elsewhere.goto(`${SERVER}/account-recovery/cancel?token=bad`, { waitUntil: 'networkidle0' });
      check('a link that matches nothing says so', (await el.text()).includes('matches no request'));
      check('the account still signs in with its own address', (await signInAddress(p)) === p.user.email);
    } finally {
      await browser.close();
    }
  } else {
    console.log('\n(no --server: the pages and the proxy were not exercised)');
  }
} catch (e) {
  if (e.message !== 'migration not applied') { console.log(`  ✗ stopped: ${e.message}`); fails++; }
} finally {
  console.log('\nCleanup');
  for (const uid of users) {
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const callers = `(${CALLER},${OTHER_CALLER})`;
  const leftRequests = await db.from('account_recoveries').select('id').in('caller', [CALLER, OTHER_CALLER]);
  const leftBrowsers = users.length ? await db.from('known_browsers').select('user_id').in('user_id', users) : { data: [] };
  const leftMessages = must(await db.from('dispatch_messages').select('id').in('caller', [CALLER, OTHER_CALLER]));
  console.log(`  ${users.length} test user(s) deleted; left under ${callers}: ${leftRequests.data?.length ?? '?'} request(s), ${leftBrowsers.data?.length ?? '?'} browser marker(s), ${leftMessages.length} message(s) (their queued events stay in the append-only log)`);
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
