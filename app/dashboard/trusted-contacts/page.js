// Posterity — trusted contacts · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { Wordmark } from '../../components/brand/Wordmark'
import { LogoutButton } from '../LogoutButton'
import { TrustedContactForm } from './TrustedContactForm'
import { makePrimary, deleteTrustedContact } from './actions'

export default async function TrustedContacts() {
  const { supabase, account } = await requireAccount()

  const { data: contacts } = await supabase
    .from('trusted_contacts')
    .select('id, name, email, phone, is_primary, accepted_at')
    .eq('account_id', account.id)
    .order('is_primary', { ascending: false })
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

        <h1 className="text-4xl font-bold mt-4 mb-2">Trusted Contacts</h1>
        <p className="text-gray-400 mb-4">
          The people who can speak for your account. Your primary contact is the first person we turn
          to; the others are there if we can&rsquo;t reach them.
        </p>
        <p className="text-gray-600 text-sm mb-12 leading-relaxed">
          Tell them you&rsquo;ve chosen them. It matters, and it&rsquo;s a better conversation to have
          now than for someone else to have later.
        </p>

        <TrustedContactForm />

        <div className="mt-10">
          {!contacts?.length ? (
            <p className="text-gray-600 text-sm text-center py-8">No one yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="bg-gray-900 rounded-xl px-6 py-4 border border-gray-800 flex justify-between items-center gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2">
                      {c.name}
                      {c.is_primary && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: 'rgba(147,171,153,0.14)',
                            color: '#93ab99',
                            border: '1px solid rgba(147,171,153,0.32)',
                          }}
                        >
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-gray-500 text-sm truncate">
                      {[c.email, c.phone].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {!c.is_primary && (
                      <form action={makePrimary}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-gray-500 hover:text-white transition text-sm cursor-pointer">
                          Make primary
                        </button>
                      </form>
                    )}
                    <form action={deleteTrustedContact}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-gray-600 hover:text-red-400 transition text-sm cursor-pointer">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/*
          What is deliberately NOT here: the invite, the portal, and the
          confirmation. A trusted contact's confirmation is one of the three ways
          the trigger fires — it is the single most dangerous input in this
          product, and it ships with its safeguards (double verification, the
          six-notification escalation, a human-in-the-loop hold) or it does not
          ship. Phase 1.2. Naming the people is safe. Letting them press the
          button is not, yet.
        */}
        <p className="text-gray-600 text-xs mt-12 leading-relaxed border-t border-gray-900 pt-6">
          Your contacts can&rsquo;t do anything yet — that part of Posterity is still being built, and
          it&rsquo;s the part we&rsquo;re taking the most time over. For now, this is you deciding who
          they are.
        </p>
      </div>
    </main>
  )
}
