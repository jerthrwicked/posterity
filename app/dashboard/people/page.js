// Posterity — User Profiles: the People tab · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { ProfileShell, Card } from '../_profile/ProfileShell'

export default async function PeopleTab() {
  const profile = await requireAccount({ next: '/dashboard/people' })
  const { supabase, account } = profile

  // Every count below runs under RLS as this user — they cannot read anyone else's.
  const counts = { recipients: 0, guards: 0 }
  if (account) {
    const [recipients, guards] = await Promise.all([
      supabase.from('recipients').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('legacy_guards').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
    ])
    counts.recipients = recipients.count ?? 0
    counts.guards = guards.count ?? 0
  }

  return (
    <ProfileShell tab="people" profile={profile}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        {/* Stage 4.5: the Saved Recipients section and the Master Recipient
            land here. Until then recipients open from this card. */}
        <Card
          href="/dashboard/recipients"
          title="Recipients"
          blurb="The people your legacy is for."
          value={counts.recipients}
          hint={counts.recipients === 1 ? 'recipient added' : 'recipients added'}
        />
        {/* Stage 4.6: the Legacy Guard setup panel lands here. Until then
            Legacy Guards open from this card. */}
        <Card
          href="/dashboard/legacy-guards"
          title="Legacy Guards"
          blurb="The people who can speak for your account."
          value={counts.guards}
          hint={counts.guards === 1 ? 'Legacy Guard added' : 'Legacy Guards added'}
        />
      </div>
    </ProfileShell>
  )
}
