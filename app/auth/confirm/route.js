import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { safeNext } from '../../../lib/auth/next-address'

// Where every link in an authentication email lands:
//   GET /auth/confirm?token_hash=…&type=email|recovery|email_change&next=/path
//
// The link is built by lib/auth/send-email.js. The token goes back to
// Supabase for a session, written to cookies here, and the person continues
// to `next`: the dashboard after a signup confirmation, the new-password page
// after a reset request, Settings after an email change. A token already used
// or past its hour goes to the page that can issue another. `next` is kept on
// this site (lib/auth/next-address.js): a full address from outside is ignored.
//
// /auth/callback beside this handles the links Supabase's own mailer sends
// while the Send Email hook is off.

const TYPES = new Set(['email', 'recovery', 'email_change'])
const LANDING = { email: '/dashboard', recovery: '/reset-password', email_change: '/dashboard/settings' }

export async function GET(request) {
  const url = request.nextUrl
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const next = safeNext(url.searchParams.get('next')) ?? LANDING[type] ?? '/dashboard'

  if (tokenHash && TYPES.has(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, url.origin))
  }

  const failed = type === 'recovery' ? '/forgot-password?error=link_expired' : '/login?error=confirmation_failed'
  return NextResponse.redirect(new URL(failed, url.origin))
}
