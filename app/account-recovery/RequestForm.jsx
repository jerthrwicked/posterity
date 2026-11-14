'use client'

// Posterity — account recovery · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { requestRecoveryAction } from './actions'
import { WarningMark } from '../components/StatusMarks'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-[color:var(--text-quiet)] mt-1 leading-relaxed'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer">
      {pending ? 'Sending...' : 'Send link'}
    </button>
  )
}

// The request. Once sent it says the same thing whatever happened, so it tells
// no one whether the address has an account or this browser has signed into it.
export function RequestForm() {
  const [state, action] = useActionState(requestRecoveryAction, {})

  if (state.done) {
    return (
      <p className="text-gray-300 leading-relaxed">
        [Placeholder: Product surface copy — account recovery: if this browser has signed into that account before, a
        link is on its way to {state.newEmail}; it lasts an hour; nothing changes and no one is told until it is used]
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-gray-400 leading-relaxed">
        [Placeholder: Product surface copy — account recovery: for someone who can no longer reach the address they
        sign in with or their recovery email address; it works only from a browser that has signed into the account
        before; access moves to the new address after seven days, during which every address and number on the
        account is told and can cancel]
      </p>
      <div>
        <label htmlFor="email" className={label}>Email you sign in with</label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email ?? ''}
          placeholder="you@example.com" className={input} />
      </div>
      <div>
        <label htmlFor="new_email" className={label}>New email</label>
        <input id="new_email" name="new_email" type="email" autoComplete="email" defaultValue={state.newEmail ?? ''}
          placeholder="you@example.com" className={input} />
        <p className={note}>
          [Placeholder: Product surface copy — account recovery: the new address; a link goes to it first, and it
          becomes the address the account signs in with]
        </p>
      </div>
      {state.error && <p className="text-sm text-center text-[color:var(--brand-rose)] inline-flex items-start justify-center gap-2"><WarningMark className="mt-0.5" />{state.error}</p>}
      <Submit />
    </form>
  )
}
