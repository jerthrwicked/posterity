#!/usr/bin/env node
// Posterity — Legacy Guard setup locks at Interlude, tested live as a real signed-in user · Walker Brown
/*
20261030000000_legacy_guard_setup_lock. Through PostgREST with the customer's
own token, so the trigger is tested where the customer meets it.

What matters most:
  - in Horizon the customer adds, edits, promotes, and removes Legacy Guards
  - a storage lapse locks building but leaves Legacy Guard setup open
  - from Interlude, adding, editing, promoting, and removing are each REFUSED
    with a reason, and the customer can still read their Legacy Guards
  - the service role still writes a resend, as automatic invitation resends will
  - legacy_guard_setup_is_open() agrees at each step, and another customer
    reading it gets nothing

The phase and the dates are moved with the service role, standing in for the
Account Trigger and the webhook.

Run: node scripts/test-legacy-guard-lock.mjs
*/
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const env = {};
for (const raw of readFileSync(homedir() + '/posterity/.env.local', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

async function call(path, { method = 'GET', body, raw, token, key = ANON, prefer, ctype = 'application/json' } = {}) {
  const headers = { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': ctype };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL + path, { method, headers, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
}
const svc = (path, opts = {}) => call(path, { ...opts, key: SERVICE });

async function adminCreate(email) {
  let [st, r] = await svc('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: { legal_name: 'Guard Lock Test' } },
  });
  if (st === 422) {
    // Left over from a run that crashed before cleanup. Remove it and retry once.
    const [, list] = await svc('/auth/v1/admin/users?page=1&per_page=200');
    const old = (list.users || []).find((u) => u.email === email);
    if (old) await adminDelete(old.id);
    [st, r] = await svc('/auth/v1/admin/users', {
      method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: { legal_name: 'Guard Lock Test' } },
    });
  }
  if (st !== 200) throw new Error(`admin create ${email}: ${st} ${JSON.stringify(r)}`);
  return r.id;
}

async function adminDelete(uid) {
  const [st, r] = await svc(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
  if (st !== 200) throw new Error(`admin delete: ${st} ${JSON.stringify(r)}`);
}

async function signIn(email) {
  const [st, r] = await call('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password: 'test-password-123' },
  });
  if (st !== 200) throw new Error(`sign in ${email}: ${st} ${JSON.stringify(r)}`);
  return r.access_token;
}

let fails = 0;
function check(label, cond, detail = '') {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail && !cond ? `  [${detail}]` : ''));
  if (!cond) fails++;
}
const DAY = 24 * 3600e3;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const ok = (st) => st === 200 || st === 201;
const refused = (st, r) => st >= 400 && /Legacy Guard setup is locked/.test(JSON.stringify(r));

const A = 'guard-lock-a@posterity.app', B = 'guard-lock-b@posterity.app';
let uidA = null, uidB = null, acct = null, tok, tokB;

