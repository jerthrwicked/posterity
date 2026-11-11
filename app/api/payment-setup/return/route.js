// Posterity — the payment form coming back · Walker Brown
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { getStripe } from '../../../../lib/posterity/stripe'
import { applyPaymentSetup, applyPaymentSetupAsOpened, PaymentSetupRefused } from '../../../../lib/posterity/payment-setup'

// Where Stripe sends the customer once the payment form opened from Settings
// is completed:
//   GET /api/payment-setup/return?session_id=…
//
// The payment method the form saved becomes the account's saved payment
// method here, and any storage fee the account owes is charged to it
// (lib/posterity/payment-setup.js). The customer continues to Settings, which
// says what happened:
//   saved          the payment method is saved
//   saved_paid     it is saved, and the storage fee owed was charged to it
//   saved_unpaid   it is saved, but the storage fee owed could not be charged
//   not_saved      it was not saved, and the one held before is unchanged
//
// A customer who is signed in has the form applied only for their own
// account, read with their own session.
//
// A customer whose session ended while they were on Stripe's page loses
// nothing: the form is applied for the account it was opened for, and they
// sign in on the way to Settings. Arriving here does not sign anyone in. The
// address carries only the form's id, and holding it shows nothing of the
// account.
export async function GET(request) {
  const url = request.nextUrl
  const sessionId = url.searchParams.get('session_id')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let result = 'not_saved'
  try {
    let applied = null
    if (user) {
      const { data: account } = await supabase.from('accounts').select('id').eq('user_id', user.id).maybeSingle()
      if (account) applied = await applyPaymentSetup(supabase, getStripe(), { accountId: account.id, sessionId })
    } else {
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      applied = await applyPaymentSetupAsOpened(admin, getStripe(), { sessionId })
    }
    if (applied) result = applied.owed.failed ? 'saved_unpaid' : applied.owed.charged ? 'saved_paid' : 'saved'
  } catch (err) {
    const why = err instanceof PaymentSetupRefused ? err.reason : String(err?.message ?? err).slice(0, 200)
    console.log(`payment setup: not saved: ${why}`)
  }

  const settings = `/dashboard/settings?payment=${result}`
  if (user) return NextResponse.redirect(new URL(settings, url.origin))
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(settings)}`, url.origin))
}
