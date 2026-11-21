// Posterity — set a new password · Walker Brown
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { AuthHead } from '../components/AuthHead'
import { NewPasswordForm } from './NewPasswordForm'
import { WhiteGlow } from '../components/Glow'

// The page a password reset link opens. The link has already given the person
// a session (through /auth/confirm or /auth/callback), so this page is reached
// signed in; without a session it sends them to ask for a link. The form sets
// the new password on that session and continues to the dashboard.

export default async function ResetPassword() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/forgot-password?error=link_expired')

  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="relative z-[1] w-full max-w-md">
        <AuthHead line="Choose a new password." />
        <NewPasswordForm email={user.email} />
      </div>
      <WhiteGlow />
    </main>
  )
}
