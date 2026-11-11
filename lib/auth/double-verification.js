// Double verification (Master Specification: "re-enter password + confirmation
// code sent to their email/phone"), built once for every action that needs it
// (Founder Build Roadmap, Stage 4.2). The email change in Settings uses it
// first, and account deletion second; the Begin button, the Legacy Guard
// confirmation, and Account Restoration reuse it as they are built.
//
// Two steps, each its own call:
//   1. startVerification: the password is checked against Supabase, then a
//      six-digit code is stored as a hash and sent through the Communication
//      Dispatch System to the address the account signs in with.
//   2. confirmVerification: the code is checked, once, within ten minutes and
//      five tries, and the payload stored at step 1 comes back to act on.
//
// The code goes by email only for now. The specification's code by text, where
// the person has agreed to texts, joins when texting clears carrier
// registration.
//
// Every write here runs with the service role: verification_codes is
// server-only (20261104000000_double_verification).

import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { enqueue } from '../dispatch/enqueue.js';

export const PURPOSES = new Set(['email_change', 'account_deletion']);
export const CODE_COPY = 'email.verification_code';
export const CALLER = 'double-verification';
export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

// Why a step was refused, as a short reason the caller maps to its own words.
export class VerificationRefused extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

function must({ data, error }) {
  if (error) throw error;
  return data;
}

export function hashCode(id, code) {
  return createHash('sha256').update(`${id}:${code}`).digest('hex');
}

function sameHash(a, b) {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

// The password re-entry: a sign-in on a client of its own that keeps nothing,
// for the address the session belongs to, signed out again at once so it
// leaves no second session behind. Returns true or false; a sign-in Supabase
// is rate-limiting is a refusal rather than a wrong password.
export async function checkPassword({ url, anonKey, userId, email, password }) {
  if (!password) return false;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) throw new VerificationRefused('rate_limited');
    return false;
  }
  await client.auth.signOut({ scope: 'local' });
  return data?.user?.id === userId;
}

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-), so the codes it queues into the live database carry a caller
// the scheduler skips and are never sent. The Worker never sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;

// Step 1. db: a service-role client. account: { id, name }. user: the signed-in
// Supabase user. Sends the code to user.email and returns the code's id, which
// the second step names. Earlier open codes for the same purpose close as
// superseded, so only the newest works.
export async function startVerification(db, {
  account, user, purpose, password, payload,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  caller = TEST_CALLER ?? CALLER, isTest = !!TEST_CALLER, now = () => new Date(),
}) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  if (!PURPOSES.has(purpose)) throw new Error(`double verification: no purpose ${purpose}`);
  if (!account?.id || !user?.id || !user?.email) throw new Error('double verification: account and user are required');
  // What the code confirms comes back at step 2 to act on, so a code that confirms nothing is refused.
  if (!payload || typeof payload !== 'object' || !Object.keys(payload).length) throw new Error('double verification: a payload is required');

  if (!(await checkPassword({ url, anonKey, userId: user.id, email: user.email, password }))) {
    throw new VerificationRefused('wrong_password');
  }

  const hourAgo = new Date(now().getTime() - 60 * 60 * 1000).toISOString();
  const recent = must(await db.from('verification_codes').select('id')
    .eq('account_id', account.id).eq('purpose', purpose).gte('created_at', hourAgo));
  if (recent.length >= MAX_CODES_PER_HOUR) throw new VerificationRefused('too_many_codes');

  must(await db.from('verification_codes')
    .update({ closed_at: now().toISOString(), outcome: 'superseded' })
    .eq('account_id', account.id).eq('purpose', purpose).is('closed_at', null));

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  must(await db.from('verification_codes').insert({
    id,
    account_id: account.id,
    purpose,
    code_hash: hashCode(id, code),
    payload,
    expires_at: new Date(now().getTime() + CODE_MINUTES * 60 * 1000).toISOString(),
  }));

  await enqueue(db, {
    accountId: account.id,
    email: user.email,
    copy: { email: CODE_COPY },
    params: { code, name: account.name },
    caller,
    selfInitiated: true,
    idempotencyKey: `verification:${id}`,
    isTest,
  });
  return { id };
}

// Step 2. Returns the payload stored at step 1 once the code matches. Each try
// counts before the code is compared, and the count moves only from the value
// just read, so two tries at once cannot both spend the same attempt.
export async function confirmVerification(db, { accountId, purpose, id, code, now = () => new Date() }) {
  const typed = String(code ?? '').replace(/\D/g, '');
  if (!id || typed.length !== 6) throw new VerificationRefused('wrong_code');

  const row = must(await db.from('verification_codes').select()
    .eq('id', id).eq('account_id', accountId).eq('purpose', purpose).maybeSingle());
  if (!row || row.closed_at) throw new VerificationRefused('expired');
  if (new Date(row.expires_at) <= now()) throw new VerificationRefused('expired');

  const counted = must(await db.from('verification_codes')
    .update({ attempts: row.attempts + 1 })
    .eq('id', id).eq('attempts', row.attempts).is('closed_at', null)
    .select('id'));
  if (counted.length !== 1) throw new VerificationRefused('expired');

  if (!sameHash(hashCode(id, typed), row.code_hash)) {
    if (row.attempts + 1 >= MAX_ATTEMPTS) {
      must(await db.from('verification_codes')
        .update({ closed_at: now().toISOString(), outcome: 'too_many_attempts' })
        .eq('id', id).is('closed_at', null));
      throw new VerificationRefused('too_many_attempts');
    }
    throw new VerificationRefused('wrong_code');
  }

  const closed = must(await db.from('verification_codes')
    .update({ closed_at: now().toISOString(), outcome: 'confirmed' })
    .eq('id', id).is('closed_at', null)
    .select('payload'));
  if (closed.length !== 1) throw new VerificationRefused('expired');
  return closed[0].payload;
}
