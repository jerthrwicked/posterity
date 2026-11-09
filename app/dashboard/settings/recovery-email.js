'use server'

// Posterity — the recovery email address · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import {
  setRecoveryEmail, resendRecoveryLink, cancelRecoveryChange, removeRecoveryEmail,
} from '../../../lib/auth/recovery-email'
import { VerificationRefused } from '../../../lib/auth/double-verification'

// The recovery email address in Settings (Master Specification, Settings:
// "optional, confirmed by link, and held only for account recovery"). One
// action, told apart by the form's `step`:
//
//   set     a new address and the password; a link goes to the address
//   resend  the password; a new link goes to the address still waiting
//   cancel  the waiting address is dropped; a confirmed one stays
//   remove  the confirmed address, and any waiting one, are dropped
//
// Adding or changing the address, or sending its link again, asks for the
// password (Walker, November 9), since the address is a way back into the
// account.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  bad_email: '[Placeholder: Product surface copy — error messages: the recovery email address cannot be read]',
  same_as_sign_in: '[Placeholder: Product surface copy — error messages: the recovery email address is the address the account signs in with]',
  already_held: '[Placeholder: Product surface copy — error messages: that address is already the confirmed recovery email address]',
  wrong_password: '[Placeholder: Product surface copy — error messages: the password re-entered is wrong]',
  rate_limited: '[Placeholder: Product surface copy — error messages: too many password tries; wait and try again]',
  too_many_links: '[Placeholder: Product surface copy — error messages: too many confirmation links asked for within an hour; wait and try again]',
  nothing_waiting: '[Placeholder: Product surface copy — error messages: no recovery email address is waiting on its link]',
  notSent: '[Placeholder: Product surface copy — error messages: the recovery email address could not be saved]',
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export async function recoveryEmailAction(_prev, formData) {
  const step = formData.get('step')
  const { user, account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }
  const db = serviceDb()
  const password = String(formData.get('password') || '')
  const email = String(formData.get('recovery_email') || '').trim()

  try {
    if (step === 'remove') {
      await removeRecoveryEmail(db, { accountId: account.id })
      revalidatePath('/dashboard/settings')
      return { done: 'removed' }
    }
    if (step === 'cancel') {
      await cancelRecoveryChange(db, { accountId: account.id })
      revalidatePath('/dashboard/settings')
      return { done: 'cancelled' }
    }
    const details = await db.from('accounts').select('id, name').eq('id', account.id).single()
    if (details.error) throw details.error
    if (step === 'set') {
      const r = await setRecoveryEmail(db, { account: details.data, user, email, password })
      revalidatePath('/dashboard/settings')
      return { done: 'sent', email: r.email }
    }
    if (step === 'resend') {
      const r = await resendRecoveryLink(db, { account: details.data, user, password })
      revalidatePath('/dashboard/settings')
      return { done: 'sent', email: r.email }
    }
  } catch (err) {
    if (err instanceof VerificationRefused) return { step, email, error: ERRORS[err.reason] ?? ERRORS.notSent }
    console.log(`recovery email: ${step} failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { step, email, error: ERRORS.notSent }
  }
  return {}
}
