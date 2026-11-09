// The recovery email address (Master Specification, Settings: "optional,
// confirmed by link, and held only for account recovery. It receives reset
// links and nothing else"), Founder Build Roadmap, Stage 4.2.
//
//   setRecoveryEmail      the password is entered again (Walker, November 9:
//                         adding or changing the address asks for it), then a
//                         link goes to the address. Until that link is used the
//                         address is waiting and receives nothing, and any
//                         confirmed address the account holds keeps receiving
//                         reset links (20261109000001_recovery_email_pending).
//   resendRecoveryLink    a new link to the waiting address, with the password
//                         again; the old link stops working.
//   confirmRecoveryEmail  the link's token, once, within an hour; the waiting
//                         address becomes the confirmed one.
//   cancelRecoveryChange  the waiting address is dropped; a confirmed one stays.
//   removeRecoveryEmail   the row is dropped: the confirmed address and any
//                         waiting one.
//   sendRecoveryResets    from the sign-in page's reset: where the address given
//                         is a confirmed recovery address, a reset link for that
//                         account goes to it.
//
// Every link is built on SITE, never on the request's own host, so a reset
// asked for with a forged host still points at Posterity.
//
// Every write runs with the service role: recovery_emails is server-only
// (20261109000000_recovery_email).

import { createHash, randomBytes } from 'node:crypto';
import { enqueue } from '../dispatch/enqueue.js';
import { SITE } from '../dispatch/reports.js';
import { checkPassword, VerificationRefused } from './double-verification.js';
import { confirmLink } from './send-email.js';

export const CONFIRM_COPY = 'email.confirm_recovery_email';
export const RESET_COPY = 'email.reset_password';
export const CALLER = 'recovery-email';
export const RESET_CALLER = 'recovery-email-reset';
export const CONFIRM_PATH = '/auth/recovery-email';
export const LINK_MINUTES = 60;
export const MAX_LINKS_PER_HOUR = 5;
export const MAX_RESETS_PER_HOUR = 5;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-), so what it queues carries a caller the scheduler skips and is
// never sent. The Worker never sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function normalize(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function recoveryLink({ site = SITE, token }) {
  return `${site}${CONFIRM_PATH}?${new URLSearchParams({ token })}`;
}

async function sentWithinHour(db, { accountId, copy, caller, now }) {
  const hourAgo = new Date(now().getTime() - 60 * 60 * 1000).toISOString();
  return must(await db.from('dispatch_messages').select('id')
    .eq('account_id', accountId).eq('copy_key', copy).eq('caller', caller).gte('created_at', hourAgo)).length;
}

// The account's recovery addresses as Settings shows them, or null where it
// holds none: { email, pending }. email is the confirmed address or null;
// pending is { email, expired } for the address waiting on its link, or null.
export async function readRecoveryEmail(db, accountId, { now = () => new Date() } = {}) {
  const row = must(await db.from('recovery_emails').select('email, pending_email, link_sent_at')
    .eq('account_id', accountId).maybeSingle());
  if (!row) return null;
  const pending = row.pending_email
    ? { email: row.pending_email, expired: new Date(row.link_sent_at).getTime() + LINK_MINUTES * 60000 <= now().getTime() }
    : null;
  return { email: row.email, pending };
}

// A new token for the row, and the link to it queued to the address. The
// upsert names only the waiting columns, so a confirmed address stays as it is.
async function sendLink(db, { account, email, site, caller, isTest, now }) {
  if (await sentWithinHour(db, { accountId: account.id, copy: CONFIRM_COPY, caller, now }) >= MAX_LINKS_PER_HOUR) {
    throw new VerificationRefused('too_many_links');
  }
  const token = randomBytes(32).toString('base64url');
  must(await db.from('recovery_emails').upsert({
    account_id: account.id, pending_email: email, token_hash: hashToken(token), link_sent_at: now().toISOString(),
  }, { onConflict: 'account_id' }));
  await enqueue(db, {
    accountId: account.id,
    email,
    copy: { email: CONFIRM_COPY },
    params: { link: recoveryLink({ site, token }), name: account.name },
    caller,
    selfInitiated: true,
    idempotencyKey: `recovery-email:${hashToken(token)}`,
    isTest,
  });
}

