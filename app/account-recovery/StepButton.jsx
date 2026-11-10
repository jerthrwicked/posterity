'use client'

// Posterity — account recovery · Walker Brown
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { confirmRecoveryAction, cancelRecoveryAction } from './actions'

function Submit({ children, busy }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer">
      {pending ? busy : children}
    </button>
  )
}

const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// What each button's action came back with, in words.
function Result({ kind, state }) {
  if (kind === 'confirm') {
    if (state.outcome === 'waiting') {
      return (
        <>
          [Placeholder: Product surface copy — account recovery: the request has started; every address and number on
          the account is being told and any of them can cancel it; unless one does, {state.newEmail} becomes the
          address the account signs in with on or after {day(state.dueAt)}, and a link to choose a new password goes to
          it then]
        </>
      )
    }
    if (state.outcome === 'address_taken') {
      return <>[Placeholder: Product surface copy — account recovery: that address can no longer be used for this request]</>
    }
    if (state.outcome === 'invalid') {
      return <>[Placeholder: Product surface copy — account recovery: the link has expired or was already used; ask again from the sign-in page]</>
    }
    return <>[Placeholder: Product surface copy — account recovery: the request could not be started; ask again from the sign-in page]</>
  }
  if (state.outcome === 'cancelled') {
    return (
      <>
        [Placeholder: Product surface copy — account recovery: the request {state.already ? 'was already' : 'is'}{' '}
        cancelled; access to the account stays where it is]
      </>
    )
  }
  if (state.outcome === 'completed') {
    return <>[Placeholder: Product surface copy — account recovery: the seven days have passed and access has already moved; contact Posterity]</>
  }
  if (state.outcome === 'invalid') {
    return <>[Placeholder: Product surface copy — account recovery: this link matches no request]</>
  }
  if (state.outcome === 'error') {
    return <>[Placeholder: Product surface copy — account recovery: the request could not be cancelled just now; try the link again]</>
  }
  return <>[Placeholder: Product surface copy — account recovery: the request is no longer waiting; access to the account stays where it is]</>
}

// The button on the page a link opens. The link itself changes nothing: only
// pressing the button does, so a mail scanner that opens the link starts or
// cancels nothing.
export function StepButton({ kind, token }) {
  const [state, action] = useActionState(kind === 'confirm' ? confirmRecoveryAction : cancelRecoveryAction, {})

  if (state.outcome) {
    return <p className="text-gray-300 leading-relaxed"><Result kind={kind} state={state} /></p>
  }
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {kind === 'confirm'
        ? <Submit busy="Starting...">Start account recovery</Submit>
        : <Submit busy="Cancelling...">Cancel this request</Submit>}
    </form>
  )
}
