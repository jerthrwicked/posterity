// Posterity — User Profiles: the Plans tab, the logged-in home · Walker Brown
import { requireAccount } from '../../lib/posterity/account'
import { ProfileShell, Card } from './_profile/ProfileShell'

export default async function PlansTab() {
  // proxy.js already redirected signed-out visitors. This is the real check —
  // proxy is an optimistic gate, not an authorization boundary.
  const profile = await requireAccount({ next: '/dashboard' })
  const { supabase, account } = profile

  // Every count below runs under RLS as this user — they cannot read anyone else's.
  const counts = { plans: 0, content: 0 }
  if (account) {
    const [plans, content] = await Promise.all([
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
    ])
    counts.plans = plans.count ?? 0
    counts.content = content.count ?? 0
  }

  return (
    <ProfileShell tab="plans" profile={profile}>
      {/* Stage 4.3, Plans and Cart: Plan Selection on the year calendar, Add a
          plan, and the plan options land here, with the live cart at the top
          right. */}
      {/* Stage 4.7: the Begin button lands here, showing only on an initiated
          account. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Your Plans"
          blurb="Each plan covers one year of delivery. Build as many as you like before you initiate."
          value={counts.plans}
          hint={counts.plans === 1 ? 'plan started' : 'plans started'}
        />
        {/* Stage 4.5: Plan Content and the button that opens the Content
            Builder land here. Until then the content built so far opens from
            this card. */}
        <Card
          href="/dashboard/legacy"
          title="My Legacy"
          blurb="The messages you're leaving behind."
          value={counts.content}
          hint={counts.content === 1 ? 'piece created' : 'pieces created'}
        />
      </div>
    </ProfileShell>
  )
}
