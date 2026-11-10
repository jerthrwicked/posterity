// Account recovery (Master Specification, Settings: "for a customer or a Legacy
// Guard who has lost every route"), Founder Build Roadmap, Stage 4.2.
//
//   requestRecovery   from the sign-in page: the address the account signs in
//                     with, and a new address. It opens only from a browser
//                     that has signed into that login before (known-browser.js).
//                     A link goes to the new address and lasts an hour; nothing
//                     else happens and no one on file is told.
//   confirmRecovery   the link's token, once. The seven days start here, and a
//                     notice carrying a cancel link is queued to the address
//                     the account signs in with, its confirmed recovery email
//                     address, and its phone number.
//   cancelRecovery    a notice's link. The request closes and access stays
//                     where it is.
//   completeDue       the scheduled pass. A request whose seven days have run
//                     moves access: the new address becomes the address the
//                     account signs in with, every signed-in browser is signed
//                     out, the thirty-day lock starts, and a link to choose a
//                     new password goes to the new address.
//
// The seven days count from when the notices left, not from when they were
// queued: completeDue holds a request while any notice is still waiting to
// send, and closes it as failed where none could be sent at all, so access
// never moves without a notice having gone to someone.
//
// Not built here: the Legacy Guard's code (Stage 5.2) and recovery for a Legacy
// Guard's own login (Stage 5.1).
//
// Every link is built on SITE, never on the request's own host. Every write
// runs with the service role: account_recoveries and known_browsers are
// server-only (20261110000000_account_recovery).

import { randomBytes } from 'node:crypto';
import { enqueue } from '../dispatch/enqueue.js';
import { SITE } from '../dispatch/reports.js';
import { VerificationRefused } from './double-verification.js';
import { cookieName, isKnownBrowser } from './known-browser.js';
import { hashToken, normalize } from './recovery-email.js';
import { confirmLink } from './send-email.js';

export const CONFIRM_COPY = 'email.confirm_account_recovery';
export const NOTICE_COPY = 'email.account_recovery_notice';
export const NOTICE_SMS_COPY = 'sms.account_recovery_notice';
export const COMPLETE_COPY = 'email.account_recovery_complete';
export const CALLER = 'account-recovery';
export const CONFIRM_PATH = '/account-recovery/confirm';
export const CANCEL_PATH = '/account-recovery/cancel';
export const LINK_MINUTES = 60;
export const WAIT_DAYS = 7;
// The thirty-day lock itself is account_status().recovery_lock_until, in the
// database; this names its length for whoever reads it here.
export const LOCK_DAYS = 30;
export const MAX_LINKS_PER_HOUR = 3;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9][0-9]{7,14}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// A local server run by a test script sets DISPATCH_TEST_CALLER (it must start
// with test-). Requests it makes carry that caller, so nothing they queue is
// sent, and the pass it runs takes only its own requests. The Worker never
// sets it.
const TEST_CALLER = process.env.DISPATCH_TEST_CALLER || null;

function must({ data, error }) {
  if (error) throw error;
  return data;
}

function checkCaller(caller) {
  if (TEST_CALLER && !TEST_CALLER.startsWith('test-')) throw new Error('DISPATCH_TEST_CALLER must start with test-');
  if (!caller) throw new Error('account recovery: caller is required');
}

const isTestCaller = (caller) => String(caller).startsWith('test-');
const newToken = () => randomBytes(32).toString('base64url');
const readable = (token) => typeof token === 'string' && token.length > 0 && token.length <= 100;
const linkExpired = (row, now) => new Date(row.link_sent_at).getTime() + LINK_MINUTES * 60000 <= now().getTime();

export function recoveryConfirmLink({ site = SITE, token }) {
  return `${site}${CONFIRM_PATH}?${new URLSearchParams({ token })}`;
}

export function recoveryCancelLink({ site = SITE, token }) {
  return `${site}${CANCEL_PATH}?${new URLSearchParams({ token })}`;
}

