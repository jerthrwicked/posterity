// Posterity — server-side auth gate · Walker Brown
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookieName, cookieOptions, isFresh, rememberBrowser } from './lib/auth/known-browser'

// Next 16 renamed `middleware` to `proxy`. Same file position (project root),
// same matcher, same job.
//
// This does three things on every request:
//   1. Refreshes the Supabase session and writes the rotated cookies back.
//      Without this, server components would read stale or expired tokens.
//   2. Redirects signed-out visitors away from private routes.
//   3. Marks a signed-in browser as one that has signed into that login, which
//      account recovery asks for later (lib/auth/known-browser.js).
//
// Next's own docs are explicit that proxy is for OPTIMISTIC checks and "should
// not be used as a full session management or authorization solution." So this
// is the outer gate, not the only one — every private page re-checks the user
// server-side, and RLS is the last line underneath that. Three layers on
// purpose: this product holds people's final words.

const PRIVATE_PREFIXES = ['/dashboard']
const AUTH_PAGES = ['/login', '/signup']

// Account recovery opens only from "a browser that has signed into that login
// before" (Master Specification, Settings). This is where a browser becomes
// one: on a page load that carries a session Supabase has just confirmed, it
// is given a marker cookie and the marker's hash is recorded against the
// login. Marking here rather than at sign-in covers every way a session
// begins, and renews the cookie for someone who stays signed in for years.
//
// Only a request for a page is marked (one that asks for HTML; Next hides its
// own navigation headers from the proxy, so the Accept header is what tells a
// page load from an in-app fetch), and only when the cookie is missing or over
// thirty days old, so this writes at most once a month per browser. It never
// blocks the page: any failure is logged and the request carries on unmarked.
async function markBrowser(request, response, user) {
  try {
    if (request.method !== 'GET') return
    if (!(request.headers.get('accept') ?? '').includes('text/html')) return
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return

    const name = await cookieName(user.id)
    const held = request.cookies.get(name)?.value
    if (isFresh(held)) return

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const value = await rememberBrowser(db, { userId: user.id, cookieValue: held })
    response.cookies.set(name, value, cookieOptions({ secure: request.nextUrl.protocol === 'https:' }))
  } catch (err) {
    console.log(`known browser: not marked: ${String(err?.message ?? err).slice(0, 200)}`)
  }
}

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
    // The page's own query goes back with it (a plan year, ?year=3), and
    // stays off the login page's address.
    url.search = ''
    url.searchParams.set('next', path + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user) await markBrowser(request, response, user)

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and image files. The session still needs
    // refreshing on public pages, so this deliberately runs broadly.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