async function set(cols) {
  const [st, r] = await svc(`/rest/v1/accounts?id=eq.${acct}`, { method: 'PATCH', body: cols, prefer: 'return=representation' });
  if (st !== 200 || r.length !== 1) throw new Error(`set ${JSON.stringify(cols)}: ${st} ${JSON.stringify(r)}`);
}
const isOpen = (token = tok) => call('/rest/v1/rpc/legacy_guard_setup_is_open', { method: 'POST', token, body: { p_account_id: acct } });
const add = (name, extra = {}) => call('/rest/v1/trusted_contacts', {
  method: 'POST', token: tok, prefer: 'return=representation',
  body: { account_id: acct, name, email: `${name.toLowerCase()}@example.com`, ...extra },
});
const edit = (id, body) => call(`/rest/v1/trusted_contacts?id=eq.${id}`, { method: 'PATCH', token: tok, prefer: 'return=representation', body });
const promote = (id) => call('/rest/v1/rpc/set_primary_trusted_contact', { method: 'POST', token: tok, body: { p_contact_id: id } });
const remove = (id) => call(`/rest/v1/trusted_contacts?id=eq.${id}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
const guards = () => call('/rest/v1/trusted_contacts?select=id,name,is_primary&order=created_at', { token: tok });

try {
  console.log('Horizon: setup is open');
  uidA = await adminCreate(A); tok = await signIn(A);
  uidB = await adminCreate(B); tokB = await signIn(B);
  let [st, r] = await call('/rest/v1/accounts?select=id', { token: tok });
  acct = r[0].id;
  [st, r] = await isOpen();
  check('legacy_guard_setup_is_open() reads true', st === 200 && r === true, `${st} ${JSON.stringify(r)}`);
  [st, r] = await isOpen(tokB);
  check('another customer reading it gets nothing', st === 200 && r === null, `${st} ${JSON.stringify(r)}`);
  [st, r] = await add('Maria', { is_primary: true });
  check('adding a Legacy Guard works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);
  const first = r[0]?.id;
  [st, r] = await add('Sam');
  check('adding a second works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);
  const second = r[0]?.id;
  [st, r] = await edit(first, { phone: '+15045550101' });
  check('editing a Legacy Guard works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);
  [st, r] = await promote(second);
  check('promoting a Legacy Guard to primary works', ok(st) || st === 204, `${st} ${JSON.stringify(r)}`);
  [st, r] = await add('Extra');
  const extra = r[0]?.id;
  [st, r] = await remove(extra);
  check('removing a Legacy Guard works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);

  console.log('\nStorage lapsed long enough to lock building: setup stays open');
  await set({ trial_ends_at: ago(400 * DAY), storage_paid_through: null });
  [st, r] = await call('/rest/v1/rpc/building_is_open', { method: 'POST', token: tok, body: { p_account_id: acct } });
  check('building is locked', st === 200 && r === false, `${st} ${JSON.stringify(r)}`);
  [st, r] = await isOpen();
  check('legacy_guard_setup_is_open() still reads true', st === 200 && r === true, `${st} ${JSON.stringify(r)}`);
  [st, r] = await edit(first, { personal_note: 'Thank you.' });
  check('editing a Legacy Guard still works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);

  console.log('\nInterlude: setup is locked');
  await set({ phase: 'interlude' });
  [st, r] = await isOpen();
  check('legacy_guard_setup_is_open() reads false', st === 200 && r === false, `${st} ${JSON.stringify(r)}`);
  [st, r] = await add('Late');
  check('adding a Legacy Guard is REFUSED with a reason', refused(st, r), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await edit(first, { name: 'Changed' });
  check('editing a Legacy Guard is REFUSED with a reason', refused(st, r), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await promote(first);
  check('promoting a Legacy Guard is REFUSED with a reason', refused(st, r), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await remove(second);
  check('removing a Legacy Guard is REFUSED with a reason', refused(st, r), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await guards();
  check('the customer still reads both, unchanged, with Sam primary',
    st === 200 && r.length === 2 && r[0].name === 'Maria' && !r[0].is_primary && r[1].is_primary, `${st} ${JSON.stringify(r)}`);
  [st, r] = await svc(`/rest/v1/trusted_contacts?id=eq.${first}`, {
    method: 'PATCH', prefer: 'return=representation', body: { invited_at: new Date().toISOString(), invite_resend_count: 1 },
  });
  check('the service role still records a resend, as automatic resends will', ok(st) && r.length === 1 && r[0].invite_resend_count === 1, `${st} ${JSON.stringify(r)}`);

  console.log('\nReprise and Posterity stay locked');
  for (const phase of ['active', 'reprise', 'posterity']) {
    await set({ phase });
    [st, r] = await add(`In${phase}`);
    check(`adding a Legacy Guard in ${phase} is REFUSED`, refused(st, r), `got ${st} ${JSON.stringify(r)}`);
  }
} catch (err) {
  console.log(`  ✗ test stopped: ${err.message}`);
  fails++;
} finally {
  console.log('\nCleanup');
  for (const uid of [uidA, uidB]) if (uid) await adminDelete(uid);
  console.log('  test users deleted');
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
