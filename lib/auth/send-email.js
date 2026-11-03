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
// so nothing reaches a person in words no one wrote for Posterity. The email
// change joins here with the double verification build.

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
// Returns the queued dispatch_messages row.
export async function queueAuthEmail(db, payload, { site = SITE, caller = CALLER, isTest = false } = {}) {
  const user = payload?.user;
  const data = payload?.email_data;
  const action = data?.email_action_type;
  if (!user?.id || !user?.email) throw new Refused('no user in the payload');
  if (!data?.token_hash) throw new Refused('no token in the payload');
  const spec = ACTIONS[action];
  if (!spec) throw new Refused(`Posterity does not send ${action || 'an unnamed'} emails`, 422);

  const { data: account, error } = await db.from('accounts').select('id, name').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!account) throw new Refused(`no account for user ${user.id}`, 422);

  const [message] = await enqueue(db, {
    accountId: account.id,
    email: user.email,
    copy: { email: spec.copy },
    params: { link: confirmLink({ site, tokenHash: data.token_hash, action }), name: account.name },
    caller,
    selfInitiated: true,
    // Supabase retries a hook call it did not hear back from; the token is new
    // on every send, so the same token twice is the same email once.
    idempotencyKey: `auth:${action}:${data.token_hash}`,
    isTest,
  });
  return message;
}
