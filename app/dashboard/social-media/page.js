// Posterity — User Profiles: the Social Media tab · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { ProfileShell, Empty } from '../_profile/ProfileShell'

export default async function SocialMediaTab() {
  const profile = await requireAccount({ next: '/dashboard/social-media' })

  return (
    <ProfileShell tab="social-media" profile={profile}>
      {/* Stage 6.2: the authorization panel lands here. Until Posterity Social
          launches, social media shows greyed and labeled coming soon; the
          label awaits Product surface copy. */}
      <Empty>[Placeholder: Product surface copy — the coming-soon label for social media]</Empty>
    </ProfileShell>
  )
}
