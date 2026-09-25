#!/usr/bin/env node
// Posterity — Communication Dispatch System database test
/*
Exercises the dispatch tables against the live database as real signed-in users.

What matters most:
  - a customer can read, write, and call NOTHING in the dispatch system; it is
    server-side only, like stripe_events
  - two scheduler cycles claiming at once never take the same message
  - the event log is append-only even for the service role, and it outlives the
    account it records, while that account's pending sends end with it

Every event this test writes is flagged is_test. The log is append-only, so
those rows stay in it permanently.
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

async function adminCreate(email) {
  const [st, r] = await svc('/auth/v1/admin/users', {
    method: 'POST', body: { email, password: 'test-password-123', email_confirm: true },
  });
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
const refusedOrEmpty = (st, rows) => st >= 400 || (st === 200 && Array.isArray(rows) && rows.length === 0);

const TABLES = ['dispatch_messages', 'dispatch_events', 'dispatch_copy', 'text_agreements', 'dispatch_inbound'];
const RPCS = {
  dispatch_claim: { p_limit: 25 },
  dispatch_record_agreement: { p_phone: '+15005550006', p_is_test: true },
  dispatch_record_stop: { p_phone: '+15005550006', p_via: 'test', p_is_test: true },
  dispatch_confirm_number: { p_phone: '+15005550006', p_via: 'inbound_text', p_is_test: true },
};

const run = Date.now().toString(36);
const message = (acct, n, extra = {}) => ({
  account_id: acct, channel: 'email', destination: `dispatch-test-${n}@example.com`,
  copy_key: 'sms.agreement_confirmation', caller: 'test-dispatch-db', is_test: true, ...extra,
});

const A = 'dispatch-a@posterity.app', B = 'dispatch-b@posterity.app';
let uidA = null, uidB = null;

try {
  uidA = await adminCreate(A); const tokA = await signIn(A);
  uidB = await adminCreate(B); const tokB = await signIn(B);
  const [, accA] = await call('/rest/v1/accounts?select=id', { token: tokA });
  const acctA = accA[0].id;

  console.log('A customer reaches nothing');
  for (const [who, tok] of [['A', tokA], ['B', tokB]]) {
    for (const t of TABLES) {
      const [st, rows] = await call(`/rest/v1/${t}?select=*`, { token: tok });
      check(`customer ${who} sees zero rows in ${t}`, refusedOrEmpty(st, rows), `${st} ${JSON.stringify(rows)}`);
    }
  }
  let [st, r] = await call('/rest/v1/dispatch_messages', { method: 'POST', token: tokA, body: message(acctA, 'x') });
  check('customer A CANNOT enqueue a message', st >= 400, `got ${st}`);
  [st, r] = await call('/rest/v1/dispatch_events', {
    method: 'POST', token: tokA, body: { event_type: 'sent', account_id: acctA, is_test: true },
  });
  check('customer A CANNOT write to the event log', st >= 400, `got ${st}`);
  for (const [fn, args] of Object.entries(RPCS)) {
    [st, r] = await call(`/rest/v1/rpc/${fn}`, { method: 'POST', token: tokA, body: args });
    check(`customer A CANNOT call ${fn}`, st >= 400, `got ${st} ${JSON.stringify(r)}`);
  }

  console.log('\nThe service role enqueues');
  const key = `test-dispatch-db-${run}`;
  [st, r] = await svc('/rest/v1/dispatch_messages', {
    method: 'POST', body: message(acctA, 0, { idempotency_key: key }), prefer: 'return=representation',
  });
  check('service role enqueues a message', st === 201, `${st} ${JSON.stringify(r)}`);
  const firstId = r?.[0]?.id;
  check('the new message is queued and due now', r?.[0]?.status === 'queued' && !!r?.[0]?.next_attempt_at);
  [st, r] = await svc('/rest/v1/dispatch_messages', { method: 'POST', body: message(acctA, 0, { idempotency_key: key }) });
  check('a duplicate idempotency_key is REJECTED', st === 409, `got ${st}`);
  [st, r] = await svc(`/rest/v1/dispatch_events?message_id=eq.${firstId}&select=event_type,is_test`);
  check('the enqueue wrote a queued event, flagged is_test',
    st === 200 && r.length === 1 && r[0].event_type === 'queued' && r[0].is_test === true, JSON.stringify(r));

  console.log('\nConcurrent claims');
  const batch = Array.from({ length: 8 }, (_, i) => message(acctA, i + 1));
  [st, r] = await svc('/rest/v1/dispatch_messages', { method: 'POST', body: batch });
  check('eight more messages enqueued', st === 201, `got ${st}`);
  const [[st1, c1], [st2, c2]] = await Promise.all([
    svc('/rest/v1/rpc/dispatch_claim', { method: 'POST', body: { p_limit: 5 } }),
    svc('/rest/v1/rpc/dispatch_claim', { method: 'POST', body: { p_limit: 5 } }),
  ]);
  check('both claims succeed', st1 === 200 && st2 === 200, `${st1} ${st2}`);
  const ids1 = new Set(c1.map(m => m.id)), ids2 = c2.map(m => m.id);
  const overlap = ids2.filter(id => ids1.has(id));
  check('two concurrent claims never take the same row', overlap.length === 0, `overlap ${overlap}`);
  check('together they claimed all nine due rows', ids1.size + ids2.length === 9, `${ids1.size} + ${ids2.length}`);
  check('every claimed row is marked sending with a lock time',
    [...c1, ...c2].every(m => m.status === 'sending' && m.locked_at));
  [st, r] = await svc('/rest/v1/rpc/dispatch_claim', { method: 'POST', body: { p_limit: 5 } });
  check('a third claim finds nothing left to take', st === 200 && r.length === 0, `${st} ${JSON.stringify(r)}`);

  console.log('\nThe event log is append-only');
  [st, r] = await svc(`/rest/v1/dispatch_events?message_id=eq.${firstId}&select=id,outcome`);
  const evId = r[0].id;
  [st, r] = await svc(`/rest/v1/dispatch_events?id=eq.${evId}`, { method: 'PATCH', body: { outcome: 'tampered' } });
  check('UPDATE on dispatch_events is REJECTED, even for the service role', st >= 400, `got ${st}`);
  [st, r] = await svc(`/rest/v1/dispatch_events?id=eq.${evId}`, { method: 'DELETE' });
  check('DELETE on dispatch_events is REJECTED, even for the service role', st >= 400, `got ${st}`);
  [st, r] = await svc(`/rest/v1/dispatch_events?id=eq.${evId}&select=outcome`);
  check('the event is untouched', st === 200 && r.length === 1 && r[0].outcome === 'queued', JSON.stringify(r));

  console.log('\nAccount deletion');
  await adminDelete(uidA); uidA = null;
  [st, r] = await svc(`/rest/v1/dispatch_messages?account_id=eq.${acctA}&select=id`);
  check("the deleted customer's pending sends are gone", st === 200 && r.length === 0, `${st} ${r?.length}`);
  [st, r] = await svc(`/rest/v1/dispatch_events?account_id=eq.${acctA}&select=id`);
  check("the deleted customer's events remain in the log", st === 200 && r.length === 9, `${st} ${r?.length}`);
} finally {
  console.log('\nCleanup');
  for (const uid of [uidA, uidB]) if (uid) await adminDelete(uid);
  console.log('  test users deleted (their test events stay in the append-only log)');
}

console.log();
if (fails) {
  console.log(`✗ ${fails} check(s) FAILED`);
  process.exit(1);
}
console.log('✓ all checks passed');
