import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { completeDue } from '../../../../lib/auth/account-recovery';

// Runs one pass of account recovery: requests whose link was never used are
// closed, and each request whose seven days have run moves access
// (lib/auth/account-recovery.js). The Worker's cron (worker.js, every minute)
// calls this beside the dispatch pass, with the same shared secret:
//   POST /api/account-recovery/run   Authorization: Bearer <DISPATCH_RUN_SECRET>
//
// It refuses every call until DISPATCH_RUN_SECRET is set.

export const maxDuration = 300;

function authorized(req, secret) {
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req) {
  const secret = process.env.DISPATCH_RUN_SECRET;
  if (!secret) return new Response('DISPATCH_RUN_SECRET not configured', { status: 503 });
  if (!authorized(req, secret)) return new Response('unauthorized', { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  return Response.json(await completeDue(db));
}
