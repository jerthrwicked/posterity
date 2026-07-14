// Posterity — server-side auth gate · Walker Brown
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Next 16 renamed `middleware` to `proxy`. Same file position (project root),
// same matcher, same job.
//
// This does two things on every request:
//   1. Refreshes the Supabase session and writes the rotated cookies back.
//      Without this, server components would read stale or expired tokens.
//   2. Redirects signed-out visitors away from private routes.
//
// Next's own docs are explicit that proxy is for OPTIMISTIC checks and "should
// not be used as a full session management or authorization solution." So this
// is the outer gate, not the only one — every private page re-checks the user
// server-side, and RLS is the last line underneath that. Three layers on
// purpose: this product holds people's final words.

const PRIVATE_PREFIXES = ['/dashboard']
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // getUser() revalidates the token with Supabase. Do not swap this for
  // getSession(), which trusts whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && PRIVATE_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and image files. The session still needs
    // refreshing on public pages, so this deliberately runs broadly.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
