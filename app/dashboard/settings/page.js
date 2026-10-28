// Posterity — Settings · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { displayPhone } from '../../../lib/posterity/phone'
import { Wordmark } from '../../components/brand/Wordmark'
import { LogoutButton } from '../LogoutButton'
import { AccountDetailsForm } from './AccountDetailsForm'

// Settings is its own page (Master Specification, Settings). The global
// navigation dropdown built within Stage 4.3 will carry its link; until then
// the dashboard does.
export default async function Settings() {
  const { supabase, user, account } = await requireAccount()

  const { data: details } = await supabase
    .from('accounts')
    .select('legal_name, name, phone')
    .eq('id', account?.id)
    .maybeSingle()

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
          <AccountDetailsForm
            legalName={details.legal_name}
            name={details.name === details.legal_name ? '' : details.name}
            email={user.email}
            phone={displayPhone(details.phone)}
          />
        ) : (
          <div className="rounded-2xl p-6 border border-yellow-900 bg-yellow-950/30">
            <p className="text-yellow-200 text-sm">
              We couldn&rsquo;t find your account record. Nothing is lost — please contact us and
              we&rsquo;ll put it right.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
