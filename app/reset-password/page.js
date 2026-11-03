// Posterity — set a new password · Walker Brown
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import Link from 'next/link'
import { Wordmark } from '../components/brand/Wordmark'
import { NewPasswordForm } from './NewPasswordForm'

// The page a password reset link opens. The link has already given the person
// a session (through /auth/confirm or /auth/callback), so this page is reached
// signed in; without a session it sends them to ask for a link. The form sets
// the new password on that session and continues to the dashboard.

export default async function ResetPassword() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/forgot-password?error=link_expired')

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Wordmark size="lg" withMark />
          </Link>
          <p className="text-gray-400 mt-2">Choose a new password</p>
        </div>
        <NewPasswordForm email={user.email} />
      </div>
    </main>
  )
}