async function loginIdFor(db, email) {
  return must(await db.rpc('login_id_for_email', { p_email: email })) ?? null;
}

async function close(db, id, outcome, now) {
  return must(await db.from('account_recoveries').update({ closed_at: now().toISOString(), outcome })
    .eq('id', id).is('closed_at', null).select('id')).length === 1;
}

const noticeKey = (id, which) => `account-recovery-notice:${id}:${which}`;

// The notices queued for a request, whatever became of each.
async function noticesFor(db, id) {
  return must(await db.from('dispatch_messages').select('id, status, sent_at')
    .like('idempotency_key', `${noticeKey(id, '')}%`));
}

// A notice still waiting to send says a request is waiting. Once the request
// has closed it would say so wrongly, so it is withdrawn. One already being
// sent goes; its link then says what became of the request.
async function withdrawNotices(db, id) {
  must(await db.from('dispatch_messages').update({ status: 'cancelled' })
    .like('idempotency_key', `${noticeKey(id, '')}%`).eq('status', 'queued'));
}

// From the sign-in page. db: a service-role client. readCookie: (name) => the
// request's cookie of that name, or undefined.
//
// Throws VerificationRefused only for what the person typed, which tells them
// nothing about any account: bad_email, bad_new_email, same_address.
// Otherwise it returns { sent, reason }, and the page says the same thing
// whichever it was, so it tells no one which addresses are Posterity's or
// which browsers an account has used. The reason is for logs and tests:
//   no_login, no_account   no customer signs in with that address
//   unknown_browser        this browser has not signed into that login
//   new_email_taken        another login already signs in with the new address
//   already_waiting        a request for the account is inside its seven days
//   too_many_links         three links within the hour
//   raced                  another request for the account landed first
export async function requestRecovery(db, {
  email, newEmail, readCookie,
  site = SITE, caller = TEST_CALLER ?? CALLER, now = () => new Date(),
}) {
  checkCaller(caller);
  const address = normalize(email);
  const newAddress = normalize(newEmail);
  if (address.length > 254 || !EMAIL.test(address)) throw new VerificationRefused('bad_email');
  if (newAddress.length > 254 || !EMAIL.test(newAddress)) throw new VerificationRefused('bad_new_email');
  if (address === newAddress) throw new VerificationRefused('same_address');
  const quiet = (reason) => ({ sent: false, reason });

  const userId = await loginIdFor(db, address);
  if (!userId) return quiet('no_login');
  const account = must(await db.from('accounts').select('id').eq('user_id', userId).maybeSingle());
  if (!account) return quiet('no_account');

  const cookieValue = typeof readCookie === 'function' ? readCookie(await cookieName(userId)) : null;
  if (!(await isKnownBrowser(db, { userId, cookieValue, now }))) return quiet('unknown_browser');

  if (await loginIdFor(db, newAddress)) return quiet('new_email_taken');

  const open = must(await db.from('account_recoveries').select('id, confirmed_at, link_sent_at')
    .eq('account_id', account.id).is('closed_at', null).maybeSingle());
  if (open?.confirmed_at) return quiet('already_waiting');

  const hourAgo = new Date(now().getTime() - 60 * 60 * 1000).toISOString();
  const links = must(await db.from('dispatch_messages').select('id')
    .eq('account_id', account.id).eq('copy_key', CONFIRM_COPY).eq('caller', caller).gte('created_at', hourAgo)).length;
  if (links >= MAX_LINKS_PER_HOUR) return quiet('too_many_links');

  // An earlier request whose link was never used gives way to this one, and
  // its link stops working.
  if (open) {
    must(await db.from('account_recoveries')
      .update({ closed_at: now().toISOString(), outcome: linkExpired(open, now) ? 'expired' : 'superseded' })
      .eq('id', open.id).is('closed_at', null).is('confirmed_at', null));
  }

  const token = newToken();
  const { data: row, error } = await db.from('account_recoveries').insert({
    account_id: account.id, new_email: newAddress, confirm_token_hash: hashToken(token),
    link_sent_at: now().toISOString(), caller,
  }).select('id').single();
  // 23505: the account already has an open request, so another landed first.
  if (error?.code === '23505') return quiet('raced');
  if (error) throw error;

  await enqueue(db, {
    accountId: account.id,
    email: newAddress,
    copy: { email: CONFIRM_COPY },
    params: { link: recoveryConfirmLink({ site, token }) },
    caller,
    selfInitiated: true,
    idempotencyKey: `account-recovery-confirm:${row.id}`,
    isTest: isTestCaller(caller),
  });
  return { sent: true, reason: 'sent', id: row.id };
}

