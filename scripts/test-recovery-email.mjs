#!/usr/bin/env node
// Posterity — the recovery email address
/*
Exercises the recovery email address against the live database as real users,
and, with a local server, Settings in a real browser, the confirm link, and the
reset from the forgot-password page.

  node scripts/test-recovery-email.mjs                      the library against the live database
  node scripts/test-recovery-email.mjs --server http://localhost:3011
                                                            plus Settings, the confirm route and the
                                                            forgot-password page on that server, which
                                                            must run with DISPATCH_TEST_CALLER=test-recovery-email

What matters most:
  - adding or changing the address, or sending its link again, needs the
    password; a wrong one sends nothing and stores nothing
  - the link works once, within an hour, and only while it is the newest; the
    token is never stored
  - only a confirmed address receives a reset link, the reset link opens the
    new-password page for the right account, and a waiting address gets none
  - changing the address keeps the confirmed one receiving resets until the
    new one's link is used (20261109000001_recovery_email_pending)
  - no customer can read or write the table, their own row included

Every message this test queues carries the caller 'test-recovery-email', which
the scheduler skips, so nothing is sent. Supabase's own mailer is never asked
to send: the forgot-password page is given recovery addresses only, which no
user signs in with. The test users are deleted at the end, and their rows and
queued messages go with them.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY); for the browser, CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import {
  setRecoveryEmail, resendRecoveryLink, confirmRecoveryEmail, cancelRecoveryChange, removeRecoveryEmail, sendRecoveryResets,
  readRecoveryEmail, hashToken, CONFIRM_COPY, RESET_COPY, MAX_LINKS_PER_HOUR, MAX_RESETS_PER_HOUR,
} from '../lib/auth/recovery-email.js';
import { VerificationRefused } from '../lib/auth/double-verification.js';
import { renderEmail } from '../lib/dispatch/render.js';

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

const CALLER = 'test-recovery-email';
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-re-${stamp}-${tag}@yourposterity.com`;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) fails++;
}
function must({ data, error }) { if (error) throw error; return data; }

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
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Recovery Email Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id, name').eq('user_id', r.id).single());
  return { user: { id: r.id, email }, account };
}

async function outcome(fn) {
  try { const v = await fn(); return { reason: 'passed', value: v }; }
  catch (e) { return { reason: e instanceof VerificationRefused ? e.reason : `error: ${e.message}` }; }
}

// The newest message of a kind queued for an account, as the email would carry it.
async function lastMessage(accountId, copy) {
  const [msg] = must(await db.from('dispatch_messages').select('params, copy_key, destination, caller, is_test, self_initiated, created_at')
    .eq('account_id', accountId).eq('copy_key', copy).order('created_at', { ascending: false }).limit(1));
  return msg;
}
const tokenOf = (msg) => new URL(msg?.params?.link ?? 'http://x').searchParams.get('token');
const row = async (accountId) => must(await db.from('recovery_emails').select().eq('account_id', accountId).maybeSingle());
const opts = { url: URL_, anonKey: ANON, caller: CALLER, isTest: true };
const resetOpts = { caller: CALLER, isTest: true };

try {
  const table = await db.from('recovery_emails').select('account_id, pending_email').limit(1);
  const copy = must(await db.from('dispatch_copy').select().or(`key.in.(${CONFIRM_COPY},${RESET_COPY}),kind.eq.frame`));
  const applied = !table.error && copy.some((r) => r.key === CONFIRM_COPY);
  check('the table, its waiting address and the copy row are in the database (20261109000000, 20261109000001)', applied,
    'not applied: nothing else can run');
  if (!applied) throw new Error('migration not applied');
  const frame = copy.find((x) => x.kind === 'frame');

  const a = await adminCreate(addr('a'));
  const b = await adminCreate(addr('b'));
  const set = (who, email, extra = {}) => setRecoveryEmail(db, { account: who.account, user: who.user, email, password: PASSWORD, ...opts, ...extra });

  console.log('\nAdding the address (live database, caller test-recovery-email, nothing sent)');
  let r = await outcome(() => set(a, addr('a-rec'), { password: 'not-it-999' }));
  check('a wrong password is refused with wrong_password', r.reason === 'wrong_password', r.reason);
  check('…and stores nothing and queues nothing', !(await row(a.account.id)) && !(await lastMessage(a.account.id, CONFIRM_COPY)));
  r = await outcome(() => set(a, 'not-an-address'));
  check('an address that cannot be read is refused with bad_email', r.reason === 'bad_email', r.reason);
  r = await outcome(() => set(a, a.user.email.toUpperCase()));
  check('the address the account signs in with is refused with same_as_sign_in', r.reason === 'same_as_sign_in', r.reason);

  r = await outcome(() => set(a, `  ${addr('a-rec').toUpperCase()} `));
  check('the right password stores the address, trimmed and in lower case', r.reason === 'passed' && r.value?.email === addr('a-rec'), r.reason);
  let held = await row(a.account.id);
  let msg = await lastMessage(a.account.id, CONFIRM_COPY);
  const token1 = tokenOf(msg);
  check('…waiting, with a hash of the link\'s token and not the token', held.pending_email === addr('a-rec') && held.email === null && !held.confirmed_at && held.token_hash === hashToken(token1) && !JSON.stringify(held).includes(token1), JSON.stringify(held));
  check('…and queues one confirmation email to the recovery address, flagged as a test', msg?.destination === addr('a-rec') && msg.caller === CALLER && msg.is_test === true && msg.self_initiated === true, JSON.stringify(msg));
  const link1 = new URL(msg.params.link);
  check('…whose link is on www.yourposterity.com/auth/recovery-email', link1.origin === 'https://www.yourposterity.com' && link1.pathname === '/auth/recovery-email', msg.params.link);
  let rendered = null, err = null;
  try { rendered = renderEmail(copy.find((x) => x.key === CONFIRM_COPY), msg.params, frame); } catch (e) { err = e; }
  check('the confirmation email renders with its link and the placeholder marker', rendered && rendered.text.includes(msg.params.link) && rendered.subject.startsWith('[Placeholder:') && !/\{\{/.test(rendered.html + rendered.text), err?.message);
  let shown = await readRecoveryEmail(db, a.account.id);
  check('Settings reads it as waiting, not expired, with no confirmed address', shown?.email === null && shown.pending?.email === addr('a-rec') && !shown.pending.expired, JSON.stringify(shown));
  shown = await readRecoveryEmail(db, a.account.id, { now: () => new Date(Date.now() + 61 * 60000) });
  check('…and as expired an hour and a minute on', shown?.pending?.expired === true);

  console.log('\nA waiting address receives no reset');
  check('a reset asked for with a waiting address queues nothing', (await sendRecoveryResets(db, { email: addr('a-rec'), ...resetOpts })) === 0 && !(await lastMessage(a.account.id, RESET_COPY)));

  console.log('\nThe link');
  check('the right token an hour and a minute on is refused', (await confirmRecoveryEmail(db, { token: token1, now: () => new Date(Date.now() + 61 * 60000) })) === null);
  r = await outcome(() => resendRecoveryLink(db, { account: a.account, user: a.user, password: 'not-it-999', ...opts }));
  check('sending the link again needs the password', r.reason === 'wrong_password', r.reason);
  r = await outcome(() => resendRecoveryLink(db, { account: a.account, user: a.user, password: PASSWORD, ...opts }));
  const token2 = tokenOf(await lastMessage(a.account.id, CONFIRM_COPY));
  check('with it, a new link goes', r.reason === 'passed' && token2 && token2 !== token1, r.reason);
  check('…and the earlier link no longer works', (await confirmRecoveryEmail(db, { token: token1 })) === null);
  check('a made-up token does nothing', (await confirmRecoveryEmail(db, { token: 'x'.repeat(43) })) === null && (await confirmRecoveryEmail(db, { token: '' })) === null);
  const both = await Promise.all([confirmRecoveryEmail(db, { token: token2 }), confirmRecoveryEmail(db, { token: token2 })]);
  check('the newest link confirms the address, once, even clicked twice at once', both.filter((x) => x === addr('a-rec')).length === 1 && both.filter((x) => x === null).length === 1, JSON.stringify(both));
  held = await row(a.account.id);
  check('…which leaves it confirmed, with nothing waiting and no token held', held.email === addr('a-rec') && !!held.confirmed_at && held.pending_email === null && held.token_hash === null && held.link_sent_at === null, JSON.stringify(held));
  check('the same link a second time does nothing', (await confirmRecoveryEmail(db, { token: token2 })) === null);
  r = await outcome(() => set(a, addr('a-rec')));
  check('adding the confirmed address again is refused with already_held', r.reason === 'already_held', r.reason);
  r = await outcome(() => resendRecoveryLink(db, { account: a.account, user: a.user, password: PASSWORD, ...opts }));
  check('a confirmed address has no link to send again', r.reason === 'nothing_waiting', r.reason);

  console.log('\nThe reset through the recovery address');
  let n = await sendRecoveryResets(db, { email: ` ${addr('a-rec').toUpperCase()}`, ...resetOpts });
  msg = await lastMessage(a.account.id, RESET_COPY);
  check('a reset asked for with the confirmed address queues one reset email to it', n === 1 && msg?.destination === addr('a-rec') && msg.caller === CALLER && msg.is_test === true, `${n} ${JSON.stringify(msg)}`);
  const resetLink = new URL(msg?.params?.link ?? 'http://x');
  check('…whose link goes to /auth/confirm as a recovery, on to /reset-password', resetLink.origin === 'https://www.yourposterity.com' && resetLink.pathname === '/auth/confirm' && resetLink.searchParams.get('type') === 'recovery' && resetLink.searchParams.get('next') === '/reset-password', msg?.params?.link);
  rendered = renderEmail(copy.find((x) => x.key === RESET_COPY), msg.params, frame);
  check('…and renders with that link', rendered.text.includes(msg.params.link));
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({ type: 'recovery', token_hash: resetLink.searchParams.get('token_hash') });
  check('the link\'s token gives a session for the account it belongs to', !vErr && verified?.user?.id === a.user.id, vErr?.message ?? verified?.user?.id);
  check('the sign-in address of the same account queues no recovery reset', (await sendRecoveryResets(db, { email: a.user.email, ...resetOpts })) === 0);
  check('an address no one holds queues nothing', (await sendRecoveryResets(db, { email: addr('nobody'), ...resetOpts })) === 0);
  check('nor does an address that cannot be read', (await sendRecoveryResets(db, { email: 'nope', ...resetOpts })) === 0);

  // B holds the same recovery address: each account gets its own reset.
  await set(b, addr('a-rec'));
  await confirmRecoveryEmail(db, { token: tokenOf(await lastMessage(b.account.id, CONFIRM_COPY)) });
  n = await sendRecoveryResets(db, { email: addr('a-rec'), ...resetOpts });
  check('an address two accounts hold gets a reset for each', n === 2, `${n}`);
  const sent = must(await db.from('dispatch_messages').select('id').eq('account_id', a.account.id).eq('copy_key', RESET_COPY).eq('caller', CALLER)).length;
  for (let i = sent; i < MAX_RESETS_PER_HOUR; i++) await sendRecoveryResets(db, { email: addr('a-rec'), ...resetOpts });
  const before = must(await db.from('dispatch_messages').select('id').eq('account_id', a.account.id).eq('copy_key', RESET_COPY).eq('caller', CALLER)).length;
  await sendRecoveryResets(db, { email: addr('a-rec'), ...resetOpts });
  const after = must(await db.from('dispatch_messages').select('id').eq('account_id', a.account.id).eq('copy_key', RESET_COPY).eq('caller', CALLER)).length;
  check(`resets stop at ${MAX_RESETS_PER_HOUR} an hour for an account`, before === MAX_RESETS_PER_HOUR && after === before, `${before} → ${after}`);

  console.log('\nChanging, cancelling and removing');
  // Resets above hit A's hourly cap, so who holds an address is read from the
  // table, where sendRecoveryResets looks it up.
  const holdersOf = async (email) => must(await db.from('recovery_emails').select('account_id')
    .eq('email', email).not('confirmed_at', 'is', null)).map((x) => x.account_id).sort();
  const touchedBefore = held.updated_at;
  r = await outcome(() => set(a, addr('a-rec2')));
  held = await row(a.account.id);
  check('changing the address waits on a new link beside the confirmed one', r.reason === 'passed' && held.email === addr('a-rec') && !!held.confirmed_at && held.pending_email === addr('a-rec2'), JSON.stringify(held));
  check('…which still receives resets for this account', JSON.stringify(await holdersOf(addr('a-rec'))) === JSON.stringify([a.account.id, b.account.id].sort()));
  check('…while the new one receives none', (await holdersOf(addr('a-rec2'))).length === 0);
  check('updated_at moves on its own (t_recovery_emails)', new Date(held.updated_at) > new Date(touchedBefore), `${touchedBefore} → ${held.updated_at}`);
  shown = await readRecoveryEmail(db, a.account.id);
  check('Settings reads the confirmed address and the waiting one', shown?.email === addr('a-rec') && shown.pending?.email === addr('a-rec2'), JSON.stringify(shown));
  check('the new link confirms the new address', (await confirmRecoveryEmail(db, { token: tokenOf(await lastMessage(a.account.id, CONFIRM_COPY)) })) === addr('a-rec2'));
  held = await row(a.account.id);
  check('…which replaces the old one, with nothing left waiting', held.email === addr('a-rec2') && held.pending_email === null && held.token_hash === null, JSON.stringify(held));
  check('…so the old address now resets only the other account', JSON.stringify(await holdersOf(addr('a-rec'))) === JSON.stringify([b.account.id]));
  check('…and the new one resets this account', JSON.stringify(await holdersOf(addr('a-rec2'))) === JSON.stringify([a.account.id]));

  await set(a, addr('a-rec3'));
  await cancelRecoveryChange(db, { accountId: a.account.id });
  held = await row(a.account.id);
  check('dropping a waiting change keeps the confirmed address', held?.email === addr('a-rec2') && held.pending_email === null && held.token_hash === null, JSON.stringify(held));
  await removeRecoveryEmail(db, { accountId: a.account.id });
  check('removing drops the address', !(await row(a.account.id)) && (await readRecoveryEmail(db, a.account.id)) === null);
  await set(a, addr('a-rec4'));
  await cancelRecoveryChange(db, { accountId: a.account.id });
  check('dropping a waiting address with nothing confirmed drops the row', !(await row(a.account.id)));
  const links = must(await db.from('dispatch_messages').select('id').eq('account_id', a.account.id).eq('copy_key', CONFIRM_COPY).eq('caller', CALLER)).length;
  for (let i = links; i < MAX_LINKS_PER_HOUR; i++) await set(a, addr(`a-rec-${i}`));
  r = await outcome(() => set(a, addr('a-rec-over')));
  check(`a link past ${MAX_LINKS_PER_HOUR} within an hour is refused with too_many_links`, r.reason === 'too_many_links', r.reason);
  await removeRecoveryEmail(db, { accountId: a.account.id });

  console.log('\nRow-level security (as user B, signed in)');
  const [, s] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email: b.user.email, password: PASSWORD } });
  check('user B signs in', !!s?.access_token);
  let [st, d] = await rest('/rest/v1/recovery_emails?select=*', { key: ANON, token: s?.access_token });
  check('user B cannot read the table, their own row included', st === 401 || st === 403 || (st === 200 && Array.isArray(d) && d.length === 0), `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st, d] = await rest(`/rest/v1/recovery_emails?account_id=eq.${b.account.id}`, { method: 'PATCH', key: ANON, token: s?.access_token, body: { email: addr('evil') } });
  check('…nor change it', st === 401 || st === 403, `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st, d] = await rest('/rest/v1/recovery_emails', { method: 'POST', key: ANON, token: s?.access_token, body: { account_id: a.account.id, email: addr('evil'), confirmed_at: new Date().toISOString() } });
  check('…nor write a confirmed row', st === 401 || st === 403, `${st} ${JSON.stringify(d).slice(0, 120)}`);
  [st] = await rest('/rest/v1/recovery_emails?select=*', { key: ANON });
  check('signed out, the table is closed too', st === 401 || st === 403, `${st}`);
  const at = new Date().toISOString();
  const refused = async (name, fields) => {
    const res = await db.from('recovery_emails').insert({ account_id: a.account.id, ...fields });
    check(`the table refuses ${name}`, res.error?.code === '23514', res.error ? `${res.error.code} ${res.error.message}` : 'inserted');
    if (!res.error) await removeRecoveryEmail(db, { accountId: a.account.id });
  };
  await refused('an address that is neither confirmed nor waiting on a link', { email: addr('x') });
  await refused('a row with no address', {});
  await refused('a waiting address with no token', { pending_email: addr('x'), link_sent_at: at });
  await refused('the same address confirmed and waiting', { email: addr('x'), confirmed_at: at, pending_email: addr('x'), token_hash: 'h', link_sent_at: at });
  await refused('a waiting address not in lower case', { pending_email: addr('X').toUpperCase(), token_hash: 'h', link_sent_at: at });

  if (SERVER) {
    console.log(`\nThe confirm route on ${SERVER}`);
    const get = (path) => fetch(`${SERVER}${path}`, { redirect: 'manual' });
    const where = (res) => { const l = res.headers.get('location') ?? ''; try { return new URL(l).pathname + new URL(l).search; } catch { return l; } };
    const c = await adminCreate(addr('c'));
    await set(c, addr('c-rec'));
    const tc = tokenOf(await lastMessage(c.account.id, CONFIRM_COPY));
    let res = await get('/auth/recovery-email?token=bad');
    check('a bad link goes to Settings with link_expired', where(res) === '/dashboard/settings?recovery_email=link_expired', where(res));
    res = await get(`/auth/recovery-email?token=${tc}`);
    check('the right link, with no session, confirms and goes to Settings', where(res) === '/dashboard/settings?recovery_email=confirmed' && !!(await row(c.account.id)).confirmed_at, where(res));
    res = await get(`/auth/recovery-email?token=${tc}`);
    check('the same link again goes to Settings with link_expired', where(res) === '/dashboard/settings?recovery_email=link_expired', where(res));

    console.log(`\nSettings and the forgot-password page on ${SERVER} (in a browser)`);
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
    try {
      const e = await adminCreate(addr('e'));
      const page = await browser.newPage();
      const text = () => page.evaluate(() => document.body.innerText);
      const settle = async (pattern) => { await page.waitForFunction((p) => new RegExp(p).test(document.body.innerText), { timeout: 20000 }, pattern).catch(() => {}); };
      const clickText = async (label) => { const [el] = await page.$$(`xpath/.//button[normalize-space(.)="${label}"]`); if (!el) throw new Error(`no button ${label}`); await el.click(); };

      await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
      await page.type('#email', e.user.email);
      await page.type('#password', PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), clickText('Log In').catch(async () => { await page.keyboard.press('Enter'); })]);
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      let t = await text();
      check('Settings shows no recovery address and a way to add one', t.includes('no recovery email address is held') && t.includes('Add a recovery email address'), t.slice(0, 300));
      await clickText('Add a recovery email address');
      await page.waitForSelector('#recovery_email');
      await page.type('#recovery_email', addr('e-rec'));
      await page.type('#recovery_password', 'not-it-999');
      await clickText('Send link');
      await settle('the password re-entered is wrong');
      check('a wrong password is refused, and nothing is stored', (await text()).includes('the password re-entered is wrong') && !(await row(e.account.id)));
      await page.$eval('#recovery_password', (el) => { el.value = ''; });
      await page.type('#recovery_password', PASSWORD);
      await clickText('Send link');
      await settle('a confirmation link went to');
      t = await text();
      const me = await lastMessage(e.account.id, CONFIRM_COPY);
      check('the right password sends the link, queued under the test caller', t.includes(`a confirmation link went to ${addr('e-rec')}`) && me?.destination === addr('e-rec') && me.caller === CALLER, t.slice(0, 300));
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      t = await text();
      check('on reload, Settings shows the address waiting on its link', t.includes(`${addr('e-rec')} is waiting on the link sent to it`) && t.includes('Send the link again'), t.slice(0, 400));
      // The link, opened in the signed-in browser, rewritten onto the local server.
      await page.goto(`${SERVER}/auth/recovery-email?token=${tokenOf(me)}`, { waitUntil: 'networkidle0' });
      t = await text();
      check('the link lands on Settings, which says the address is confirmed', page.url().includes('/dashboard/settings?recovery_email=confirmed') && t.includes('the recovery email address is confirmed') && !t.includes('is waiting on the link'), `${page.url()} ${t.slice(0, 300)}`);
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      await clickText('Change recovery email address');
      await page.waitForSelector('#recovery_email');
      await page.type('#recovery_email', addr('e-rec2'));
      await page.type('#recovery_password', PASSWORD);
      await clickText('Send link');
      await settle('a confirmation link went to');
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      t = await text();
      held = await row(e.account.id);
      check('changing it shows the new address waiting, and the old one staying', t.includes(`${addr('e-rec2')} is waiting on the link sent to it`) && t.includes(`${addr('e-rec')} stays the recovery email address`) && held.email === addr('e-rec') && held.pending_email === addr('e-rec2'), t.slice(0, 500));
      await clickText('Drop the waiting address');
      await clickText('Drop it');
      await settle('was dropped');
      held = await row(e.account.id);
      check('dropping the waiting address keeps the old one', (await text()).includes('the address waiting on its link was dropped') && held?.email === addr('e-rec') && held.pending_email === null, JSON.stringify(held));
      await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
      await clickText('Remove');
      await clickText('Remove');
      await settle('was removed');
      check('Remove drops the address', (await text()).includes('the recovery email address was removed') && !(await row(e.account.id)));

      // The forgot-password page, signed out, with a fresh account's confirmed
      // recovery address (A's and B's have spent their hour of resets).
      const f = await adminCreate(addr('f'));
      await set(f, addr('f-rec'));
      await confirmRecoveryEmail(db, { token: tokenOf(await lastMessage(f.account.id, CONFIRM_COPY)) });
      const page2 = await (await browser.createBrowserContext()).newPage();
      await page2.goto(`${SERVER}/forgot-password`, { waitUntil: 'networkidle0' });
      const resetsBefore = must(await db.from('dispatch_messages').select('id').eq('account_id', f.account.id).eq('copy_key', RESET_COPY).eq('caller', CALLER)).length;
      await page2.type('#email', addr('f-rec'));
      const [btn] = await page2.$$('xpath/.//button[normalize-space(.)="Send reset link"]');
      await btn.click();
      await page2.waitForFunction(() => document.body.innerText.includes('Check your email'), { timeout: 20000 }).catch(() => {});
      const t2 = await page2.evaluate(() => document.body.innerText);
      const resetsAfter = must(await db.from('dispatch_messages').select('id').eq('account_id', f.account.id).eq('copy_key', RESET_COPY).eq('caller', CALLER)).length;
      check('the forgot-password page queues a reset to the recovery address', t2.includes('Check your email') && resetsAfter === resetsBefore + 1, `${resetsBefore} → ${resetsAfter}`);
      await page2.goto(`${SERVER}/forgot-password`, { waitUntil: 'networkidle0' });
      await page2.type('#email', addr('nobody'));
      const [btn2] = await page2.$$('xpath/.//button[normalize-space(.)="Send reset link"]');
      await btn2.click();
      await page2.waitForFunction(() => document.body.innerText.includes('Check your email'), { timeout: 20000 }).catch(() => {});
      check('…and says the same thing for an address no one holds', (await page2.evaluate(() => document.body.innerText)).includes('Check your email'));
    } finally {
      await browser.close();
    }
  } else {
    console.log('\n(no --server: Settings, the confirm route and the forgot-password page were not exercised)');
  }
} catch (e) {
  if (e.message !== 'migration not applied') { console.log(`  ✗ stopped: ${e.message}`); fails++; }
} finally {
  console.log('\nCleanup');
  for (const uid of users) {
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const left = must(await db.from('dispatch_messages').select('id').eq('caller', CALLER));
  console.log(`  ${users.length} test user(s) deleted, ${left.length} test message(s) left (their queued events stay in the append-only log)`);
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
