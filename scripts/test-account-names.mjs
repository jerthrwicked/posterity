#!/usr/bin/env node
// Posterity — the account's legal name, name, and phone, tested live as a real signed-in user · Walker Brown
/*
20261027020000_account_names_and_phone and 20261028010000_account_details. Signup sends legal_name, an optional
name, and an optional phone in the user's metadata, and handle_new_user writes
them to the account. Through PostgREST with the customer's own token, so
row-level security is the thing under test.

What matters most:
  - the name recipients see is the one the customer gave, or the legal name
    when they gave none
  - a phone number that is not E.164 is dropped at signup instead of refusing it
  - a signup without a legal name is refused
  - the customer reads and edits their own name, legal name, and phone; a name
    left blank becomes the legal name; a missing legal name, a name without a
    letter or number, or a malformed phone is refused
  - a changed phone number starts over unconfirmed, and the customer cannot
    confirm a number themselves
  - another customer's account is neither readable nor editable

Users are created through the admin endpoint, which fires the same trigger a
signup does without sending a confirmation email.

Run: node scripts/test-account-names.mjs
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

async function call(path, { method = 'GET', body, token, key = ANON, prefer } = {}) {
  const headers = { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return [r.status, data];
}
const svc = (path, opts = {}) => call(path, { ...opts, key: SERVICE });

let fails = 0;
const check = (label, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + label); if (!cond) fails++; };

const users = [];
async function signup(email, metadata) {
  let [st, r] = await svc('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: metadata },
  });
  if (st === 422) {
    // Left over from a run that crashed before cleanup. Remove it and retry once.
    const [, list] = await svc('/auth/v1/admin/users?page=1&per_page=200');
    const old = (list.users || []).find((u) => u.email === email);
    if (old) await svc(`/auth/v1/admin/users/${old.id}`, { method: 'DELETE' });
    [st, r] = await svc('/auth/v1/admin/users', {
      method: 'POST', body: { email, password: 'test-password-123', email_confirm: true, user_metadata: metadata },
    });
  }
  if (st !== 200) throw new Error(`create ${email}: ${st}`);
  users.push(r.id);
  const [, session] = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: 'test-password-123' } });
  const [, rows] = await svc(`/rest/v1/accounts?user_id=eq.${r.id}&select=id,legal_name,name,phone`);
  return { uid: r.id, token: session.access_token, account: rows[0] };
}

try {
  console.log('\nSignup writes the names and phone to the account');
  const a = await signup('names-a@posterity.test', { legal_name: '  Names Test Able  ', name: ' Able ', phone: '+15045551234' });
  check('legal name kept, trimmed', a.account.legal_name === 'Names Test Able');
  check('the name given is the name recipients see', a.account.name === 'Able');
  check('an E.164 phone is kept', a.account.phone === '+15045551234');

  const b = await signup('names-b@posterity.test', { legal_name: 'Names Test Baker', phone: '504-555-1234' });
  check('no name given: the name is the legal name', b.account.name === 'Names Test Baker');
  check('a phone that is not E.164 is dropped, and the signup still succeeds', b.account.phone === null);

  const [stNoLegal] = await svc('/auth/v1/admin/users', {
    method: 'POST', body: { email: 'names-c@posterity.test', password: 'test-password-123', email_confirm: true, user_metadata: { name: 'No Legal' } },
  });
  check(`a signup without a legal name is refused [${stNoLegal}]`, stNoLegal >= 400);
  if (stNoLegal === 200) {
    const [, list] = await svc('/auth/v1/admin/users?page=1&per_page=200');
    const made = (list.users || []).find((u) => u.email === 'names-c@posterity.test');
    if (made) users.push(made.id);
  }

  console.log('\nThe customer edits their own account details');
  const mine = `/rest/v1/accounts?id=eq.${a.account.id}`;
  let [st, rows] = await call(mine + '&select=legal_name,name,phone', { token: a.token });
  check('reads their own legal name, name, and phone', st === 200 && rows[0]?.legal_name === 'Names Test Able');
  [st, rows] = await call(mine, { method: 'PATCH', token: a.token, body: { name: 'Abe', legal_name: 'Names Test Abel', phone: '+15045550000' }, prefer: 'return=representation' });
  check('changes their name, legal name, and phone', st === 200 && rows[0]?.name === 'Abe' && rows[0]?.legal_name === 'Names Test Abel' && rows[0]?.phone === '+15045550000');
  [st] = await call(mine, { method: 'PATCH', token: a.token, body: { phone: '555-1234' } });
  check(`a malformed phone is refused [${st}]`, st === 400);
  [st, rows] = await call(mine, { method: 'PATCH', token: a.token, body: { name: '   ' }, prefer: 'return=representation' });
  check(`a name left blank becomes the legal name [${st}]`, st === 200 && rows[0]?.name === 'Names Test Abel');
  [st] = await call(mine, { method: 'PATCH', token: a.token, body: { name: '\u200b\u200b' } });
  check(`a name of invisible characters is refused [${st}]`, st === 400);
  [st] = await call(mine, { method: 'PATCH', token: a.token, body: { legal_name: null } });
  check(`removing the legal name is refused [${st}]`, st === 400);

  console.log('\nA changed phone number starts over unconfirmed');
  await svc(mine, { method: 'PATCH', body: { phone_confirmed_at: new Date().toISOString() } });
  [st] = await call(mine, { method: 'PATCH', token: a.token, body: { phone_confirmed_at: new Date().toISOString() } });
  check(`the customer cannot confirm a number themselves [${st}]`, st === 403);
  [st, rows] = await call(mine, { method: 'PATCH', token: a.token, body: { name: 'Abe' }, prefer: 'return=representation' });
  check('an edit that leaves the number alone keeps it confirmed', st === 200 && rows[0]?.phone_confirmed_at !== null);
  [st, rows] = await call(mine, { method: 'PATCH', token: a.token, body: { phone: '+15045559999' }, prefer: 'return=representation' });
  check('a changed number is no longer confirmed', st === 200 && rows[0]?.phone_confirmed_at === null);
  [st] = await call(mine, { method: 'PATCH', token: a.token, body: { phone: null } });
  check(`removes their phone [${st}]`, st === 204);

  console.log("\nAnother customer's details stay private");
  const theirs = `/rest/v1/accounts?id=eq.${b.account.id}`;
  [st, rows] = await call(theirs + '&select=legal_name,name,phone', { token: a.token });
  check("reads none of another customer's account", st === 200 && rows.length === 0);
  [st, rows] = await call(theirs, { method: 'PATCH', token: a.token, body: { name: 'Hijacked' }, prefer: 'return=representation' });
  const [, after] = await svc(theirs + '&select=name');
  check("cannot change another customer's name", rows.length === 0 && after[0]?.name === 'Names Test Baker');
} catch (e) {
  console.log('  ✗ stopped: ' + e.message); fails++;
} finally {
  for (const uid of users) {
    const [s] = await svc(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' });
    console.log(`  test user deleted [${s}]`);
  }
}
console.log(fails ? `\n✗ ${fails} FAILED` : '\n✓ all checks passed');
process.exit(fails ? 1 : 0);
