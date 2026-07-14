'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase/client'
import { Wordmark } from '../components/brand/Wordmark'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSignup = async () => {
    setError('')

    if (!fullName.trim()) return setError('Please enter your name.')
    if (!email.trim()) return setError('Please enter your email.')
    if (password.length < 8) return setError('Please choose a password of at least 8 characters.')

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) return setError(error.message)

    // If email confirmation is on, there is no session yet — the account row is
    // created by a database trigger the moment the auth user exists, so nothing
    // is lost by waiting for them to confirm.
    if (data.session) {
      window.location.href = '/dashboard'
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Wordmark size="lg" withMark />
          </a>
          <div className="bg-gray-900 rounded-2xl p-8 mt-10 border border-gray-800">
            <h1 className="text-2xl font-bold mb-3">Check your email</h1>
            <p className="text-gray-400 leading-relaxed">
              We sent a confirmation link to <span className="text-white">{email}</span>. Open it and
              your account will be waiting.
            </p>
          </div>
          <p className="text-gray-600 text-sm mt-6">
            Wrong address?{' '}
            <button onClick={() => setSent(false)} className="text-gray-300 underline hover:text-white cursor-pointer">
              Go back
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Wordmark size="lg" withMark />
          </a>
          <p className="text-gray-400 mt-2">Your legacy starts here</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="text-sm text-gray-400 mb-1 block">Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
            />
          </div>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSignup()}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
            />
          </div>

          {error && <p className="text-sm text-center text-red-400">{error}</p>}

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating your account...' : 'Create account'}
          </button>

          <p className="text-xs text-gray-600 text-center leading-relaxed mt-1">
            Building is free while you decide. You choose a plan when you&rsquo;re ready.
          </p>
        </div>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-white underline hover:text-gray-200">Log in</a>
        </p>
      </div>
    </main>
  )
}