// What the confirm page shows before its button is pressed: the new address a
// working link belongs to, or null. Reading the link uses nothing, so a mail
// scanner that opens it starts nothing.
export async function peekConfirm(db, { token, now = () => new Date() }) {
  if (!readable(token)) return null;
  const row = must(await db.from('account_recoveries').select('new_email, link_sent_at')
    .eq('confirm_token_hash', hashToken(token)).is('closed_at', null).maybeSingle());
  if (!row || linkExpired(row, now)) return null;
  return { newEmail: row.new_email };
}

// The confirm page's button. Returns { outcome }:
//   waiting         the seven days have started; also dueAt and newEmail
//   invalid         the link is unknown, used, replaced, or past its hour
//   address_taken   another login took the new address meanwhile
//   failed          the notices could not be queued, so nothing was started
// The update matches the hash it read, so a link works once even if two
// clicks arrive together.
export async function confirmRecovery(db, { token, site = SITE, now = () => new Date() }) {
  if (!readable(token)) return { outcome: 'invalid' };
  const hash = hashToken(token);
  const row = must(await db.from('account_recoveries').select('id, account_id, new_email, link_sent_at, caller')
    .eq('confirm_token_hash', hash).is('closed_at', null).maybeSingle());
  if (!row || linkExpired(row, now)) return { outcome: 'invalid' };

  if (await loginIdFor(db, row.new_email)) {
    await close(db, row.id, 'failed', now);
    return { outcome: 'address_taken' };
  }

  const cancelToken = newToken();
  const dueAt = new Date(now().getTime() + WAIT_DAYS * DAY_MS).toISOString();
  const started = must(await db.from('account_recoveries')
    .update({
      confirmed_at: now().toISOString(), due_at: dueAt, cancel_token_hash: hashToken(cancelToken),
      confirm_token_hash: null, link_sent_at: null,
    })
    .eq('id', row.id).eq('confirm_token_hash', hash).is('closed_at', null).select('id'));
  if (started.length !== 1) return { outcome: 'invalid' };

  try {
    await queueNotices(db, { row, cancelToken, site });
  } catch (err) {
    // A request must not wait out its seven days with no one told.
    console.log(`account recovery: notices for ${row.id} not queued: ${String(err?.message ?? err).slice(0, 200)}`);
    await close(db, row.id, 'failed', now);
    await withdrawNotices(db, row.id).catch(() => {});
    return { outcome: 'failed' };
  }
  return { outcome: 'waiting', dueAt, newEmail: row.new_email };
}

// "Every email address and phone number on file": the address the account
// signs in with, its confirmed recovery email address, and its phone number.
// Whether the text goes is channel policy's decision at send. No one set these
// off themselves, so the text keeps to the texting hours.
async function queueNotices(db, { row, cancelToken, site }) {
  const account = must(await db.from('accounts').select('id, name, user_id, phone').eq('id', row.account_id).single());
  const { data: found, error } = await db.auth.admin.getUserById(account.user_id);
  if (error || !found?.user?.email) throw new Error(`no sign-in address: ${error?.status ?? ''} ${error?.code ?? ''}`);
  const signIn = normalize(found.user.email);
  const recovery = must(await db.from('recovery_emails').select('email')
    .eq('account_id', account.id).not('confirmed_at', 'is', null).maybeSingle())?.email ?? null;

  const base = {
    accountId: account.id,
    copy: { email: NOTICE_COPY, sms: NOTICE_SMS_COPY },
    params: { link: recoveryCancelLink({ site, token: cancelToken }), name: account.name, new_email: row.new_email },
    caller: row.caller,
    selfInitiated: false,
    isTest: isTestCaller(row.caller),
  };
  await enqueue(db, { ...base, email: signIn, idempotencyKey: noticeKey(row.id, 'sign-in') });
  if (recovery && recovery !== signIn) {
    await enqueue(db, { ...base, email: recovery, idempotencyKey: noticeKey(row.id, 'recovery') });
  }
  if (account.phone && E164.test(account.phone)) {
    await enqueue(db, { ...base, phone: account.phone, idempotencyKey: noticeKey(row.id, 'phone') });
  }
}

