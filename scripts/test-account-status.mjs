#!/usr/bin/env node
// Posterity — Account Status and the building lock, tested live as a real signed-in user · Walker Brown
/*
Stage 4.1 (20261026000000_account_status). Through PostgREST with the
customer's own token, so row-level security is the thing under test.

What matters most:
  - account_status() gives one reading of the account — phase, storage
    standing, storage product, the lapse date, whether building is open, when it
    locks, and Posterity Social — and storage_is_current() agrees with it
  - a lapse leaves building open for three months and then locks it: insert and
    update are REFUSED, the media bucket refuses an upload, and the customer can
    still read and delete (Master Spec, Storage Lapse Grace Period)
  - Stripe's three-day retry counts as current, and a lapse the webhook records
    replaces the fallback date
  - Interlude closes building whatever is paid
  - the customer cannot move their phase or any storage state, cannot read
    another customer's status, and cannot delete their account row and insert
    one with storage paid through any date
  - the customer cannot delete or demote the primary legacy, so its messages
    cannot be cascaded away, and cannot write a plan: every plan column is set
    by payment (20261026020000)

Dates are moved with the service role, standing in for the webhook and the
Account Trigger, which are the only things that will ever write them.

Run: node scripts/test-account-status.mjs
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
    method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: { legal_name: 'Status Test' } },
  });
  if (st === 422) {
    // Left over from a run that crashed before cleanup. Remove it and retry once.
    const [, list] = await svc('/auth/v1/admin/users?page=1&per_page=200');
    const old = (list.users || []).find((u) => u.email === email);
    if (old) await adminDelete(old.id);
    [st, r] = await svc('/auth/v1/admin/users', {
      method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: { legal_name: 'Status Test' } },
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

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4' +
  '890000000a49444154789c6360000002000100ffff03000006000557bfabd400' +
  '00000049454e44ae426082', 'hex');
const HOUR = 3600e3, DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
// The product's "today" for a paid-through date: the date in UTC-12 (20260918123000).
const paidDay = (days) => new Date(Date.now() - 12 * HOUR + days * DAY).toISOString().slice(0, 10);
const near = (a, b, ms = 2 * DAY) => !!a && !!b && Math.abs(new Date(a) - new Date(b)) < ms;

const A = 'status-a@posterity.app', B = 'status-b@posterity.app';
let uidA = null, uidB = null, acct = null, legacy = null;
const files = [];
let tok, tokB, recId, itemId;

async function set(cols) {
  // The webhook's and the Account Trigger's job, stood in for here.
  const [st, r] = await svc(`/rest/v1/accounts?id=eq.${acct}`, { method: 'PATCH', body: cols, prefer: 'return=representation' });
  if (st !== 200 || r.length !== 1) throw new Error(`set ${JSON.stringify(cols)}: ${st} ${JSON.stringify(r)}`);
}
async function status() {
  const [st, r] = await call('/rest/v1/rpc/account_status', { method: 'POST', token: tok, body: { p_account_id: acct } });
  const [st2, cur] = await call('/rest/v1/rpc/storage_is_current', { method: 'POST', token: tok, body: { p_account_id: acct } });
  if (st !== 200 || r.length !== 1 || st2 !== 200) throw new Error(`account_status: ${st} ${JSON.stringify(r)} / ${st2} ${JSON.stringify(cur)}`);
  return { ...r[0], is_current: cur };
}
function reads(s, want) {
  const got = Object.fromEntries(Object.keys(want).map((k) => [k, s[k]]));
  check(`reads ${Object.entries(want).map(([k, v]) => `${k} ${v}`).join(', ')}`,
    Object.keys(want).every((k) => s[k] === want[k]), JSON.stringify(got));
  const current = s.storage_standing === 'trial' || s.storage_standing === 'current';
  check('storage_is_current() agrees', s.is_current === current, `is_current ${s.is_current}, standing ${s.storage_standing}`);
}
const addRecipient = (name) => call('/rest/v1/recipients', {
  method: 'POST', token: tok, prefer: 'return=representation',
  body: { account_id: acct, name, email: `${name.toLowerCase()}@example.com` },
});
const editMessage = (body) => call(`/rest/v1/content_items?id=eq.${itemId}`, {
  method: 'PATCH', token: tok, prefer: 'return=representation', body: { body },
});
async function upload(name) {
  const path = `${acct}/${legacy}/${name}`;
  files.push(path);
  return call(`/storage/v1/object/legacy-media/${path}`, { method: 'POST', token: tok, raw: PNG, ctype: 'image/png' });
}
// Replacing a file already in the bucket is an UPDATE on storage.objects, not an insert.
const overwrite = () => call(`/storage/v1/object/legacy-media/${acct}/${legacy}/trial.png`, { method: 'PUT', token: tok, raw: PNG, ctype: 'image/png' });
const ok = (st) => st === 200 || st === 201;

async function building(open, n) {
  if (open) {
    let [st, r] = await addRecipient(`Open${n}`);
    check('adding a recipient works', ok(st), `${st} ${JSON.stringify(r)}`);
    [st, r] = await editMessage(`Edited ${n}.`);
    check('editing a message works', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);
    [st, r] = await upload(`open-${n}.png`);
    check('an upload to the media bucket works', ok(st), `${st} ${JSON.stringify(r)}`);
    [st, r] = await overwrite();
    check('replacing a file in the media bucket works', ok(st), `${st} ${JSON.stringify(r)}`);
  } else {
    let [st, r] = await addRecipient(`Closed${n}`);
    check('adding a recipient is REFUSED', st >= 400, `got ${st} ${JSON.stringify(r)}`);
    [st, r] = await call('/rest/v1/content_items', {
      method: 'POST', token: tok, prefer: 'return=representation',
      body: { legacy_id: legacy, account_id: acct, kind: 'message', body: 'One more.', recipient_id: recId, deliver_on: '2044-07-01' },
    });
    check('writing a message is REFUSED', st >= 400, `got ${st} ${JSON.stringify(r)}`);
    [st, r] = await editMessage(`Closed edit ${n}.`);
    check('editing a message is REFUSED (no row updated)', st >= 400 || (Array.isArray(r) && r.length === 0), `got ${st} ${JSON.stringify(r)}`);
    [st, r] = await upload(`closed-${n}.png`);
    check('an upload to the media bucket is REFUSED', st >= 400, `got ${st} ${JSON.stringify(r)}`);
    [st, r] = await overwrite();
    check('replacing a file in the media bucket is REFUSED', st >= 400, `got ${st} ${JSON.stringify(r)}`);
    [st, r] = await call('/rest/v1/content_items?select=id', { token: tok });
    check('the customer can still read everything', st === 200 && r.length >= 1, `${st} ${JSON.stringify(r)}`);
  }
}

try {
  console.log('A new account, in its trial');
  uidA = await adminCreate(A); tok = await signIn(A);
  uidB = await adminCreate(B); tokB = await signIn(B);
  let [st, r] = await call('/rest/v1/accounts?select=id,trial_ends_at', { token: tok });
  check('signup still creates the account row (the insert guard lets handle_new_user through)', st === 200 && r.length === 1, `${st} ${JSON.stringify(r)}`);
  acct = r[0].id;
  const trialEnds = r[0].trial_ends_at;
  [st, r] = await call('/rest/v1/legacies?select=id', { token: tok });
  legacy = r[0].id;

  let s = await status();
  reads(s, { phase: 'horizon', storage_standing: 'trial', storage_product: 'horizon', building_open: true, social: 'closed' });
  check('the lapse date is the trial end, and building locks three months after it',
    near(s.lapse_at, trialEnds, 1000) && near(s.building_locks_at, new Date(new Date(trialEnds).setUTCMonth(new Date(trialEnds).getUTCMonth() + 3))),
    `${s.lapse_at} / ${s.building_locks_at}`);
  [st, r] = await addRecipient('Daughter');
  check('adding a recipient works', ok(st), `${st} ${JSON.stringify(r)}`);
  recId = r[0].id;
  [st, r] = await call('/rest/v1/content_items', {
    method: 'POST', token: tok, prefer: 'return=representation',
    body: { legacy_id: legacy, account_id: acct, kind: 'message', title: 'Her 30th', body: 'I am so proud of you.', recipient_id: recId, deliver_on: '2044-06-01' },
  });
  check('writing a message works', ok(st), `${st} ${JSON.stringify(r)}`);
  itemId = r[0].id;
  [st, r] = await upload('trial.png');
  check('an upload to the media bucket works', ok(st), `${st} ${JSON.stringify(r)}`);

  console.log('\nNo one else reads it');
  [st, r] = await call('/rest/v1/rpc/account_status', { method: 'POST', token: tokB, body: { p_account_id: acct } });
  check("another customer reading this account's status gets nothing", st >= 400 || (st === 200 && r.length === 0), `${st} ${JSON.stringify(r)}`);
  [st, r] = await call('/rest/v1/rpc/account_status', { method: 'POST', body: { p_account_id: acct } });
  check('signed out, it gets nothing', st >= 400 || (st === 200 && r.length === 0), `${st} ${JSON.stringify(r)}`);

  console.log('\nThe customer cannot move what Posterity sets');
  const owned = {
    phase: 'planning', phase_entered_at: '2020-01-01T00:00:00Z', initiated_at: '2020-01-01T00:00:00Z',
    interlude_at: '2020-01-01T00:00:00Z', trigger_source: 'customer_ready', trial_ends_at: '2099-01-01T00:00:00Z',
    storage_paid_through: '2099-01-01', storage_lapsed_at: '2020-01-01T00:00:00Z', storage_product: 'grace',
  };
  for (const [col, val] of Object.entries(owned)) {
    [st, r] = await call(`/rest/v1/accounts?id=eq.${acct}`, { method: 'PATCH', token: tok, prefer: 'return=representation', body: { [col]: val } });
    check(`setting their own ${col} is REFUSED by the guard`, st >= 400 && /set by Posterity/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  }
  s = await status();
  reads(s, { phase: 'horizon', storage_standing: 'trial', storage_product: 'horizon', storage_paid_through: null });

  console.log('\nTrial ended two months ago, nothing paid');
  await set({ trial_ends_at: ago(60 * DAY) });
  s = await status();
  reads(s, { storage_standing: 'lapsed', building_open: true, social: 'closed' });
  check('building locks about a month from now', near(s.building_locks_at, new Date(Date.now() + 30 * DAY), 4 * DAY), s.building_locks_at);
  await building(true, 2);

  console.log('\nTrial ended four months ago, nothing paid');
  await set({ trial_ends_at: ago(122 * DAY) });
  s = await status();
  reads(s, { storage_standing: 'lapsed', building_open: false, social: 'closed' });
  await building(false, 4);

  console.log("\nStorage paid through two days ago: Stripe's retry window");
  await set({ trial_ends_at: ago(400 * DAY), storage_paid_through: paidDay(-2) });
  s = await status();
  reads(s, { storage_standing: 'current', building_open: true, social: 'open' });
  check('the lapse date is still ahead, three days past the paid year', new Date(s.lapse_at) > new Date(), s.lapse_at);
  await building(true, 'retry');

  console.log('\nThe webhook recorded the failed retry an hour ago');
  const lapsed = ago(HOUR);
  await set({ storage_lapsed_at: lapsed });
  s = await status();
  reads(s, { storage_standing: 'lapsed', building_open: true, social: 'open' });
  check('the lapse date is the one the webhook recorded', near(s.lapse_at, lapsed, 1000), s.lapse_at);
  await building(true, 'recorded');

  console.log('\nPaid year ended five months ago');
  await set({ storage_paid_through: paidDay(-150), storage_lapsed_at: null });
  s = await status();
  reads(s, { storage_standing: 'lapsed', building_open: false, social: 'open' });
  await building(false, 5);

  console.log('\nPaid year ended fourteen months ago');
  await set({ storage_paid_through: paidDay(-425) });
  s = await status();
  reads(s, { storage_standing: 'lapsed', building_open: false, social: 'closed' });

  console.log('\nStorage paid again, on Grace Storage');
  await set({ storage_paid_through: paidDay(365), storage_product: 'grace' });
  s = await status();
  reads(s, { storage_standing: 'current', storage_product: 'grace', building_open: true, social: 'open' });
  await building(true, 'paid');

  console.log('\nInterlude, with storage paid');
  await set({ phase: 'interlude' });
  s = await status();
  reads(s, { phase: 'interlude', storage_standing: 'ended', building_open: false, social: 'read_only', lapse_at: null, building_locks_at: null });
  await building(false, 'interlude');
  [st, r] = await call(`/rest/v1/content_items?id=eq.${itemId}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
  check('the customer can still delete their own message (deletion at Interlude is Stage 4.7)', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);

  console.log('\nThe account row cannot be deleted or replaced');
  await set({ phase: 'horizon', storage_paid_through: null, trial_ends_at: ago(400 * DAY) });
  [st, r] = await call(`/rest/v1/accounts?id=eq.${acct}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
  check('deleting their own account row is REFUSED (no row deleted)', st >= 400 || (Array.isArray(r) && r.length === 0), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await svc(`/rest/v1/accounts?id=eq.${acct}&select=id`);
  check('the account row is still there', st === 200 && r.length === 1, `${st} ${JSON.stringify(r)}`);
  [st, r] = await call('/rest/v1/accounts', {
    method: 'POST', token: tok, prefer: 'return=representation',
    body: { user_id: uidA, storage_paid_through: '2099-01-01' },
  });
  check('inserting a fresh account with storage paid is REFUSED', st >= 400 && /created at signup/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);

  console.log('\nThe primary legacy cannot be deleted or demoted (20261026020000)');
  [st, r] = await svc('/rest/v1/content_items', {
    method: 'POST', prefer: 'return=representation',
    body: { legacy_id: legacy, account_id: acct, kind: 'message', body: 'Still here.', recipient_id: recId, deliver_on: '2045-01-01' },
  });
  check('a message sits in the primary legacy', ok(st), `${st} ${JSON.stringify(r)}`);
  [st, r] = await call(`/rest/v1/legacies?id=eq.${legacy}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
  check('deleting the primary legacy is REFUSED (no row deleted)', st >= 400 || (Array.isArray(r) && r.length === 0), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await svc(`/rest/v1/content_items?legacy_id=eq.${legacy}&select=id`);
  check('its message is still there', st === 200 && r.length === 1, `${st} ${JSON.stringify(r)}`);
  [st, r] = await call(`/rest/v1/legacies?id=eq.${legacy}`, { method: 'PATCH', token: tok, prefer: 'return=representation', body: { is_primary: false } });
  check('demoting the primary legacy is REFUSED by the guard', st >= 400 && /set by Posterity/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await call('/rest/v1/legacies', { method: 'POST', token: tok, prefer: 'return=representation', body: { account_id: acct, is_primary: true, title: 'Another' } });
  check('inserting a second primary legacy is REFUSED', st >= 400 && /created at signup/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await call('/rest/v1/legacies', { method: 'POST', token: tok, prefer: 'return=representation', body: { account_id: acct, title: 'Another' } });
  check('a second legacy can be added, and is not the primary unless it says so (20261026030000)', ok(st) && r.length === 1 && r[0].is_primary === false, `${st} ${JSON.stringify(r)}`);
  const second = r[0]?.id;
  [st, r] = await call(`/rest/v1/legacies?id=eq.${second}`, { method: 'PATCH', token: tok, prefer: 'return=representation', body: { is_primary: true } });
  check('promoting it to primary is REFUSED by the guard', st >= 400 && /set by Posterity/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await call(`/rest/v1/legacies?id=eq.${second}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
  check('the second legacy can be deleted', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);

  console.log('\nPlans are read-only to the customer (20261026020000)');
  [st, r] = await svc('/rest/v1/plans', { method: 'POST', prefer: 'return=representation', body: { account_id: acct, plan_year: 1, tier: 'basic' } });
  check('the service role writes an unpaid plan, as the webhook will', ok(st) && r.length === 1, `${st} ${JSON.stringify(r)}`);
  const planId = r[0]?.id;
  [st, r] = await call('/rest/v1/plans?select=id', { token: tok });
  check('the customer can read their plan', st === 200 && r.length === 1, `${st} ${JSON.stringify(r)}`);
  for (const [col, val] of Object.entries({ paid_at: '2026-10-01T00:00:00Z', tier: 'legacy', plan_year: 2, delivery_year: 2030, funds_released_at: '2026-10-01T00:00:00Z' })) {
    [st, r] = await call(`/rest/v1/plans?id=eq.${planId}`, { method: 'PATCH', token: tok, prefer: 'return=representation', body: { [col]: val } });
    check(`setting their plan's ${col} is REFUSED by the guard`, st >= 400 && /set by payment/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  }
  [st, r] = await call('/rest/v1/plans', { method: 'POST', token: tok, prefer: 'return=representation', body: { account_id: acct, plan_year: 2, tier: 'legacy', paid_at: '2026-10-01T00:00:00Z' } });
  check('inserting a paid plan is REFUSED', st >= 400 && /set by payment/.test(JSON.stringify(r)), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await call(`/rest/v1/plans?id=eq.${planId}`, { method: 'DELETE', token: tok, prefer: 'return=representation' });
  check('deleting their plan is REFUSED (no row deleted)', st >= 400 || (Array.isArray(r) && r.length === 0), `got ${st} ${JSON.stringify(r)}`);
  [st, r] = await svc(`/rest/v1/plans?id=eq.${planId}&select=paid_at,tier`);
  check('the plan is still there, unpaid and on its tier', st === 200 && r.length === 1 && r[0].paid_at === null && r[0].tier === 'basic', `${st} ${JSON.stringify(r)}`);
} catch (err) {
  console.log(`  ✗ test stopped: ${err.message}`);
  fails++;
} finally {
  console.log('\nCleanup');
  // The account's files first — deleting a user does not delete their storage files.
  if (files.length) {
    const [st, r] = await svc('/storage/v1/object/legacy-media', { method: 'DELETE', body: { prefixes: files } });
    console.log(`  ${st === 200 ? '✓' : '✗'} test files removed from the bucket (${st === 200 ? r.length : 0}) [${st}]`);
    if (st !== 200) fails++;
  }
  for (const uid of [uidA, uidB]) if (uid) await adminDelete(uid);
  console.log('  test users deleted');
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
