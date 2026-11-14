'use server'

// Posterity — User Profiles: paying from the cart · Walker Brown
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { requireAccount } from '../../../lib/posterity/account'
import { openCheckout, CheckoutRefused } from '../../../lib/posterity/checkout'
import { getStripe } from '../../../lib/posterity/stripe'

// The server action behind the cart's Pay button (Master Specification, User
// Profiles: "Plans can be paid for individually or all at once"). The
// customer's session says whose account it is. The form says which plans are
// ticked, that the refund policy was accepted, and the total the page showed.
// Everything charged is worked out again on the server from the plans and the
// catalog (lib/posterity/checkout.js), and the customer is sent to the
// payment form.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  notOpened: '[Placeholder: Product surface copy — error messages: the payment form could not be opened, and nothing was charged]',
  policy_not_accepted: '[Placeholder: Product surface copy — error messages: the refund policy is accepted before paying]',
  building_closed: '[Placeholder: Product surface copy — error messages: plans cannot be paid for from here once the Planning Phase has closed]',
  nothing_to_pay: '[Placeholder: Product surface copy — error messages: no plan is chosen to pay for]',
  storage_owed: '[Placeholder: Product surface copy — error messages: the storage fee is unpaid, and is settled before a plan is paid for]',
  cart_changed: '[Placeholder: Product surface copy — error messages: the cart has changed since this page loaded; it now shows what will be charged]',
  superseded: '[Placeholder: Product surface copy — error messages: another payment form was opened for this account just now]',
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export async function payAction(_prev, formData) {
  const { user, account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }

  let url
  try {
    const shown = formData.get('total')
    const total = Number(shown)
    const opened = await openCheckout(serviceDb(), getStripe(), {
      accountId: account.id,
      userId: user.id,
      email: user.email,
      planIds: formData.getAll('plan').map(String),
      accepted: formData.get('accept') === 'on',
      expectedTotal: shown !== null && Number.isInteger(total) ? total : undefined,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    })
    url = opened.url
  } catch (err) {
    // The cart is read afresh on every tab, so a refusal shows the customer
    // the cart as it now stands.
    revalidatePath('/dashboard', 'layout')
    if (err instanceof CheckoutRefused) return { error: ERRORS[err.reason] ?? ERRORS.notOpened }
    console.log(`cart: the payment form was not opened: ${String(err?.message ?? err).slice(0, 200)}`)
    return { error: ERRORS.notOpened }
  }
  redirect(url)
}
