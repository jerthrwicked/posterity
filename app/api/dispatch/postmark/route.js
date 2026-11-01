import { createClient } from '@supabase/supabase-js';
import { recordPostmarkReport } from '../../../../lib/dispatch/reports';

// Postmark's webhook for the live server's outbound stream: Delivery and Bounce.
//   POST /api/dispatch/postmark
//
// Postmark signs nothing, so each report is looked up through Postmark's API
// with the server token before it is recorded (lib/dispatch/reports.js). Any
// 2xx tells Postmark the report arrived; a 503 has it send the report again.

export async function POST(req) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return new Response('POSTMARK_SERVER_TOKEN not configured', { status: 503 });

  let payload;
  try { payload = await req.json(); } catch { return new Response('not JSON', { status: 400 }); }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  try {
    return Response.json(await recordPostmarkReport(db, payload, { token }));
  } catch (err) {
    console.log(`postmark report: ${String(err?.message ?? err).slice(0, 200)}`);
    return new Response('try again', { status: 503 });
  }
}
