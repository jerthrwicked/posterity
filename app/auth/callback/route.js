// Posterity — email confirmation callback · Walker Brown
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
