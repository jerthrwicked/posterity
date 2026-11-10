'use server'

// Posterity — the text message switch · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '../../../lib/posterity/account'
import { displayPhone } from '../../../lib/posterity/phone'
import { SMS_FROM } from '../../../lib/dispatch/senders'
import {
  turnAccountTextsOn, turnAccountTextsOff, cancelAccountTextRequest, SwitchRefused,
} from '../../../lib/dispatch/text-switch'

// The text message switch in Settings (Master Specification, Settings: Text
// message opt-in). The form's `turn` says which way:
//
//   on      the customer agrees against the disclosure the page shows. Where
//           this account has already proven the number, the agreement is
//           recorded and its confirmation text queued. Otherwise nothing is
//           recorded yet: the page shows a code, and the agreement is recorded
//           when a text carrying it arrives from that number
//           (lib/dispatch/text-switch.js)
//   cancel  the customer stops waiting on a code; nothing was recorded
//   off     records the stop for the number
//
// The disclosure recorded is the server's own constant, the one the page
// renders, never text the form sends.
//
// The switch stays usable whatever the account's storage standing, so this
// does not read canBuild.
//
// No approved text exists yet for these messages, so each is a placeholder
// naming the Writing Requirements item that will supply it.
const ERRORS = {
  noAccount: '[Placeholder: Product surface copy — error messages: the account record cannot be found]',
  no_number: '[Placeholder: Product surface copy — error messages: texts need a phone number on file]',
  needs_start: `[Placeholder: Product surface copy — error messages: this number replied STOP; text START to ${displayPhone(SMS_FROM)}, then turn texts on here]`,
  notSaved: '[Placeholder: Product surface copy — error messages: the text message setting was not saved]',
}

// Returns { done } — 'on', 'waiting' (a code is showing), 'cancelled' or 'off'
// — or { error }.
export async function textSwitchAction(_prev, formData) {
  const turn = formData.get('turn')
  const { user, account } = await requireAccount()
  if (!account) return { error: ERRORS.noAccount }
  if (turn !== 'on' && turn !== 'off' && turn !== 'cancel') return { error: ERRORS.notSaved }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  let done
  try {
    if (turn === 'on') {
      const turned = await turnAccountTextsOn(db, { accountId: account.id, userId: user.id })
      done = turned.on ? 'on' : 'waiting'
    } else if (turn === 'cancel') {
      await cancelAccountTextRequest(db, { accountId: account.id })
      done = 'cancelled'
    } else {
      await turnAccountTextsOff(db, { accountId: account.id, userId: user.id })
      done = 'off'
    }
  } catch (err) {
    revalidatePath('/dashboard/settings')
    // Already off, by a STOP reply or a changed number: the page now says so.
    if (err instanceof SwitchRefused && err.reason === 'not_on') return { done: 'off' }
    if (err instanceof SwitchRefused) return { error: ERRORS[err.reason] ?? ERRORS.notSaved }
    console.log(`text switch: ${turn} failed: ${String(err?.message ?? err).slice(0, 200)}`)
    return { error: ERRORS.notSaved }
  }
  revalidatePath('/dashboard/settings')
  return { done }
}
