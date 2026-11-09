import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '../../../../lib/auth/webhook';
import { queueAuthEmail, Refused } from '../../../../lib/auth/send-email';

// Supabase's Send Email hook: with it switched on, every authentication email
// arrives here as a signed call instead of leaving Supabase's own mailer, and
// is queued through the Communication Dispatch System (lib/auth/send-email.js).
//   POST /api/auth/send-email
//
// The secret is the one Supabase shows for the hook, held as the Worker secret
// SEND_EMAIL_HOOK_SECRET. Until it is set, every call is refused, and Supabase
// reports the failure to whoever asked for the email rather than losing it.
// An error body in Supabase's own shape goes back for a refusal, so the
// message reaches its logs.

export async function POST(req) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return refuse(503, 'SEND_EMAIL_HOOK_SECRET not configured');

  const body = await req.text();
  const sig = verifySignature(body, req.headers, secret);
  if (!sig.ok) return refuse(401, `unauthorized: ${sig.reason}`);

  let payload;
  try { payload = JSON.parse(body); } catch { return refuse(400, 'not JSON'); }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  try {
    const messages = await queueAuthEmail(db, payload);
    console.log(`auth email: ${payload.email_data.email_action_type} queued as message ${messages.map((m) => m.id).join(', ')}`);
    return Response.json({});
  } catch (err) {
    const status = err instanceof Refused ? err.status : 500;
    console.log(`auth email: ${payload?.email_data?.email_action_type} refused ${status}: ${String(err?.message ?? err).slice(0, 200)}`);
    return refuse(status, err instanceof Refused ? err.message : 'could not queue the email');
  }
}

function refuse(status, message) {
  return Response.json({ error: { http_code: status, message } }, { status });
}
