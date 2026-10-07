import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { runPass } from '../../../../lib/dispatch/run';

// Runs one pass of the Communication Dispatch System's scheduler. Whatever wakes
// it on a cycle (a cron at the host) calls this with the shared secret:
//   POST /api/dispatch/run   Authorization: Bearer <DISPATCH_RUN_SECRET>
//
// It refuses every call until DISPATCH_RUN_SECRET is set and both senders
// exist, so a half-configured deploy never claims a message it cannot send.

export const maxDuration = 300;

// The Postmark and Twilio senders join here once their keys arrive. Until then
// there is nothing to send through and the pass does not run.
function channels() {
  return null;
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
