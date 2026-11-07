#!/usr/bin/env node
// Posterity — double verification and the email change
/*
Exercises double verification against the live database as real users, and,
with a local server, the email change in Settings in a real browser and the
confirm route for an email change's link.

  node scripts/test-double-verification.mjs                      the library against the live database
  node scripts/test-double-verification.mjs --server http://localhost:3011
                                                                 plus Settings and the confirm route on that
                                                                 server, which must run with
                                                                 DISPATCH_TEST_CALLER=test-double-verification

What matters most:
  - a wrong password sends no code, and a code works once, only for its own
    account, within ten minutes and five tries, and only while it is the newest
  - the code is never stored, and no customer can read the codes table
  - the email change's link goes to the new address, and the account keeps the
    old address until the link is used
  - Settings walks the change from the password to the code, and refuses a
    wrong password, a wrong code, and an address another account holds

Every message this test queues carries the caller 'test-double-verification',
which the scheduler skips, so nothing is sent. Supabase's own mailer is never
asked to send: the one change carried through Settings is to an address
another account holds, which Supabase refuses before sending anything. The
test users are deleted at the end, and their codes and queued messages go
with them.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY); for the browser, CHROME_PATH if Puppeteer's own
Chrome is not installed.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  checkPassword, startVerification, confirmVerification, VerificationRefused, hashCode,
  CODE_COPY, MAX_ATTEMPTS, MAX_CODES_PER_HOUR,
} from '../lib/auth/double-verification.js';
import { queueAuthEmail, Refused } from '../lib/auth/send-email.js';
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

const CALLER = 'test-double-verification';
const PASSWORD = 'test-password-123';
const stamp = Date.now();
const addr = (tag) => `test-dv-${stamp}-${tag}@yourposterity.com`;

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
    method: 'POST', body: { email, password: PASSWORD, email_confirm: true, user_metadata: { legal_name: 'Double Verification Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  const account = must(await db.from('accounts').select('id, name').eq('user_id', r.id).single());
  return { user: { id: r.id, email }, account };
}

// The reason a step was refused, or 'passed'.
async function outcome(fn) {
  try { const v = await fn(); return { reason: 'passed', value: v }; }
  catch (e) { return { reason: e instanceof VerificationRefused ? e.reason : `error: ${e.message}` }; }
}

// The code a start queued, read from its queued message, as the email would carry it.
async function codeFor(accountId) {
  const [msg] = must(await db.from('dispatch_messages').select('params, copy_key, destination, caller, is_test, self_initiated')
    .eq('account_id', accountId).eq('copy_key', CODE_COPY).order('created_at', { ascending: false }).limit(1));
  return msg;
}

const opts = { url: URL_, anonKey: ANON, caller: CALLER, isTest: true };

try {
  const a = await adminCreate(addr('a'));
  const b = await adminCreate(addr('b'));

  console.log('Password re-entry (live Supabase sign-in)');
  check('the right password passes', await checkPassword({ url: URL_, anonKey: ANON, userId: a.user.id, email: a.user.email, password: PASSWORD }));
  check('a wrong password does not', !(await checkPassword({ url: URL_, anonKey: ANON, userId: a.user.id, email: a.user.email, password: 'not-it-999' })));
  check('an empty password does not', !(await checkPassword({ url: URL_, anonKey: ANON, userId: a.user.id, email: a.user.email, password: '' })));
  check('another account\'s right password does not pass for this one', !(await checkPassword({ url: URL_, anonKey: ANON, userId: a.user.id, email: b.user.email, password: PASSWORD })));

  const table = await db.from('verification_codes').select('id').limit(1);
  const copy = must(await db.from('dispatch_copy').select().or(`key.in.(${CODE_COPY},email.confirm_email_change),kind.eq.frame`));
  const applied = !table.error && copy.some((r) => r.key === CODE_COPY) && copy.some((r) => r.key === 'email.confirm_email_change');
  check('the table and the two copy rows are in the database (migration 20261104000000_double_verification)', applied,
    'not applied: the code, row-level security and hook checks are skipped');

  if (applied) {
    console.log('\nCodes (live database, caller test-double-verification, nothing sent)');
    const start = (who, extra = {}) => startVerification(db, {
      account: who.account, user: who.user, purpose: 'email_change', password: PASSWORD, payload: { new_email: addr('new') }, ...opts, ...extra,
    });

    let r = await outcome(() => start(a, { password: 'not-it-999' }));
    check('a wrong password is refused with wrong_password', r.reason === 'wrong_password', r.reason);
    let rows = must(await db.from('verification_codes').select('id').eq('account_id', a.account.id));
    check('…and leaves no code', rows.length === 0, `${rows.length}`);

    const first = await start(a);
    const msg = await codeFor(a.account.id);
    const code1 = msg?.params?.code;
    check('the right password queues one code email', !!first.id && /^\d{6}$/.test(code1 ?? ''), JSON.stringify(msg?.params));
    check('…to the address the account signs in with, sent at once, flagged as a test', msg?.destination === a.user.email && msg.self_initiated === true && msg.caller === CALLER && msg.is_test === true);
    const row = must(await db.from('verification_codes').select().eq('id', first.id).single());
    check('the stored row holds a hash, not the code', row.code_hash === hashCode(first.id, code1) && !JSON.stringify(row).includes(`"${code1}"`));
    check('…the new address as its payload', row.payload?.new_email === addr('new'));
    const minutes = (new Date(row.expires_at) - new Date(row.created_at)) / 60000;
    check('…and lasts ten minutes', Math.abs(minutes - 10) < 0.1, `${minutes}`);

    const frame = copy.find((x) => x.kind === 'frame');
    let rendered = null, err = null;
    try { rendered = renderEmail(copy.find((x) => x.key === CODE_COPY), msg.params, frame); } catch (e) { err = e; }
    check('the code email renders with the code in the HTML and the text', rendered && rendered.html.includes(code1) && rendered.text.includes(code1), err?.message);
    check('…and carries the placeholder marker, not a bare token', rendered && rendered.subject.startsWith('[Placeholder:') && !/\{\{/.test(rendered.html + rendered.text));

    const wrong = code1 === '000000' ? '000001' : '000000';
    r = await outcome(() => confirmVerification(db, { accountId: b.account.id, purpose: 'email_change', id: first.id, code: code1 }));
    check('another account cannot use the code', r.reason === 'expired', r.reason);
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: first.id, code: wrong }));
    check('a wrong code is refused with wrong_code', r.reason === 'wrong_code', r.reason);
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: first.id, code: '12' }));
    check('a code that is not six digits is refused without spending a try', r.reason === 'wrong_code', r.reason);
    check('…while the wrong code counted one try', must(await db.from('verification_codes').select('attempts').eq('id', first.id).single()).attempts === 1);
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: first.id, code: code1, now: () => new Date(Date.now() + 11 * 60000) }));
    check('the right code eleven minutes on is refused as expired', r.reason === 'expired', r.reason);
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: first.id, code: ` ${code1.slice(0, 3)} ${code1.slice(3)} ` }));
    check('the right code in time returns the payload, spaces and all', r.reason === 'passed' && r.value?.new_email === addr('new'), r.reason);
    check('…and closes the code as confirmed', must(await db.from('verification_codes').select('outcome, closed_at').eq('id', first.id).single()).outcome === 'confirmed');
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: first.id, code: code1 }));
    check('the same code a second time is refused', r.reason === 'expired', r.reason);

    const second = await start(a);
    const code2 = (await codeFor(a.account.id)).params.code;
    const third = await start(a);
    const code3 = (await codeFor(a.account.id)).params.code;
    check('a new code closes the one before it as superseded', must(await db.from('verification_codes').select('outcome').eq('id', second.id).single()).outcome === 'superseded');
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: second.id, code: code2 }));
    check('…which no longer works', r.reason === 'expired', r.reason);

    const wrong3 = code3 === '000000' ? '000001' : '000000';
    const tries = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) tries.push((await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: third.id, code: wrong3 }))).reason);
    check(`${MAX_ATTEMPTS} wrong codes: four refusals, then too_many_attempts`, tries.slice(0, -1).every((t) => t === 'wrong_code') && tries.at(-1) === 'too_many_attempts', tries.join(','));
    r = await outcome(() => confirmVerification(db, { accountId: a.account.id, purpose: 'email_change', id: third.id, code: code3 }));
    check('…after which the right code no longer works', r.reason === 'expired', r.reason);

    const made = must(await db.from('verification_codes').select('id').eq('account_id', a.account.id)).length;
    for (let i = made; i < MAX_CODES_PER_HOUR; i++) await start(a);
    r = await outcome(() => start(a));
    check(`a code past ${MAX_CODES_PER_HOUR} within an hour is refused with too_many_codes`, r.reason === 'too_many_codes', r.reason);
    r = await outcome(() => start(b));
    check('…which leaves another account free to ask', r.reason === 'passed', r.reason);

    console.log('\nRow-level security (as user A, signed in)');
    const [, s] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email: a.user.email, password: PASSWORD } });
    check('user A signs in', !!s?.access_token);
    let [st, d] = await rest('/rest/v1/verification_codes?select=*', { key: ANON, token: s?.access_token });
    check('user A cannot read the codes table, their own codes included', st === 401 || st === 403 || (st === 200 && Array.isArray(d) && d.length === 0), `${st} ${JSON.stringify(d).slice(0, 120)}`);
    [st, d] = await rest('/rest/v1/verification_codes', { method: 'POST', key: ANON, token: s?.access_token, body: { id: crypto.randomUUID(), account_id: a.account.id, purpose: 'email_change', code_hash: 'x', expires_at: new Date(Date.now() + 3600e3).toISOString() } });
    check('…nor write to it', st === 401 || st === 403, `${st} ${JSON.stringify(d).slice(0, 120)}`);

    console.log('\nThe email change through the Send Email hook (nothing sent)');
    const hook = (tokenHash, tokenHashNew = '', newEmail = addr('new')) => ({
      user: { ...a.user, new_email: newEmail },
      email_data: { token: '123456', token_hash: tokenHash, token_new: '', token_hash_new: tokenHashNew, email_action_type: 'email_change', redirect_to: '', site_url: 'https://www.yourposterity.com' },
    });
    const th = randomBytes(20).toString('hex');
    let queued = await queueAuthEmail(db, hook(th), { caller: CALLER, isTest: true });
    check('with Secure Email Change off, one email, to the new address', queued.length === 1 && queued[0].destination === addr('new') && queued[0].copy_key === 'email.confirm_email_change', JSON.stringify(queued.map((m) => m.destination)));
    const q = new URL(queued[0]?.params?.link ?? 'http://x').searchParams;
    check('…whose link carries its token, type email_change and next /dashboard/settings', q.get('token_hash') === th && q.get('type') === 'email_change' && q.get('next') === '/dashboard/settings', queued[0]?.params?.link);
    const thCurrent = randomBytes(20).toString('hex'), thNew = randomBytes(20).toString('hex');
    queued = await queueAuthEmail(db, hook(thNew, thCurrent), { caller: CALLER, isTest: true });
    const toNew = queued.find((m) => m.destination === addr('new')), toOld = queued.find((m) => m.destination === a.user.email);
    check('with it on, two emails, one to each address', queued.length === 2 && !!toNew && !!toOld);
    check('…the new address with token_hash, the current one with token_hash_new', new URL(toNew?.params.link ?? 'http://x').searchParams.get('token_hash') === thNew && new URL(toOld?.params.link ?? 'http://x').searchParams.get('token_hash') === thCurrent);
    r = null;
    try { await queueAuthEmail(db, hook('x', '', ''), { caller: CALLER, isTest: true }); } catch (e) { r = e; }
    check('an email change with no new address is refused with 400', r instanceof Refused && r.status === 400, r?.message ?? 'queued');
    const sentToNew = await renderEmail(copy.find((x) => x.key === 'email.confirm_email_change'), toNew.params, frame);
    check('the email change email renders with its link', sentToNew.html.includes(toNew.params.link.replace(/&/g, '&amp;')) && sentToNew.text.includes(toNew.params.link));
  }

  if (SERVER) {
    console.log(`\nConfirm route on ${SERVER}`);
    const get = (path, cookie) => fetch(`${SERVER}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });
    const where = (res) => { const l = res.headers.get('location') ?? ''; try { return new URL(l).pathname + new URL(l).search; } catch { return l; } };
    // Supabase's generate_link stands in for the email change's emails. Two
    // things about it shape this section: the token hash it returns for the
    // new address is hashed with the current address instead, so the right
    // hash is rebuilt from its six-digit code; and each call replaces the
    // tokens the one before it made, so while Secure Email Change is on (both
    // addresses must confirm) no pair of its links can finish a change.
    const c = await adminCreate(addr('c'));
    const newC = addr('c-new');
    const [gst, g] = await rest('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'email_change_new', email: c.user.email, new_email: newC } });
    if (gst !== 200) throw new Error(`generate_link: ${gst} ${JSON.stringify(g)}`);
    const hashNew = createHash('sha224').update(newC + g.email_otp).digest('hex');
    let [, u] = await rest(`/auth/v1/admin/users/${c.user.id}`);
    check('Supabase holds the new address as pending and keeps the old one', u?.email === c.user.email && u?.new_email === newC, `${u?.email} / ${u?.new_email}`);
    let res = await get('/auth/confirm?token_hash=bad&type=email_change');
    check('a bad email change link goes to /login?error=confirmation_failed', where(res) === '/login?error=confirmation_failed', where(res));
    res = await get(`/auth/confirm?token_hash=${hashNew}&type=email_change`);
    check('the new address\'s link, with no next, goes on to /dashboard/settings', where(res) === '/dashboard/settings', `${res.status} ${where(res)}`);
    [, u] = await rest(`/auth/v1/admin/users/${c.user.id}`);
    if (u?.email === newC) {
      check('with Secure Email Change off, that one link moves the account to the new address', !u?.new_email, `${u?.new_email}`);
      res = await get(`/auth/confirm?token_hash=${hashNew}&type=email_change`);
      check('a used email change link goes to /login?error=confirmation_failed', where(res) === '/login?error=confirmation_failed', where(res));
    } else {
      // Supabase accepts the new address's link again while the change waits
      // on the current address, so a used link is only checkable with it off.
      check('with Secure Email Change on, the old address stays until the current address confirms too', u?.email === c.user.email && u?.new_email === newC, `${u?.email} / ${u?.new_email}`);
      console.log('  – the finished change and a used link are not checkable here while Secure Email Change is on');
    }

    if (applied) {
      console.log(`\nSettings on ${SERVER} (in a browser)`);
      const { default: puppeteer } = await import('puppeteer');
      const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
      try {
        const d = await adminCreate(addr('d'));
        const page = await browser.newPage();
        const text = () => page.evaluate(() => document.body.innerText);
        const settle = async (pattern) => { await page.waitForFunction((p) => new RegExp(p).test(document.body.innerText), { timeout: 20000 }, pattern).catch(() => {}); };
        const clickText = async (label) => { const [el] = await page.$$(`xpath/.//button[normalize-space(.)="${label}"]`); if (!el) throw new Error(`no button ${label}`); await el.click(); };

        await page.goto(`${SERVER}/login`, { waitUntil: 'networkidle0' });
        await page.type('#email', d.user.email);
        await page.type('#password', PASSWORD);
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), clickText('Log In').catch(async () => { await page.keyboard.press('Enter'); })]);
        await page.goto(`${SERVER}/dashboard/settings`, { waitUntil: 'networkidle0' });
        let t = await text();
        check('Settings shows the address the account signs in with, and a way to change it', t.includes(d.user.email) && t.includes('Change email address'), page.url());
        await clickText('Change email address');
        await page.waitForSelector('#new_email');

        await page.type('#new_email', b.user.email);
        await page.type('#password', 'not-it-999');
        await clickText('Send code');
        await settle('password re-entered for double verification is wrong');
        t = await text();
        check('a wrong password is refused, and no code goes', t.includes('the password re-entered for double verification is wrong') && must(await db.from('verification_codes').select('id').eq('account_id', d.account.id)).length === 0);

        await page.$eval('#password', (el) => { el.value = ''; });
        await page.$eval('#new_email', (el) => { el.value = ''; });
        await page.type('#new_email', b.user.email);
        await page.type('#password', PASSWORD);
        await clickText('Send code');
        await page.waitForSelector('#code', { timeout: 20000 }).catch(() => {});
        t = await text();
        const sent = await codeFor(d.account.id);
        check('the right password moves on to the code, sent to the current address', !!(await page.$('#code')) && sent?.destination === d.user.email && t.includes(d.user.email), t.slice(0, 300));
        check('…queued under the test caller, so nothing is sent', sent?.caller === CALLER && sent?.is_test === true, `${sent?.caller}`);

        const good = sent.params.code, bad = good === '000000' ? '000001' : '000000';
        await page.type('#code', bad);
        await clickText('Confirm');
        await settle('confirmation code does not match');
        check('a wrong code is refused and the code step stays', (await text()).includes('the confirmation code does not match') && !!(await page.$('#code')));

        await page.$eval('#code', (el) => { el.value = ''; });
        await page.type('#code', good);
        await clickText('Confirm');
        await settle('belongs to another account');
        t = await text();
        check('the right code reaches Supabase, which refuses an address another account holds', t.includes('the new email address belongs to another account'), t.slice(0, 300));
        const [, du] = await rest(`/auth/v1/admin/users/${d.user.id}`);
        check('…and the account keeps its address, with nothing pending', du?.email === d.user.email && !du?.new_email, `${du?.email} / ${du?.new_email}`);
        check('the code was spent', must(await db.from('verification_codes').select('outcome').eq('account_id', d.account.id).is('closed_at', null)).length === 0);
      } finally {
        await browser.close();
      }
    }
  } else {
    console.log('\n(no --server: Settings and the confirm route were not exercised)');
  }
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
