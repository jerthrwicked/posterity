'use client'

// Posterity — the email address and its change · Walker Brown
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { changeEmail } from './email-change'
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
      className="flex-1 bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer"
    >
      {pending ? busy : children}
    </button>
  )
}

// The two steps of the change, from the new address to the code. Remounted
// for each attempt, so Cancel starts clean.
function Steps({ email, onCancel }) {
  const [state, action] = useActionState(changeEmail, { step: 'start' })
  const cancel = (
    <button type="button" onClick={onCancel}
      className="flex-1 border border-gray-700 text-gray-300 py-3 rounded-lg hover:border-white hover:text-white transition cursor-pointer">
      Cancel
    </button>
  )

  if (state.step === 'sent') {
    return (
      <div className="mt-4 rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          [Placeholder: Product surface copy — Settings: a confirmation link went to {state.newEmail}; the account
          keeps {email}, and every message keeps going to it, until that link is used]
        </p>
      </div>
    )
  }

  if (state.step === 'code') {
    return (
      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="step" value="code" />
        <input type="hidden" name="verification_id" value={state.verificationId} />
        <div>
          <label htmlFor="code" className={label}>Confirmation code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className={input} placeholder="123456" />
          <p className={note}>
            [Placeholder: Product surface copy — Settings: a six-digit code went to {email}, the address the account
            signs in with; it works once, for ten minutes, and confirms the change to {state.newEmail}]
          </p>
        </div>
        {state.error && <p className="text-sm text-[color:var(--brand-rose)] inline-flex items-start gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
        <div className="flex gap-3">
          {cancel}
          <Submit busy="Confirming...">Confirm</Submit>
        </div>
      </form>
    )
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="step" value="start" />
      <div>
        <label htmlFor="new_email" className={label}>New email address</label>
        <input id="new_email" name="new_email" type="email" autoComplete="email" className={input}
          defaultValue={state.newEmail ?? ''} placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className={label}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={input} />
        <p className={note}>
          [Placeholder: Product surface copy — Settings: changing the email address needs the password and then a
          code sent to the current address, the double verification]
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

export function EmailChangeForm({ email, pendingEmail }) {
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(0)

  return (
    <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 border border-[color:var(--card-edge)]">
      <p className={label}>Email</p>
      <p className="px-4 py-3 rounded-lg border border-gray-800 text-gray-300">{email}</p>
      <p className={note}>
        You sign in with this address, and every message from Posterity goes to it.{' '}
        <a href="/forgot-password" className="text-gray-400 underline hover:text-white">Change your password</a> by a link sent to it.
      </p>
      {pendingEmail && !open && (
        <p className="text-xs text-white mt-3 leading-relaxed flex items-start gap-2">
          <WarningMark className="mt-0.5" />
          [Placeholder: Product surface copy — Settings: a change to {pendingEmail} is waiting on the link sent to
          it; until it is used, {email} stays the address]
        </p>
      )}
      {open ? (
        <Steps key={round} email={email} onCancel={() => { setOpen(false); setRound((r) => r + 1) }} />
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-4 text-sm text-gray-300 underline hover:text-white cursor-pointer">
          Change email address
        </button>
      )}
    </div>
  )
}
