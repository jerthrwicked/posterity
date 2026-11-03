// Posterity — email confirmation callback · Walker Brown
// The links Supabase's own mailer sends land here (PKCE: a code for a
// session). Once the Send Email hook is on, every link is built by
// lib/auth/send-email.js and lands on /auth/confirm instead.
import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

// Where the email confirmation link lands. Exchanges the one-time code for a
// session and sets the cookies, then sends them on to the dashboard.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
