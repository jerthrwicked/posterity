'use server'

// Posterity — changing the email address · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import { startVerification, confirmVerification, VerificationRefused } from '../../../lib/auth/double-verification'
import { SITE } from '../../../lib/dispatch/reports'

// The email change (Master Specification, Settings: "a change requires double
// verification. The old address keeps receiving until the new one is
// confirmed"). Two steps through one action, told apart by the form's `step`:
//
//   start  the new address and the password. The password is checked and a
//          code goes to the address the account signs in with now.
//   code   the code. Once it matches, Supabase is asked to change the address,
//          and it sends a confirmation link to the new one. The account keeps
//          the old address until that link is used, so every message keeps
//          going to it until then.
//
// The new address is the one stored with the code at the first step, never
// one the second step's form sends back.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  badEmail: '[Placeholder: Product surface copy — error messages: the new email address cannot be read]',
  sameEmail: '[Placeholder: Product surface copy — error messages: the new email address is the one already held]',
  wrong_password: '[Placeholder: Product surface copy — error messages: the password re-entered for double verification is wrong]',
  rate_limited: '[Placeholder: Product surface copy — error messages: too many password tries; wait and try again]',
  too_many_codes: '[Placeholder: Product surface copy — error messages: too many codes asked for within an hour; wait and try again]',
  wrong_code: '[Placeholder: Product surface copy — error messages: the confirmation code does not match]',
  expired: '[Placeholder: Product surface copy — error messages: the confirmation code has expired or was replaced; start again]',
  too_many_attempts: '[Placeholder: Product surface copy — error messages: too many wrong codes; start again]',
  taken: '[Placeholder: Product surface copy — error messages: the new email address belongs to another account]',
  emailLimit: '[Placeholder: Product surface copy — error messages: too many emails sent within an hour; wait and try again]',
  notSent: '[Placeholder: Product surface copy — error messages: the change could not be started]',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export async function changeEmail(prev, formData) {
  const step = formData.get('step')
  const { supabase, user, account } = await requireAccount()
  if (!account) return { step: 'start', error: ERRORS.noAccount }
  const db = serviceDb()

  if (step === 'start') {
    const newEmail = String(formData.get('new_email') || '').trim().toLowerCase()
    if (newEmail.length > 254 || !EMAIL.test(newEmail)) return { step: 'start', newEmail, error: ERRORS.badEmail }
    if (newEmail === user.email.toLowerCase()) return { step: 'start', newEmail, error: ERRORS.sameEmail }

    try {
      const { data: details, error } = await db.from('accounts').select('id, name').eq('id', account.id).single()
      if (error) throw error
      const { id } = await startVerification(db, {
        account: details,
        user,
        purpose: 'email_change',
        password: String(formData.get('password') || ''),
        payload: { new_email: newEmail },
      })
      return { step: 'code', verificationId: id, newEmail }
    } catch (err) {
      if (err instanceof VerificationRefused) return { step: 'start', newEmail, error: ERRORS[err.reason] ?? ERRORS.notSent }
      console.log(`email change: start failed: ${String(err?.message ?? err).slice(0, 200)}`)
      return { step: 'start', newEmail, error: ERRORS.notSent }
    }
  }

  if (step === 'code') {
    const verificationId = String(formData.get('verification_id') || '')
    let payload
    try {
      payload = await confirmVerification(db, {
        accountId: account.id,
        purpose: 'email_change',
        id: verificationId,
        code: formData.get('code'),
      })
    } catch (err) {
      if (err instanceof VerificationRefused && err.reason === 'wrong_code') {
        return { step: 'code', verificationId, newEmail: prev?.newEmail, error: ERRORS.wrong_code }
      }
      if (err instanceof VerificationRefused) return { step: 'start', newEmail: prev?.newEmail, error: ERRORS[err.reason] ?? ERRORS.notSent }
      console.log(`email change: confirm failed: ${String(err?.message ?? err).slice(0, 200)}`)
      return { step: 'start', newEmail: prev?.newEmail, error: ERRORS.notSent }
    }

    // Supabase's own mailer, until the Send Email hook is on, sends a link
    // that lands on /auth/callback; with the hook on, the link is built by
    // lib/auth/send-email.js and lands on /auth/confirm.
    const origin = (await headers()).get('origin') || SITE
    const { error } = await supabase.auth.updateUser(
      { email: payload.new_email },
      { emailRedirectTo: `${origin}/auth/callback?next=/dashboard/settings` },
    )
    if (error) {
      console.log(`email change: Supabase refused: ${error.status} ${error.code ?? ''}`)
      const message = error.code === 'email_exists' ? ERRORS.taken
        : error.status === 429 ? ERRORS.emailLimit
        : ERRORS.notSent
      return { step: 'start', newEmail: payload.new_email, error: message }
    }

    revalidatePath('/dashboard/settings')
    return { step: 'sent', newEmail: payload.new_email }
  }

  return { step: 'start' }
}
