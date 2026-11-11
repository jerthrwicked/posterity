'use server'

// Posterity — payment setup · Walker Brown
import { redirect } from 'next/navigation'
import { requireAccount } from '../../../lib/posterity/account'
import { getStripe } from '../../../lib/posterity/stripe'
import { openPaymentSetup, PaymentSetupRefused } from '../../../lib/posterity/payment-setup'

// Payment setup in Settings (Master Specification, Settings: Payment setup).
// This opens the payment form, Stripe's hosted Checkout, for the customer to
// save a payment method, and sends them to it. Nothing changes here: the saved
// payment method changes when the completed form comes back
// (app/api/payment-setup/return, lib/posterity/payment-setup.js).
//
// Which Stripe customer the form belongs to is read with the customer's own
// session, under the row-level rule that shows a customer only their own
// subscriptions.
//
// Payment setup stays usable whatever the account's storage standing, so this
// does not read canBuild.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  no_subscription: '[Placeholder: Product surface copy — error messages: a payment method is saved with the first storage payment]',
  notOpened: '[Placeholder: Product surface copy — error messages: the payment form could not be opened]',
}

// Sends the customer to the payment form, or returns { error }.
export async function paymentSetupAction() {
  const { supabase, user, account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }

  let url
  try {
    ({ url } = await openPaymentSetup(supabase, getStripe(), {
      accountId: account.id, userId: user.id, siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    }))
  } catch (err) {
    if (err instanceof PaymentSetupRefused) return { error: ERRORS[err.reason] ?? ERRORS.notOpened }
    console.log(`payment setup: not opened: ${String(err?.message ?? err).slice(0, 200)}`)
    return { error: ERRORS.notOpened }
  }
  // redirect() works by throwing, so it stays outside the try.
  redirect(url)
}
