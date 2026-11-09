// Posterity — Settings · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { displayPhone } from '../../../lib/posterity/phone'
import { Wordmark } from '../../components/brand/Wordmark'
import { LogoutButton } from '../LogoutButton'
import { AccountDetailsForm } from './AccountDetailsForm'
import { EmailChangeForm } from './EmailChangeForm'
import { RecoveryEmailForm } from './RecoveryEmailForm'
import { createClient } from '@supabase/supabase-js'
import { readRecoveryEmail } from '../../../lib/auth/recovery-email'

// Settings is its own page (Master Specification, Settings). The global
// navigation dropdown built within Stage 4.3 will carry its link; until then
// the dashboard does.
export default async function Settings({ searchParams }) {
  const { supabase, user, account } = await requireAccount()
  const notice = (await searchParams)?.recovery_email ?? null

  const { data: details } = await supabase
    .from('accounts')
    .select('legal_name, name, phone')
    .eq('id', account?.id)
    .maybeSingle()

  // recovery_emails is server-only, so it is read with the service role, for
  // this account alone.
  let recovery = null
  if (account?.id) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    recovery = await readRecoveryEmail(db, account.id).catch(() => null)
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <a href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Wordmark size="sm" withMark />
        </a>
        <LogoutButton />
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <a href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Dashboard</a>

        <h1 className="text-4xl font-bold mt-4 mb-12">Settings</h1>

        <h2 className="text-xl font-bold mb-4">Account details</h2>
        {details ? (
          <>
            <AccountDetailsForm
              legalName={details.legal_name}
              name={details.name === details.legal_name ? '' : details.name}
              phone={displayPhone(details.phone)}
            />
            <EmailChangeForm email={user.email} pendingEmail={user.new_email || null} />
            <RecoveryEmailForm held={recovery} notice={notice} />
          </>
        ) : (
          <div className="rounded-2xl p-6 border border-yellow-900 bg-yellow-950/30">
            <p className="text-yellow-200 text-sm">
              [Placeholder: Product surface copy — error messages: the account record cannot be found]
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
