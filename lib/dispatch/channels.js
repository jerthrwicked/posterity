// The Communication Dispatch System's senders as a deploy holds them, and the
// way a caller sends its own messages at once.
//
// The scheduler's route sends every due message each minute. A few callers
// cannot wait for it: account deletion removes the account's queued messages
// with the account, so its notices have to leave first. sendNow runs the same
// pass the scheduler runs, over the same queue and into the same event log,
// for the callers of the messages named.

import { postmarkSender, twilioSender } from './senders.js';
import { SITE, STATUS_CALLBACK_PATH } from './reports.js';
import { runPass } from './run.js';

function must({ data, error }) {
  if (error) throw error;
  return data;
}

// Both senders, built from the deploy's keys, or null while any key is missing
// so that a pass never runs with one channel and no way to send the other.
// Every text asks Twilio to report its final status to the site.
export function deployChannels(env = process.env) {
  const token = env.POSTMARK_SERVER_TOKEN;
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!token || !accountSid || !authToken) return null;
  return {
    email: postmarkSender({ token }),
    sms: twilioSender({ accountSid, authToken, statusCallback: `${SITE}${STATUS_CALLBACK_PATH}` }),
  };
}

const WAITING = new Set(['queued', 'sending']);

// Sends the messages named now, and waits a few seconds for each to settle.
//
// db: a service-role Supabase client. ids: dispatch_messages ids.
// Returns the rows as they stand at the end. One still 'queued' or 'sending'
// has not gone: its provider failed in a way a retry may fix, and it stays in
// the queue for the scheduler. One 'failed' will never go, and the event log
// holds why.
//
// The scheduler may claim one of these messages in the same moment. That
// message is then the scheduler's to send, and this waits for it.
export async function sendNow(db, { ids, channels, tries = 8, waitMs = 1000 }) {
  if (!channels?.email || !channels?.sms) throw new Error('sendNow: both the email and the text channel are required');
  const wanted = [...new Set(ids ?? [])];
  if (!wanted.length) return [];
  const read = async () => must(await db.from('dispatch_messages')
    .select('id, status, caller, next_attempt_at, attempts, last_error').in('id', wanted));

  let rows = await read();
  for (let i = 0; i < tries; i++) {
    const waiting = rows.filter((r) => WAITING.has(r.status));
    if (!waiting.length) break;
    // A message put back for a later retry will not go while this waits.
    const horizon = Date.now() + (tries - i) * waitMs;
    if (waiting.every((r) => r.status === 'queued' && new Date(r.next_attempt_at).getTime() > horizon)) break;

    for (const caller of new Set(waiting.map((r) => r.caller))) {
      await runPass(db, { channels, caller, limit: 25 });
    }
    rows = await read();
    if (!rows.some((r) => WAITING.has(r.status))) break;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    rows = await read();
  }
  return rows;
}

// Whether every one of sendNow's rows has settled, sent or failed for good.
export function allSettled(rows) {
  return rows.every((r) => !WAITING.has(r.status));
}
