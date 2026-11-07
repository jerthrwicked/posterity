#!/usr/bin/env node
// Posterity — authentication emails through the Communication Dispatch System
/*
Exercises the Send Email hook's pieces against the live database, and, with a
local server, the hook route and the confirm route over HTTP.

  node scripts/test-auth-email.mjs                      the library against the live database
  node scripts/test-auth-email.mjs --server http://localhost:3011
                                                        plus the routes on that server, which
                                                        must run with the same SEND_EMAIL_HOOK_SECRET

What matters most:
  - a call the secret did not sign queues nothing, and neither does an action
    Posterity has no copy for
  - a signup confirmation and a password reset each queue one email, through
    the queue every other message uses, with a link to this site's confirm
    route; the same token twice is the same email once
  - the confirm route turns a real token into a session and sends the person
    on, keeps `next` on this site, and a used token goes to the page that can
    issue another; the reset page needs that session, and the session can set
    a new password

Every message this test queues carries the caller 'test-auth-email', which the
scheduler skips, so nothing is sent. The test users are deleted at the end,
and their queued messages go with them.

Needs ~/posterity/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY) and, for the HTTP checks, SEND_EMAIL_HOOK_SECRET in the
environment.
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { verifySignature, hookKey, sign } from '../lib/auth/webhook.js';
import { queueAuthEmail, confirmLink, Refused, ACTIONS } from '../lib/auth/send-email.js';
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
const HOOK_SECRET = process.env.SEND_EMAIL_HOOK_SECRET;
if (SERVER && !HOOK_SECRET) { console.error('--server needs SEND_EMAIL_HOOK_SECRET in the environment'); process.exit(2); }

const CALLER = 'test-auth-email';
const PASSWORD = 'test-password-123';
const stamp = Date.now();

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

async function adminCreate(email, { confirmed = true } = {}) {
  const [st, r] = await rest('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: PASSWORD, email_confirm: confirmed, user_metadata: { legal_name: 'Auth Email Test' } },
  });
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  users.push(r.id);
  return r.id;
}

// A real token for a user, as Supabase would hand the hook, without sending.
async function tokenFor(type, email) {
  const [st, r] = await rest('/auth/v1/admin/generate_link', { method: 'POST', body: { type, email, password: PASSWORD } });
  if (st !== 200) throw new Error(`generate_link ${type}: ${st} ${JSON.stringify(r)}`);
  return r.hashed_token ?? r.properties?.hashed_token;
}

function payload(user, action, tokenHash) {
  return { user, email_data: { token: '12345678', token_hash: tokenHash, redirect_to: 'https://www.yourposterity.com/auth/callback', email_action_type: action, site_url: 'https://www.yourposterity.com', token_new: '', token_hash_new: '' } };
}

function signed(secret, body, { id = `msg_${randomBytes(8).toString('hex')}`, at = Math.floor(Date.now() / 1000), sig } = {}) {
  const signature = sig ?? `v1,${sign(hookKey(secret), id, at, body)}`;
  return new Headers({ 'webhook-id': id, 'webhook-timestamp': String(at), 'webhook-signature': signature, 'content-type': 'application/json' });
}

try {
  console.log('Signature');
  const secret = `v1,whsec_${randomBytes(32).toString('base64')}`;
  const body = '{"hello":"world"}';
  check('a call signed with the secret passes', verifySignature(body, signed(secret, body), secret).ok);
  check('a call signed with another secret is refused', !verifySignature(body, signed(`v1,whsec_${randomBytes(32).toString('base64')}`, body), secret).ok);
  check('a signed call whose body changed is refused', !verifySignature(body + ' ', signed(secret, body), secret).ok);
  check('a call with no signature headers is refused', verifySignature(body, new Headers(), secret).reason === 'missing signature headers');
  const stale = Math.floor(Date.now() / 1000) - 6 * 60;
  check('a call six minutes old is refused', verifySignature(body, signed(secret, body, { at: stale }), secret).reason === 'timestamp outside tolerance');
  const id = 'msg_multi', at = Math.floor(Date.now() / 1000);
  const multi = `v1,${'A'.repeat(44)} v1,${sign(hookKey(secret), id, at, body)}`;
  check('one good signature among several passes', verifySignature(body, signed(secret, body, { id, at, sig: multi }), secret).ok);
  check('the secret works with or without its v1,whsec_ prefix', hookKey(secret).equals(hookKey(secret.replace('v1,whsec_', ''))));

  console.log('\nLinks');
  const link = confirmLink({ tokenHash: 'abc+def', action: 'signup' });
  check('a signup link points at this site\'s confirm route', link.startsWith('https://www.yourposterity.com/auth/confirm?'), link);
  const q = new URL(link).searchParams;
  check('…with the token, type email and next /dashboard', q.get('token_hash') === 'abc+def' && q.get('type') === 'email' && q.get('next') === '/dashboard', link);
  const rq = new URL(confirmLink({ tokenHash: 'x', action: 'recovery' })).searchParams;
  check('a reset link carries type recovery and next /reset-password', rq.get('type') === 'recovery' && rq.get('next') === '/reset-password');
  let threw = null;
  try { confirmLink({ tokenHash: 'x', action: 'magiclink' }); } catch (e) { threw = e; }
  check('no link for an action Posterity does not send', !!threw);

  console.log('\nQueueing (live database, caller test-auth-email, nothing sent)');
  const email = `test-auth-email-${stamp}@yourposterity.com`;
  const uid = await adminCreate(email);
  const account = must(await db.from('accounts').select('id, name').eq('user_id', uid).single());
  const user = { id: uid, email, aud: 'authenticated', role: 'authenticated' };
  const opts = { caller: CALLER, isTest: true };

  const rows = must(await db.from('dispatch_copy').select().or('key.in.(email.confirm_signup,email.reset_password),kind.eq.frame'));
  const haveCopy = rows.some((x) => x.key === 'email.confirm_signup') && rows.some((x) => x.key === 'email.reset_password');
  check('the two copy rows are in the database (migration 20261102000000_auth_email_copy)', haveCopy, 'not applied: the queueing and rendering checks are skipped');
  let queued = 0;
  if (haveCopy) {
  const tokenA = randomBytes(20).toString('hex');
  let [m] = await queueAuthEmail(db, payload(user, 'signup', tokenA), opts);
  check('a signup confirmation queues one email', m?.channel === 'email' && m.copy_key === 'email.confirm_signup', JSON.stringify(m).slice(0, 200));
  check('…to the user\'s address, for their account, sent at once', m?.destination === email && m.account_id === account.id && m.self_initiated === true);
  check('…with the confirm link and the account\'s name as its params', m?.params?.link === confirmLink({ tokenHash: tokenA, action: 'signup' }) && m.params.name === account.name, JSON.stringify(m?.params));
  check('…flagged is_test, caller test-auth-email', m?.is_test === true && m.caller === CALLER);
  const [again] = await queueAuthEmail(db, payload(user, 'signup', tokenA), opts);
  check('the same token again is the same message, not a second one', again?.id === m?.id, `${m?.id} vs ${again?.id}`);
  const [r] = await queueAuthEmail(db, payload(user, 'recovery', randomBytes(20).toString('hex')), opts);
  check('a password reset queues one email from email.reset_password', r?.copy_key === 'email.reset_password' && r.destination === email);
  const rl = new URL(r?.params?.link ?? 'http://x').searchParams;
  check('…whose link carries type recovery and next /reset-password', rl.get('type') === 'recovery' && rl.get('next') === '/reset-password');

  for (const [name, p, status] of [
    ['an action with no copy (magiclink) is refused with 422', payload(user, 'magiclink', 'x'), 422],
    ['a change notification is refused with 422', payload(user, 'password_changed_notification', 'x'), 422],
    ['a payload with no token is refused with 400', { user, email_data: { email_action_type: 'signup' } }, 400],
    ['a payload with no user is refused with 400', { email_data: { email_action_type: 'signup', token_hash: 'x' } }, 400],
    ['a user with no account is refused with 422', payload({ id: '00000000-0000-0000-0000-000000000000', email: 'nobody@yourposterity.com' }, 'signup', 'x'), 422],
  ]) {
    let err = null;
    try { await queueAuthEmail(db, p, opts); } catch (e) { err = e; }
    check(name, err instanceof Refused && err.status === status, err ? `${err.constructor.name} ${err.status ?? ''} ${err.message}` : 'queued');
  }
  const count = must(await db.from('dispatch_messages').select('id').eq('caller', CALLER).eq('account_id', account.id));
  check('exactly two messages were queued in all', count.length === 2, `${count.length}`);
  queued = count.length;

  console.log('\nRendering (the live copy rows and frame)');
  const frame = rows.find((x) => x.kind === 'frame');
  for (const msg of [m, r]) {
    const row = rows.find((x) => x.key === msg.copy_key);
    let rendered = null, err = null;
    try { rendered = renderEmail(row, msg.params, frame); } catch (e) { err = e; }
    check(`${msg.copy_key} renders with its link in the HTML and the text`, rendered && rendered.html.includes(`href="${msg.params.link.replace(/&/g, '&amp;')}"`) && rendered.text.includes(msg.params.link), err?.message);
    check(`${msg.copy_key} carries the placeholder marker, not a bare token`, rendered && rendered.subject.startsWith('[Placeholder:') && !/\{\{/.test(rendered.html + rendered.text));
  }
  }

  if (SERVER) {
    console.log(`\nHook route on ${SERVER}`);
    const post = async (body, headers) => {
      const res = await fetch(`${SERVER}/api/auth/send-email`, { method: 'POST', headers, body });
      let data = null; try { data = await res.json(); } catch {}
      return [res.status, data];
    };
    const p = JSON.stringify(payload(user, 'magiclink', 'x'));
    let [st, d] = await post(p, { 'content-type': 'application/json' });
    check('a call with no signature is refused with 401', st === 401, `${st} ${JSON.stringify(d)}`);
    [st, d] = await post(p, signed(`v1,whsec_${randomBytes(32).toString('base64')}`, p));
    check('a call signed with the wrong secret is refused with 401', st === 401, `${st} ${JSON.stringify(d)}`);
    [st, d] = await post(p, signed(HOOK_SECRET, p, { at: Math.floor(Date.now() / 1000) - 600 }));
    check('a correctly signed call ten minutes old is refused with 401', st === 401, `${st} ${JSON.stringify(d)}`);
    [st, d] = await post('not json', signed(HOOK_SECRET, 'not json'));
    check('a signed call that is not JSON is refused with 400', st === 400, `${st} ${JSON.stringify(d)}`);
    [st, d] = await post(p, signed(HOOK_SECRET, p));
    check('a signed call for an action with no copy is refused with 422, in Supabase\'s error shape', st === 422 && d?.error?.http_code === 422 && /magiclink/.test(d.error.message), `${st} ${JSON.stringify(d)}`);
    const before = must(await db.from('dispatch_messages').select('id').eq('account_id', account.id));
    check('none of those queued anything', before.length === queued, `${before.length} vs ${queued}`);

    console.log(`\nConfirm route on ${SERVER}`);
    const get = (path, cookie) => fetch(`${SERVER}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });
    const where = (res) => { const l = res.headers.get('location') ?? ''; try { return new URL(l).pathname + new URL(l).search; } catch { return l; } };
    const cookiesOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

    const email2 = `test-auth-email-${stamp}-b@yourposterity.com`;
    const [gst, g] = await rest('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'signup', email: email2, password: PASSWORD, data: { legal_name: 'Auth Email Test B' } } });
    if (gst !== 200) throw new Error(`generate_link signup: ${gst} ${JSON.stringify(g)}`);
    users.push(g.id ?? g.user?.id);
    const signupHash = g.hashed_token ?? g.properties?.hashed_token;
    const [, fresh] = await rest(`/auth/v1/admin/users/${g.id ?? g.user?.id}`);
    check('the new user starts unconfirmed', !fresh?.email_confirmed_at, JSON.stringify(fresh).slice(0, 120));

    let res = await get(`/auth/confirm?token_hash=${signupHash}&type=email&next=/dashboard`);
    check('a signup token gives a session and goes to /dashboard', [303, 307].includes(res.status) && where(res) === '/dashboard' && /sb-.*auth-token/.test(cookiesOf(res)), `${res.status} ${where(res)}`);
    const [, confirmed] = await rest(`/auth/v1/admin/users/${g.id ?? g.user?.id}`);
    check('…and the address is now confirmed', !!confirmed?.email_confirmed_at);
    res = await get(`/auth/confirm?token_hash=${signupHash}&type=email&next=/dashboard`);
    check('the same token again goes to /login?error=confirmation_failed', where(res) === '/login?error=confirmation_failed', where(res));
    res = await get(`/auth/confirm?token_hash=nope&type=recovery`);
    check('a bad reset token goes to /forgot-password?error=link_expired', where(res) === '/forgot-password?error=link_expired', where(res));
    res = await get(`/auth/confirm?token_hash=${signupHash}&type=invite`);
    check('a type the route does not take is refused the same way', where(res) === '/login?error=confirmation_failed', where(res));

    let hash = await tokenFor('recovery', email2);
    res = await get(`/auth/confirm?token_hash=${hash}&type=recovery&next=https://example.com/elsewhere`);
    check('a reset token with an outside `next` lands on /reset-password instead', where(res) === '/reset-password', `${res.status} ${where(res)}`);
    hash = await tokenFor('recovery', email2);
    res = await get(`/auth/confirm?token_hash=${hash}&type=recovery&next=//example.com`);
    check('…and so does a protocol-relative one', where(res) === '/reset-password', `${res.status} ${where(res)}`);

    hash = await tokenFor('recovery', email2);
    res = await get(`/auth/confirm?token_hash=${hash}&type=recovery&next=/reset-password`);
    const session = cookiesOf(res);
    check('a reset token gives a session and goes to /reset-password', where(res) === '/reset-password' && /sb-.*auth-token/.test(session), `${res.status} ${where(res)}`);

    console.log(`\nReset page on ${SERVER}`);
    res = await get('/reset-password');
    check('without a session, /reset-password goes to /forgot-password?error=link_expired', where(res) === '/forgot-password?error=link_expired', `${res.status} ${where(res)}`);
    res = await get('/reset-password', session);
    let html = await res.text();
    check('with the session, /reset-password shows the new-password form for that address', res.status === 200 && html.includes('Choose a new password') && html.includes(email2), `${res.status}`);

    // The form calls supabase.auth.updateUser({ password }) on that session: the same request, made here.
    const token = accessTokenFrom(session);
    check('the session cookie carries an access token', !!token);
    let [ust, u] = await rest('/auth/v1/user', { method: 'PUT', key: ANON, token, body: { password: 'new-password-456' } });
    check('the session can set a new password', ust === 200, `${ust} ${JSON.stringify(u).slice(0, 160)}`);
    let [sst, s] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email: email2, password: 'new-password-456' } });
    check('…and the new password signs in', sst === 200 && !!s?.access_token, `${sst}`);
    [sst] = await rest('/auth/v1/token?grant_type=password', { method: 'POST', key: ANON, body: { email: email2, password: PASSWORD } });
    check('…while the old one no longer does', sst === 400, `${sst}`);

    console.log(`\nPages on ${SERVER}`);
    res = await get('/forgot-password'); html = await res.text();
    check('/forgot-password shows the request form', res.status === 200 && html.includes('Send reset link'), `${res.status}`);
    res = await get('/login'); html = await res.text();
    check('/login links to it', res.status === 200 && html.includes('href="/forgot-password"'), `${res.status}`);
  } else {
    console.log('\n(no --server: the hook route, the confirm route and the pages were not exercised over HTTP)');
  }
} finally {
  console.log('\nCleanup');
  for (const uid of users) {
    if (!uid) continue;
    const [st, r] = await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    if (st !== 200) console.log(`  could not delete user ${uid}: ${st} ${JSON.stringify(r)}`);
  }
  const left = must(await db.from('dispatch_messages').select('id').eq('caller', CALLER));
  console.log(`  ${users.length} test user(s) deleted, ${left.length} test message(s) left (their queued events stay in the append-only log)`);
}

// The @supabase/ssr cookie: "base64-" + base64url JSON, possibly in .0/.1 chunks.
function accessTokenFrom(cookieHeader) {
  const parts = cookieHeader.split('; ').map((c) => c.split('=')).filter(([n]) => /^sb-.*-auth-token(\.\d+)?$/.test(n))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const joined = parts.map(([, v]) => decodeURIComponent(v)).join('');
  const b64 = joined.replace(/^base64-/, '');
  try { return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')).access_token; } catch { return null; }
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
