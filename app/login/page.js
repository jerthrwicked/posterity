'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { Wordmark } from '../components/brand/Wordmark'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

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
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <Wordmark size="lg" withMark />
        </a>
        <p className="text-gray-400 mt-2">Welcome back</p>
      </div>
      <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm text-gray-400 mb-1 block">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
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
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
          />
        </div>
        {message && <p className="text-sm text-center text-red-400">{message}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer"
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
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
