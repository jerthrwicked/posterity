'use client'

// Posterity — deleting the account · Walker Brown
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { deleteMyAccount } from './account-deletion'
import { WarningMark } from '../../components/StatusMarks'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-[color:var(--text-quiet)] mt-1 leading-relaxed'

function Submit({ children, busy }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 border border-[color:var(--brand-rose)] text-[color:var(--brand-rose)] py-3 rounded-lg font-semibold hover:bg-[color:var(--brand-rose)] hover:text-black transition disabled:opacity-50 cursor-pointer"
    >
      {pending ? busy : children}
    </button>
  )
}

// The two steps of the deletion, from the password to the code. Remounted for
// each attempt, so Cancel starts clean. The last step never comes back: the
// action sends the browser to /account-deleted.
function Steps({ email, onCancel }) {
  const [state, action] = useActionState(deleteMyAccount, { step: 'start' })
  const cancel = (
    <button type="button" onClick={onCancel}
      className="flex-1 border border-gray-700 text-gray-300 py-3 rounded-lg hover:border-white hover:text-white transition cursor-pointer">
      Cancel
    </button>
  )

  if (state.step === 'code') {
    return (
      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="step" value="code" />
        <input type="hidden" name="verification_id" value={state.verificationId} />
        <div>
          <label htmlFor="deletion_code" className={label}>Confirmation code</label>
          <input id="deletion_code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className={input} placeholder="123456" />
          <p className={note}>
            [Placeholder: Product surface copy — Settings: a six-digit code went to {email}, the address the account
            signs in with; it works once, for ten minutes; entering it deletes the account at once, and that cannot
            be undone]
          </p>
        </div>
        {state.refunds?.length > 0 ? (
          <ul className="text-sm text-gray-300 leading-relaxed" data-refunds>
            {state.refunds.map((r, i) => (
              <li key={i}>
                [Placeholder: Product surface copy — Settings: deleting the account refunds {r.amount} for
                the {r.plan} plan to the payment method that paid it]
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-300 leading-relaxed" data-refunds="none">
            [Placeholder: Product surface copy — Settings: deleting the account refunds nothing, since no plan was
            paid within the last thirty days]
          </p>
        )}
        {state.error && <p className="text-sm text-[color:var(--brand-rose)] inline-flex items-start gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
        <div className="flex gap-3">
          {cancel}
          <Submit busy="Deleting...">Delete account</Submit>
        </div>
      </form>
    )
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="step" value="start" />
      <div>
        <label htmlFor="deletion_password" className={label}>Password</label>
        <input id="deletion_password" name="password" type="password" autoComplete="current-password" className={input} />
        <p className={note}>
          [Placeholder: Product surface copy — Settings: deleting the account needs the password and then a code
          sent to {email}, the double verification]
        </p>
      </div>
      {state.error && <p className="text-sm text-[color:var(--brand-rose)] inline-flex items-start gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
      <div className="flex gap-3">
        {cancel}
        <Submit busy="Sending...">Send code</Submit>
      </div>
    </form>
  )
}

// closed: null where deletion is open, or why it is not (phase, recovery_lock).
// until: the day a recovery lock ends, as text.
export function DeleteAccountForm({ email, closed, until }) {
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(0)

  return (
    <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)]" data-card="delete-account">
      <p className={label}>Delete account</p>
      <p className="text-sm text-gray-300 leading-relaxed">
        [Placeholder: Product surface copy — Settings: deleting the account removes everything it holds, at once and
        for good; a plan paid within the last thirty days is refunded in full, and storage fees are not refunded]
      </p>
      {closed === 'recovery_lock' ? (
        <p className="text-xs text-white mt-3 leading-relaxed flex items-start gap-2" data-closed="recovery_lock">
          <WarningMark className="mt-0.5" />
          [Placeholder: Product surface copy — Settings: the account was recovered, so it cannot be deleted
          until {until}]
        </p>
      ) : closed ? (
        <p className="text-xs text-white mt-3 leading-relaxed flex items-start gap-2" data-closed={closed}>
          <WarningMark className="mt-0.5" />
          [Placeholder: Product surface copy — Settings: the account can be deleted only during the Horizon and
          Planning Phases]
        </p>
      ) : open ? (
        <Steps key={round} email={email} onCancel={() => { setOpen(false); setRound((r) => r + 1) }} />
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-4 text-sm text-[color:var(--brand-rose)] underline cursor-pointer">
          Delete account
        </button>
      )}
    </div>
  )
}