// What the cancel page shows before its button is pressed. Returns null for a
// link that matches nothing, { state: 'waiting', newEmail, dueAt } for a
// request that can still be cancelled, or { state: 'closed', outcome }.
export async function peekCancel(db, { token }) {
  if (!readable(token)) return null;
  const row = must(await db.from('account_recoveries').select('new_email, due_at, closed_at, outcome')
    .eq('cancel_token_hash', hashToken(token)).maybeSingle());
  if (!row) return null;
  if (row.closed_at) return { state: 'closed', outcome: row.outcome };
  return { state: 'waiting', newEmail: row.new_email, dueAt: row.due_at };
}

// The cancel page's button. Returns { outcome }: cancelled, invalid for a link
// that matches nothing, or what had already become of the request (completed,
// cancelled, failed). already is true where this call changed nothing.
export async function cancelRecovery(db, { token, now = () => new Date() }) {
  if (!readable(token)) return { outcome: 'invalid' };
  const read = async () => must(await db.from('account_recoveries').select('id, closed_at, outcome')
    .eq('cancel_token_hash', hashToken(token)).maybeSingle());
  const row = await read();
  if (!row) return { outcome: 'invalid' };
  if (row.closed_at) return { outcome: row.outcome, already: true };
  if (!(await close(db, row.id, 'cancelled', now))) return { outcome: (await read()).outcome, already: true };
  await withdrawNotices(db, row.id).catch((err) => {
    console.log(`account recovery: notices for ${row.id} not withdrawn: ${String(err?.message ?? err).slice(0, 200)}`);
  });
  return { outcome: 'cancelled' };
}

// The recovery email address is "held only for account recovery" and is never
// the address the account signs in with. Where the new address was the
// account's recovery email address, confirmed or waiting, that part of the row
// goes.
async function tidyRecoveryEmail(db, { accountId, email }) {
  const row = must(await db.from('recovery_emails').select('email, pending_email').eq('account_id', accountId).maybeSingle());
  if (!row) return;
  const keepConfirmed = row.email && row.email !== email;
  const keepPending = row.pending_email && row.pending_email !== email;
  if (keepConfirmed && keepPending) return;
  if (!keepConfirmed && !keepPending) {
    must(await db.from('recovery_emails').delete().eq('account_id', accountId));
  } else if (keepConfirmed) {
    if (row.pending_email) {
      must(await db.from('recovery_emails').update({ pending_email: null, token_hash: null, link_sent_at: null }).eq('account_id', accountId));
    }
  } else {
    must(await db.from('recovery_emails').update({ email: null, confirmed_at: null }).eq('account_id', accountId));
  }
}