// db: a service-role client. account: { id, name }. user: the signed-in
// Supabase user. Refuses with a reason: bad_email, same_as_sign_in,
// already_held, wrong_password, rate_limited, too_many_links.
export async function setRecoveryEmail(db, {
  account, user, email, password,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  site = SITE, caller = TEST_CALLER ?? CALLER, isTest = !!TEST_CALLER, now = () => new Date(),
}) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  if (!account?.id || !user?.id || !user?.email) throw new Error('recovery email: account and user are required');
  const address = normalize(email);
  if (address.length > 254 || !EMAIL.test(address)) throw new VerificationRefused('bad_email');
  if (address === normalize(user.email)) throw new VerificationRefused('same_as_sign_in');

  const held = await readRecoveryEmail(db, account.id, { now });
  if (held?.email === address) throw new VerificationRefused('already_held');

  if (!(await checkPassword({ url, anonKey, userId: user.id, email: user.email, password }))) {
    throw new VerificationRefused('wrong_password');
  }
  await sendLink(db, { account, email: address, site, caller, isTest, now });
  return { email: address };
}

// A new link to the address still waiting on one. Refuses with nothing_waiting
// where there is none.
export async function resendRecoveryLink(db, {
  account, user, password,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  site = SITE, caller = TEST_CALLER ?? CALLER, isTest = !!TEST_CALLER, now = () => new Date(),
}) {
  const held = await readRecoveryEmail(db, account.id, { now });
  if (!held?.pending) throw new VerificationRefused('nothing_waiting');
  if (!(await checkPassword({ url, anonKey, userId: user.id, email: user.email, password }))) {
    throw new VerificationRefused('wrong_password');
  }
  await sendLink(db, { account, email: held.pending.email, site, caller, isTest, now });
  return { email: held.pending.email };
}

// The link's token. Returns the address it confirms, which replaces any
// confirmed one, or null for a token that is unknown, used, replaced, or past
// its hour. The update matches the hash it read, so a token works once even if
// two clicks arrive together.
export async function confirmRecoveryEmail(db, { token, now = () => new Date() }) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const hash = hashToken(token);
  const row = must(await db.from('recovery_emails').select('account_id, pending_email, link_sent_at')
    .eq('token_hash', hash).maybeSingle());
  if (!row) return null;
  if (new Date(row.link_sent_at).getTime() + LINK_MINUTES * 60000 <= now().getTime()) return null;
  const done = must(await db.from('recovery_emails')
    .update({
      email: row.pending_email, confirmed_at: now().toISOString(),
      pending_email: null, token_hash: null, link_sent_at: null,
    })
    .eq('account_id', row.account_id).eq('token_hash', hash).select('email'));
  return done.length === 1 ? done[0].email : null;
}

// Drops the waiting address. A row with no confirmed address goes; one with
// a confirmed address keeps it.
export async function cancelRecoveryChange(db, { accountId }) {
  must(await db.from('recovery_emails').delete().eq('account_id', accountId).is('email', null));
  must(await db.from('recovery_emails').update({ pending_email: null, token_hash: null, link_sent_at: null })
    .eq('account_id', accountId).not('email', 'is', null));
}

export async function removeRecoveryEmail(db, { accountId }) {
  must(await db.from('recovery_emails').delete().eq('account_id', accountId));
}

// From the sign-in page's reset, for whatever address was typed. For each
// account holding it as a confirmed recovery address, Supabase makes a reset
// link for the address the account signs in with (generating a link sends
// nothing), and the link goes to the recovery address instead. Returns how many
// were queued; the page says the same thing whatever the count, so the caller
// never shows it.
export async function sendRecoveryResets(db, {
  email, site = SITE, caller = TEST_CALLER ?? RESET_CALLER, isTest = !!TEST_CALLER, now = () => new Date(),
}) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  const address = normalize(email);
  if (address.length > 254 || !EMAIL.test(address)) return 0;
  const rows = must(await db.from('recovery_emails').select('account_id, email')
    .eq('email', address).not('confirmed_at', 'is', null));

  let queued = 0;
  for (const row of rows) {
    if (await sentWithinHour(db, { accountId: row.account_id, copy: RESET_COPY, caller, now }) >= MAX_RESETS_PER_HOUR) continue;
    const account = must(await db.from('accounts').select('id, name, user_id').eq('id', row.account_id).single());
    const { data: found, error: userError } = await db.auth.admin.getUserById(account.user_id);
    if (userError || !found?.user?.email) continue;
    const { data: link, error } = await db.auth.admin.generateLink({ type: 'recovery', email: found.user.email });
    if (error || !link?.properties?.hashed_token) {
      console.log(`recovery reset: no link for account ${account.id}: ${error?.status ?? ''} ${error?.code ?? ''}`);
      continue;
    }
    const tokenHash = link.properties.hashed_token;
    await enqueue(db, {
      accountId: account.id,
      email: row.email,
      copy: { email: RESET_COPY },
      params: { link: confirmLink({ site, tokenHash, action: 'recovery' }), name: account.name },
      caller,
      selfInitiated: true,
      idempotencyKey: `recovery-reset:${tokenHash}`,
      isTest,
    });
    queued++;
  }
  return queued;
}
