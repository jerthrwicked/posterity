'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { safeNext } from '../../lib/auth/next-address'
import { AuthHead } from '../components/AuthHead'
import { WarningMark } from '../components/StatusMarks'
import { WhiteGlow } from '../components/Glow'

function LoginForm() {
  const searchParams = useSearchParams()
  // Where to continue once signed in: a page on this site, else the dashboard.
  const next = safeNext(searchParams.get('next')) ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(
    searchParams.get('error') === 'confirmation_failed'
      ? 'That confirmation link has expired. Try logging in, or sign up again.'
      : ''
  )

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
      setLoading(false)
    } else {
      // Full navigation, not a client push: the proxy needs to see the new
      // session cookies on a fresh request.
      window.location.href = next
    }
  }

  return (
    <div className="relative z-[1] w-full max-w-md">
      <AuthHead line="Welcome back." />
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm text-gray-400 mb-1 block">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-2.5 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-gray-400 mb-1 block">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
            className="w-full bg-transparent border-0 border-b border-gray-600 rounded-none px-0 py-2.5 text-white placeholder:text-[color:var(--text-quiet)] focus:outline-none focus:border-white transition"
          />
        </div>
        <p className="text-right text-xs -mt-2">
          <a href="/forgot-password" className="text-[color:var(--text-quiet)] hover:text-gray-300">Forgot your password?</a>
        </p>
        <p className="text-right text-xs -mt-2">
          <a href="/account-recovery" className="text-[color:var(--text-quiet)] hover:text-gray-300">
            [Placeholder: Product surface copy — sign-in page: the link to account recovery, for someone who can no
            longer reach their email]
          </a>
        </p>
        {message && <p className="text-sm text-center text-[color:var(--brand-rose)] inline-flex items-start justify-center gap-2"><WarningMark className="mt-0.5" />{message}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </div>
      <p className="text-center text-gray-400 mt-6 text-sm">
        Don&rsquo;t have an account?{' '}
        <a href="/signup" className="text-white underline hover:text-gray-200">Sign up</a>
      </p>
    </div>
  )
}

export default function Login() {
  return (
    <main className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <WhiteGlow />
    </main>
  )
}
