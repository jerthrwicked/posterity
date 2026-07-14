import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Wordmark } from '../components/brand/Wordmark'
import { LogoutButton } from './LogoutButton'

// The six phases, in the product's own language. Never clinical.
const PHASES = {
  horizon:   { name: 'Horizon',   line: 'You are building. Take all the time you need.' },
  planning:  { name: 'Planning',  line: 'Your account is initiated. Your legacy is safe with us.' },
  abeyance:  { name: 'Abeyance',  line: 'A quiet pause. Nothing is delivered during this phase.' },
  active:    { name: 'Active',    line: 'Your legacy is being delivered, on the dates you chose.' },
  twilight:  { name: 'Twilight',  line: 'The final plan year is complete.' },
  posterity: { name: 'Posterity', line: 'A permanent archive, in the care of your trusted contact.' },
}

function Card({ title, blurb, value, hint }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{blurb}</p>
      <p className="text-3xl font-bold mt-6">{value}</p>
      <p className="text-gray-600 text-sm">{hint}</p>
    </div>
  )
}

export default async function Dashboard() {
  const supabase = await createClient()

  // proxy.js already redirected signed-out visitors. This is the real check —
  // proxy is an optimistic gate, not an authorization boundary.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, phase, next_checkin_due')
    .eq('user_id', user.id)
    .single()

  // Every count below runs under RLS as this user — they cannot read anyone else's.
  const counts = { content: 0, recipients: 0, contacts: 0, plans: 0 }
  if (account) {
    const [content, recipients, contacts, plans] = await Promise.all([
      supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('recipients').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('trusted_contacts').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
    ])
    counts.content = content.count ?? 0
    counts.recipients = recipients.count ?? 0
    counts.contacts = contacts.count ?? 0
    counts.plans = plans.count ?? 0
  }

  const phase = PHASES[account?.phase] ?? PHASES.horizon
  const name = user.user_metadata?.full_name || 'Friend'

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <Wordmark size="sm" withMark />
        <LogoutButton />
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-4xl font-bold mb-2">Welcome, {name}.</h2>
        <p className="text-gray-400 mb-2">{phase.line}</p>
        <p className="text-gray-600 text-sm mb-12">
          Phase: <span className="text-gray-300">{phase.name}</span>
        </p>

        {!account && (
          <div className="mb-8 rounded-2xl p-6 border border-yellow-900 bg-yellow-950/30">
            <p className="text-yellow-200 text-sm">
              We couldn&rsquo;t find your account record. Nothing is lost — please contact us and
              we&rsquo;ll put it right.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="My Legacy"
            blurb="The messages, videos, and photos you're leaving behind."
            value={counts.content}
            hint={counts.content === 1 ? 'piece created' : 'pieces created'}
          />
          <Card
            title="Recipients"
            blurb="The people your legacy is for."
            value={counts.recipients}
            hint={counts.recipients === 1 ? 'recipient added' : 'recipients added'}
          />
          <Card
            title="Trusted Contacts"
            blurb="The people who can speak for your account."
            value={counts.contacts}
            hint={counts.contacts === 1 ? 'contact added' : 'contacts added'}
          />
        </div>

        <div className="mt-8 bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h3 className="text-xl font-bold mb-2">Your Plans</h3>
          <p className="text-gray-400 text-sm mb-6">
            Each plan covers one year of delivery. Build as many as you like before you initiate.
          </p>
          <p className="text-3xl font-bold">{counts.plans}</p>
          <p className="text-gray-600 text-sm">{counts.plans === 1 ? 'plan started' : 'plans started'}</p>
        </div>

        {/*
          The check-in control deliberately does not exist yet.

          It used to: a button reading "✓ I'm Still Here" that was wired to
          nothing at all. That is worse than no button — it tells a customer their
          check-in landed when it did not.

          Check-in only means something alongside the thing it holds back. Both
          halves ship together in Phase 1.2, or neither does.
        */}
      </div>
    </main>
  )
}
