// Posterity — account recovery: a notice's cancel link · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { peekCancel } from '../../../lib/auth/account-recovery'
import { Frame } from '../Frame'
import { StepButton } from '../StepButton'

// Where the link in an account recovery notice lands:
//   /account-recovery/cancel?token=…
//
// "Each notice carries a link that cancels it" (Master Specification,
// Settings). The link needs no session: whoever holds a notice can cancel. As
// with the confirm link, opening it changes nothing and the button does, so a
// mail scanner cancels nothing. A request that has already closed says what
// became of it.
const CLOSED = {
  cancelled: '[Placeholder: Product surface copy — account recovery: the request was already cancelled; access to the account stays where it is]',
  completed: '[Placeholder: Product surface copy — account recovery: the seven days have passed and access has already moved; contact Posterity]',
}

export default async function CancelAccountRecovery({ searchParams }) {
  const token = String((await searchParams).token ?? '')
  let found = null
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    found = await peekCancel(db, { token })
  } catch (err) {
    console.log(`account recovery: cancel page: ${String(err?.message ?? err).slice(0, 200)}`)
  }

  return (
    <Frame line="Account recovery">
      {found?.state === 'waiting' ? (
        <>
          <p className="text-gray-300 leading-relaxed">
            [Placeholder: Product surface copy — account recovery: someone asked to move access to your Posterity
            account to {found.newEmail}; if that was not you, cancel it here and access stays where it is]
          </p>
          <StepButton kind="cancel" token={token} />
        </>
      ) : (
        <p className="text-gray-300 leading-relaxed">
          {found
            ? CLOSED[found.outcome] ?? '[Placeholder: Product surface copy — account recovery: the request is no longer waiting; access to the account stays where it is]'
            : '[Placeholder: Product surface copy — account recovery: this link matches no request]'}
        </p>
      )}
    </Frame>
  )
}