// Moves access for one request whose seven days have run. Each step can be
// run again, so a pass that stops partway is finished by the next one. Returns
// completed, held, failed, or retry.
async function complete(db, row, { site, now }) {
  const notices = await noticesFor(db, row.id);
  if (notices.some((n) => n.status === 'queued' || n.status === 'sending')) return 'held';
  const sent = notices.filter((n) => n.status === 'sent').map((n) => new Date(n.sent_at).getTime());
  if (!sent.length) {
    await close(db, row.id, 'failed', now);
    return 'failed';
  }
  // Seven days from when the last notice left.
  const moveAt = Math.max(...sent) + WAIT_DAYS * DAY_MS;
  if (moveAt > now().getTime()) {
    must(await db.from('account_recoveries').update({ due_at: new Date(moveAt).toISOString() })
      .eq('id', row.id).is('closed_at', null));
    return 'held';
  }

  const account = must(await db.from('accounts').select('id, name, user_id').eq('id', row.account_id).single());
  const holder = await loginIdFor(db, row.new_email);
  if (holder && holder !== account.user_id) {
    await close(db, row.id, 'failed', now);
    return 'failed';
  }

  const moved = await db.auth.admin.updateUserById(account.user_id, { email: row.new_email, email_confirm: true });
  if (moved.error) {
    console.log(`account recovery: ${row.id} not moved: ${moved.error.status ?? ''} ${moved.error.code ?? ''}`);
    if (moved.error.status === 422) {
      await close(db, row.id, 'failed', now);
      return 'failed';
    }
    return 'retry';
  }
  must(await db.rpc('end_login_sessions', { p_user_id: account.user_id }));
  must(await db.from('accounts').update({ recovered_at: now().toISOString() }).eq('id', account.id));
  await tidyRecoveryEmail(db, { accountId: account.id, email: row.new_email });

  // Only the pass that closes the request sends the link.
  if (!(await close(db, row.id, 'completed', now))) return 'held';
  try {
    const { data: link, error } = await db.auth.admin.generateLink({ type: 'recovery', email: row.new_email });
    if (error || !link?.properties?.hashed_token) throw new Error(`no link: ${error?.status ?? ''} ${error?.code ?? ''}`);
    await enqueue(db, {
      accountId: account.id,
      email: row.new_email,
      copy: { email: COMPLETE_COPY },
      params: { link: confirmLink({ site, tokenHash: link.properties.hashed_token, action: 'recovery' }), name: account.name },
      caller: row.caller,
      selfInitiated: true,
      idempotencyKey: `account-recovery-complete:${row.id}`,
      isTest: isTestCaller(row.caller),
    });
  } catch (err) {
    // Access has moved. The sign-in page's password reset sends another link
    // to the new address.
    console.log(`account recovery: ${row.id} completed, link not queued: ${String(err?.message ?? err).slice(0, 200)}`);
  }
  return 'completed';
}

// The scheduled pass. It closes requests whose link to the new address was
// never used, then moves access for each request whose seven days have run.
// onlyCaller: a test script's caller, so its pass takes only its own requests;
// without one the pass skips every test request, as dispatch_claim does.
// Returns a tally.
export async function completeDue(db, {
  site = SITE, onlyCaller = TEST_CALLER, limit = 20, now = () => new Date(),
} = {}) {
  if (onlyCaller && !onlyCaller.startsWith('test-')) throw new Error('account recovery: a pass limited to one caller is for test callers');
  const scoped = (query) => (onlyCaller ? query.eq('caller', onlyCaller) : query.not('caller', 'like', 'test-%'));
  const tally = { expired: 0, due: 0, completed: 0, held: 0, failed: 0, retry: 0, errors: 0 };

  tally.expired = must(await scoped(db.from('account_recoveries')
    .update({ closed_at: now().toISOString(), outcome: 'expired' })
    .is('closed_at', null).is('confirmed_at', null)
    .lte('link_sent_at', new Date(now().getTime() - LINK_MINUTES * 60000).toISOString())).select('id')).length;

  const due = must(await scoped(db.from('account_recoveries').select('id, account_id, new_email, caller')
    .is('closed_at', null).not('confirmed_at', 'is', null).lte('due_at', now().toISOString()))
    .order('due_at').limit(limit));
  tally.due = due.length;
  for (const row of due) {
    try {
      tally[await complete(db, row, { site, now })]++;
    } catch (err) {
      tally.errors++;
      console.log(`account recovery: ${row.id} stopped: ${String(err?.message ?? err).slice(0, 200)}`);
    }
  }
  return tally;
}
