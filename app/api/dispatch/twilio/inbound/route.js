import { createClient } from '@supabase/supabase-js';
import { readTwilioRequest, recordInbound } from '../../../../../lib/dispatch/reports';

// Twilio's webhook for a text received at Posterity's number ("A message comes
// in" on the number, in the Twilio console).
//   POST /api/dispatch/twilio/inbound
//
// Signed with the auth token; an unsigned or wrongly signed request is refused.
// It answers with an empty TwiML reply, so Posterity sends nothing back itself:
// Twilio answers STOP, START and HELP on its own.

const EMPTY_REPLY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

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
    await recordInbound(db, params);
    return new Response(EMPTY_REPLY, { headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    console.log(`twilio inbound: ${String(err?.message ?? err).slice(0, 200)}`);
    return new Response('try again', { status: 503 });
  }
}
