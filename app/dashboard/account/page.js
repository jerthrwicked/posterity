// Posterity — User Profiles: the Account tab · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { ProfileShell, Empty } from '../_profile/ProfileShell'

export default async function AccountTab() {
  const profile = await requireAccount({ next: '/dashboard/account' })

  return (
    <ProfileShell tab="account" profile={profile}>
      {/* Later insertions the Master Specification names for the Account tab
          land here. Stage 4.7: the Account Restoration option. */}
      <Empty>[Placeholder: Product surface copy — User Profiles: what the Account tab says while nothing is within it]</Empty>
    </ProfileShell>
  )
}
