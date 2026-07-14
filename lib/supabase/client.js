// Posterity — browser Supabase client · Walker Brown
import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client.
//
// This replaces the old `lib/supabase.js`, which used the plain `supabase-js`
// client. That one kept the session in localStorage, where the server could
// never see it — which is why the dashboard's auth check had to run in the
// browser after mount. @supabase/ssr stores the session in cookies instead, so
// the server can read it and the gate in `proxy.js` can actually gate.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
