'use server'

// Posterity — deleting the account · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireAccount } from '../../../lib/posterity/account'
import { startVerification, confirmVerification, VerificationRefused } from '../../../lib/auth/double-verification'
import { deleteAccount, deletionClosed, refundsOwedOnDeletion, DeletionRefused } from '../../../lib/posterity/account-deletion'
import { money } from '../../../lib/posterity/refunds'
import { deployChannels } from '../../../lib/dispatch/channels'
import { getStripe } from '../../../lib/posterity/stripe'

// Delete account (Master Specification, Settings: "available throughout the
// Horizon and Planning Phases and confirmed through double verification").
// Two steps through one action, told apart by the form's `step`:
//
//   start  the password. It is checked, what the deletion would refund is
//          read from Stripe to show beside the code, and a code goes to the
//          address the account signs in with.
//   code   the code. Once it matches, the account is deleted
//          (lib/posterity/account-deletion.js), the browser is signed out,
//          and it lands on /account-deleted.
//
// Both steps ask whether deletion is open, so an account that left Planning,
// or was recovered, between the two is refused at the second.
//
// The deletion's notices leave before the account is removed, so nothing
// starts while the deploy holds no senders.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  phase: '[Placeholder: Product surface copy — error messages: the account can be deleted only during the Horizon and Planning Phases]',
  recovery_lock: '[Placeholder: Product surface copy — error messages: the account cannot be deleted for thirty days after an account recovery]',
  no_account: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  notices_waiting: '[Placeholder: Product surface copy — error messages: the account was not deleted and nothing was removed, because its notices could not be sent yet; any refund owed was issued; try again in a few minutes]',
  wrong_password: '[Placeholder: Product surface copy — error messages: the password re-entered for double verification is wrong]',
  rate_limited: '[Placeholder: Product surface copy — error messages: too many password tries; wait and try again]',
  too_many_codes: '[Placeholder: Product surface copy — error messages: too many codes asked for within an hour; wait and try again]',
  wrong_code: '[Placeholder: Product surface copy — error messages: the confirmation code does not match]',
  expired: '[Placeholder: Product surface copy — error messages: the confirmation code has expired or was replaced; start again]',
  too_many_attempts: '[Placeholder: Product surface copy — error messages: too many wrong codes; start again]',
  notNow: '[Placeholder: Product surface copy — error messages: the account cannot be deleted right now; try again later]',
  notDeleted: '[Placeholder: Product surface copy — error messages: the account was not deleted; try again, and nothing is refunded twice]',
}

function serviceDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

const brief = (err) => String(err?.message ?? err).slice(0, 200)

export async function deleteMyAccount(prev, formData) {
  const step = formData.get('step')
  const { supabase, user, account, status } = await requireAccount()
  if (!account) return { step: 'start', error: ERRORS.noAccount }
  const closed = deletionClosed(status)
  if (closed) return { step: 'start', error: ERRORS[closed] }
  const channels = deployChannels()
  if (!channels) return { step: 'start', error: ERRORS.notNow }
  const db = serviceDb()

  if (step === 'start') {
    try {
      const { data: details, error } = await db.from('accounts').select('id, name').eq('id', account.id).single()
      if (error) throw error
      const owed = await refundsOwedOnDeletion(db, getStripe(), { accountId: account.id })
      const { id } = await startVerification(db, {
        account: details,
        user,
        purpose: 'account_deletion',
        password: String(formData.get('password') || ''),
        payload: { account_id: account.id },
      })
      return {
        step: 'code',
        verificationId: id,
        refunds: owed.map((r) => ({ plan: r.planName, amount: money(r.amount, r.currency) })),
      }
    } catch (err) {
      if (err instanceof VerificationRefused) return { step: 'start', error: ERRORS[err.reason] ?? ERRORS.notNow }
      console.log(`account deletion: start failed: ${brief(err)}`)
      return { step: 'start', error: ERRORS.notNow }
    }
  }

  if (step === 'code') {
    const verificationId = String(formData.get('verification_id') || '')
    try {
      const payload = await confirmVerification(db, {
        accountId: account.id,
        purpose: 'account_deletion',
        id: verificationId,
        code: formData.get('code'),
      })
      if (payload?.account_id !== account.id) throw new VerificationRefused('expired')
    } catch (err) {
      if (err instanceof VerificationRefused && err.reason === 'wrong_code') {
        return { step: 'code', verificationId, refunds: prev?.refunds ?? [], error: ERRORS.wrong_code }
      }
      if (err instanceof VerificationRefused) return { step: 'start', error: ERRORS[err.reason] ?? ERRORS.notNow }
      console.log(`account deletion: confirm failed: ${brief(err)}`)
      return { step: 'start', error: ERRORS.notNow }
    }

    try {
      await deleteAccount(db, getStripe(), { accountId: account.id, user, channels, verificationId })
    } catch (err) {
      if (err instanceof DeletionRefused) return { step: 'start', error: ERRORS[err.reason] ?? ERRORS.notDeleted }
      console.log(`account deletion: failed partway: ${brief(err)}`)
      return { step: 'start', error: ERRORS.notDeleted }
    }

    // The sign-in no longer exists, so Supabase has no session to end. This
    // clears the browser's own copy of it.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    redirect('/account-deleted')
  }

  return { step: 'start' }
}
