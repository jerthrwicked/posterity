// Posterity — the cart's payment form coming back · Walker Brown
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { getStripe } from '../../../../lib/posterity/stripe'
import { applyCheckout, applyCheckoutAsOpened, CheckoutRefused } from '../../../../lib/posterity/checkout'

// Where Stripe sends the customer once the payment form opened from the cart
// is paid:
//   GET /api/cart/return?session_id=…
//
// The payment is applied here (lib/posterity/checkout.js): each plan it paid
// for is marked paid, each skipped year's storage fee is recorded, the
// storage subscription it opened becomes the account's, and the first plan
// paid initiates the account. The customer continues to the Plans tab, which
// says what happened:
//   paid          the payment is applied
//   not_paid      the form was not paid, or is not one this account opened
//   unconfirmed   the payment could not be read just now. Nothing is lost:
//                 the Plans tab reads the form again as it loads, and so
//                 does Stripe's webhook
//
// A customer who is signed in has the form applied only for their own
// account, found with their own session.
//
// A customer whose session ended while they were on Stripe's page loses
// nothing: the form is applied for the account it was opened for, and they
// sign in on the way to the Plans tab. Arriving here does not sign anyone in.
// The address carries only the form's id, and holding it shows nothing of the
// account.
export async function GET(request) {
  const url = request.nextUrl
  const sessionId = url.searchParams.get('session_id')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  let result = 'not_paid'
  try {
    if (user) {
      const { data: account } = await supabase.from('accounts').select('id').eq('user_id', user.id).maybeSingle()
      if (account) {
        await applyCheckout(admin(), getStripe(), { accountId: account.id, sessionId })
        result = 'paid'
      }
    } else {
      await applyCheckoutAsOpened(admin(), getStripe(), { sessionId })
      result = 'paid'
    }
  } catch (err) {
    const refused = err instanceof CheckoutRefused
    if (!refused) result = 'unconfirmed'
    console.log(`cart: payment not applied: ${refused ? err.reason : String(err?.message ?? err).slice(0, 200)}`)
  }

  const plans = `/dashboard?payment=${result}`
  if (user) return NextResponse.redirect(new URL(plans, url.origin))
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(plans)}`, url.origin))
}
