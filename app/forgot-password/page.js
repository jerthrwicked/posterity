'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import Link from 'next/link'
import { Wordmark } from '../components/brand/Wordmark'
import { requestRecoveryReset } from './actions'
import { WarningMark } from '../components/StatusMarks'
import { AccountGlow } from '../components/Glow'

// Password reset, from the sign-in page (Master Specification, Settings:
// "Password change and reset"). The person gives the address they sign in
// with, and a link goes to it. Supabase builds the link and the email leaves
// through the Communication Dispatch System once the Send Email hook is on;
// until then Supabase's own mailer sends it. Either way the link lands on
// /auth/confirm (hook) or /auth/callback (mailer) and continues to
// /reset-password, where the new password is set.
//
// The same box takes a recovery email address (Master Specification, Settings:
// "A customer who has lost that address resets through a link sent to their
// recovery email address"). Beside Supabase's reset, requestRecoveryReset sends
// a reset link to the address where it is a confirmed recovery address.
//
// The page says the same thing whether or not the address has an account, so
// it tells no one which addresses are Posterity's.

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState(
    searchParams.get('error') === 'link_expired'
      ? 'That reset link has expired or was already used. Ask for a new one below.'
      : ''
  )

  const handleRequest = async () => {
    if (!email.trim()) return setMessage('Please enter your email.')
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const [{ error }] = await Promise.all([
      supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }),
      requestRecoveryReset(email.trim()),
    ])
    setLoading(false)
    if (error) return setMessage(error.message)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="relative z-[1] w-full max-w-md text-center">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <Wordmark size="lg" withMark />
        </Link>
        <div className="bg-[color:var(--card-ground)] posterity-frame rounded-2xl p-8 mt-10 border border-[color:var(--card-edge)]">
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-gray-400 leading-relaxed">
            If <span className="text-white">{email}</span> has a Posterity account, a reset link is on
            its way. It works for an hour.
          </p>
        </div>
        <p className="text-[color:var(--text-quiet)] text-sm mt-6">
          <a href="/login" className="text-gray-300 underline hover:text-white">Back to log in</a>
        </p>
      </div>
    )
  }

  return (
    <div className="relative z-[1] w-full max-w-md">
      <div className="text-center mb-10">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <Wordmark size="lg" withMark />
        </Link>
        <p className="text-gray-400 mt-2">Reset your password</p>
      </div>
      <div className="bg-[color:var(--card-ground)] posterity-frame border border-[color:var(--card-edge)] rounded-2xl p-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm text-gray-400 mb-1 block">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleRequest()}
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition"
          />
          <p className="text-xs text-[color:var(--text-quiet)] mt-1 leading-relaxed">
            The address you sign in with. We&rsquo;ll send it a link to choose a new password.{' '}
            [Placeholder: Product surface copy — forgot password: a confirmed recovery email address works here too]
          </p>
        </div>
        {message && <p className="text-sm text-center text-[color:var(--brand-rose)] inline-flex items-start justify-center gap-2"><WarningMark className="mt-0.5" />{message}</p>}
        <button
          onClick={handleRequest}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </div>
      <p className="text-center text-gray-400 mt-6 text-sm">
        Remembered it?{' '}
        <a href="/login" className="text-white underline hover:text-gray-200">Log in</a>
      </p>
    </div>
  )
}

export default function ForgotPassword() {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
      <AccountGlow />
    </main>
  )
}
