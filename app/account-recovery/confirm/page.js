// Posterity — account recovery: the new address's link · Walker Brown
import { createClient } from '@supabase/supabase-js'
import { peekConfirm } from '../../../lib/auth/account-recovery'
import { Frame } from '../Frame'
import { StepButton } from '../StepButton'

// Where the link sent to the new address lands:
//   /account-recovery/confirm?token=…
//
// Opening the link changes nothing. The page reads the token with the service
// role (account_recoveries is server-only) and shows a button; pressing it is
// what starts the seven days and sends the notices. A link is often opened by
// a mail scanner before its reader, and that must not start anything.
export default async function ConfirmAccountRecovery({ searchParams }) {
  const token = String((await searchParams).token ?? '')
  let found = null
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    found = await peekConfirm(db, { token })
  } catch (err) {
    console.log(`account recovery: confirm page: ${String(err?.message ?? err).slice(0, 200)}`)
  }

  return (
    <Frame line="Account recovery">
      {found ? (
        <>
          <p className="text-gray-300 leading-relaxed">
            [Placeholder: Product surface copy — account recovery: someone asked to move access to a Posterity account
            to {found.newEmail}; starting tells every address and number on the account, and access moves after seven
            days unless one of them cancels; if you did not ask, close this page and nothing happens]
          </p>
          <StepButton kind="confirm" token={token} />
        </>
      ) : (
        <p className="text-gray-300 leading-relaxed">
          [Placeholder: Product surface copy — account recovery: the link has expired or was already used; ask again
          from the sign-in page]
        </p>
      )}
    </Frame>
  )
}
