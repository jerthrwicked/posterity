'use server'

// Posterity — the automatic payments switch · Walker Brown
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import { getStripe } from '../../../lib/posterity/stripe'
import { setAccountAutomaticPayments, PaymentsRefused } from '../../../lib/posterity/automatic-payments'

// The automatic payments switch in Settings (Master Specification, Settings:
// Automatic payments; the rule is held within Horizon Tier). The form's `turn`
// says which way:
//
//   off  each storage renewal is raised as a payment request for the customer
//        to pay, in place of a charge to the saved payment method
//   on   each storage renewal is charged to the saved payment method
//
// The setting lives on the account's storage subscription within Stripe, and
// this writes it there (lib/posterity/automatic-payments.js). Which
// subscriptions are the account's is read with the customer's own session,
// under the row-level rule that shows a customer only their own.
//
// The switch stays usable whatever the account's storage standing, so this
// does not read canBuild.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  no_subscription: '[Placeholder: Product surface copy — error messages: there is no storage subscription to change yet]',
  no_payment_method: '[Placeholder: Product surface copy — error messages: automatic payments need a saved payment method]',
  notSaved: '[Placeholder: Product surface copy — error messages: the automatic payments setting was not saved]',
}

// Returns { done } — 'on' or 'off' — or { error }.
export async function automaticPaymentsAction(_prev, formData) {
  const turn = formData.get('turn')
  const { supabase, account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }
  if (turn !== 'on' && turn !== 'off') return { error: ERRORS.notSaved }

  try {
    await setAccountAutomaticPayments(supabase, getStripe(), { accountId: account.id, on: turn === 'on' })
  } catch (err) {
    revalidatePath('/dashboard/settings')
    if (err instanceof PaymentsRefused) return { error: ERRORS[err.reason] ?? ERRORS.notSaved }
    console.log(`automatic payments: ${turn} failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { error: ERRORS.notSaved }
  }
  revalidatePath('/dashboard/settings')
  return { done: turn }
}
