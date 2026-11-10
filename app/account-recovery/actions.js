'use server'

// Posterity — account recovery · Walker Brown
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { requestRecovery, confirmRecovery, cancelRecovery } from '../../lib/auth/account-recovery'
import { VerificationRefused } from '../../lib/auth/double-verification'

// Account recovery from the sign-in page (Master Specification, Settings:
// "for a customer or a Legacy Guard who has lost every route"). Three actions,
// none of which needs a session:
//
//   requestRecoveryAction   the address the account signs in with, and a new
//                           address. A link goes to the new address where this
//                           browser has signed into that account before.
//   confirmRecoveryAction   the button on the page that link opens. The seven
//                           days and the notices start here.
//   cancelRecoveryAction    the button on the page a notice's link opens.
//
// The request answers the same way whatever it found, so it tells no one
// which addresses are Posterity's or which browsers an account has used. Only
// what the person typed is ever refused to their face.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  bad_email: '[Placeholder: Product surface copy — error messages: the address the account signs in with cannot be read]',
  bad_new_email: '[Placeholder: Product surface copy — error messages: the new address cannot be read]',
  same_address: '[Placeholder: Product surface copy — error messages: the new address is the address the account already signs in with]',
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export async function requestRecoveryAction(_prev, formData) {
  const email = String(formData.get('email') || '').trim()
  const newEmail = String(formData.get('new_email') || '').trim()
  try {
    const jar = await cookies()
    const r = await requestRecovery(serviceDb(), { email, newEmail, readCookie: (name) => jar.get(name)?.value })
    if (!r.sent) console.log(`account recovery: request not sent: ${r.reason}`)
  } catch (err) {
    if (err instanceof VerificationRefused && ERRORS[err.reason]) return { email, newEmail, error: ERRORS[err.reason] }
    console.log(`account recovery: request failed: ${String(err?.message ?? err).slice(0, 200)}`)
  }
  return { done: true, newEmail: newEmail.toLowerCase() }
}

export async function confirmRecoveryAction(_prev, formData) {
  try {
    return await confirmRecovery(serviceDb(), { token: String(formData.get('token') || '') })
  } catch (err) {
    console.log(`account recovery: confirm failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { outcome: 'error' }
  }
}

export async function cancelRecoveryAction(_prev, formData) {
  try {
    return await cancelRecovery(serviceDb(), { token: String(formData.get('token') || '') })
  } catch (err) {
    console.log(`account recovery: cancel failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { outcome: 'error' }
  }
}
