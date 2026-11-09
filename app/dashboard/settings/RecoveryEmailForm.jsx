'use client'

// Posterity — the recovery email address · Walker Brown
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { recoveryEmailAction } from './recovery-email'

const input =
  'w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition'
const label = 'text-sm text-gray-400 mb-1 block'
const note = 'text-xs text-gray-600 mt-1 leading-relaxed'
const link = 'text-sm text-gray-300 underline hover:text-white cursor-pointer'

function Submit({ children, busy }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="flex-1 bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer">
      {pending ? busy : children}
    </button>
  )
}

function Cancel({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 border border-gray-700 text-gray-300 py-3 rounded-lg hover:border-white hover:text-white transition cursor-pointer">
      Cancel
    </button>
  )
}

function Password() {
  return (
    <div>
      <label htmlFor="recovery_password" className={label}>Password</label>
      <input id="recovery_password" name="password" type="password" autoComplete="current-password" className={input} />
      <p className={note}>
        [Placeholder: Product surface copy — Settings: adding or changing the recovery email address, or sending its
        link again, needs the password]
      </p>
    </div>
  )
}

// One open form at a time: set (add or change), resend, cancel (the waiting
// address), or remove. Remounted for each attempt, so Cancel starts clean.
function Open({ mode, held, onClose }) {
  const [state, action] = useActionState(recoveryEmailAction, {})

  if (state.done === 'sent') {
    return (
      <div className="mt-4 rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          [Placeholder: Product surface copy — Settings: a confirmation link went to {state.email}; it lasts an hour,
          and the address receives reset links only once it is used; until then any confirmed recovery email address
          keeps receiving them]
        </p>
      </div>
    )
  }
  if (state.done === 'cancelled') {
    return (
      <p className="mt-4 text-sm text-gray-300">
        [Placeholder: Product surface copy — Settings: the address waiting on its link was dropped]
      </p>
    )
  }
  if (state.done === 'removed') {
    return (
      <p className="mt-4 text-sm text-gray-300">
        [Placeholder: Product surface copy — Settings: the recovery email address was removed]
      </p>
    )
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="step" value={mode} />
      {mode === 'set' && (
        <div>
          <label htmlFor="recovery_email" className={label}>Recovery email address</label>
          <input id="recovery_email" name="recovery_email" type="email" autoComplete="email" className={input}
            defaultValue={state.email ?? ''} placeholder="you@example.com" />
        </div>
      )}
      {mode === 'remove' && (
        <p className="text-sm text-gray-300 leading-relaxed">
          [Placeholder: Product surface copy — Settings: removing {held?.email} means a lost sign-in address can no
          longer be recovered through it{held?.pending ? `; the change waiting on ${held.pending.email} is dropped too` : ''}]
        </p>
      )}
      {mode === 'cancel' && (
        <p className="text-sm text-gray-300 leading-relaxed">
          [Placeholder: Product surface copy — Settings: dropping {held?.pending?.email}, which is waiting on its
          link{held?.email ? `; ${held.email} stays the recovery email address` : ''}]
        </p>
      )}
      {(mode === 'set' || mode === 'resend') && <Password />}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-3">
        <Cancel onClick={onClose} />
        {mode === 'remove' && <Submit busy="Removing...">Remove</Submit>}
        {mode === 'cancel' && <Submit busy="Dropping...">Drop it</Submit>}
        {(mode === 'set' || mode === 'resend') && <Submit busy="Sending...">Send link</Submit>}
      </div>
    </form>
  )
}

// held: { email, pending } or null, from readRecoveryEmail: email is the
// confirmed address or null, pending { email, expired } the address waiting on
// its link. notice: the confirm link's outcome, from the page's address
// ('confirmed' or 'link_expired').
export function RecoveryEmailForm({ held, notice }) {
  const [mode, setMode] = useState(null)
  const [round, setRound] = useState(0)
  const open = (m) => { setMode(m); setRound((r) => r + 1) }

  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mt-6">
      <p className={label}>Recovery email address</p>
      {held?.email ? (
        <p className="px-4 py-3 rounded-lg border border-gray-800 text-gray-300">{held.email}</p>
      ) : (
        <p className="px-4 py-3 rounded-lg border border-gray-800 text-gray-600">
          [Placeholder: Product surface copy — Settings: no recovery email address is held]
        </p>
      )}
      <p className={note}>
        [Placeholder: Product surface copy — Settings: the recovery email address is optional; if the address you sign
        in with is lost, a password reset link can go here instead; it receives reset links and nothing else]
      </p>
      {notice === 'confirmed' && held?.email && (
        <p className="text-xs text-green-300 mt-3">
          [Placeholder: Product surface copy — Settings: the recovery email address is confirmed]
        </p>
      )}
      {notice === 'link_expired' && (
        <p className="text-xs text-red-400 mt-3">
          [Placeholder: Product surface copy — Settings: that confirmation link has expired, was replaced, or was
          already used; send a new one]
        </p>
      )}
      {held?.pending && (
        <p className="text-xs text-yellow-200 mt-3 leading-relaxed">
          {held.pending.expired
            ? `[Placeholder: Product surface copy — Settings: the link sent to ${held.pending.email} has expired; until a new one is used, it receives nothing`
            : `[Placeholder: Product surface copy — Settings: ${held.pending.email} is waiting on the link sent to it, which lasts an hour; until it is used, it receives nothing`}
          {held.email ? `, and ${held.email} stays the recovery email address]` : ']'}
        </p>
      )}

      {mode ? (
        <Open key={round} mode={mode} held={held} onClose={() => setMode(null)} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          <button type="button" className={link} onClick={() => open('set')}>
            {held?.email ? 'Change recovery email address' : 'Add a recovery email address'}
          </button>
          {held?.pending && (
            <button type="button" className={link} onClick={() => open('resend')}>Send the link again</button>
          )}
          {held?.pending && (
            <button type="button" className={link} onClick={() => open('cancel')}>Drop the waiting address</button>
          )}
          {held?.email && (
            <button type="button" className={link} onClick={() => open('remove')}>Remove</button>
          )}
        </div>
      )}
    </div>
  )
}
