// Supabase's authentication emails, sent through the Communication Dispatch
// System instead of Supabase's own mailer (Founder Build Roadmap, Stage 4.2:
// "it leaves through the Communication Dispatch System, so Supabase's own
// authentication emails stay off").
//
// With the Send Email hook on, Supabase sends nothing itself: for each email
// it would have sent, it calls POST /api/auth/send-email with the user and the
// token, and this module queues the message. The link in the message points at
// the site's own confirm route, /auth/confirm, which hands the token back to
// Supabase for a session. Each action is a copy row, so the wording is a
// placeholder until Product surface copy approves it.
//
// Actions Supabase can ask for and the product does not use (magic links,
// invitations, reauthentication codes, the change notifications) are refused,
// so nothing reaches a person in words no one wrote for Posterity.
//
// The email change reaches Supabase only after double verification has passed
// in Settings (lib/auth/double-verification.js). Its link goes to the new
// address, and the account keeps the old one until that link is used. With
// Supabase's Secure Email Change off, that is the only email. With it on,
// Supabase asks for a second link to the current address too, and both go.
// Supabase names the hashes backwards: token_hash belongs with the new
// address, token_hash_new with the current one.

import { enqueue } from '../dispatch/enqueue.js';
import { SITE } from '../dispatch/reports.js';

export const CALLER = 'auth-send-email';
export const CONFIRM_PATH = '/auth/confirm';

// email_action_type → the copy row, the type /auth/confirm hands verifyOtp
// (Supabase names a signup confirmation 'email' there), and where the person
// lands once the token is accepted.
export const ACTIONS = {
  signup:   { copy: 'email.confirm_signup', verifyType: 'email',    next: '/dashboard' },
  recovery: { copy: 'email.reset_password', verifyType: 'recovery', next: '/reset-password' },
  email_change: { copy: 'email.confirm_email_change', verifyType: 'email_change', next: '/dashboard/settings' },
};

export function confirmLink({ site = SITE, tokenHash, action }) {
  const a = ACTIONS[action];
  if (!a) throw new Error(`send email: no link for ${action}`);
  const q = new URLSearchParams({ token_hash: tokenHash, type: a.verifyType, next: a.next });
  return `${site}${CONFIRM_PATH}?${q}`;
}

// A refusal the hook route turns into a 4xx, so Supabase reports it to the
// caller instead of pretending the email went.
export class Refused extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// db: a service-role client. payload: the hook's body, already verified.
// Returns the queued dispatch_messages rows: one, or two for an email change
// with Secure Email Change on.
export async function queueAuthEmail(db, payload, { site = SITE, caller = CALLER, isTest = false } = {}) {
  const user = payload?.user;
  const data = payload?.email_data;
  const action = data?.email_action_type;
  if (!user?.id || !user?.email) throw new Refused('no user in the payload');
  if (!data?.token_hash) throw new Refused('no token in the payload');
  const spec = ACTIONS[action];
  if (!spec) throw new Refused(`Posterity does not send ${action || 'an unnamed'} emails`, 422);

  // Each email: where it goes, and the token its link carries.
  const sends = [{ to: user.email, tokenHash: data.token_hash }];
  if (action === 'email_change') {
    if (!user.new_email) throw new Refused('no new address in the email change payload');
    sends[0] = { to: user.new_email, tokenHash: data.token_hash };
    if (data.token_hash_new) sends.push({ to: user.email, tokenHash: data.token_hash_new });
  }

  const { data: account, error } = await db.from('accounts').select('id, name').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!account) throw new Refused(`no account for user ${user.id}`, 422);

  const messages = [];
  for (const { to, tokenHash } of sends) {
    const [message] = await enqueue(db, {
      accountId: account.id,
      email: to,
      copy: { email: spec.copy },
      params: { link: confirmLink({ site, tokenHash, action }), name: account.name },
      caller,
      selfInitiated: true,
      // Supabase retries a hook call it did not hear back from; the token is new
      // on every send, so the same token twice is the same email once.
      idempotencyKey: `auth:${action}:${tokenHash}`,
      isTest,
    });
    messages.push(message);
  }
  return messages;
}
