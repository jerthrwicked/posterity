// Posterity — my legacy · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { Wordmark } from '../../components/brand/Wordmark'
import { LogoutButton } from '../LogoutButton'
import { MessageForm } from './MessageForm'
import { deleteMessage } from './actions'

function formatDate(d) {
  // Parse as a plain calendar date. `new Date('2026-07-13')` is parsed as UTC
  // midnight and can render as the day before in a western timezone — which is
  // not a bug we get to have in a product built on calendar dates.
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function Legacy() {
  const { supabase, account } = await requireAccount()

  const [{ data: recipients }, { data: items }] = await Promise.all([
    supabase
      .from('recipients')
      .select('id, name')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('content_items')
      .select('id, title, body, deliver_on, include_in_posterity, recipients(name)')
      .eq('account_id', account.id)
      .order('deliver_on', { ascending: true }),
  ])

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

        <h1 className="text-4xl font-bold mt-4 mb-2">My Legacy</h1>
        <p className="text-gray-400 mb-12">
          Everything you leave behind. Write it now, at your own pace — nothing is delivered while
          you&rsquo;re here.
        </p>

        <MessageForm recipients={recipients ?? []} />

        <div className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-gray-600 mb-5">
            {items?.length ? `${items.length} ${items.length === 1 ? 'piece' : 'pieces'}` : 'Nothing yet'}
          </h2>

          {!items?.length ? (
            <p className="text-gray-600 text-sm py-4">
              Your legacy is empty. The first one is the hardest.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {item.title || 'Untitled'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        For {item.recipients?.name ?? 'someone'} · arrives {formatDate(item.deliver_on)}
                      </p>
                    </div>
                    <form action={deleteMessage}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="text-gray-600 hover:text-red-400 transition text-sm cursor-pointer shrink-0"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{item.body}</p>
                  {item.include_in_posterity && (
                    <p className="text-gray-600 text-xs mt-4">Kept in Posterity</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
