// Posterity — recipients · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { Wordmark } from '../../components/brand/Wordmark'
import { LogoutButton } from '../LogoutButton'
import { RecipientForm } from './RecipientForm'
import { deleteRecipient } from './actions'

export default async function Recipients() {
  const { supabase, account } = await requireAccount()

  const { data: recipients } = await supabase
    .from('recipients')
    .select('id, name, email, phone, platform, platform_handle')
    .eq('account_id', account.id)
    .order('created_at', { ascending: true })

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

        <h1 className="text-4xl font-bold mt-4 mb-2">Recipients</h1>
        <p className="text-gray-400 mb-12">
          The people your legacy is for. Add them once — you&rsquo;ll choose from this list every time
          you write something.
        </p>

        <RecipientForm />

        <div className="mt-10">
          {!recipients?.length ? (
            <p className="text-gray-600 text-sm text-center py-8">No one yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recipients.map((r) => (
                <li
                  key={r.id}
                  className="bg-gray-900 rounded-xl px-6 py-4 border border-gray-800 flex justify-between items-center gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.name}</p>
                    <p className="text-gray-500 text-sm truncate">
                      {[r.email, r.phone].filter(Boolean).join(' · ')}
                      {r.platform && (
                        <span className="text-gray-600">
                          {' '}· {r.platform}
                          {r.platform_handle ? ` ${r.platform_handle}` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <form action={deleteRecipient}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-gray-600 hover:text-red-400 transition text-sm cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
