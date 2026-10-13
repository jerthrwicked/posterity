import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { runPass } from '../../../../lib/dispatch/run';
import { postmarkSender, twilioSender } from '../../../../lib/dispatch/senders';

// Runs one pass of the Communication Dispatch System's scheduler. The Worker's
// cron (worker.js, every minute) calls this with the shared secret:
//   POST /api/dispatch/run   Authorization: Bearer <DISPATCH_RUN_SECRET>
//
// It refuses every call until DISPATCH_RUN_SECRET is set and both senders
// exist, so a half-configured deploy never claims a message it cannot send.

export const maxDuration = 300;

// Both senders, built from the deploy's keys, or null while either is missing
// so that the pass does not run with one channel and no way to send the other.
function channels() {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !accountSid || !authToken) return null;
  return {
    email: postmarkSender({ token }),
    sms: twilioSender({ accountSid, authToken }),
  };
}

function authorized(req, secret) {
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req) {
  const secret = process.env.DISPATCH_RUN_SECRET;
  if (!secret) return new Response('DISPATCH_RUN_SECRET not configured', { status: 503 });
  if (!authorized(req, secret)) return new Response('unauthorized', { status: 401 });

  const senders = channels();
  if (!senders) return new Response('senders not configured', { status: 503 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const tally = await runPass(db, { channels: senders });
  return Response.json(tally);
}
