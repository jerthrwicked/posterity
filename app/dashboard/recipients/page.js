// Posterity — recipients · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { displayPhone } from '../../../lib/posterity/phone'
import { RecipientForm } from './RecipientForm'
import { StorageNotice } from '../../components/StorageNotice'
import { AccountGlow } from '../../components/Glow'
import { NavCart } from '../_cart/NavCart'
import { deleteRecipient } from './actions'

export default async function Recipients() {
  const profile = await requireAccount()
  const { supabase, account, canBuild } = profile

  const { data: recipients } = await supabase
    .from('recipients')
    .select('id, name, email, phone, platform, platform_handle')
    .eq('account_id', account.id)
    .order('created_at', { ascending: true })

  return (
    <main className="relative min-h-screen bg-black text-white">
      <NavCart profile={profile} />

      <div className="relative z-[1] max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <a href="/dashboard/people" className="text-gray-400 hover:text-white text-sm">&larr; People</a>

        <h1 className="text-4xl font-bold mt-4 mb-2">Recipients</h1>
        <p className="text-gray-400 mb-12">
          The people your legacy is for. Add them once — you&rsquo;ll choose from this list every time
          you write something.
        </p>

        {canBuild ? <RecipientForm /> : <StorageNotice />}

        <div className="mt-10">
          {!recipients?.length ? (
            <p className="text-gray-400 text-sm text-center py-8">No one yet.</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {recipients.map((r) => (
                <li
                  key={r.id}
                  className="bg-[color:var(--card-ground)] posterity-frame rounded-xl px-6 py-4 border border-[color:var(--card-edge)] flex justify-between items-center gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.name}</p>
                    <p className="text-gray-400 text-sm truncate">
                      {[r.email, displayPhone(r.phone)].filter(Boolean).join(' · ')}
                      {r.platform && (
                        <span className="text-gray-400">
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
                      className="text-gray-400 hover:text-[color:var(--brand-rose)] transition text-sm cursor-pointer shrink-0"
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
      <AccountGlow />
    </main>
  )
}
