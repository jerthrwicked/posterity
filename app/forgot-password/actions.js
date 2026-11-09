'use server'

// Posterity — the reset through a recovery email address · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { sendRecoveryResets } from '../../lib/auth/recovery-email'

// The forgot-password page calls this beside Supabase's own reset, with the
// address typed. Where it is a confirmed recovery email address, a reset link
// goes to it (lib/auth/recovery-email.js). It returns nothing either way, so
// the page cannot tell, and says the same thing whatever happened.
export async function requestRecoveryReset(email) {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    await sendRecoveryResets(db, { email: String(email ?? '') })
  } catch (err) {
    console.log(`recovery reset failed: ${String(err?.message ?? err).slice(0, 200)}`)
  }
}
