import { createClient } from '@supabase/supabase-js';
import { readTwilioRequest, recordTwilioStatus } from '../../../../../lib/dispatch/reports';

// Twilio's status callback for each text the scheduler sends (the run route
// gives Twilio this address with every send).
//   POST /api/dispatch/twilio/status
//
// Signed with the auth token; an unsigned or wrongly signed request is refused.
// Only a final status is recorded (lib/dispatch/reports.js).

export async function POST(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!authToken || !accountSid) return new Response('Twilio keys not configured', { status: 503 });

  const params = await readTwilioRequest(req, { authToken, accountSid });
  if (!params) return new Response('forbidden', { status: 403 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  try {
    return Response.json(await recordTwilioStatus(db, params));
  } catch (err) {
    console.log(`twilio status: ${String(err?.message ?? err).slice(0, 200)}`);
    return new Response('try again', { status: 503 });
  }
}
