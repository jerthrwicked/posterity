// Posterity — confirming a recovery email address · Walker Brown
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { confirmRecoveryEmail } from '../../../lib/auth/recovery-email'

// Where the link in a recovery email address's confirmation lands:
//   GET /auth/recovery-email?token=…
//
// The token is checked with the service role (recovery_emails is server-only)
// and works once, within an hour. The link needs no session, since it is often
// opened on another device; either way the person continues to Settings, which
// says whether the address is confirmed, and signs in first if they are not.
export async function GET(request) {
  const url = request.nextUrl
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  let confirmed = null
  try {
    confirmed = await confirmRecoveryEmail(db, { token: url.searchParams.get('token') })
  } catch (err) {
    console.log(`recovery email: confirm failed: ${String(err?.message ?? err).slice(0, 200)}`)
  }
  const result = confirmed ? 'confirmed' : 'link_expired'
  return NextResponse.redirect(new URL(`/dashboard/settings?recovery_email=${result}`, url.origin))
}
